import copy
import unittest
from proxy_bundle import compile_clash, nikki_config, shadowrocket_config, shadowrocket_nodes, validate_graph
from epctl import ToolError


def fixture():
    master = {'proxies': [{'name': 'TW', 'type': 'trojan', 'server': '192.0.2.1', 'port': 443, 'password': 'example', 'sni': 'tw.example'}], 'proxy-providers': {'a': {'x-source': 'airport', 'exclude-filter': 'V0|notice'}}, 'proxy-groups': [{'name': 'HK-auto', 'type': 'url-test', 'use': ['a'], 'filter': 'HK'}, {'name': 'manual', 'type': 'select', 'proxies': ['HK-auto'], 'use': ['a']}, {'name': 'TW-only', 'type': 'select', 'proxies': ['TW', 'REJECT']}], 'rules': ['DOMAIN-SUFFIX,claude.ai,TW-only', 'MATCH,manual'], 'secret': 'do-not-export', 'tun': {'enable': True}, 'dns': {'nameserver': ['https://1.1.1.1/dns-query#manual'], 'proxy-server-nameserver': ['https://223.5.5.5/dns-query#DIRECT'], 'nameserver-policy': {'+.claude.ai': ['https://1.0.0.1/dns-query#TW-only']}}}
    node = {'name': 'HK good', 'type': 'vless', 'server': '192.0.2.2', 'port': 443, 'uuid': 'example', 'reality-opts': {'public-key': 'example', 'short-id': 'ab'}, 'client-fingerprint': 'chrome', 'flow': 'xtls-rprx-vision'}
    sources = {'airport': {'proxies': [node, dict(node, name='V0 HK'), dict(node, name='notice')]}}
    return master, sources


class BundleTests(unittest.TestCase):
    def test_flatten_filters_prefixes_and_keeps_defaults(self):
        m, s = fixture(); result = compile_clash(m, s, {})
        self.assertNotIn('proxy-providers', result)
        self.assertEqual(result['proxy-groups'][0]['proxies'], ['[airport] HK good'])
        self.assertEqual(result['proxy-groups'][1]['proxies'], ['HK-auto', '[airport] HK good'])
        self.assertEqual(result['proxy-groups'][2]['proxies'], ['TW', 'REJECT'])
        self.assertNotIn('secret', result); self.assertNotIn('tun', result)
        self.assertIn('proxy-providers', m)  # does not mutate the source

    def test_duplicate_node_names_across_sources_are_namespaced(self):
        m,s = fixture(); s['other'] = copy.deepcopy(s['airport']); m['proxy-providers']['b'] = {'x-source':'other', 'exclude-filter':'V0|notice'}
        r=compile_clash(m,s,{})
        self.assertEqual(len(r['proxies']),3)
        self.assertEqual(len({n['name'] for n in r['proxies']}),3)

    def test_empty_region_rejects(self):
        m,s=fixture();m['proxy-groups'][0]['filter']='JP'
        self.assertEqual(compile_clash(m,s,{})['proxy-groups'][0]['proxies'],['REJECT'])

    def test_no_resolve_and_rule_insertion_order(self):
        m,s=fixture();m['rule-providers']={'r':{'format':'text','behavior':'classical'}};m['rules'].insert(1,'RULE-SET,r,manual,no-resolve')
        r=compile_clash(m,s,{'r':'# test\nIP-CIDR,192.0.2.0/24\nDOMAIN,example.com\n'})['rules']
        self.assertEqual(r[1:3],['IP-CIDR,192.0.2.0/24,manual,no-resolve','DOMAIN,example.com,manual,no-resolve'])
        self.assertEqual(r[-1],'MATCH,manual')

    def test_domain_and_ipv6_provider(self):
        m,s=fixture();m['rule-providers']={'r':{'behavior':'domain','format':'yaml'},'ip':{'behavior':'ipcidr','format':'text'}};m['rules']=['RULE-SET,r,manual','RULE-SET,ip,TW-only','MATCH,manual']
        r=compile_clash(m,s,{'r':'payload: ["+.example.com", "exact.example"]','ip':'2001:db8::/32'})['rules']
        self.assertEqual(r[:3],['DOMAIN-SUFFIX,example.com,manual','DOMAIN,exact.example,manual','IP-CIDR6,2001:db8::/32,TW-only'])

    def test_unknown_provider_and_binary_rule_fail(self):
        m,s=fixture();m['proxy-groups'][0]['use']=['missing']
        with self.assertRaises(ToolError):compile_clash(m,s,{})
        m,s=fixture();m['rules']=['RULE-SET,r,manual'];m['rule-providers']={'r':{'format':'mrs'}}
        with self.assertRaises(ToolError):compile_clash(m,s,{'r':'binary'})

    def test_relay_cycle_rejected(self):
        m,s=fixture();r=compile_clash(m,s,{});r['proxies'][0]['dialer-proxy']='TW-only'
        with self.assertRaises(ToolError):validate_graph(r)

    def test_dangling_rule_target_rejected(self):
        m,s=fixture();m['rules']=['MATCH,missing']
        with self.assertRaises(ToolError):compile_clash(m,s,{})

    def test_shadowrocket_preserves_transport_and_chain(self):
        m,s=fixture();r=compile_clash(m,s,{});r['proxies'][0]['dialer-proxy']='manual'
        output=shadowrocket_nodes(r)['proxies']
        self.assertEqual(output[0]['dialer-proxy'],'manual');self.assertEqual(output[0]['servername'],'tw.example')
        self.assertEqual(output[1]['reality-opts'],r['proxies'][1]['reality-opts'])
        self.assertEqual(output[1]['flow'],'xtls-rprx-vision')

    def test_shadowrocket_wire_format_preserves_values_and_literal_marker(self):
        import json, yaml
        from proxy_bundle import dump_shadowrocket_nodes
        value={'proxies':[{'name':'台湾 \"test\"', 'type':'vless', 'server':'example.com', 'port':443, 'uuid':'example', 'reality-opts':{'short-id':'12e34567'}, 'dialer-proxy':'入口'}]}
        text=dump_shadowrocket_nodes(value)
        self.assertTrue(text.startswith('proxies:\n  - {'))
        self.assertEqual(yaml.safe_load(text),value)
        self.assertEqual(json.loads(text.splitlines()[1][4:]),value['proxies'][0])

    def test_shadowrocket_logical_rules_and_dns(self):
        m,s=fixture();r=compile_clash(m,s,{});r['rules'].insert(0,'AND,((NETWORK,udp),(DST-PORT,443)),REJECT')
        output=shadowrocket_config(r)
        self.assertIn('(PROTOCOL,UDP)',output);self.assertIn('FINAL,manual',output)
        self.assertIn('close-if-proxy-chain-missing = true',output)
        self.assertIn('*.claude.ai = server:https://1.0.0.1/dns-query#proxy=TW-only',output)

    def test_process_rules_require_explicit_platform_omission(self):
        m,s=fixture();r=compile_clash(m,s,{});r['rules'].insert(0,'PROCESS-NAME,example,DIRECT')
        with self.assertRaises(ToolError):shadowrocket_config(r)
        self.assertNotIn('PROCESS-NAME',shadowrocket_config(r,['PROCESS-NAME']))

    def test_domestic_rules_populate_dns_without_overwriting_exceptions(self):
        m,s=fixture();m['rule-providers']={'cn':{'format':'text','behavior':'classical'}}
        m['rules']=['DOMAIN-SUFFIX,claude.ai,TW-only','RULE-SET,cn,DIRECT','MATCH,manual']
        m['x-direct-dns-from-rule-providers']=['cn']
        m['dns']['direct-nameserver']=['https://223.5.5.5/dns-query#DIRECT']
        r=compile_clash(m,s,{'cn':'DOMAIN-SUFFIX,claude.ai\nDOMAIN-SUFFIX,leigod.com\nDOMAIN,exact.example\nDOMAIN-KEYWORD,keyword'})
        policy=r['dns']['nameserver-policy']
        self.assertEqual(policy['+.claude.ai'],m['dns']['nameserver-policy']['+.claude.ai'])
        self.assertEqual(policy['+.leigod.com'],m['dns']['direct-nameserver'])
        self.assertEqual(policy['exact.example'],m['dns']['direct-nameserver'])
        self.assertNotIn('keyword',policy)
        self.assertEqual(r['rules'][0],'DOMAIN-SUFFIX,claude.ai,TW-only')
        self.assertNotIn('x-direct-dns-from-rule-providers',r)

    def test_nikki_preserves_master_real_ip_exclusions(self):
        m,s=fixture();r=compile_clash(m,s,{})
        r['dns']['fake-ip-filter']=['+.nrd.nie.163.com','*.local']
        n=nikki_config(r,{'dns':{'fake-ip-filter':['*.local','+.nexus.example']}})
        self.assertEqual(n['dns']['fake-ip-filter'],['+.nrd.nie.163.com','*.local','+.nexus.example'])
        self.assertEqual(r['dns']['fake-ip-filter'],['+.nrd.nie.163.com','*.local'])

    def test_nikki_overlay_cannot_replace_business_groups(self):
        m,s=fixture();r=compile_clash(m,s,{})
        with self.assertRaises(ToolError):nikki_config(r,{'proxy-groups':[]})
        n=nikki_config(r,{'redir-port':17892,'dns':{'listen':'0.0.0.0:17874'}})
        self.assertEqual(n['proxy-groups'],r['proxy-groups']);self.assertNotIn('secret',n)
        self.assertEqual(n['external-controller'],'127.0.0.1:19090')

if __name__ == '__main__': unittest.main()
