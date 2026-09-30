import copy
import unittest
from epctl import ToolError
from proxy_bundle import shadowrocket_daily, shadowrocket_config, shadowrocket_nodes
from test_proxy_bundle import fixture
from proxy_bundle import compile_clash


class DailyProfileTests(unittest.TestCase):
    def sample(self):
        m, s = fixture(); flat = compile_clash(m, s, {})
        flat['proxies'].append({'name':'maintenance','type':'trojan','server':'192.0.2.3','port':443,'password':'test'})
        flat['proxy-groups'].append({'name':'maintenance-group','type':'select','proxies':['maintenance']})
        p={'mode':'selective-direct','visible-groups':['daily','TW-only','ads'],'groups':[{'name':'daily','type':'select','proxies':['HK-auto']},{'name':'ads','type':'select','proxies':['REJECT','DIRECT']}],'group-options':{'HK-auto':{'interval':1800,'tolerance':100}},'dns':{'nameserver':['system'],'direct-nameserver':['system'],'nameserver-policy':{'+.claude.ai':['https://1.1.1.1/dns-query#TW-only']}},'rule-providers':{'ad':{'format':'text','behavior':'classical'},'services':{'format':'text','behavior':'classical'}},'rules':['IP-CIDR,192.168.0.0/16,DIRECT,no-resolve','DOMAIN-SUFFIX,claude.ai,TW-only','RULE-SET,ad,ads,no-resolve','RULE-SET,services,daily,no-resolve','MATCH,DIRECT']}
        rules={'ad':'DOMAIN-SUFFIX,claude.ai\nDOMAIN,ad.example','services':'DOMAIN,foreign.example\nIP-ASN,64496\nUSER-AGENT,Example*'}
        return flat,p,rules

    def test_priority_and_direct_final(self):
        flat,p,rules=self.sample();result=shadowrocket_daily(flat,p,rules)
        self.assertEqual(result['rules'][1],'DOMAIN-SUFFIX,claude.ai,TW-only')
        self.assertEqual(result['rules'][2],'DOMAIN-SUFFIX,claude.ai,ads,no-resolve')
        self.assertEqual(result['rules'][-1],'MATCH,DIRECT')
        self.assertEqual(flat['rules'][-1],'MATCH,manual')
        self.assertNotIn('rule-providers',result)

    def test_visible_order_and_hidden_helpers(self):
        flat,p,rules=self.sample();result=shadowrocket_daily(flat,p,rules)
        self.assertEqual([g['name'] for g in result['proxy-groups'] if not g['hidden']],p['visible-groups'])
        g=next(g for g in result['proxy-groups'] if g['name']=='HK-auto')
        self.assertEqual(g['interval'],1800);self.assertTrue(g['hidden'])
        self.assertNotIn('maintenance',{n['name'] for n in result['proxies']})
        self.assertNotIn('maintenance-group',{g['name'] for g in result['proxy-groups']})

    def test_renderer_and_no_mitm(self):
        flat,p,rules=self.sample();result=shadowrocket_daily(flat,p,rules)
        text=shadowrocket_config(result,daily=True)
        self.assertIn('dns-server = system',text)
        self.assertIn('private-ip-answer = true',text)
        self.assertIn('direct-dns-server = system',text)
        self.assertIn('IP-ASN,64496,daily,no-resolve',text)
        self.assertIn('USER-AGENT,Example*,daily\n',text)
        self.assertIn('ads = select,REJECT,DIRECT',text)
        self.assertNotIn('bypass-system',text)
        self.assertNotIn('[MITM]',text);self.assertNotIn('RULE-SET,',text)
        self.assertIn('FINAL,DIRECT',text)

    def test_relay_dependencies_preserved(self):
        flat,p,rules=self.sample();flat['proxies'][0]['dialer-proxy']='HK-auto'
        result=shadowrocket_daily(flat,p,rules)
        self.assertEqual(shadowrocket_nodes(result)['proxies'][0]['dialer-proxy'],'HK-auto')

    def test_final_and_bad_group_override_fail(self):
        flat,p,rules=self.sample();p['rules'][-1]='MATCH,daily'
        with self.assertRaises(ToolError):shadowrocket_daily(flat,p,rules)
        flat,p,rules=self.sample();p['group-options']['HK-auto']={'proxies':['DIRECT']}
        with self.assertRaises(ToolError):shadowrocket_daily(flat,p,rules)

if __name__=='__main__':unittest.main()
