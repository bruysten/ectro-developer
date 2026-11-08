"""HTTP contract for studio permissions, source access, CSRF and template entries."""
import base64, http.cookiejar, json, os, pathlib, signal, socket, subprocess, tempfile, time, urllib.error, urllib.parse, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
checks=0
def check(value,message):
    global checks
    assert value,message
    checks+=1
class Client:
    def __init__(self,base):
        self.base=base;self.token='';self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def call(self,action,data=None,csrf=True,**params):
        headers={'Content-Type':'application/json'}
        if csrf:headers['X-CSRF-Token']=self.token
        req=urllib.request.Request(self.base+'/api/?'+urllib.parse.urlencode({'action':action,**params}),data=None if data is None else json.dumps(data).encode(),headers=headers)
        try:r=self.opener.open(req,timeout=20)
        except urllib.error.HTTPError as e:r=e
        result=json.loads(r.read())
        if 'csrf' in result:self.token=result['csrf']
        return r.code,result
    def ok(self,action,data=None,**params):
        code,result=self.call(action,data,**params);check(code<300,f'{action}: {code} {result}');return result
with tempfile.TemporaryDirectory(prefix='ectro-studio-http-') as private:
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    env=dict(os.environ,APP_ENV='development',APP_KEY=base64.b64encode(os.urandom(32)).decode(),APP_DATA_DIR=private,APP_SETUP_TOKEN='isolated-studio-setup-token-2026-12345')
    server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t','public','scripts/router.php'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
    try:
        admin=Client(f'http://127.0.0.1:{port}')
        for _ in range(60):
            try:admin.ok('bootstrap');break
            except urllib.error.URLError:time.sleep(.1)
        admin.ok('setup',{'token':env['APP_SETUP_TOKEN'],'name':'Admin','email':'admin@example.test','password':'secure-test-password'})
        admin.ok('login',{'portal':'admin','email':'admin@example.test','password':'secure-test-password'})
        gid=admin.ok('admin.group.save',{'name':'Studio group','features':{}})['id']
        learners=[]
        for name in ['alice','bob']:
            admin.ok('admin.user.save',{'name':name,'email':name+'@example.test','role':'user','password':'secure-test-password','must_change_password':False,'groups':[gid] if name=='alice' else []})
            client=Client(admin.base);client.ok('bootstrap');client.ok('login',{'portal':'user','email':name+'@example.test','password':'secure-test-password'});learners.append(client)
        alice,bob=learners;pid=alice.ok('project.create',{'name':'Studio','template':'web'})['id']
        conn_data={'name':'Synthetic group model','provider':'openai','model':'synthetic','capability':'chat','key':'synthetic-not-a-real-key','shared':True}
        check(alice.call('admin.ai.connection.save',conn_data)[0]==403,'Learners cannot manage provided connections')
        check(admin.call('admin.ai.connection.save',conn_data,csrf=False)[0]==403,'Admin connection mutation requires CSRF')
        check(admin.call('admin.ai.connection.save')[0]==405,'Admin connection mutation rejects GET')
        connection=admin.ok('admin.ai.connection.save',conn_data)['connection']
        check('secret' not in connection and 'key' not in connection,'Saved connection never returns credentials')
        grant={'group':gid,'connection':connection['id'],'version':0,'max_calls':30,'max_tokens':10000,'max_output_tokens':128}
        check(alice.call('admin.ai.group.save',grant)[0]==403,'Learners cannot grant shared group keys')
        check(admin.call('admin.ai.group.save',grant,csrf=False)[0]==403,'Group grants require CSRF')
        group_grant=admin.ok('admin.ai.group.save',grant)['grant']
        check(admin.call('admin.ai.group.save',grant)[0]==409,'Stale group grant edits conflict')
        provided=alice.ok('lab.info',project=pid)['connections']
        check(len(provided)==1 and provided[0]['group_name']=='Studio group' and not set(['secret','base_url','user_id','key']).intersection(provided[0]),'Learners receive safe group usage metadata')
        personal=bob.ok('project.create',{'name':'Ungrouped','template':'web'})['id']
        check(not bob.ok('lab.info',project=personal)['connections'],'Ungrouped account never receives another group connection')
        check(any(g['group_id']==gid for g in admin.ok('admin.labs')['group_grants']),'Admin overview exposes editable group budget')
        admin.ok('admin.ai.group.save',{'group':gid,'connection':connection['id'],'version':group_grant['version'],'remove':True})
        check(not alice.ok('lab.info',project=pid)['connections'],'Group revocation immediately removes connection')
        admin.ok('admin.ai.connection.delete',{'id':connection['id'],'version':connection['version']})
        source={'type':'json','path':'values.json'}
        alice.ok('file.save',{'project':pid,'path':'values.json','content':'[{"category":"A","value":7},{"category":"B","value":3}]','version':0})
        content={'source':source,'view':{'kind':'bar','x':'category','y':'value','aggregate':'sum'},'actions':{}}
        obj=alice.ok('lab.save',{'project':pid,'kind':'visualization','name':'Overview','content':content})['object']
        request={'project':pid,'kind':'visualization','source':source}
        check(alice.ok('studio.source',request)['rows'][0]['value']==7,'Authorized JSON data source')
        check(alice.call('studio.source',request,csrf=False)[0]==403,'Source reads require CSRF for POST')
        check(alice.call('studio.source',project=pid,kind='visualization')[0]==405,'Read source cannot be invoked with GET')
        check(bob.call('studio.source',request)[0]==404,'Foreign project source hidden')
        check(bob.call('lab.object',id=obj['id'])[0]==404,'Foreign studio object hidden')
        check(alice.call('studio.source',{**request,'source':{'type':'json','path':'../config.local.php'}})[0]==404,'Traversal never reads outside project storage')
        check(alice.call('studio.source',{**request,'source':{'type':'mysql','table':'x;DROP TABLE users'}})[0]==422,'SQL identifier injection rejected before connection')
        group=next(g for g in admin.ok('admin.groups')['groups'] if g['id']==gid)
        admin.ok('admin.group.features.save',{'id':gid,'version':group['version'],'features':{'visualization_lab':False}})
        check(alice.call('studio.source',request)[0]==403,'Revoked group feature blocks existing source session')
        check(alice.call('lab.object',id=obj['id'])[0]==403,'Revoked feature blocks saved object')
        check(all(o['id']!=obj['id'] for o in alice.ok('lab.info',project=pid)['objects']),'Blocked objects omitted from metadata')
        group=next(g for g in admin.ok('admin.groups')['groups'] if g['id']==gid)
        admin.ok('admin.group.features.save',{'id':gid,'version':group['version'],'features':{}})
        alice.ok('studio.sources',{'project':pid,'kind':'visualization'})
        check(alice.call('lab.save',{**obj,'project':pid,'version':0})[0]==409,'Conflicting edits keep previous revision')
        template=admin.ok('admin.template.save',{'name':'Visualization only','language':'web','active':True,'version':0,'files':[],'labs':{'tools':['visualization'],'entry':'visualization','groups':[gid],'seeds':[{'kind':'visualization','name':'Start','content':content}]}})['id']
        seeded=alice.ok('project.create',{'name':'Seeded','template':template})['id']
        check(next(p for p in alice.ok('projects')['projects'] if p['id']==seeded)['lab_entry']=='visualization','New studio template entry survives project creation')
        check(alice.call('lab.save',{'project':seeded,'kind':'conversation','name':'Forbidden','content':{'messages':[]}})[0]==403,'Template tool restriction protects other labs')
        check(alice.call('studio.sources',{'project':seeded,'kind':'assistant'})[0]==403,'Source APIs respect project tool restrictions')
        persona_content={'name':'HTTP Persona','model':'jobs','goal':'Find a course','context':'Little time','fields':{'job':'Learn with project data'}}
        persona=alice.ok('studio.persona.save',{'project':pid,'content':persona_content})['persona']
        check(alice.call('studio.persona.save',{'project':pid,'content':persona_content},csrf=False)[0]==403,'Persona writes require CSRF')
        check(bob.call('studio.personas',{'project':pid})[0]==404,'Persona library is isolated by project access')
        check(alice.call('studio.personas',{'project':seeded})[0]==403,'Project tools restrict persona library')
        check(alice.ok('studio.personas',{'project':pid})['personas'][0]['id']==persona['id'],'Saved profile is listed')
        check(alice.call('studio.persona.save',{'project':pid,'id':persona['id'],'version':0,'content':persona_content})[0]==409,'Stale persona edits cannot overwrite current version')
        archived=alice.ok('studio.persona.archive',{'project':pid,'id':persona['id'],'version':1,'archived':True})['persona']
        check(archived['archived'] and archived['version']==2,'HTTP archive preserves profile and advances version')
        group=next(g for g in admin.ok('admin.groups')['groups'] if g['id']==gid)
        admin.ok('admin.group.features.save',{'id':gid,'version':group['version'],'features':{'journey_lab':False}})
        check(alice.call('studio.personas',{'project':pid})[0]==403,'Revocation blocks existing persona session')
        check(alice.call('studio.persona.archive',{'project':pid,'id':persona['id'],'version':2,'archived':False})[0]==403,'Revocation also protects persona mutations')
        print(f'{checks} studio HTTP, CSRF, source isolation, revocation and template checks passed.')
    finally:
        os.killpg(server.pid,signal.SIGTERM);server.wait(timeout=5)
