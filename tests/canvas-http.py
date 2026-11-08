"""Independent sessions verify canvas CSRF, permissions, concurrent writes and recovery."""
import base64,concurrent.futures,http.cookiejar,json,os,pathlib,signal,socket,subprocess,tempfile,time,urllib.request,urllib.error,urllib.parse,uuid
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Client:
 def __init__(self,base):self.base=base;self.token='';self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def call(self,action,data=None,csrf=True,**params):
  headers={'Content-Type':'application/json'}
  if csrf:headers['X-CSRF-Token']=self.token
  req=urllib.request.Request(self.base+'/api/?'+urllib.parse.urlencode({'action':action,**params}),data=None if data is None else json.dumps(data).encode(),headers=headers)
  try:r=self.opener.open(req,timeout=20)
  except urllib.error.HTTPError as e:r=e
  value=json.loads(r.read());self.token=value.get('csrf',self.token);return r.code,value
 def ok(self,action,data=None,**params):
  status,value=self.call(action,data,**params);assert status==200,(action,status,value);return value
with tempfile.TemporaryDirectory(prefix='ectro-canvas-http-') as private:
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 env=dict(os.environ,APP_ENV='development',APP_KEY=base64.b64encode(os.urandom(32)).decode(),APP_DATA_DIR=private,APP_SETUP_TOKEN='isolated-canvas-setup-token-2026-123456',PHP_CLI_SERVER_WORKERS='4')
 server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t','public','scripts/router.php'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
 try:
  base=f'http://127.0.0.1:{port}';admin=Client(base)
  for _ in range(60):
   try:admin.ok('bootstrap');break
   except urllib.error.URLError:time.sleep(.1)
  admin.ok('setup',{'token':env['APP_SETUP_TOKEN'],'name':'Admin','email':'admin@example.test','password':'canvas-test-password'})
  admin.ok('login',{'portal':'admin','email':'admin@example.test','password':'canvas-test-password'})
  gid=admin.ok('admin.group.save',{'name':'Canvas Team','features':{}})['id'];clients=[]
  for name in ['alice','bob','outsider']:
   admin.ok('admin.user.save',{'name':name,'email':name+'@example.test','password':'canvas-test-password','role':'user','must_change_password':False,'groups':[gid] if name!='outsider' else []})
   c=Client(base);c.ok('bootstrap');c.ok('login',{'portal':'user','email':name+'@example.test','password':'canvas-test-password'});clients.append(c)
  a,b,out=clients;c=a.ok('canvas.create',{'kind':'business','name':'Private'})['canvas'];assert b.call('canvas.get',id=c['id'])[0]==404;assert admin.call('canvas.get',id=c['id'])[0]==404
  assert a.call('canvas.create',{'kind':'business','name':'No CSRF'},csrf=False)[0]==403;assert a.call('canvas.create')[0]==405;assert a.call('canvas.get',{'id':c['id']})[0]==405
  shared=a.ok('canvas.create',{'kind':'business','name':'Shared','group':gid})['canvas'];assert out.call('canvas.get',id=shared['id'])[0]==404
  def payload(text,card=None,version=0):return {'id':shared['id'],'op':'put','mutation':uuid.uuid4().hex,'card_id':card or uuid.uuid4().hex,'card_version':version,'card':{'section':'value','text':text}}
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda pair:pair[0].call('canvas.mutate',pair[1]),[(a,payload('Alice')),(b,payload('Bob'))]))
  assert [r[0] for r in results]==[200,200];latest=b.ok('canvas.get',id=shared['id'])['canvas'];assert len(latest['content']['cards'])==2
  card=latest['content']['cards'][0]
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:race=list(pool.map(lambda pair:pair[0].call('canvas.mutate',pair[1])[0],[(a,payload('A revision',card['id'],1)),(b,payload('B revision',card['id'],1))]))
  assert sorted(race)==[200,409],race
  p=payload('Lost response');first=a.ok('canvas.mutate',p)['canvas'];retry=a.ok('canvas.mutate',p)['canvas'];assert first['version']==retry['version'];assert len(retry['content']['cards'])==3
  moving=next(c for c in retry['content']['cards'] if c['id']==card['id'])
  other=next(c for c in retry['content']['cards'] if c['id']!=moving['id'])
  b.ok('canvas.mutate',payload('Independent concurrent note',other['id'],other['version']))
  move={'id':shared['id'],'op':'move','mutation':uuid.uuid4().hex,'card_id':moving['id'],'card_version':moving['version'],'section':'channels'}
  moved=a.ok('canvas.mutate',move)['canvas'];after=next(c for c in moved['content']['cards'] if c['id']==moving['id'])
  assert after['section']=='channels' and after['version']==moving['version']+1
  for key in ['id','text','evidence','color','status','priority','author']:assert after[key]==moving[key],key
  assert next(c for c in moved['content']['cards'] if c['id']==other['id'])['text']=='Independent concurrent note'
  assert a.ok('canvas.mutate',move)['canvas']['version']==moved['version'],'Move retries preserve the same mutation identity'
  assert b.call('canvas.mutate',{**move,'mutation':uuid.uuid4().hex})[0]==409,'Stale moves cannot overwrite card edits'
  assert a.call('canvas.mutate',{**move,'mutation':uuid.uuid4().hex,'card_version':after['version'],'section':'unknown'})[0]==422
  assert out.call('canvas.mutate',{**move,'mutation':uuid.uuid4().hex})[0]==404
  assert a.call('canvas.mutate',{**move,'mutation':uuid.uuid4().hex},csrf=False)[0]==403
  retry=moved
  trash={'id':shared['id'],'op':'trash','mutation':uuid.uuid4().hex,'version':retry['version']}
  assert b.call('canvas.mutate',trash)[0]==403
  trashed=a.ok('canvas.mutate',trash)['canvas'];assert trashed['deleted_at']
  assert a.call('canvas.get',id=shared['id'])[0]==404
  assert b.call('canvas.mutate',payload('Hidden trash edit'))[0]==404
  assert out.call('canvas.get',id=shared['id'],trash='1')[0]==404
  assert b.ok('canvas.get',id=shared['id'],trash='1')['canvas']['deleted_at']
  assert any(c['id']==shared['id'] and c['deleted_at'] for c in a.ok('canvas.list')['canvases'])
  restored=a.ok('canvas.mutate',{'id':shared['id'],'op':'restore','mutation':uuid.uuid4().hex,'version':trashed['version']})['canvas'];assert restored['content']==retry['content'] and not restored['deleted_at']
  assert a.call('canvas.purge',{'id':shared['id'],'version':restored['version']})[0]==409
  probe=a.ok('canvas.create',{'kind':'smart','name':'Purge test','group':gid})['canvas']
  probe=a.ok('canvas.mutate',{'id':probe['id'],'op':'trash','mutation':uuid.uuid4().hex,'version':probe['version']})['canvas']
  assert b.call('canvas.purge',{'id':probe['id'],'version':probe['version']})[0]==403
  assert a.call('canvas.purge',{'id':probe['id'],'version':0})[0]==409
  assert a.call('canvas.purge',{'id':probe['id'],'version':probe['version']},csrf=False)[0]==403
  a.ok('canvas.purge',{'id':probe['id'],'version':probe['version']})
  assert a.call('canvas.get',id=probe['id'],trash='1')[0]==404
  for kind in ['smart','swot','pestel']:
   assert a.ok('canvas.create',{'kind':kind,'name':kind})['canvas']['kind']==kind
  group=next(g for g in admin.ok('admin.groups')['groups'] if g['id']==gid);admin.ok('admin.group.features.save',{'id':gid,'version':group['version'],'features':{'canvas_lab':False}});assert a.call('canvas.get',id=shared['id'])[0]==403;assert b.call('canvas.mutate',payload('Revoked'))[0]==403
  print('Canvas HTTP verified: private isolation, group access, method/CSRF guards, independent-session merging, same-card race, idempotent retry and live revocation.')
 finally:os.killpg(server.pid,signal.SIGTERM);server.wait(timeout=10)
