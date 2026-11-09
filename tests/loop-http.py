"""Isolated HTTP contract for the Chatbot Lab extension; synthetic providers only."""
import base64,http.cookiejar,json,os,socket,subprocess,tempfile,time,urllib.error,urllib.parse,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='ectro-loop-ui-') as private:
    env={**os.environ,'APP_DATA_DIR':private,'APP_ENV':'development','APP_KEY':base64.b64encode(os.urandom(32)).decode(),'ECTRO_LOOP_UI_TEST':'1'}
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    base=f'http://127.0.0.1:{port}'
    with open(Path(private)/'server.log','w') as log:
        server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t','public','tests/loop-ui-router.php'],cwd=root,env=env,stdout=log,stderr=log)
        try:
            client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()));csrf=''
            def call(action,data=None,expected=200,token=None,**params):
                global csrf
                headers={'Content-Type':'application/json','X-CSRF-Token':csrf if token is None else token,'X-Workspace-Portal':'frontend'}
                req=urllib.request.Request(base+'/api/?'+urllib.parse.urlencode({'action':action,**params}),data=None if data is None else json.dumps(data).encode(),headers=headers)
                try:response=client.open(req,timeout=5)
                except urllib.error.HTTPError as e:response=e
                body=json.load(response);assert response.code==expected,(action,response.code,body)
                if body.get('csrf'):csrf=body['csrf']
                return body
            for _ in range(80):
                try:call('bootstrap');break
                except urllib.error.URLError:time.sleep(.03)
            # Setup is seeded through the real bootstrap schema; no production state is touched.
            seed=r'''require 'app/bootstrap.php';$uid=id();query('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',[$uid,'Loop HTTP','http@loop.example.test',password_hash('synthetic-loop-password',PASSWORD_DEFAULT),'user',now()]);$pid=id();query('INSERT INTO projects(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)',[$pid,$uid,'Loop HTTP',now(),now()]);echo $pid;'''
            project=subprocess.run(['php','-r',seed],cwd=root,env=env,check=True,capture_output=True,text=True).stdout
            call('login',{'email':'http@loop.example.test','password':'synthetic-loop-password','portal':'user'})
            connection=call('ai.connection.save',{'name':'Synthetisches Testmodell','provider':'openai','model':'test-synthetic','key':'fake-only-not-real','capability':'chat','shared':False})['connection']['id']
            config={'input':'Start','connection':connection,'rounds':2,'agents':[{'id':'a','name':'A','prompt':'Bearbeite den Text.','connection':''},{'id':'b','name':'B','prompt':'Verbessere den Text.','connection':''}]}
            obj=call('lab.save',{'project':project,'kind':'conversation','name':'Loop','content':{'assistant':'','assistantVersion':0,'connection':connection,'messages':[],'loop':config}})['object']
            req=lambda:os.urandom(16).hex()
            call('studio.loop.list',{'id':obj['id']},expected=403,token='wrong')
            call('studio.loop.list',None,expected=405,id=obj['id'])
            run=call('studio.loop.start',{'id':obj['id'],'version':obj['version'],'request':req()})['run']
            for index in range(4):
                request={'run':run['id'],'version':run['version'],'request':req()}
                out=call('studio.loop.step',request)['run'];assert len(out['runtime']['results'])==index+1
                assert call('studio.loop.step',request)['run']==out
                run=out
            assert run['runtime']['status']=='done'
            unchanged=call('studio.loop.status',{'run':run['id'],'version':run['version']});assert unchanged['unchanged']
            assert call('lab.object',id=obj['id'])['object']['content']['messages']==[]
            print('Loop HTTP verified: real sessions/CSRF, wrong methods, saved config, two-round chaining, replay and status polling. Synthetic provider only.')
        finally:server.terminate();server.wait(timeout=5)
