#!/usr/bin/env python3
"""Run one isolated native Mihomo subscription refresh and validate before saving."""

import argparse
import copy
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

from epctl import DATA, ToolError, json_text, private_write
from subscription_guard import inspect


def prepare(source, provider_name, folder, port, secret):
    """Whitelist only outbound/bootstrap configuration; never copy active TUN/listeners."""
    providers = source.get("proxy-providers", {})
    if provider_name not in providers or providers[provider_name].get("type") != "http":
        raise ToolError("Select an HTTP provider from the private native refresh configuration.")
    if any(group.get("use") for group in source.get("proxy-groups", [])):
        raise ToolError("Bootstrap groups must be self-contained; they cannot depend on fetched providers.")
    provider = copy.deepcopy(providers[provider_name])
    if not provider.get("proxy"):
        raise ToolError("Set the provider's proxy to the intended independent bootstrap node/group.")
    if urllib.parse.urlsplit(provider.get("url", "")).scheme != "https":
        raise ToolError("Native upstream subscription URL must use HTTPS.")
    provider.update({"path": str(folder / "provider.yaml"), "interval": 86400, "health-check": {"enable": False}})
    config = {k: copy.deepcopy(source[k]) for k in ("proxies", "proxy-groups", "dns") if k in source}
    config.update({"mode": "rule", "ipv6": False, "log-level": "warning", "external-controller": f"127.0.0.1:{port}", "secret": secret, "proxy-providers": {provider_name: provider}, "rules": ["MATCH,REJECT"]})
    if "dns" in config:
        config["dns"].pop("listen", None)
        config["dns"]["ipv6"] = False
    return config


def fetch_native(binary, source, provider, timeout=45, min_nodes=20, baseline=None, max_drop=0.4, allow_bootstrap=False):
    try:
        import yaml
    except ImportError:
        raise ToolError("Install scripts/requirements-ops.txt for native refresh YAML support.") from None
    run_root = DATA / "native-runs"
    run_root.mkdir(mode=0o700, parents=True, exist_ok=True)
    folder = Path(tempfile.mkdtemp(prefix="refresh-", dir=run_root))
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    secret = secrets.token_urlsafe(32)
    config = prepare(source, provider, folder, port, secret)
    config_path = folder / "config.yaml"
    private_write(config_path, yaml.safe_dump(config, allow_unicode=True, sort_keys=False))
    log_path = folder / "native.log"
    private_write(log_path, b"")
    # The native core, not this Python process, sends the upstream request.
    process = None
    try:
        with log_path.open("ab") as log:
            process = subprocess.Popen([str(binary), "-d", str(folder), "-f", str(config_path)], stdout=log, stderr=subprocess.STDOUT)
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
            status_url = f"http://127.0.0.1:{port}/providers/proxies/" + urllib.parse.quote(provider, safe="")
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                if process.poll() is not None:
                    raise ToolError(f"Native core exited; inspect private log: {log_path}")
                try:
                    request = urllib.request.Request(status_url, headers={"Authorization": "Bearer " + secret})
                    with opener.open(request, timeout=2) as response:
                        status = json.load(response)
                    export = folder / "provider.yaml"
                    if status.get("proxies") and export.exists():
                        raw = export.read_bytes()
                        report = inspect(raw, baseline=baseline, min_nodes=min_nodes, max_drop=max_drop)
                        if allow_bootstrap and report["bootstrap_only"] and report["node_count"] >= min_nodes and baseline is None:
                            report["accepted"] = True
                            report["bootstrap_stage"] = True
                            report["reasons"] = []
                        private_write(folder / "report.json", json_text(report))
                        if not report["accepted"]:
                            raise ToolError(f"Native export failed completeness checks; previous output preserved. Report: {folder / 'report.json'}")
                        return raw, report, folder
                except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
                    pass
                time.sleep(0.5)
            raise ToolError(f"Native refresh timed out; previous output preserved. Private log: {log_path}")
    finally:
        if process is not None and process.poll() is None:
            process.terminate()
            try: process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mihomo", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True, help="Private self-contained native provider/bootstrap config")
    parser.add_argument("--provider", required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--baseline", type=Path)
    parser.add_argument("--min-nodes", type=int, default=20)
    parser.add_argument("--max-drop", type=float, default=0.4)
    parser.add_argument("--timeout", type=float, default=45)
    args = parser.parse_args()
    if not args.mihomo.is_file(): parser.error("Mihomo binary does not exist.")
    if args.timeout <= 0 or args.timeout > 300 or args.min_nodes < 1 or not 0 <= args.max_drop < 1:
        parser.error("Invalid timeout/count/drop threshold.")
    import yaml
    try:
        source = yaml.safe_load(args.config.read_text())
    except yaml.YAMLError:
        raise ToolError("Invalid private YAML configuration; inspect the file locally.") from None
    if not isinstance(source, dict): raise ToolError("Native refresh config must be a mapping.")
    baseline = args.baseline.read_bytes() if args.baseline else (args.out.read_bytes() if args.out.exists() else None)
    raw, report, run = fetch_native(args.mihomo.resolve(), source, args.provider, args.timeout, args.min_nodes, baseline, args.max_drop)
    private_write(args.out, raw)
    print(json_text({"output": str(args.out), "run": str(run), "report": report}), end="")


if __name__ == "__main__":
    try: main()
    except (ToolError, OSError, ValueError, ImportError) as error:
        # Native logs may contain the upstream URL; keep their contents private.
        from epctl import redact
        print("native-refresh:", redact(error), file=sys.stderr)
        sys.exit(1)
