from pathlib import Path
import unittest

from epctl import ToolError
from refresh_native import prepare


class NativeRefreshTests(unittest.TestCase):
    def source(self):
        return {
            "tun": {"enable": True}, "mixed-port": 7890, "listeners": [{"port": 443}],
            "external-controller": "0.0.0.0:9090", "secret": "old-secret",
            "dns": {"enable": True, "listen": "0.0.0.0:53", "ipv6": True},
            "proxies": [{"name": "bootstrap", "type": "trojan"}],
            "proxy-groups": [{"name": "entry", "type": "select", "proxies": ["bootstrap"]}],
            "proxy-providers": {
                "main": {"type": "http", "url": "https://example.com/private", "proxy": "entry", "path": "/do-not-overwrite", "header": {"User-Agent": ["native-client/version"]}},
                "unrelated": {"type": "http", "url": "https://unrelated.example"},
            },
        }

    def test_only_runs_selected_provider_without_touching_system_or_other_listeners(self):
        source = self.source()
        result = prepare(source, "main", Path("/private/run"), 12345, "new-secret")
        for key in ["tun", "mixed-port", "listeners"]: self.assertNotIn(key, result)
        self.assertEqual(result["external-controller"], "127.0.0.1:12345")
        self.assertEqual(result["secret"], "new-secret")
        self.assertNotIn("listen", result["dns"])
        self.assertEqual(list(result["proxy-providers"]), ["main"])
        self.assertEqual(result["proxy-providers"]["main"]["path"], "/private/run/provider.yaml")
        self.assertEqual(result["proxy-providers"]["main"]["header"], source["proxy-providers"]["main"]["header"])
        self.assertEqual(source["proxy-providers"]["main"]["path"], "/do-not-overwrite")

    def test_rejects_bootstrap_dependency_on_downloaded_provider(self):
        source = self.source(); source["proxy-groups"][0]["use"] = ["main"]
        with self.assertRaises(ToolError): prepare(source, "main", Path("/private"), 12345, "secret")

    def test_requires_explicit_download_route_and_https(self):
        for change in [lambda p: p.pop("proxy"), lambda p: p.update(url="http://example.com")]:
            source = self.source(); change(source["proxy-providers"]["main"])
            with self.assertRaises(ToolError): prepare(source, "main", Path("/private"), 12345, "secret")


if __name__ == "__main__": unittest.main()
