"""Compile one canonical Mihomo config into dependency-free client artifacts.

No network or publication here. Unknown semantics fail rather than disappearing.
"""
import copy
import json
import re
import urllib.parse

import yaml
from epctl import ToolError


class QuotedDumper(yaml.SafeDumper):
    pass


QuotedDumper.add_representer(str, lambda dumper, value: dumper.represent_scalar('tag:yaml.org,2002:str', value, style='"'))


def dump(value):
    # Go YAML and PyYAML disagree on scalars such as 12e3456 (a valid Reality short ID).
    return yaml.dump(value, Dumper=QuotedDumper, allow_unicode=True, sort_keys=True, width=120)


def match(pattern, name):
    try:
        return bool(re.search(pattern, name))
    except re.error:
        raise ToolError("Unsupported node-filter expression.") from None


def compile_clash(master, sources, rule_files):
    out = copy.deepcopy(master)
    providers = out.pop('proxy-providers', {})
    rule_providers = out.pop('rule-providers', {})
    original = out.get('proxies', [])
    if len({n['name'] for n in original}) != len(original):
        raise ToolError('Duplicate self-hosted node names.')
    by_provider = {}
    all_nodes = list(original)
    used_names = {n['name'] for n in original}
    for name, spec in providers.items():
        source = spec.get('x-source', name)
        if source not in sources:
            raise ToolError('Master refers to an unregistered source: ' + source)
        if spec.get('override'):
            raise ToolError('Provider override is not supported; move node overrides into the canonical source.')
        nodes = []
        for entry in sources[source]['proxies']:
            n = copy.deepcopy(entry)
            if spec.get('filter') and not match(spec['filter'], n['name']): continue
            if spec.get('exclude-filter') and match(spec['exclude-filter'], n['name']): continue
            if n['type'] in str(spec.get('exclude-type', '')).split('|'): continue
            n['name'] = '[' + source + '] ' + n['name']
            if n['name'] in used_names:
                raise ToolError('Duplicate generated node name within a source.')
            used_names.add(n['name']); nodes.append(n); all_nodes.append(n)
        if not nodes: raise ToolError('Source filtering removed every node: ' + source)
        by_provider[name] = nodes
    for node in all_nodes:
        credential = 'uuid' if node.get('type') in ('vless', 'vmess') else 'password' if node.get('type') in ('trojan', 'anytls', 'hysteria2', 'ss') else None
        if credential and (not isinstance(node.get(credential), str) or not node[credential]):
            raise ToolError('Node credentials must be nonempty strings; refusing a YAML type coercion.')
    out['proxies'] = all_nodes
    for group in out.get('proxy-groups', []):
        if any(group.get(k) for k in ['include-all', 'include-all-providers', 'include-all-proxies']):
            raise ToolError('Explicit provider use is required; include-all expansion is not supported.')
        members = list(group.get('proxies', []))
        for provider in group.pop('use', []):
            if provider not in by_provider: raise ToolError('Unknown provider in group.')
            for node in by_provider[provider]:
                # Apply the filter to the original label, not the generated source prefix.
                label = node['name'].split('] ', 1)[1]
                if group.get('filter') and not match(group['filter'], label): continue
                if group.get('exclude-filter') and match(group['exclude-filter'], label): continue
                if node['type'] in str(group.get('exclude-type', '')).split('|'): continue
                members.append(node['name'])
        for key in ['filter', 'exclude-filter', 'exclude-type']: group.pop(key, None)
        group['proxies'] = list(dict.fromkeys(members))
        # A geographically empty group must reject, never become COMPATIBLE/DIRECT.
        if not members: group['proxies'] = ['REJECT']
    rules = []
    for rule in out.get('rules', []):
        if not rule.startswith('RULE-SET,'):
            rules.append(rule); continue
        parts = rule.split(',')
        if len(parts) not in (3, 4) or (len(parts) == 4 and parts[3] != 'no-resolve'):
            raise ToolError('Unsupported RULE-SET options.')
        _, name, target, *options = parts
        if name not in rule_providers or name not in rule_files:
            raise ToolError('Missing rule dependency: ' + name)
        spec = rule_providers[name]
        if spec.get('format', 'yaml') not in ('text', 'yaml'):
            raise ToolError('Only text/YAML rule providers are supported; binary MRS must be decoded explicitly.')
        body = rule_files[name]
        entries = yaml.safe_load(body).get('payload', []) if spec.get('format', 'yaml') == 'yaml' else body.splitlines()
        count = 0
        for raw in entries:
            entry = str(raw).strip()
            if not entry or entry.startswith(('#', '//')): continue
            behavior = spec.get('behavior', 'classical')
            if behavior == 'domain':
                if entry.startswith(('+.','*.')): entry = 'DOMAIN-SUFFIX,' + entry[2:]
                elif '*' in entry or '?' in entry: raise ToolError('Unsupported domain wildcard in rule provider.')
                else: entry = 'DOMAIN,' + entry.lstrip('.')
            elif behavior == 'ipcidr': entry = ('IP-CIDR6,' if ':' in entry else 'IP-CIDR,') + entry
            elif behavior != 'classical': raise ToolError('Unsupported rule-provider behavior.')
            own_no_resolve = entry.endswith(',no-resolve')
            if own_no_resolve: entry = entry[:-11]
            if entry.startswith('RULE-SET,'): raise ToolError('Nested rule-set is unsupported.')
            rules.append(entry + ',' + target + (',no-resolve' if own_no_resolve or options else ''))
            count += 1
        if not count: raise ToolError('Empty external rule set.')
    out['rules'] = rules
    for key in list(out):
        if key.startswith('x-'): out.pop(key)
    # Client shells own their management/TUN listeners; no machine credentials escape.
    for key in ['secret', 'external-ui', 'external-ui-url', 'external-ui-name', 'external-controller', 'listeners', 'tun', 'authentication', 'interface-name']:
        out.pop(key, None)
    out['allow-lan'] = False
    out['mixed-port'] = 7890
    if 'dns' in out: out['dns']['listen'] = '127.0.0.1:1053'
    validate_graph(out)
    return out


def validate_graph(config):
    nodes = {n['name']: n for n in config.get('proxies', [])}
    groups = {g['name']: g for g in config.get('proxy-groups', [])}
    if len(groups) != len(config.get('proxy-groups', [])) or set(groups) & set(nodes):
        raise ToolError('Duplicate group/node name.')
    known = set(nodes) | set(groups) | {'DIRECT', 'REJECT', 'REJECT-DROP'}
    edges = {k: list(v.get('proxies', [])) for k, v in groups.items()}
    edges.update({k: [v['dialer-proxy']] for k, v in nodes.items() if v.get('dialer-proxy')})
    for k, values in edges.items():
        if not values or any(v not in known for v in values): raise ToolError('Dangling/empty proxy group or relay: ' + k)
    def visit(n, chain):
        if n in chain: raise ToolError('Proxy/relay dependency cycle: ' + n)
        for child in edges.get(n, []): visit(child, chain + [n])
    for name in edges: visit(name, [])
    for rule in config.get('rules', []):
        fields = rule.split(',')
        target = fields[-2] if fields[-1] == 'no-resolve' else fields[-1]
        if target not in known: raise ToolError('Unknown rule target: ' + target)


def nikki_config(flat, overlay):
    out = copy.deepcopy(flat)
    allowed = {'mixed-port', 'port', 'socks-port', 'redir-port', 'tproxy-port', 'allow-lan', 'bind-address', 'dns', 'hosts', 'sniffer', 'authentication', 'listeners', 'rules-prepend'}
    if set(overlay) - allowed: raise ToolError('Unexpected Nikki overlay key.')
    for k, value in overlay.items():
        if k == 'rules-prepend': out['rules'] = value + out['rules']
        elif k == 'dns':
            dns = out.setdefault('dns', {})
            for field, setting in value.items():
                if field == 'fake-ip-filter':
                    dns[field] = list(dict.fromkeys(dns.get(field, []) + setting))
                else:
                    dns[field] = copy.deepcopy(setting)
        else: out[k] = copy.deepcopy(value)
    # Controller credentials stay in local Nikki UCI, not in the published profile.
    out['external-controller'] = '127.0.0.1:19090'
    out['tun'] = {'enable': False}
    validate_graph(out)
    return out


def shadowrocket_nodes(flat):
    """Shadowrocket's YAML node format preserves Reality, hopping and transport options."""
    nodes = []
    supported = {'vless', 'trojan', 'anytls', 'hysteria2', 'ss', 'vmess'}
    for original in flat['proxies']:
        n = copy.deepcopy(original)
        if n['type'] not in supported: raise ToolError('Unsupported Shadowrocket node protocol: ' + n['type'])
        if 'sni' in n: n['servername'] = n.pop('sni')
        if n['type'] in {'trojan', 'anytls', 'hysteria2'}: n.pop('tls', None)
        # Mihomo-specific per-node IPv4 preference is represented by config-wide IPv6 disable.
        if n.get('ip-version') not in (None, 'ipv4'): raise ToolError('Unsupported Shadowrocket IP preference.')
        n.pop('ip-version', None)
        nodes.append(n)
    return {'proxies': nodes}


def dump_shadowrocket_nodes(value):
    """Keep the conventional subscription marker; JSON protects scalar types.

    Some subscription detectors look for a literal proxies: prefix even though
    quoted YAML keys are valid. Do not use the generic all-quoted YAML dumper.
    """
    if not isinstance(value.get('proxies'), list) or not value['proxies']:
        raise ToolError('Shadowrocket subscription must contain nodes.')
    return 'proxies:\n' + ''.join('  - ' + json.dumps(node, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n' for node in value['proxies'])


def shadowrocket_config(flat, omit_rule_types=(), daily=False):
    """Companion config references names from the generated YAML node subscription."""
    def safe(value):
        value = str(value)
        if any(x in value for x in ['\n', '\r', ',']): raise ToolError('Shadowrocket name contains a config delimiter.')
        return value
    def dns_url(value):
        url, sep, group = value.partition('#')
        if value == 'system': return value
        if not url.startswith('https://'): raise ToolError('Shadowrocket adapter currently requires DoH DNS.')
        if not sep or group == 'DIRECT': return url
        return url + '#proxy=' + urllib.parse.quote(group, safe='')
    if set(omit_rule_types) - {'PROCESS-NAME'}: raise ToolError('Only explicitly inapplicable process rules may be omitted for iOS.')
    dns = flat.get('dns', {})
    general = ['[General]', 'bypass-system = false', 'skip-proxy = 127.0.0.1, localhost, *.local', 'ipv6 = false', 'dns-direct-fallback-proxy = false', 'close-if-proxy-chain-missing = true']
    if daily:
        general = [line for line in general if not line.startswith('bypass-system')]
        general.append('private-ip-answer = true')
        general[general.index('skip-proxy = 127.0.0.1, localhost, *.local')] = 'skip-proxy = 127.0.0.1, localhost, *.local, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, captive.apple.com'
    for source, target in [('nameserver', 'dns-server'), ('proxy-server-nameserver', 'proxy-dns-server'), ('direct-nameserver', 'direct-dns-server')]:
        if dns.get(source): general.append(target + ' = ' + ','.join(dns_url(v) for v in dns[source]))
    # Keep fallback bound to the same policy, rather than implicit system-DNS fallback.
    if dns.get('nameserver'): general.append('fallback-dns-server = ' + ','.join(dns_url(v) for v in dns['nameserver']))
    lines = general + ['', '[Proxy Group]']
    for g in flat['proxy-groups']:
        if g['type'] not in ('select', 'url-test', 'fallback'): raise ToolError('Unsupported Shadowrocket group type.')
        members = [safe(v) for v in g['proxies']]
        options = ['hidden=1'] if g.get('hidden') else []
        if g['type'] == 'select': options.append('policy-select-name=' + members[0])
        else:
            options += ['url=' + safe(g.get('url', 'https://www.gstatic.com/generate_204')), 'interval=' + str(g.get('interval', 600)), 'tolerance=' + str(g.get('tolerance', 50))]
        lines.append(safe(g['name']) + ' = ' + ','.join([g['type']] + members + options))
    lines += ['', '[Rule]']
    allowed = {'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'IP-CIDR', 'IP-CIDR6', 'GEOIP', 'DST-PORT', 'SRC-IP-CIDR', 'IP-ASN', 'USER-AGENT', 'DOMAIN-WILDCARD', 'AND', 'OR', 'NOT', 'MATCH'}
    for rule in flat['rules']:
        if rule.split(',')[0] in omit_rule_types: continue
        if rule.split(',')[0] not in allowed: raise ToolError('Unsupported Shadowrocket rule type: ' + rule.split(',')[0])
        if rule.startswith(('DOMAIN,', 'DOMAIN-SUFFIX,', 'DOMAIN-KEYWORD,', 'USER-AGENT,')) and rule.endswith(',no-resolve'):
            rule = rule[:-11]
        rule = re.sub(r'\(NETWORK,(tcp|udp)\)', lambda m: '(PROTOCOL,' + m[1].upper() + ')', rule)
        if rule.startswith('MATCH,'): rule = 'FINAL,' + rule[6:]
        lines.append(rule)
    lines += ['', '[Host]']
    for domain, resolvers in dns.get('nameserver-policy', {}).items():
        if not domain.startswith('+.') or len(resolvers) != 1: raise ToolError('Unsupported per-domain Shadowrocket DNS mapping.')
        server = 'server:' + dns_url(resolvers[0])
        lines += [domain[2:] + ' = ' + server, '*.' + domain[2:] + ' = ' + server]
    return '\n'.join(lines) + '\n'


def shadowrocket_daily(flat, policy, rule_files):
    """Apply the mobile-only policy stored inside the canonical master.

    Reuse compiled node definitions; never mutate desktop/router artifacts.
    """
    if policy.get('mode') != 'selective-direct':
        raise ToolError('Unsupported Shadowrocket mobile policy mode.')
    out = copy.deepcopy(flat)
    groups = {g['name']: g for g in out['proxy-groups']}
    for group in policy.get('groups', []):
        groups[group['name']] = copy.deepcopy(group)
    for name, options in policy.get('group-options', {}).items():
        if name not in groups: raise ToolError('Unknown mobile group override: ' + name)
        if set(options) - {'interval', 'tolerance', 'url', 'hidden'}: raise ToolError('Unsupported mobile group option.')
        groups[name].update(options)
    rules = policy.get('rules', [])
    if not rules or rules[-1] != 'MATCH,DIRECT':
        raise ToolError('Daily mobile policy requires an explicit DIRECT final rule.')
    out['rules'] = list(rules)
    out['rule-providers'] = copy.deepcopy(policy.get('rule-providers', {}))
    out['proxy-groups'] = list(groups.values())
    out['dns'] = copy.deepcopy(policy['dns'])
    out = compile_clash(out, {}, rule_files)
    # Keep only reachable groups/nodes; subscription-only bootstrap does not belong on phones.
    groups = {g['name']: g for g in out['proxy-groups']}
    nodes = {n['name']: n for n in out['proxies']}
    reachable = set()
    def visit(name):
        if name in reachable or name in {'DIRECT', 'REJECT', 'REJECT-DROP'}: return
        reachable.add(name)
        if name in groups:
            for child in groups[name]['proxies']: visit(child)
        elif name in nodes:
            if nodes[name].get('dialer-proxy'): visit(nodes[name]['dialer-proxy'])
        else: raise ToolError('Unknown mobile dependency: ' + name)
    visible = policy['visible-groups']
    for name in visible: visit(name)
    for rule in out['rules']:
        parts = rule.split(',');visit(parts[-2] if parts[-1] == 'no-resolve' else parts[-1])
    for values in out['dns'].get('nameserver-policy', {}).values():
        for value in values:
            if '#' in value: visit(value.split('#', 1)[1])
    for field in ['nameserver', 'direct-nameserver', 'proxy-server-nameserver']:
        for value in out['dns'].get(field, []):
            if '#' in value: visit(value.split('#', 1)[1])
    order = list(dict.fromkeys(visible + list(groups)))
    out['proxy-groups'] = [dict(groups[n], hidden=n not in visible) for n in order if n in reachable]
    out['proxies'] = [n for n in out['proxies'] if n['name'] in reachable]
    validate_graph(out)
    return out
