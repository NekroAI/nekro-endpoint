#!/usr/bin/env python3
"""Fetch private source recipes, compile, validate and publish protected EP artifacts.

Default: preview. --apply publishes new-layout endpoints only; never reloads a client.
"""
import argparse
import concurrent.futures
import contextlib
import copy
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.parse

import yaml
import epctl
from epctl import ToolError, private_write, json_text
from refresh_native import fetch_native
from proxy_bundle import compile_clash, dump, nikki_config, shadowrocket_nodes, shadowrocket_config, shadowrocket_daily, dump_shadowrocket_nodes

DEFAULT_CONFIG = Path.home() / '.config/nekro-endpoint/proxy-sync.json'


def sha(content): return hashlib.sha256(content.encode()).hexdigest()


def yaml_read(raw):
    try: value = yaml.safe_load(raw)
    except yaml.YAMLError: raise ToolError('Invalid YAML; inspect the private run files.') from None
    if not isinstance(value, dict): raise ToolError('Expected a YAML mapping.')
    return value


@contextlib.contextmanager
def locked(path):
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    with path.open('a') as f:
        os.chmod(path, 0o600)
        try: fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError: raise ToolError('Another proxy sync is running.') from None
        try: yield
        finally: fcntl.flock(f, fcntl.LOCK_UN)


def native_source(recipe, binary, baseline, folder):
    url = Path(recipe['url_file']).expanduser().read_text().strip()
    if urllib.parse.urlsplit(url).scheme != 'https': raise ToolError('Sources require HTTPS.')
    config = {'proxies': [], 'proxy-groups': [], 'dns': {'enable': True, 'ipv6': False, 'nameserver': recipe['bootstrap_dns'], 'proxy-server-nameserver': recipe['bootstrap_dns']}, 'proxy-providers': {'source': {'type': 'http', 'url': url, 'proxy': 'DIRECT', 'header': {'User-Agent': [recipe['user_agent']]}}}}
    runs = []
    if recipe['mode'] == 'two-stage':
        first, report, run = fetch_native(binary, config, 'source', timeout=recipe.get('timeout', 75), min_nodes=1, allow_bootstrap=True)
        runs.append(str(run)); private_write(folder / 'bootstrap-response.yaml', first)
        nodes = yaml_read(first).get('proxies', [])
        boot = [n for n in nodes if re.search(recipe['bootstrap_filter'], n['name'])]
        if not boot: raise ToolError('No independent subscription bootstrap nodes found.')
        # Each isolated core tries a concrete bootstrap node, avoiding group-default races.
        errors = []
        for node in boot:
            second = copy.deepcopy(config); second['proxies'] = [node]; second['proxy-providers']['source']['proxy'] = node['name']
            try:
                raw, report, run = fetch_native(binary, second, 'source', timeout=recipe.get('timeout', 75), min_nodes=recipe['min_nodes'], baseline=baseline, max_drop=recipe.get('max_drop', 0.35))
                runs.append(str(run)); break
            except ToolError as error: errors.append(epctl.redact(error))
        else: raise ToolError('All native bootstrap paths failed; previous outputs preserved.')
    elif recipe['mode'] == 'direct':
        raw, report, run = fetch_native(binary, config, 'source', timeout=recipe.get('timeout', 75), min_nodes=recipe['min_nodes'], baseline=baseline, max_drop=recipe.get('max_drop', 0.35))
        runs.append(str(run))
    else: raise ToolError('Unknown source acquisition mode.')
    data = yaml_read(raw)
    ordinary = [n for n in data['proxies'] if not re.search(recipe['exclude_filter'], n['name'])]
    if len(ordinary) < recipe['min_ordinary']: raise ToolError('Too few ordinary usable node definitions.')
    if baseline:
        previous = yaml_read(baseline)['proxies']
        before = [n for n in previous if not re.search(recipe['exclude_filter'], n['name'])]
        if len(ordinary) < len(before) * (1 - recipe.get('max_drop', 0.35)):
            raise ToolError('Ordinary-node count dropped too far; nothing published.')
    result = {'proxies': data['proxies']}
    private_write(folder / 'validated.yaml', dump(result))
    return result, {'nodes': len(data['proxies']), 'ordinary': len(ordinary), 'native_runs': runs}


def fetch_rule(spec, folder):
    url = spec.get('url', '')
    if not url.startswith('https://'): raise ToolError('Rule dependencies require HTTPS.')
    config = 'url = ' + json.dumps(url) + '\nuser-agent = "NekroEndpoint-ConfigCompiler/1.0"\n'
    result = subprocess.run(['curl', '--config', '-', '--fail', '--silent', '--show-error', '--connect-timeout', '10', '--max-time', '35', '--max-filesize', '8388608'], input=config.encode(), capture_output=True)
    if result.returncode: raise ToolError('Rule dependency fetch failed; see private source metadata.')
    try: text = result.stdout.decode('utf-8-sig')
    except UnicodeDecodeError: raise ToolError('Binary rule provider is not supported.') from None
    if not text.strip() or text.lstrip().startswith('<'): raise ToolError('Rule response was empty/HTML.')
    private_write(folder, text)
    return text


def fetch_rules(providers, folder):
    def one(item):
        name, spec = item
        return name, fetch_rule(spec, folder / (hashlib.sha256(name.encode()).hexdigest()[:24] + '.txt'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        return dict(pool.map(one, providers.items()))


def check_mihomo(binary, config, work, geo_file):
    work.mkdir(mode=0o700, parents=True, exist_ok=True)
    if geo_file:
        import shutil
        shutil.copyfile(Path(geo_file).expanduser(), work / 'Country.mmdb')
    path = work / 'config.yaml'; private_write(path, dump(config))
    result = subprocess.run([str(binary), '-t', '-d', str(work), '-f', str(path)], capture_output=True, timeout=60)
    private_write(work / 'check.log', result.stdout + result.stderr)
    if result.returncode: raise ToolError('Mihomo validation failed; see private log: ' + str(work / 'check.log'))


def publish_bundle(client, contents, initial, master_path, master_digest, group_ids, folder):
    """Preflight every endpoint; compensate only when our own write is still present.

    Not atomic and not server CAS. Checkpoint files permit diagnosis after interruption.
    """
    for path in contents:
        if path in initial:
            if epctl.digest(client.get(initial[path]['id'])) != epctl.digest(initial[path]): raise ToolError('Remote changed during generation: ' + path)
        elif any(e['path'] == path for e in client.endpoints(path)):
            raise ToolError('New path appeared during generation: ' + path)
    if epctl.digest(client.resolve(master_path)) != master_digest: raise ToolError('Canonical master changed during generation.')
    history = []
    private_write(folder / 'publish-journal.json', json_text({'status': 'started', 'changes': []}))
    try:
        for path, content in contents.items():
            old = initial.get(path)
            if old and old['config'].get('content') == content and old['isPublished']:
                print('Unchanged:', path, flush=True); continue
            if old:
                epctl.backup(old)
                if epctl.digest(client.get(old['id'])) != epctl.digest(old): raise ToolError('Concurrent edit before write: ' + path)
                cfg = dict(old['config']); cfg['content'] = content
                history.append({'path': path, 'old': old, 'desired': cfg, 'id': old['id']})
                private_write(folder / 'publish-journal.json', json_text({'status': 'writing', 'changes': history}))
                client.patch(old, {'config': cfg})
                current = client.get(old['id'])
            else:
                cfg = {'content': content, 'contentType': 'text/plain; charset=utf-8'}
                history.append({'path': path, 'old': None, 'desired': cfg, 'id': None})
                private_write(folder / 'publish-journal.json', json_text({'status': 'creating', 'changes': history}))
                client.request('/api/endpoints', 'POST', {'path': path, 'name': path.rsplit('/', 1)[-1], 'type': 'static', 'config': cfg, 'accessControl': 'authenticated', 'requiredPermissionGroups': group_ids})
                current = client.resolve(path); history[-1]['id'] = current['id']
            if current['config'] != cfg or current['accessControl'] != 'authenticated' or set(current['requiredPermissionGroups']) != set(group_ids):
                raise ToolError('Publication content/access readback mismatch.')
            if not current['isPublished']: client.request('/api/endpoints/' + current['id'] + '/publish', 'POST')
            current = client.get(current['id'])
            if current['config'] != cfg or not current['isPublished']: raise ToolError('Published readback mismatch.')
            history[-1]['written'] = epctl.digest(current)
            private_write(folder / 'publish-journal.json', json_text({'status': 'writing', 'changes': history}))
            print('Published:', path, flush=True)
    except Exception:
        failures = []
        for change in reversed(history):
            try:
                current = client.get(change['id']) if change['id'] else client.resolve(change['path'])
                if current['config'] != change['desired'] or (change.get('written') and epctl.digest(current) != change['written']):
                    failures.append(change['path'] + ': concurrent/uncertain state; not overwritten'); continue
                if change['old']:
                    old = change['old']; client.patch(current, {'config': old['config']})
                    if current['isPublished'] != old['isPublished']:
                        client.request('/api/endpoints/' + current['id'] + ('/publish' if old['isPublished'] else '/unpublish'), 'POST')
                    restored = client.get(current['id'])
                    if restored['config'] != old['config'] or restored['isPublished'] != old['isPublished']: raise ToolError('Restore mismatch')
                else:
                    if current['isPublished']: client.request('/api/endpoints/' + current['id'] + '/unpublish', 'POST')
            except Exception: failures.append(change['path'] + ': restoration needs review')
        private_write(folder / 'publish-journal.json', json_text({'status': 'failed', 'changes': history, 'rollback_issues': failures}))
        raise ToolError('Publish failed; compensation attempted. Inspect private journal before retrying.') from None
    private_write(folder / 'publish-journal.json', json_text({'status': 'complete', 'changes': history}))


def sync(settings, apply=False):
    cfg = json.loads(Path(settings).expanduser().read_text())
    root = Path(cfg['state_dir']).expanduser(); binary = Path(cfg['mihomo']).expanduser()
    if not binary.is_file(): raise ToolError('Configured Mihomo binary is missing.')
    client = epctl.load_client(Path(cfg.get('credentials', str(epctl.CONFIG))).expanduser())
    with locked(root / 'sync.lock'):
        stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
        work = root / 'runs' / stamp; work.mkdir(mode=0o700, parents=True)
        master_ep = client.resolve(cfg['master_path'])
        if master_ep['type'] != 'static' or master_ep['accessControl'] != 'authenticated': raise ToolError('Canonical master must be protected static content.')
        master_digest = epctl.digest(master_ep); master = yaml_read(master_ep['config']['content'])
        private_write(work / 'master.json', json_text(master_ep))
        # Resolve every output before fetching, so generated artifacts cannot silently overwrite edits.
        paths = [v['endpoint'] for v in cfg['sources'].values()] + list(cfg['outputs'].values())
        if any(epctl.canonical_path(p) != p for p in paths): raise ToolError('Noncanonical output path.')
        if len(paths) != len(set(paths)) or cfg['master_path'] in paths: raise ToolError('Duplicate/master output path.')
        if any(not p.startswith('/proxy/source/') and not p.startswith('/proxy/client/') for p in paths): raise ToolError('Output paths must use the new layout; legacy paths are read-only.')
        initial = {e['path']: client.get(e['id']) for e in client.endpoints('/proxy') if e['path'] in paths}
        groups = master_ep['requiredPermissionGroups']
        if not groups: raise ToolError('Master has no permission group.')
        for e in initial.values():
            if e['type'] != 'static' or e['accessControl'] != 'authenticated' or set(e['requiredPermissionGroups']) != set(groups): raise ToolError('Output type/permissions changed; refusing publication.')
        sources = {}; reports = {}
        for name, recipe in cfg['sources'].items():
            if not re.fullmatch(r'[a-z0-9_-]+', name): raise ToolError('Source IDs must be lowercase identifiers.')
            old = initial.get(recipe['endpoint'])
            baseline = old['config']['content'].encode() if old else Path(recipe['baseline_file']).expanduser().read_bytes() if recipe.get('baseline_file') else None
            print('Fetch:', name, recipe['mode'], flush=True)
            sources[name], reports[name] = native_source(recipe, binary, baseline, work / 'sources' / name)
            print('Validated:', name, reports[name]['nodes'], 'nodes;', reports[name]['ordinary'], 'ordinary', flush=True)
        # Bootstrap definitions are obtained from the same fresh source, not pinned forever.
        for entry in master.get('x-bootstrap-nodes', []):
            matches = [n for n in sources[entry['source']]['proxies'] if re.search(entry['match'], n['name'])]
            if len(matches) != 1: raise ToolError('Canonical bootstrap node selector must match exactly one node.')
            node = copy.deepcopy(matches[0]); node['name'] = entry['name']
            master.setdefault('proxies', []).append(node)
        rule_files = fetch_rules(master.get('rule-providers', {}), work / 'rules')
        flat = compile_clash(master, sources, rule_files)
        overlay = yaml_read(Path(cfg['nikki_overlay']).expanduser().read_text())
        nikki = nikki_config(flat, overlay)
        mobile = flat
        mobile_policy = master.get('x-shadowrocket')
        if mobile_policy:
            mobile_rules = fetch_rules(mobile_policy.get('rule-providers', {}), work / 'mobile-rules')
            mobile = shadowrocket_daily(flat, mobile_policy, mobile_rules)
        sr_nodes = shadowrocket_nodes(mobile); sr_config = shadowrocket_config(mobile, cfg.get("shadowrocket", {}).get("omit_rule_types", []), daily=bool(mobile_policy))
        check_mihomo(binary, flat, work / 'check-clash', cfg.get('geo_file'))
        check_mihomo(binary, nikki, work / 'check-nikki', cfg.get('geo_file'))
        contents = {cfg['sources'][name]['endpoint']: dump(data) for name, data in sources.items()}
        outputs = cfg['outputs']
        contents.update({outputs['clash']: dump(flat), outputs['nikki']: dump(nikki), outputs['shadowrocket_nodes']: dump_shadowrocket_nodes(sr_nodes), outputs['shadowrocket_config']: sr_config})
        report = {'batch': stamp, 'master_hash': sha(master_ep['config']['content']), 'sources': reports, 'outputs': {p: {'sha256': sha(c), 'bytes': len(c.encode())} for p, c in contents.items()}, 'shadowrocket_omitted_rules': [r for r in mobile['rules'] if r.split(',')[0] in cfg.get('shadowrocket', {}).get('omit_rule_types', [])], 'apply': apply, 'validation': 'Mihomo checks passed; Shadowrocket syntax adapter checked, device import still required'}
        for path, content in contents.items(): private_write(work / 'artifacts' / (path.strip('/').replace('/', '__') + '.txt'), content)
        private_write(work / 'report.json', json_text(report))
        print('Prepared batch:', work, flush=True)
        if not apply:
            print('Preview only; no endpoints changed. Use --apply to publish.', flush=True); return work
        publish_bundle(client, contents, initial, cfg['master_path'], master_digest, groups, work)
        private_write(root / 'last-success.json', json_text(report))
        print('All new-layout outputs published and verified; clients and legacy endpoints unchanged.', flush=True)
        return work


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=DEFAULT_CONFIG)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--preview', action='store_true')
    args = parser.parse_args()
    if args.apply and args.preview: parser.error('Choose --apply or --preview.')
    sync(args.config, args.apply)


if __name__ == '__main__':
    try: main()
    except (ToolError, OSError, ValueError, subprocess.SubprocessError) as error:
        print('proxy-sync:', epctl.redact(error), file=sys.stderr); sys.exit(1)
