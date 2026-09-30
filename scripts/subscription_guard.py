#!/usr/bin/env python3
"""Validate a native-client subscription export before replacing a last-good snapshot."""

import argparse
import base64
import binascii
import collections
import hashlib
import json
import re
from pathlib import Path
import sys
import urllib.parse

from epctl import ToolError, json_text, private_write

URI_SCHEMES = {"ss", "ssr", "trojan", "vmess", "vless", "anytls", "hysteria", "hysteria2", "hy2", "tuic"}


def decode_subscription(raw):
    text = raw.decode("utf-8-sig").strip()
    if not text or text.lstrip().startswith(("<", "<!")):
        raise ToolError("Empty/HTML response is not a subscription.")
    if re.search(r"(?m)^\s*(?:proxies|\"proxies\"|'proxies')\s*:", text) or text.startswith("{"):
        try:
            import yaml
        except ImportError:
            raise ToolError("YAML inspection needs PyYAML: install scripts/requirements-ops.txt.") from None
        try:
            data = yaml.safe_load(text)
        except yaml.YAMLError:
            raise ToolError("Invalid YAML subscription.") from None
        if not isinstance(data, dict) or not isinstance(data.get("proxies"), list):
            raise ToolError("No proxies array; an API error or configuration-only response is not a node export.")
        nodes = []
        for item in data["proxies"]:
            if not isinstance(item, dict) or any(k not in item for k in ("name", "type", "server", "port")):
                raise ToolError("A proxy entry is missing name/type/server/port.")
            if not isinstance(item["name"], str) or not isinstance(item["server"], str) or not item["server"]:
                raise ToolError("Proxy names and servers must be nonempty strings.")
            if not isinstance(item["port"], int) or not 1 <= item["port"] <= 65535:
                raise ToolError("Invalid proxy port.")
            nodes.append({"name": item["name"], "type": str(item["type"])})
        return "yaml", nodes
    if "://" not in text:
        try:
            compact = "".join(text.split())
            text = base64.b64decode(compact + "=" * (-len(compact) % 4), validate=True).decode("utf-8")
        except (binascii.Error, UnicodeDecodeError):
            raise ToolError("Response is neither proxy YAML nor a valid base64/URI subscription.") from None
    nodes = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith(("STATUS=", "REMARKS=", "#")):
            continue
        uri = urllib.parse.urlsplit(line)
        if uri.scheme not in URI_SCHEMES:
            raise ToolError("Unknown line/protocol in URI subscription; not silently accepting it.")
        name = urllib.parse.unquote(uri.fragment)
        if uri.scheme == "vmess":
            try:
                encoded = line.split("://", 1)[1].split("#", 1)[0]
                vmess = json.loads(base64.b64decode(encoded + "=" * (-len(encoded) % 4)))
                name = vmess.get("ps", name)
            except (ValueError, binascii.Error, UnicodeDecodeError):
                raise ToolError("Malformed VMess export.") from None
        nodes.append({"name": name, "type": uri.scheme})
    return "uri", nodes


def summarize(raw):
    format_name, nodes = decode_subscription(raw)
    bootstrap = [n for n in nodes if n["name"].startswith("PRO | 订阅专用节点")]
    notice_prefixes = ("如您", "请连接", "则为", "剩余", "过期", "到期", "套餐", "距离")
    ordinary = [n for n in nodes if n not in bootstrap and not n["name"].startswith(notice_prefixes + ("V0-",))]
    return {
        "format": format_name, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw),
        "node_count": len(nodes), "protocol_counts": dict(collections.Counter(n["type"] for n in nodes)),
        "bootstrap_count": len(bootstrap), "ordinary_count": len(ordinary),
        "bootstrap_only": bool(bootstrap) and not ordinary,
    }


def inspect(raw, baseline=None, min_nodes=1, max_drop=0.4):
    report = summarize(raw)
    reasons = []
    if report["node_count"] < min_nodes: reasons.append("node count below configured minimum")
    if report["bootstrap_only"]: reasons.append("only bootstrap/V0/instruction entries were returned")
    if baseline is not None:
        previous = summarize(baseline)
        report["baseline_node_count"] = previous["node_count"]
        if previous["node_count"] and report["node_count"] < previous["node_count"] * (1 - max_drop):
            reasons.append("node count dropped beyond the configured threshold")
    report["accepted"] = not reasons
    report["reasons"] = reasons
    return report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("file", type=Path)
    p.add_argument("--baseline", type=Path)
    p.add_argument("--min-nodes", type=int, default=1)
    p.add_argument("--max-drop", type=float, default=0.4)
    p.add_argument("--report", type=Path)
    args = p.parse_args()
    if args.min_nodes < 1 or not 0 <= args.max_drop < 1: p.error("Invalid count/drop threshold.")
    result = inspect(args.file.read_bytes(), args.baseline.read_bytes() if args.baseline else None, args.min_nodes, args.max_drop)
    if args.report: private_write(args.report, json_text(result))
    print(json_text(result), end="")
    return 0 if result["accepted"] else 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ToolError, OSError, ValueError, UnicodeDecodeError) as error:
        print("subscription-guard:", type(error).__name__, ": invalid input; last-good file was not changed", file=sys.stderr)
        sys.exit(2)
