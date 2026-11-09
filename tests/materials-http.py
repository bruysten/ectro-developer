"""Real sessions, multipart uploads and protected downloads in a disposable Academy."""
import base64,http.cookiejar,json,os,socket,subprocess,tempfile,time,urllib.error,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='ectro-materials-http-') as private:
    env={**os.environ,'APP_DATA_DIR':private,'APP_ENV':'development','APP_KEY':base64.b64encode(os.urandom(32)).decode()}
    seed=r'''require 'app/bootstrap.php';require 'app/templates.php';db();$ids=[];foreach(['admin','user','other'] as $role){$id=id();$ids[$role]=$id;query('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',[$id,'Materials HTTP',$role.'@materials.example.test',password_hash('synthetic-test-password',PASSWORD_DEFAULT),$role==='admin'?'admin':'user',now()]);}foreach(['first','second'] as $key){$id=id();$ids[$key]=$id;query('INSERT INTO groups(id,name,created_at) VALUES(?,?,?)',[$id,$key,now()]);query('INSERT INTO group_members VALUES(?,?)',[$id,$ids['user']]);}echo json_encode($ids);'''
    ids=json.loads(subprocess.check_output(['php','-r',seed],cwd=root,env=env))
    with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
    base=f'http://127.0.0.1:{port}'
    class Client:
        def __init__(self,role):self.portal='admin' if role=='admin' else 'frontend';self.csrf='';self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()));self.role=role
        def raw(self,path,data=None,headers=None):
            req=urllib.request.Request(base+path,data=data,headers={'X-Workspace-Portal':self.portal,**(headers or {})})
            try:r=self.opener.open(req,timeout=10)
            except urllib.error.HTTPError as ex:r=ex
            return r.code,r.headers,r.read()
        def api(self,action,data=None,expected=200,csrf=None):
            status,headers,raw=self.raw('/api/?action='+action,None if data is None else json.dumps(data).encode(),{'Content-Type':'application/json','X-CSRF-Token':self.csrf if csrf is None else csrf});assert status==expected,(action,status,raw);return json.loads(raw)
        def login(self):
            self.csrf=self.api('bootstrap')['csrf'];self.csrf=self.api('login',{'email':self.role+'@materials.example.test','password':'synthetic-test-password','portal':'admin' if self.role=='admin' else 'user'})['csrf']
    with open(Path(private)/'server.log','w') as log:
        server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t','public','scripts/router.php'],cwd=root,env=env,stdout=log,stderr=log)
        try:
            admin=Client('admin');user=Client('user');other=Client('other')
            for _ in range(100):
                try:
                    if admin.raw('/api/?action=bootstrap')[0]==200:break
                except urllib.error.URLError:time.sleep(.03)
            for c in [admin,user,other]:c.login()
            value={'title':'Geschützte Unterlage','description':'Nur für eine Gruppe','category':'Kurs','kind':'link','url':'https://example.org/material','enabled':True,'groups':[ids['first']]}
            user.api('admin.material.save',value,403);admin.api('admin.material.save',value,403,csrf='wrong');user.api('materials',{},405);admin.api('admin.material.save',expected=405)
            link=admin.api('admin.material.save',value)['material'];assert len(user.api('materials')['materials'])==1 and not other.api('materials')['materials']
            draft=admin.api('admin.material.save',{**value,'id':link['id'],'version':link['version'],'enabled':False})['material'];assert not user.api('materials')['materials']
            publish={'id':draft['id'],'version':draft['version']}
            user.api('admin.material.publish',publish,403);admin.api('admin.material.publish',publish,403,csrf='wrong');admin.api('admin.material.publish',expected=405)
            link=admin.api('admin.material.publish',publish)['material'];assert link['enabled'] and [g['id'] for g in link['groups']]==[ids['first']]
            assert len(user.api('materials')['materials'])==1 and not other.api('materials')['materials'];admin.api('admin.material.publish',publish,409)
            boundary='MaterialBoundarySynthetic';payload=bytearray();fields={**value,'kind':'document','url':'','enabled':'true','groups':json.dumps([ids['first']])}
            for key,val in fields.items():payload.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{val}\r\n'.encode())
            content=b'%PDF-synthetic-material-test';payload.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="Kurs.pdf"\r\nContent-Type: application/pdf\r\n\r\n'.encode()+content+f'\r\n--{boundary}--\r\n'.encode())
            headers={'Content-Type':'multipart/form-data; boundary='+boundary,'X-CSRF-Token':admin.csrf}
            code,_,raw=admin.raw('/api/?action=admin.material.upload',bytes(payload),headers);assert code==200,(code,raw);doc=json.loads(raw)['material'];url='/material-file.php?id='+doc['id']
            code,h,raw=user.raw(url);assert code==200 and raw==content and h['Content-Type']=='application/octet-stream' and 'attachment;' in h['Content-Disposition'] and 'no-store' in h['Cache-Control']
            assert other.raw(url)[0]==404;assert Client('anonymous').raw(url)[0]==401
            grant=admin.api('admin.material.grant',{'id':doc['id'],'version':doc['version'],'group':ids['first'],'enabled':False})['material'];assert user.raw(url)[0]==404
            admin.api('admin.material.save',{**fields,'id':doc['id'],'version':doc['version'],'enabled':True,'groups':[ids['first']]},409)
            grant=admin.api('admin.material.grant',{'id':grant['id'],'version':grant['version'],'group':ids['first'],'enabled':True})['material']
            # Existing membership in a second active group preserves login, but cannot grant the first group's material.
            close=r'''require 'app/bootstrap.php';saveGroupPeriods($argv[1],groupPeriodsInput(['access_end'=>'2000-01-01']));'''
            subprocess.run(['php','-r',close,ids['first']],cwd=root,env=env,check=True,capture_output=True)
            assert user.raw(url)[0]==404 and not user.api('materials')['materials']
            second=admin.api('admin.material.grant',{'id':grant['id'],'version':grant['version'],'group':ids['second'],'enabled':True})['material'];assert user.raw(url)[0]==200
            admin.api('admin.material.delete',{'id':doc['id'],'version':second['version']});assert user.raw(url)[0]==404
            print('Materials HTTP: real CSRF/method checks, multipart upload, active-group access, protected attachment headers, outsiders, expiry, immediate revocation and stale edits verified.')
        finally:server.terminate();server.wait(timeout=5)
