#!/usr/bin/env python3
"""Small, dependency-free EP management client. Never prints credentials by default."""

import argparse
import datetime as dt
import difflib
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

CONFIG = Path.home() / ".config/nekro-endpoint/credentials.json"
DATA = Path.home() / ".local/share/nekro-endpoint"
USER_AGENT = "NekroEndpoint-Admin/0.1"
MAX_RESPONSE = 8 * 1024 * 1024
EDITABLE = ("parentId", "path", "name", "type", "config", "accessControl", "requiredPermissionGroups", "enabled")


class ToolError(Exception):
    pass


def redact(value):
    text = str(value)
    text = re.sub(r"\b(?:sec-[a-fA-F0-9]{64}|ep-[a-fA-F0-9]{32})\b", "[REDACTED]", text)
    text = re.sub(r"(?i)([?&](?:access_key|access_token|token|key|auth|password)=)[^\s&\"'<>]+", r"\1[REDACTED]", text)
    text = re.sub(r"(?i)((?:trojan|ss|vless|vmess|https?)://)[^\s/@]+@", r"\1[REDACTED]@", text)
    text = re.sub(r"(?i)\b(?:trojan|ss|ssr|vless|vmess|hysteria2|hy2|tuic)://[^\s\"'<>]+", "[PROXY-URI-REDACTED]", text)
    text = re.sub(r'''(?i)(["']?(?:password|secret|token|uuid|private-key|authorization|cookie|x-access-key)["']?\s*[:=]\s*)("[^"\n]*"|'[^'\n]*'|[^\s,}\]]+)''', r"\1[REDACTED]", text)
    text = re.sub(r'(?im)^(\s*[-+]?\s*[\"\']?(?:password|secret|token|uuid|private-key|authorization|x-access-key)[\"\']?\s*[:=]).*$', r"\1 [REDACTED]", text)
    # Subscription URLs can hide credentials in path segments, not only query keys.
    return re.sub(r'https?://[^\s\"\'<>]+', lambda m: safe_url(m.group()), text)


def safe_url(url):
    parsed = urllib.parse.urlsplit(url)
    return f"{parsed.scheme}://{parsed.hostname or '[host]'}/[path-redacted]"


def private_write(path, content):
    path = Path(path)
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    raw = content.encode() if isinstance(content, str) else content
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def json_text(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def canonical_path(path):
    if not path.startswith("/") or any(p in ("", ".", "..") for p in path[1:].split("/")):
        raise ToolError("Use an absolute endpoint path without empty, dot or parent segments.")
    if not re.fullmatch(r"/[A-Za-z0-9_./-]+", path):
        raise ToolError("Endpoint path contains unsupported characters.")
    return path


def normalize(endpoint):
    if not isinstance(endpoint, dict) or not endpoint.get("id") or not endpoint.get("path"):
        raise ToolError("Unexpected endpoint response shape.")
    result = dict(endpoint)
    for field in ("config", "requiredPermissionGroups"):
        if isinstance(result.get(field), str):
            result[field] = json.loads(result[field])
    result["requiredPermissionGroups"] = result.get("requiredPermissionGroups") or []
    if not isinstance(result.get("config"), dict):
        raise ToolError("Endpoint config must be an object.")
    return result


def digest(endpoint):
    return hashlib.sha256(json.dumps(normalize(endpoint), ensure_ascii=False, sort_keys=True).encode()).hexdigest()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # In particular, do not forward a management Bearer token to another host.
        return None


class Client:
    def __init__(self, base_url, token, timeout=25):
        parsed = urllib.parse.urlsplit(base_url)
        local = parsed.hostname in ("localhost", "127.0.0.1", "::1")
        if parsed.scheme != "https" and not (parsed.scheme == "http" and local):
            raise ToolError("Management API requires HTTPS (HTTP is allowed only on loopback).")
        if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ("", "/"):
            raise ToolError("Base URL must be an origin without credentials, path or query.")
        if not token or any(c in token for c in "\r\n"):
            raise ToolError("Missing or invalid management credential.")
        self.base = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout
        self.opener = urllib.request.build_opener(NoRedirect)

    def request(self, path, method="GET", payload=None, access_key=None):
        if not path.startswith("/") or path.startswith("//"):
            raise ToolError("Request paths must stay on the configured origin.")
        headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
        if access_key is None:
            headers["Authorization"] = "Bearer " + self.token
        else:
            headers["X-Access-Key"] = access_key
            headers["Accept"] = "*/*"
        data = None
        if payload is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(payload).encode()
        req = urllib.request.Request(self.base + path, data=data, headers=headers, method=method)
        try:
            with self.opener.open(req, timeout=self.timeout) as response:
                raw = response.read(MAX_RESPONSE + 1)
                if len(raw) > MAX_RESPONSE:
                    raise ToolError("Response exceeds the 8 MiB limit.")
                if access_key is not None:
                    return raw
                body = json.loads(raw)
                if isinstance(body, dict) and body.get("success") is False:
                    raise ToolError("API returned success=false; no local baseline changed.")
                return body
        except urllib.error.HTTPError as error:
            # Do not echo remote error bodies: they may contain URLs/credentials.
            hint = ""
            if error.code == 401:
                hint = " Check the credential; older EP servers accept browser sessions only."
            elif error.code == 403:
                hint = " Access was denied; check account permissions and Cloudflare rules."
            elif 300 <= error.code < 400:
                hint = " Redirect refused to protect credentials."
            status = error.code
            error.close()
            raise ToolError(f"HTTP {status} from EP.{hint}") from None
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            raise ToolError("EP connection failed or returned invalid JSON; no automatic retry.") from None

    def endpoints(self, prefix="/"):
        response = self.request("/api/endpoints?view=flat&includeDisabled=true")
        values = response.get("data", {}).get("endpoints")
        if not isinstance(values, list):
            raise ToolError("Unexpected list response.")
        return [normalize(e) for e in values if prefix == "/" or e["path"] == prefix or e["path"].startswith(prefix.rstrip("/") + "/")]

    def get(self, identifier):
        response = self.request("/api/endpoints/" + urllib.parse.quote(identifier, safe=""))
        data = response.get("data", response)
        return normalize(data.get("endpoint", data))

    def resolve(self, path):
        path = canonical_path(path)
        matches = [e for e in self.endpoints(path) if e["path"] == path]
        if len(matches) != 1:
            raise ToolError("Endpoint not found or ambiguous.")
        return self.get(matches[0]["id"])

    def patch(self, endpoint, payload):
        return self.request("/api/endpoints/" + urllib.parse.quote(endpoint["id"], safe=""), "PATCH", payload)


def load_client(config_path):
    config_path = Path(config_path)
    config = json.loads(config_path.read_text()) if config_path.exists() else {}
    token = os.environ.get("EP_TOKEN") or config.get("token")
    base = os.environ.get("EP_BASE_URL") or config.get("base_url")
    if not token or not base:
        raise ToolError("Run 'epctl init' or set EP_BASE_URL and EP_TOKEN.")
    return Client(base, token)


def workspace(path):
    return DATA / "work" / canonical_path(path).lstrip("/")


def save_baseline(folder, endpoint):
    private_write(folder / "endpoint.json", json_text(endpoint))
    private_write(folder / "baseline.sha256", digest(endpoint) + "\n")


def backup(endpoint, root=DATA):
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    path = root / "backups" / f"{stamp}-{hashlib.sha256(endpoint['id'].encode()).hexdigest()[:12]}.json"
    private_write(path, json_text(endpoint))
    return path


def show_diff(before, after):
    # Redact entire changed lines containing credential fields or URLs. Context
    # hashes separately identify changes which disappear through redaction.
    print("".join(difflib.unified_diff(redact(before).splitlines(True), redact(after).splitlines(True), fromfile="remote (redacted)", tofile="local (redacted)")), end="")
    print("content sha256:", hashlib.sha256(before.encode()).hexdigest(), "->", hashlib.sha256(after.encode()).hexdigest())


def push(client, path, folder, apply=False):
    baseline = normalize(json.loads((folder / "endpoint.json").read_text()))
    if baseline["path"] != canonical_path(path):
        raise ToolError("Workspace belongs to a different endpoint path.")
    expected = (folder / "baseline.sha256").read_text().strip()
    if digest(baseline) != expected:
        raise ToolError("Baseline was edited; pull a fresh workspace before pushing.")
    current = client.get(baseline["id"])
    if digest(current) != expected:
        raise ToolError("Remote endpoint changed since pull; refusing to overwrite it.")
    if current["type"] == "static":
        config = dict(current["config"])
        config["content"] = (folder / "content.txt").read_text()
        show_diff(current["config"].get("content", ""), config["content"])
    else:
        config = json.loads((folder / "config.json").read_text())
        if not isinstance(config, dict):
            raise ToolError("config.json must contain an object.")
        show_diff(json_text(current["config"]), json_text(config))
    if config == current["config"]:
        print("No changes.")
        return
    if not apply:
        print("Preview only. Add --apply to upload; publication state is preserved.")
        return
    saved = backup(current)
    # A second preflight narrows, but cannot eliminate, the race without server CAS.
    if digest(client.get(current["id"])) != expected:
        raise ToolError("Remote changed during preflight; upload cancelled.")
    client.patch(current, {"config": config})
    verified = client.get(current["id"])
    if verified["config"] != config or verified["isPublished"] != current["isPublished"]:
        raise ToolError(f"Read-back differs; inspect the remote state. Backup: {saved}")
    save_baseline(folder, verified)
    print("Uploaded and verified. Backup:", saved)


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--config", type=Path, default=CONFIG)
    sub = p.add_subparsers(dest="command", required=True)
    init = sub.add_parser("init", help="Store a management credential with mode 0600")
    init.add_argument("--base-url", required=True)
    sub.add_parser("whoami")
    listing = sub.add_parser("list")
    listing.add_argument("--prefix", default="/proxy")
    snapshot = sub.add_parser("snapshot")
    snapshot.add_argument("--prefix", default="/proxy")
    snapshot.add_argument("--out", type=Path)
    for command in ("pull", "diff", "push"):
        c = sub.add_parser(command)
        c.add_argument("path")
        c.add_argument("--dir", type=Path)
        if command == "push": c.add_argument("--apply", action="store_true")
        if command == "pull": c.add_argument("--overwrite", action="store_true")
    create = sub.add_parser("create-static")
    create.add_argument("path")
    create.add_argument("file", type=Path)
    create.add_argument("--name")
    create.add_argument("--content-type", default="text/plain")
    create.add_argument("--permission-group", action="append", default=[])
    create.add_argument("--public", action="store_true")
    create.add_argument("--apply", action="store_true")
    for command in ("publish", "unpublish"):
        c = sub.add_parser(command)
        c.add_argument("path")
        c.add_argument("--apply", action="store_true")
    restore = sub.add_parser("restore")
    restore.add_argument("backup", type=Path)
    restore.add_argument("--apply", action="store_true")
    download = sub.add_parser("download", help="Read a published endpoint using a separate access key")
    download.add_argument("path")
    download.add_argument("--username", required=True)
    download.add_argument("--access-key-file", type=Path, required=True)
    download.add_argument("--out", type=Path, required=True)
    return p


def main(argv=None):
    args = parser().parse_args(argv)
    if args.command == "init":
        token = getpass.getpass("EP management key/session (hidden): ")
        Client(args.base_url, token)  # Validate before saving, without sending it.
        private_write(args.config, json_text({"base_url": args.base_url, "token": token}))
        print("Credential stored privately:", args.config)
        return
    client = load_client(args.config)
    if args.command == "whoami":
        data = client.request("/api/auth/me")
        user = data.get("data", data)
        user = user.get("user", user)
        print(json_text({k: user.get(k) for k in ("id", "username", "role", "isActivated")}), end="")
    elif args.command == "list":
        for ep in client.endpoints(args.prefix):
            print(json.dumps({k: ep.get(k) for k in ("id", "path", "type", "isPublished", "enabled", "accessControl", "updatedAt")}, ensure_ascii=False))
    elif args.command == "snapshot":
        endpoints = client.endpoints(args.prefix)
        target = args.out or DATA / "snapshots" / dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ.json")
        if target.exists(): raise ToolError("Snapshot already exists; choose a new output path.")
        private_write(target, json_text({"base_url": client.base, "prefix": args.prefix, "endpoints": endpoints}))
        print(f"Saved {len(endpoints)} endpoints privately to {target}")
    elif args.command == "pull":
        folder = args.dir or workspace(args.path)
        if folder.exists() and any(folder.iterdir()) and not args.overwrite:
            raise ToolError("Workspace already exists; use another directory or explicit --overwrite.")
        ep = client.resolve(args.path)
        save_baseline(folder, ep)
        if ep["type"] == "static": private_write(folder / "content.txt", ep["config"]["content"])
        else: private_write(folder / "config.json", json_text(ep["config"]))
        print("Downloaded:", folder)
    elif args.command in ("diff", "push"):
        push(client, args.path, args.dir or workspace(args.path), getattr(args, "apply", False))
    elif args.command == "create-static":
        path = canonical_path(args.path)
        if not args.public and not args.permission_group:
            raise ToolError("Specify --permission-group, or explicitly opt into --public.")
        if args.public and args.permission_group:
            raise ToolError("Choose public access or permission groups, not both.")
        if any(e["path"] == path for e in client.endpoints(path)):
            raise ToolError("Path already exists; use pull/push instead.")
        payload = {"path": path, "name": args.name or path.rsplit("/", 1)[-1], "type": "static", "config": {"content": args.file.read_text(), "contentType": args.content_type}, "accessControl": "public" if args.public else "authenticated", "requiredPermissionGroups": args.permission_group}
        if not args.apply:
            print("Preview: create unpublished static endpoint", path, "access:", payload["accessControl"])
        else:
            client.request("/api/endpoints", "POST", payload)
            ep = client.resolve(path)
            if ep["config"]["content"] != payload["config"]["content"] or ep["isPublished"]:
                raise ToolError("Created endpoint read-back is unexpected; inspect before publishing.")
            print("Created and verified as draft:", path)
    elif args.command in ("publish", "unpublish"):
        ep = client.resolve(args.path)
        desired = args.command == "publish"
        if ep["isPublished"] == desired:
            print("Already in the requested publication state.")
            return
        if not args.apply:
            print("Preview:", args.command, ep["path"])
            return
        saved = backup(ep)
        client.request(f"/api/endpoints/{urllib.parse.quote(ep['id'], safe='')}/{args.command}", "POST")
        if client.get(ep["id"])["isPublished"] != desired:
            raise ToolError("Publication read-back differs; inspect remote state.")
        print("Verified publication state. Backup:", saved)
    elif args.command == "restore":
        old = normalize(json.loads(args.backup.read_text()))
        now = client.get(old["id"])
        if old.get("ownerUserId") != now.get("ownerUserId") or old["path"] != now["path"]:
            raise ToolError("Backup owner/path differs; refusing cross-endpoint restoration.")
        payload = {k: old[k] for k in EDITABLE if k in old}
        show_diff(json_text({k: now.get(k) for k in payload}), json_text(payload))
        if not args.apply:
            print("Preview only. Restore leaves publication state unchanged.")
            return
        saved = backup(now)
        if digest(client.get(now["id"])) != digest(now): raise ToolError("Remote changed during restore preflight.")
        client.patch(now, payload)
        result = client.get(now["id"])
        if any(result.get(k) != v for k, v in payload.items()): raise ToolError("Restore read-back differs.")
        print("Restored and verified. Pre-restore backup:", saved)
    elif args.command == "download":
        key = args.access_key_file.read_text().strip()
        if not key.startswith("ep-") or any(c in key for c in "\r\n"):
            raise ToolError("Expected a separate ep-* endpoint access key file.")
        path = "/e/" + urllib.parse.quote(args.username, safe="") + canonical_path(args.path)
        body = client.request(path, access_key=key)
        private_write(args.out, body)
        print("Downloaded", len(body), "bytes; sha256", hashlib.sha256(body).hexdigest(), "to", args.out)


if __name__ == "__main__":
    try:
        main()
    except (ToolError, OSError, ValueError, KeyError) as error:
        print("epctl:", redact(error), file=sys.stderr)
        sys.exit(1)
