import base64
import unittest

from subscription_guard import inspect, summarize
from epctl import ToolError


class SubscriptionTests(unittest.TestCase):
    def nodes(self, count):
        return ("proxies:\n" + "".join(f"  - {{name: node-{i}, type: trojan, server: example.com, port: 443}}\n" for i in range(count))).encode()

    def test_rejects_successful_http_response_containing_only_bootstrap_nodes(self):
        raw = "STATUS=info\nREMARKS=airport\ntrojan://secret@example.com:443#PRO%20%7C%20%E8%AE%A2%E9%98%85%E4%B8%93%E7%94%A8%E8%8A%82%E7%82%B9AN%20%7C%200%E5%80%8D\ntrojan://secret@example.com:443#V0-test\n".encode()
        report = inspect(base64.b64encode(raw))
        self.assertEqual(report["node_count"], 2)
        self.assertTrue(report["bootstrap_only"])
        self.assertFalse(report["accepted"])
        self.assertNotIn("secret", str(report))

    def test_rejects_html_errors_and_empty_exports(self):
        for raw in [b"<html>challenge</html>", b'{"error":"forbidden"}', b"garbage", b"proxies: []"]:
            with self.subTest(raw=raw):
                try: self.assertFalse(inspect(raw)["accepted"])
                except ToolError: pass

    def test_rejects_large_drop_without_mutating_baseline(self):
        baseline = self.nodes(80)
        report = inspect(self.nodes(8), baseline=baseline)
        self.assertFalse(report["accepted"])
        self.assertEqual(summarize(baseline)["node_count"], 80)

    def test_accepts_complete_export_but_does_not_claim_connectivity(self):
        report = inspect(self.nodes(75), baseline=self.nodes(80), min_nodes=20)
        self.assertTrue(report["accepted"])
        self.assertNotIn("reachable", report)


if __name__ == "__main__": unittest.main()
