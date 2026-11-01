"""Isolated project/lab authorization, validation, sharing and concurrency checks."""
import base64, concurrent.futures, http.cookiejar, json, os, pathlib, signal, socket, sqlite3, subprocess, tempfile, time, urllib.request, urllib.error, urllib.parse
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
        try:r=self.opener.open(req,timeout=30)
        except urllib.error.HTTPError as e:r=e
        value=json.loads(r.read())
        if 'csrf' in value:self.token=value['csrf']
        return r.code,value
    def ok(self,action,data=None,**params):
        status,value=self.call(action,data,**params);check(status<300,f'{action}: {status} {value}');return value
with tempfile.TemporaryDirectory(prefix='academy-labs-test-') as private:
    with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
    env=dict(os.environ,APP_ENV='development',APP_KEY=base64.b64encode(os.urandom(32)).decode(),APP_DATA_DIR=private,APP_SETUP_TOKEN='isolated-learning-labs-setup-2026-12345',PHP_CLI_SERVER_WORKERS='4')
    server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t','public','scripts/router.php'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
    try:
        base=f'http://127.0.0.1:{port}';admin=Client(base)
        for i in range(60):
            try:admin.ok('bootstrap');break
            except urllib.error.URLError:time.sleep(.1)
        admin.ok('setup',{'token':env['APP_SETUP_TOKEN'],'name':'Admin','email':'admin@example.test','password':'secure-test-password'})
        admin.ok('login',{'portal':'admin','email':'admin@example.test','password':'secure-test-password'})
        gid=admin.ok('admin.group.save',{'name':'Laborgruppe','features':{}})['id'];other=admin.ok('admin.group.save',{'name':'Andere Gruppe','features':{}})['id']
        def make(name,role='user',group=gid):
            uid=admin.ok('admin.user.save',{'name':name,'email':name+'@example.test','role':role,'password':'secure-test-password','must_change_password':False,'groups':[group]})['id'];client=Client(base);client.ok('bootstrap');client.ok('login',{'portal':'user','email':name+'@example.test','password':'secure-test-password'});return uid,client
        uid,alice=make('alice');_,bob=make('bob',group=other);tid,teacher=make('teacher',role='teacher')
        pid=alice.ok('project.create',{'name':'Laborprojekt','template':'web'})['id']
        graph={'types':[],'relations':[],'nodes':[{'id':'a','label':'Mara','type':'Person','properties':{},'x':1,'y':2},{'id':'b','label':'Firma','type':'Firma','properties':{},'x':3,'y':4}],'edges':[{'id':'e','from':'a','to':'b','label':'arbeitet bei'}]}
        obj=alice.ok('lab.save',{'project':pid,'kind':'graph','name':'Testgraph','content':graph})['object'];oid=obj['id']
        # Run the same API through the optional server-PHP transport.
        runtime=admin.ok('admin.overview')['php_runner']
        if runtime['available']:
            admin.ok('admin.settings',{'features':{},'hosts':['localhost'],'php_execution_mode':'server'})
            alice.ok('file.save',{'project':pid,'path':'graph-test.php','content':'<?php echo json_encode(academy_call("graph.nodes", ["id" => "'+oid+'"]));','version':0})
            run=alice.ok('php.execute',{'project':pid,'path':'graph-test.php'})
            check(run['exit_code']==0 and json.loads(run['output'])[0]['label']=='Mara','Server PHP reaches scoped graph API')
            admin.ok('admin.settings',{'features':{},'hosts':['localhost'],'php_execution_mode':'browser'})
        check(bob.call('lab.info',project=pid)[0]==404,'Foreign project hidden')
        check(bob.call('lab.rpc',{'project':pid,'op':'get','args':{'id':oid}})[0]==404,'Foreign RPC forbidden')
        check(alice.call('lab.save',{'project':pid,'kind':'graph','name':'CSRF','content':graph},csrf=False)[0]==403,'Lab CSRF enforced')
        check(bob.call('db.info',project=pid)[0]==404,'Project SQL credentials require project access')
        check(bob.call('training.info',project=pid)[0]==404,'Training respects SQL project access')
        check(teacher.call('db.info',participant=uid,group=gid)[0]==200,'Teacher may view learner connection metadata')
        check(bob.call('db.info',participant=uid,group=gid)[0]==403,'Learner cannot borrow another connection')
        check(teacher.call('db.disconnect',{'participant':uid,'group':gid})[0]==403,'Borrowed personal credentials cannot be removed')
        check(alice.call('lab.validate',{'project':pid,'kind':'graph','content':{'nodes':[{'id':'x','label':'X','x':'<script>','y':0}],'edges':[]}})[0]==422,'Imported coordinates validated before rendering')
        teacher.ok('lab.info',project=pid)
        check(alice.call('lab.save',{**obj,'project':pid,'version':0})[0]==409,'Stale writes rejected')
        bad=json.loads(json.dumps(graph));bad['edges'][0]['to']='missing'
        check(alice.call('lab.save',{**obj,'project':pid,'content':bad})[0]==422,'Dangling edge rejected')
        bad=json.loads(json.dumps(graph));bad['types']=[{'name':'Person','fields':[{'name':'name','type':'text','required':True}]},{'name':'Firma','fields':[]}]
        check(alice.call('lab.save',{**obj,'project':pid,'content':bad})[0]==422,'Ontology requirements enforced')
        paths=alice.ok('lab.rpc',{'project':pid,'op':'graph.path','args':{'id':oid,'node':'a','target':'b'}})['value'];check(paths==['a','b'],'Directed graph path')
        check(alice.ok('lab.rpc',{'project':pid,'op':'graph.neighbors','args':{'id':oid,'node':'a','depth':1}})['value'][0]['id']=='b','Graph neighbors')
        alice.ok('lab.rpc',{'project':pid,'op':'graph.add_node','args':{'id':oid,'label':'Neue Person','type':'Person'}})
        check(len(alice.ok('lab.object',id=oid)['object']['content']['nodes'])==3,'Code mutation persists')
        net={'layers':[1,1],'weights':[[[1]]],'biases':[[0]],'samples':[{'input':[0],'output':[0]},{'input':[1],'output':[1]}]}
        no=alice.ok('lab.save',{'project':pid,'kind':'network','name':'Netz','content':net})['object']
        check(abs(alice.ok('lab.rpc',{'project':pid,'op':'network.predict','args':{'id':no['id'],'input':[0]}})['value'][0]-.5)<1e-9,'Network inference')
        check(alice.call('lab.save',{'project':pid,'kind':'network','name':'Falsch','content':{**net,'layers':[2,1]}})[0]==422,'Malformed matrix rejected')
        check(alice.call('lab.validate',{'project':pid,'kind':'network','content':{**net,'epochs':'<img src=x>'}})[0]==422,'Imported model metadata cannot inject markup')
        trained=alice.ok('lab.rpc',{'project':pid,'op':'network.train','args':{'id':no['id'],'epochs':500,'rate':.5}})['value']
        check(trained['content']['epochs']==500 and trained['version']==2,'Real code training saves model with version')
        check(alice.call('lab.rpc',{'project':pid,'op':'network.train','args':{'id':no['id'],'epochs':100000,'rate':.5}})[0]==422,'Code training budget enforced')
        alice.ok('presence.touch',{'route':'graph','project':pid,'object':oid})
        loc=teacher.ok('presence.open',{'user':uid,'group':gid})['context'];check(loc['project']==pid and loc['object']==oid,'Teacher opens same object')
        check(alice.call('presence.open',{'user':tid,'group':gid})[0]==404,'Learner cannot inspect others')
        check(bob.call('presence.open',{'user':uid,'group':other})[0]==404,'Cross-group presence blocked')
        check(alice.call('presence.touch',{'route':'https://evil.invalid'})[0]==422,'No arbitrary location URLs')
        alice.ok('presence.touch',{'route':'ai-lab','project':pid,'analysis':{'vectorView':'network3','vectorAxes':'0,1,2','vectorSelected':'query'}})
        vector_context=teacher.ok('presence.open',{'user':uid,'group':gid})['context']
        check(vector_context['analysis']['vectorView']=='network3' and vector_context['analysis']['vectorSelected']=='query','Teacher follows structured vector view and axes')
        check(alice.call('lab.validate',{'project':pid,'kind':'rag','content':{'chunks':[],'queryVector':['<img src=x>']}})[0]==422,'Imported query vectors require finite numbers')
        # Keys here are synthetic non-credentials. No external API request is made.
        own=alice.ok('ai.connection.save',{'name':'Persönlich','provider':'openai','model':'test-model','capability':'chat','key':'synthetic-test-value','shared':False})['connection']
        check('secret' not in own and 'key' not in own,'No secret in connection response')
        check(not teacher.ok('ai.connections')['connections'],'Teacher cannot read personal keys')
        check(alice.call('ai.connection.save',{'name':'Illegal','provider':'openai','model':'test','key':'synthetic-test-value','shared':True})[0]==403,'Learners cannot publish credentials')
        check(alice.call('ai.connection.save',{'name':'Nicht erlaubt','provider':'daimon','model':'test','key':'synthetic-test-value'})[0]==403,'Learners cannot configure Daimon even via direct API')
        check(admin.call('ai.connection.save',{'name':'SSRF','provider':'daimon','base_url':'https://127.0.0.1/v1','model':'test','key':'synthetic-test-value'})[0]==422,'Local addresses rejected')
        check(admin.call('ai.connection.save',{'name':'SSRF','provider':'daimon','base_url':'https://user@knowledge-core-001.daimon.intelligence-gmbh.com/vllm/x/v1','model':'test','key':'synthetic-test-value'})[0]==422,'URL userinfo rejected')
        check(teacher.call('ai.connection.save',{'name':'Nicht erlaubt','provider':'daimon','base_url':'https://nemotron-core-001.daimon.intelligence-gmbh.com/vllm/nemotron-nano/v1','model':'test','key':'synthetic-test-value','shared':True})[0]==403,'Only admin may configure Daimon')
        shared=admin.ok('ai.connection.save',{'name':'Kursmodell','provider':'daimon','base_url':'https://nemotron-core-001.daimon.intelligence-gmbh.com/vllm/nemotron-nano/v1','model':'test','key':'synthetic-teacher-test','shared':True})['connection']
        check(teacher.call('ai.grant',{'project':pid,'connection':shared['id'],'max_calls':10})[0]==403,'Only admin may grant Daimon')
        admin.ok('ai.grant',{'project':pid,'connection':shared['id'],'max_calls':10})
        check(shared['id'] in [c['id'] for c in alice.ok('lab.info',project=pid)['connections']],'Explicit project grant visible')
        check('secret' not in json.dumps(alice.ok('lab.info',project=pid)['connections']),'Project never receives secrets')
        exposed=next(c for c in alice.ok('lab.info',project=pid)['connections'] if c['id']==shared['id'])
        check('base_url' not in exposed,'Daimon server configuration stays admin-only')
        alice.ok('project.share',{'id':pid,'group':gid})
        check(teacher.ok('lab.info',project=pid)['project']['group_id']==gid,'Sharing retains same graph project')
        admin.ok('ai.grant',{'project':pid,'connection':shared['id'],'max_calls':0})
        check(shared['id'] not in [c['id'] for c in alice.ok('lab.info',project=pid)['connections']],'Revocation immediate')
        template=admin.ok('admin.template.save',{'name':'Graphstart','language':'web','active':True,'version':0,'files':[],'labs':{'tools':['graph'],'entry':'graph','groups':[gid],'seeds':[{'kind':'graph','name':'Startgraph','content':graph}]}})['id']
        check(template not in [t['id'] for t in bob.ok('templates')['templates']],'Template scoped to group')
        seeded=alice.ok('project.create',{'name':'Mit Startgraph','template':template})['id'];check(len(alice.ok('lab.info',project=seeded)['objects'])==1,'Template seed copied atomically')
        check(alice.call('lab.save',{'project':seeded,'kind':'network','name':'Nicht erlaubt','content':net})[0]==403,'Project tool restriction enforced')
        # Both administrative screens share one versioned group permission set.
        def group(g):return next(x for x in admin.ok('admin.groups')['groups'] if x['id']==g)
        original=group(gid);other_before=group(other)
        flags={k:False for k in ['data_lab','graph','ai','rag','neural']}
        for actor in [alice,teacher]:
            check(actor.call('admin.group.features.save',{'id':gid,'version':original['version'],'features':flags})[0]==403,'Group permissions are admin-only')
        for invalid in [{'graph':'false'},{'invented':False}]:
            check(admin.call('admin.group.features.save',{'id':gid,'version':original['version'],'features':invalid})[0]==422,'Strict group permission validation')
        check(admin.call('admin.group.features.save',{'id':gid,'version':original['version'],'features':flags},csrf=False)[0]==403,'Permission mutation requires CSRF')
        updated=admin.ok('admin.group.features.save',{'id':gid,'version':original['version'],'features':flags})['group']
        after=group(gid)
        check(after['name']==original['name'] and after['user_ids']==original['user_ids'],'Rights-only save preserves members and group details')
        check(group(other)==other_before,'Rights-only save does not change another group')
        check(updated['version']==original['version']+1,'Group permissions share a revision')
        check(admin.call('admin.group.save',{'id':gid,'version':original['version'],'name':original['name'],'users':[],'features':{}})[0]==409,'Stale modal cannot overwrite rights or membership')
        check(admin.call('admin.group.features.save',{'id':gid,'features':{}})[0]==409,'Missing revision cannot bypass conflict protection')
        for action,params in [('lab.object',{'id':oid}),('lab.object',{'id':no['id']}),('ai.connections',{})]:
            check(alice.call(action,**params)[0]==403,'Group deny enforced on lab and AI APIs')
        restored=admin.ok('admin.group.features.save',{'id':gid,'version':after['version'],'features':json.loads(original['features'])})['group']
        stale=group(gid)
        make('revision-member')
        check(admin.call('admin.group.save',{'id':gid,'version':stale['version'],'name':stale['name'],'users':stale['user_ids']})[0]==409,'Membership change invalidates an open group modal')
        # Independent admin sessions racing with the same revision: exactly one wins.
        race=group(gid);admin2=Client(base);admin2.ok('bootstrap');admin2.ok('login',{'portal':'admin','email':'admin@example.test','password':'secure-test-password'})
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(lambda c:c.call('admin.group.features.save',{'id':gid,'version':race['version'],'features':{}})[0],[admin,admin2]))
        check(sorted(results)==[200,409],'Concurrent permission updates cannot silently overwrite')
        # Different authenticated browser sessions, not repeated requests under one session lock.
        clients=[]
        for i in range(25):
            with sqlite3.connect(pathlib.Path(private)/'app.sqlite') as db:db.execute('DELETE FROM rate_limits')
            _,c=make('load'+str(i));clients.append(c)
        def visit(c):
            result=c.ok('lab.info',project=pid)
            obj=c.ok('lab.object',id=oid)['object']
            check(obj['kind']=='graph','Concurrent session loads same graph')
            return len(result['objects'])
        start=time.monotonic()
        with concurrent.futures.ThreadPoolExecutor(max_workers=25) as pool:values=list(pool.map(visit,clients))
        check(all(v==2 for v in values),'25 members read shared objects concurrently')
        print(f'{checks} lab/API/security checks passed; 25-session read batch: {time.monotonic()-start:.3f}s.')
    finally:
        os.killpg(server.pid,signal.SIGTERM);server.wait(timeout=10)
