import contextlib
import base64
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("epctl", Path(__file__).with_name("epctl.py"))
epctl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(epctl)


def endpoint():
    return {
        "id": "ep-one", "ownerUserId": "owner", "path": "/proxy/example", "name": "Example",
        "type": "static", "config": {"content": "old\n", "contentType": "text/yaml", "headers": {"Cache-Control": "no-store"}},
        "requiredPermissionGroups": ["group"], "accessControl": "authenticated", "enabled": True,
        "isPublished": True, "updatedAt": "2026-09-29T00:00:00Z",
    }


class MemoryClient:
    def __init__(self): self.state = endpoint(); self.writes = []
    def get(self, identifier): return copy.deepcopy(self.state)
    def patch(self, current, payload):
        self.writes.append(copy.deepcopy(payload)); self.state.update(payload)
        self.state["updatedAt"] = "2026-09-29T00:01:00Z"


class ToolTests(unittest.TestCase):
    def test_normalizes_both_management_response_formats(self):
        raw = endpoint(); raw["config"] = json.dumps(raw["config"])
        raw["requiredPermissionGroups"] = '["group"]'
        self.assertEqual(epctl.normalize(raw), endpoint())

    def test_rejects_path_traversal(self):
        for path in ["proxy/test", "/../test", "/a/./b", "/a//b", "/a?token=secret"]:
            with self.subTest(path=path), self.assertRaises(epctl.ToolError): epctl.canonical_path(path)

    def test_private_file_permissions_even_when_replacing_existing_file(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / "secret.json"; p.write_text("old"); p.chmod(0o644)
            epctl.private_write(p, "new")
            self.assertEqual(p.read_text(), "new")
            self.assertEqual(p.stat().st_mode & 0o777, 0o600)

    def test_redacts_urls_proxy_uris_inline_and_multiline_credentials(self):
        secrets = ["sec-" + "a" * 64, "ep-" + "b" * 32, "inline-pass", "line-pass", "uuid-value", "encoded-vmess", "url-path-token"]
        text = secrets[0] + " " + secrets[1] + '\npassword: line-pass\n{password: "inline-pass", uuid: uuid-value}\nvmess://encoded-vmess\nhttps://example.com/url-path-token?access_key=other\n'
        redacted = epctl.redact(text)
        for secret in secrets: self.assertNotIn(secret, redacted)

    def test_redacts_embedded_json_documents_during_restore(self):
        document = json.dumps({"config": {"content": 'proxies:\n - {password: "nested-secret"}\n', "code": 'const value = "code-secret";'}})
        result = epctl.redact(document)
        self.assertNotIn("nested-secret", result)
        self.assertNotIn("code-secret", result)

    def test_redacts_base64_subscription_documents(self):
        encoded = base64.b64encode(("trojan://private-password@example.com:443#private-node\n" * 2).encode()).decode()
        self.assertNotIn(encoded, epctl.redact(encoded))

    def make_workspace(self, folder, client):
        epctl.save_baseline(folder, client.state)
        epctl.private_write(folder / "content.txt", "new\n")

    def test_push_is_preview_only_without_apply(self):
        c = MemoryClient()
        with tempfile.TemporaryDirectory() as temp, contextlib.redirect_stdout(io.StringIO()):
            folder = Path(temp); self.make_workspace(folder, c)
            epctl.push(c, c.state["path"], folder)
        self.assertEqual(c.writes, [])

    def test_push_preserves_metadata_and_backs_up_before_writing(self):
        c = MemoryClient()
        with tempfile.TemporaryDirectory() as temp, contextlib.redirect_stdout(io.StringIO()):
            folder = Path(temp); self.make_workspace(folder, c)
            with patch.object(epctl, "backup", return_value=folder / "backup.json") as backup:
                epctl.push(c, c.state["path"], folder, apply=True)
                backup.assert_called_once()
            self.assertEqual(c.writes[0], {"config": {"content": "new\n", "contentType": "text/yaml", "headers": {"Cache-Control": "no-store"}}})
            self.assertTrue(c.state["isPublished"])
            self.assertEqual((folder / "baseline.sha256").read_text().strip(), epctl.digest(c.state))

    def test_remote_conflict_or_tampered_baseline_never_writes(self):
        for tamper in (False, True):
            with self.subTest(tamper=tamper), tempfile.TemporaryDirectory() as temp:
                c = MemoryClient(); folder = Path(temp); self.make_workspace(folder, c)
                if tamper:
                    p = folder / "endpoint.json"; d = json.loads(p.read_text()); d["name"] = "changed"; p.write_text(json.dumps(d))
                else: c.state["config"]["content"] = "changed by someone else"
                with self.assertRaises(epctl.ToolError): epctl.push(c, c.state["path"], folder, apply=True)
                self.assertEqual(c.writes, [])

    def test_second_preflight_detects_concurrent_change(self):
        c = MemoryClient()
        with tempfile.TemporaryDirectory() as temp, contextlib.redirect_stdout(io.StringIO()):
            folder = Path(temp); self.make_workspace(folder, c)
            changed = copy.deepcopy(c.state); changed["name"] = "concurrent"
            with patch.object(c, "get", side_effect=[c.state, changed]), patch.object(epctl, "backup", return_value=folder / "backup.json"):
                with self.assertRaises(epctl.ToolError): epctl.push(c, c.state["path"], folder, apply=True)
            self.assertEqual(c.writes, [])

    def test_base_url_rejects_secret_or_nonlocal_plain_http(self):
        for url in ["http://example.com", "https://u:p@example.com", "https://example.com?token=x", "https://example.com/api"]:
            with self.subTest(url=url), self.assertRaises(epctl.ToolError): epctl.Client(url, "token")


class RequestTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.requests = []
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                cls.requests.append((self.path, dict(self.headers)))
                if self.path == "/redirect":
                    self.send_response(302); self.send_header("Location", "/should-not-fetch"); self.end_headers(); return
                if self.path == "/error":
                    self.send_response(401); self.end_headers(); self.wfile.write(b'Bearer sensitive-remote-error'); return
                self.send_response(200); self.end_headers()
                self.wfile.write(b"published content" if self.path.startswith("/e/") else b'{"success": true}')
            def log_message(self, *args): pass
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True); cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self):
        self.requests.clear()
        self.client = epctl.Client(f"http://127.0.0.1:{self.server.server_port}", "management-secret")

    def test_separates_management_and_endpoint_access_credentials(self):
        self.client.request("/api/test")
        self.assertEqual(self.requests[-1][1].get("Authorization"), "Bearer management-secret")
        self.assertEqual(self.requests[-1][1].get("User-Agent"), epctl.USER_AGENT)
        self.assertEqual(self.client.request("/e/alice/test", access_key="ep-access"), b"published content")
        headers = self.requests[-1][1]
        self.assertEqual(headers.get("X-Access-Key"), "ep-access")
        self.assertNotIn("Authorization", headers)

    def test_does_not_follow_redirect_or_print_remote_auth_error(self):
        with self.assertRaises(epctl.ToolError): self.client.request("/redirect")
        self.assertEqual([p for p, _ in self.requests], ["/redirect"])
        with self.assertRaises(epctl.ToolError) as raised: self.client.request("/error")
        self.assertNotIn("sensitive-remote-error", str(raised.exception))


if __name__ == "__main__": unittest.main()
