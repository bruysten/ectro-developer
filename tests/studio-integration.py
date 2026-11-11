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
        project_grant={'project':pid,'connection':connection['id'],'max_calls':5}
        check(alice.call('ai.grant',project_grant)[0]==403,'Learners cannot grant provided project connections')
        check(admin.call('ai.grant',project_grant,csrf=False)[0]==403,'Project grants require CSRF')
        check(admin.call('ai.grant')[0]==405,'Project grants reject GET')
        check(admin.call('ai.grant',{**project_grant,'project':'f'*32})[0]==404,'Project grants validate destination project')
        for invalid in [-1,10001,1.5,'5']:
            check(admin.call('ai.grant',{**project_grant,'max_calls':invalid})[0]==422,'Project call budgets require a bounded integer')
        admin.ok('ai.grant',project_grant)
        check(connection['id'] in [c['id'] for c in alice.ok('lab.info',project=pid)['connections']],'Project grant makes provided connection available without group grant')
        check(not bob.ok('lab.info',project=personal)['connections'],'Project grant does not leak into unrelated projects')
        admin.ok('ai.grant',{**project_grant,'max_calls':12})
        row=next(g for g in admin.ok('admin.labs')['grants'] if g['project_id']==pid and g['connection_id']==connection['id'])
        check(row['max_calls']==12 and row['project_name']=='Studio' and row['connection_name']==conn_data['name'],'Admin project overview reflects edited budget and names')
        check(len([g for g in admin.ok('admin.labs')['grants'] if g['project_id']==pid and g['connection_id']==connection['id']])==1,'Regrant updates one pair rather than duplicating it')
        group_grant=admin.ok('admin.ai.group.save',grant)['grant']
        admin.ok('ai.grant',{**project_grant,'max_calls':0})
        check(connection['id'] in [c['id'] for c in alice.ok('lab.info',project=pid)['connections']],'Revoking a project grant preserves independent group access')
        check(not any(g['project_id']==pid and g['connection_id']==connection['id'] for g in admin.ok('admin.labs')['grants']),'Revoked project pair disappears from admin overview')
        admin.ok('admin.ai.group.save',{'group':gid,'connection':connection['id'],'version':group_grant['version'],'remove':True})
        check(not alice.ok('lab.info',project=pid)['connections'],'Revoking both access paths removes the connection')
        # The project dialog reads actual grants and saves tools + multiple capabilities atomically.
        provisioning={'source':connection['id'],'version':connection['version'],'model':'text-embedding-3-small'}
        check(admin.call('admin.ai.embedding.create',provisioning,csrf=False)[0]==403,'Embedding provisioning requires CSRF')
        check(admin.call('admin.ai.embedding.create')[0]==405,'Embedding provisioning rejects GET')
        check(alice.call('admin.ai.embedding.create',provisioning)[0]==403,'Learners cannot use admin provisioning')
        check(alice.call('ai.embedding.create',provisioning)[0]==404,'Personal provisioning cannot reuse another account key')
        provided_embedding=admin.ok('admin.ai.embedding.create',provisioning)['connection']
        check('secret' not in provided_embedding and provided_embedding['capability']=='embedding','Provisioned embedding exposes no key')
        check(not alice.ok('lab.info',project=pid)['connections'],'Provisioning alone creates no access for learners')
        admin.ok('admin.ai.connection.delete',{'id':provided_embedding['id'],'version':provided_embedding['version']})
        embedding=admin.ok('admin.ai.connection.save',{**conn_data,'name':'Synthetic embeddings','provider':'daimon','base_url':'https://synthetic.daimon.intelligence-gmbh.com/vllm/embedding/v1','capability':'embedding'})['connection']
        check(alice.call('lab.project.settings',project=pid)[0]==403,'Learners cannot inspect grant management metadata')
        state=admin.ok('lab.project.settings',project=pid)
        check(not any(set(c).intersection(['secret','key','base_url','user_id']) for c in state['connections']),'Project dialog returns safe connection metadata only')
        config={'tools':['prompt','rag','network'],'entry':'rag'}
        change={'project':pid,'revision':state['revision'],'config':config,'grants':[{'connection':connection['id'],'max_calls':11},{'connection':embedding['id'],'max_calls':15}]}
        check(admin.call('lab.project.settings.save',change,csrf=False)[0]==403,'Atomic project save requires CSRF')
        check(admin.call('lab.project.settings.save')[0]==405,'Atomic project save rejects GET')
        check(alice.call('lab.project.settings.save',change)[0]==403,'Learners cannot change project grants')
        state=admin.ok('lab.project.settings.save',change)
        reopened=admin.ok('lab.project.settings',project=pid)
        check(state['revision']==reopened['revision'] and len(reopened['grants'])==2,'Dialog reopening returns saved grants and stable revision')
        check({g['connection_id']:g['max_calls'] for g in reopened['grants']}=={connection['id']:11,embedding['id']:15},'Both capability budgets persist')
        available=alice.ok('lab.info',project=pid)['connections']
        check({c['capability'] for c in available}=={'chat','embedding'},'Granted embedding and chat connections both reach learner RAG')
        check(not bob.ok('lab.info',project=personal)['connections'],'Atomic grant stays inside its project')
        check(admin.call('lab.project.settings.save',change)[0]==409,'Stale dialog cannot overwrite current settings')
        bad={**change,'revision':state['revision'],'config':{**config,'entry':'prompt'},'grants':[{'connection':connection['id'],'max_calls':3},{'connection':'f'*32,'max_calls':9}]}
        check(admin.call('lab.project.settings.save',bad)[0]==403,'Unauthorized connection aborts the entire save')
        after=admin.ok('lab.project.settings',project=pid)
        check(after['revision']==state['revision'] and after['config']['entry']=='rag','Failed grant rolls back config and preceding grant mutations')
        for invalid in [-1,10001,1.5,'5']:
            check(admin.call('lab.project.settings.save',{**change,'revision':state['revision'],'grants':[{'connection':embedding['id'],'max_calls':invalid}]})[0]==422,'Atomic budgets require bounded integers')
        admin.ok('admin.ai.connection.save',{**conn_data,'id':embedding['id'],'version':embedding['version'],'provider':'daimon','base_url':'https://synthetic.daimon.intelligence-gmbh.com/vllm/embedding/v1','capability':'embedding','active':False})
        check(admin.call('lab.project.settings.save',{**change,'revision':state['revision']})[0]==409,'Connection changes invalidate the open dialog')
        state=admin.ok('lab.project.settings',project=pid)
        check(admin.call('lab.project.settings.save',{**change,'revision':state['revision'],'grants':[{'connection':embedding['id'],'max_calls':20}]})[0]==422,'Inactive connection cannot receive a new grant')
        check(all(c['capability']!='embedding' for c in alice.ok('lab.info',project=pid)['connections']),'Disabled embedding is unavailable to learners')
        admin.ok('lab.project.settings.save',{**change,'revision':state['revision'],'config':{'tools':list(json.loads(subprocess.check_output(['php','-r',"require 'app/bootstrap.php'; require 'app/labs.php'; echo json_encode(LAB_KINDS);"],cwd=ROOT,env=env))),'entry':'editor'},'grants':[{'connection':connection['id'],'max_calls':0},{'connection':embedding['id'],'max_calls':0}]})
        check(not admin.ok('lab.project.settings',project=pid)['grants'],'Project grants can be explicitly revoked')
        admin.ok('admin.ai.connection.delete',{'id':connection['id'],'version':connection['version']})
        readiness={'schemaVersion':1,'organization':'Self-check company','scope':'organization','area':'','baseline':'connected','answers':{},'screen':'questions','step':0,'completedAt':''}
        assessment=alice.ok('lab.save',{'project':pid,'kind':'readiness','name':'Self-check','content':readiness})['object']
        check(alice.call('lab.save',{'project':pid,'kind':'readiness','name':'CSRF','content':readiness},csrf=False)[0]==403,'Readiness saves require CSRF')
        check(bob.call('lab.object',id=assessment['id'])[0]==404,'Private self-check remains private')
        check(alice.call('lab.save',{**assessment,'project':pid,'version':0})[0]==409,'Concurrent readiness edits conflict')
        readiness['answers']={'workflows':'partial','processes':'yes','automation':'unknown'}
        assessment=alice.ok('lab.save',{**assessment,'project':pid,'content':readiness})['object']
        check(alice.ok('lab.object',id=assessment['id'])['object']['content']['answers']==readiness['answers'],'Partial answers survive save and reload')
        check(alice.call('lab.validate',{'project':pid,'kind':'readiness','content':{**readiness,'screen':'result','completedAt':'2026-11-09T09:00:00.000Z'}})[0]==422,'Incomplete readiness cannot be submitted as a result')
        catalog=json.loads((ROOT/'app/readiness-catalog.json').read_text())
        completed={**readiness,'answers':{k['id']:'unknown' for k in catalog['criteria']},'screen':'result','completedAt':'2026-11-09T09:00:00.000Z'}
        assessment=alice.ok('lab.save',{**assessment,'project':pid,'content':completed})['object']
        check(len(assessment['content']['answers'])==30 and assessment['content']['screen']=='result','Explicit unknowns permit a completed, uncertain self-check')
        check(alice.call('lab.validate',{'project':pid,'kind':'readiness','content':{**completed,'answers':{**completed['answers'],'fake':'yes'}}})[0]==422,'Unknown criteria are rejected')
        group=next(g for g in admin.ok('admin.groups')['groups'] if g['id']==gid)
        admin.ok('admin.group.features.save',{'id':gid,'version':group['version'],'features':{'readiness_lab':False}})
        check(alice.call('lab.object',id=assessment['id'])[0]==403,'Group switch revokes existing self-check access')
        check(all(o['id']!=assessment['id'] for o in alice.ok('lab.info',project=pid)['objects']),'Revoked self-check omitted from project list')
        group=next(g for g in admin.ok('admin.groups')['groups'] if g['id']==gid)
        admin.ok('admin.group.features.save',{'id':gid,'version':group['version'],'features':{'ai':False}})
        check(alice.ok('lab.object',id=assessment['id'])['object']['content']['screen']=='result','Self-check is independent of AI access')
        group=next(g for g in admin.ok('admin.groups')['groups'] if g['id']==gid)
        admin.ok('admin.group.features.save',{'id':gid,'version':group['version'],'features':{}})
        company=alice.ok('project.create',{'name':'Company landscape','template':'web','group':gid})['id']
        landscape_content={'organization':'Synthetic company','systems':[{'id':'crm','name':'CRM'},{'id':'shop','name':'Shop'}],'stores':[{'id':'contacts','system':'crm','name':'Contacts'}],'flows':[{'id':'f','name':'Export','from':'crm','to':'shop','stores':['contacts']}]}
        landscape=alice.ok('lab.save',{'project':company,'kind':'landscape','name':'Landscape','content':landscape_content})['object']
        check(alice.call('lab.save',{'project':company,'kind':'landscape','name':'Forgery','content':landscape_content},csrf=False)[0]==403,'Landscape writes require CSRF')
        check(bob.call('lab.object',id=landscape['id'])[0]==404,'Foreign group inventory remains hidden')
        check(alice.call('lab.save',{**landscape,'project':company,'version':0})[0]==409,'Landscape stale writes conflict')
        blueprint={'items':[{'id':'activity','stage':'phase','lane':'backstage','text':'Prepare data','systems':'CRM','data':'Customer data'}],'links':[]}
        journey_content={'persona':{'name':'Alex'},'stages':[{'id':'phase','name':'Choose','emotion':0}],'blueprint':blueprint}
        journey_content['infrastructure']={'landscape':landscape['id'],'bindings':[{'stage':'phase','element':'touchpoint','systems':['shop'],'stores':['contacts']},{'stage':'phase','element':'blueprint','blueprint':'activity','systems':['crm'],'stores':['contacts']}]}
        pair_input={'project':company,'name':'Example pair','landscape':landscape_content,'journey':journey_content}
        check(alice.call('lab.industry.create',pair_input,csrf=False)[0]==403,'Example pairs require CSRF')
        check(alice.call('lab.industry.create',project=company)[0]==405,'Example pair endpoint is POST only')
        check(bob.call('lab.industry.create',pair_input)[0]==404,'Another user cannot create pairs in foreign projects')
        pair=alice.ok('lab.industry.create',pair_input)
        check(pair['journey']['content']['infrastructure']['landscape']==pair['landscape']['id'],'Example pair binds to newly created source')
        check(alice.call('lab.save',{'project':pid,'kind':'journey','name':'Cross project','content':journey_content})[0]==422,'Cross-project landscape links rejected')
        bad_journey=json.loads(json.dumps(journey_content));bad_journey['infrastructure']['bindings'][0]['stores']=['invented']
        check(alice.call('lab.validate',{'project':company,'kind':'journey','content':bad_journey})[0]==422,'Validation endpoint enforces source membership')
        before=len(alice.ok('lab.info',project=company)['objects'])
        check(alice.call('lab.industry.create',{**pair_input,'journey':bad_journey})[0]==422,'Malformed pair rejected')
        check(len(alice.ok('lab.info',project=company)['objects'])==before,'Failed pair leaves no partial Landscape')
        journey=alice.ok('lab.save',{'project':company,'kind':'journey','name':'Blueprint','content':journey_content})['object']
        preserved=journey['content']['blueprint']
        group=next(g for g in admin.ok('admin.groups')['groups'] if g['id']==gid)
        admin.ok('admin.group.features.save',{'id':gid,'version':group['version'],'features':{'landscape_lab':False,'blueprint_lab':False}})
        check(alice.call('lab.object',id=landscape['id'])[0]==403,'Group revocation blocks Landscape')
        check(all(o['id']!=landscape['id'] for o in alice.ok('lab.info',project=company)['objects']),'Revoked Landscape omitted from object list')
        redacted=alice.ok('lab.object',id=journey['id'])['object']
        check('blueprint' not in redacted['content'],'Revoked Blueprint removed from Journey response')
        check('infrastructure' not in redacted['content'],'Revoked Landscape removes infrastructure references')
        check(alice.call('lab.validate',{'project':company,'kind':'journey','content':journey_content})[0]==403,'Validation endpoint enforces Blueprint permission')
        check(alice.call('lab.save',{**journey,'project':company})[0]==403,'Stale clients cannot write revoked Blueprint')
        redacted['content']['persona']['name']='Updated perspective'
        updated=alice.ok('lab.save',{**redacted,'project':company})['object']
        check('blueprint' not in updated['content'],'Save responses never leak revoked Blueprint')
        group=next(g for g in admin.ok('admin.groups')['groups'] if g['id']==gid)
        admin.ok('admin.group.features.save',{'id':gid,'version':group['version'],'features':{}})
        check(alice.ok('lab.object',id=journey['id'])['object']['content']['blueprint']==preserved,'Hidden Blueprint survives ordinary Journey editing')
        check(alice.ok('lab.object',id=landscape['id'])['object']['content']['flows'][0]['stores']==['contacts'],'Group reactivation restores saved inventory')
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
