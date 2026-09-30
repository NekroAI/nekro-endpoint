import copy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import epctl
from epctl import ToolError
from proxy_sync import publish_bundle, locked
from proxy_bundle import dump


def endpoint(path, content='old'):
    return {'id': path, 'path': path, 'type': 'static', 'config': {'content': content, 'contentType': 'text/plain'}, 'accessControl': 'authenticated', 'requiredPermissionGroups': ['group'], 'isPublished': True, 'enabled': True}


class FakeClient:
    def __init__(self):
        self.data={x['path']:x for x in [endpoint('/proxy/source/master'),endpoint('/proxy/client/a'),endpoint('/proxy/client/b')]}
        self.calls=[];self.fail=None
    def get(self,identifier):return copy.deepcopy(self.data[identifier])
    def resolve(self,path):return self.get(path)
    def endpoints(self,path):return [self.get(k) for k in self.data if k==path]
    def patch(self,current,payload):
        key=current['id'];self.calls.append(key)
        if self.fail==key:self.fail=None;raise ToolError('simulated write error')
        self.data[key].update(copy.deepcopy(payload))
    def request(self,path,method,payload=None):
        if path=='/api/endpoints':
            x=endpoint(payload['path']);x.update(copy.deepcopy(payload));x['isPublished']=False;self.data[x['path']]=x
        else:
            action=path.rsplit('/',1)[-1];key=path[len('/api/endpoints/'):].rsplit('/',1)[0];self.data[key]['isPublished']=action=='publish'


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.folder=Path(self.temp.name);self.client=FakeClient()
        self.initial={k:self.client.get(k) for k in self.client.data if k!='/proxy/source/master'}
        self.master=epctl.digest(self.client.resolve('/proxy/source/master'))
        self.backup=patch('epctl.backup',return_value=Path('/private/backup'));self.backup.start()
    def tearDown(self):self.backup.stop();self.temp.cleanup()
    def publish(self,contents):publish_bundle(self.client,contents,self.initial,'/proxy/source/master',self.master,['group'],self.folder)
    def test_noop_skips_writes(self):
        self.publish({'/proxy/client/a':'old'});self.assertEqual(self.client.calls,[])
    def test_success_readback(self):
        self.publish({'/proxy/client/a':'new'});self.assertEqual(self.client.resolve('/proxy/client/a')['config']['content'],'new')
    def test_partial_failure_restores_first_output(self):
        self.client.fail='/proxy/client/b'
        with self.assertRaises(ToolError):self.publish({'/proxy/client/a':'new','/proxy/client/b':'new'})
        self.assertEqual(self.client.resolve('/proxy/client/a')['config']['content'],'old')
    def test_preflight_detects_output_drift(self):
        self.client.data['/proxy/client/a']['config']['content']='human edit'
        with self.assertRaises(ToolError):self.publish({'/proxy/client/a':'new'})
        self.assertEqual(self.client.calls,[])
    def test_preflight_detects_master_drift(self):
        self.client.data['/proxy/source/master']['config']['content']='new rules'
        with self.assertRaises(ToolError):self.publish({'/proxy/client/a':'new'})
        self.assertEqual(self.client.calls,[])
    def test_create_is_protected_and_published(self):
        self.publish({'/proxy/client/new':'new'})
        e=self.client.resolve('/proxy/client/new');self.assertEqual(e['accessControl'],'authenticated');self.assertTrue(e['isPublished'])
    def test_mutual_exclusion(self):
        with locked(self.folder/'lock'):
            with self.assertRaises(ToolError):
                with locked(self.folder/'lock'):pass
    def test_guard_reads_quoted_canonical_yaml(self):
        from subscription_guard import inspect
        raw=dump({"proxies":[{"name":"香港", "type":"trojan", "server":"example.com", "port":443}]}).encode()
        self.assertTrue(inspect(raw)["accepted"])

    def test_mapping_order_does_not_republish_same_nodes(self):
        self.assertEqual(dump({"name":"x", "port":443}),dump({"port":443, "name":"x"}))

    def test_hex_looking_like_exponent_is_quoted(self):
        self.assertIn('"short-id": "12e34567"',dump({'short-id':'12e34567'}))

if __name__=='__main__':unittest.main()
