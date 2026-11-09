"""Isolated group access windows, ongoing sessions, and cross-group permissions."""
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
        if hasattr(self,'portal'):headers['X-Workspace-Portal']=self.portal
        if csrf:headers['X-CSRF-Token']=self.token
        req=urllib.request.Request(self.base+'/api/?'+urllib.parse.urlencode({'action':action,**params}),data=None if data is None else json.dumps(data).encode(),headers=headers)
        try:r=self.opener.open(req,timeout=30)
        except urllib.error.HTTPError as e:r=e
        value=json.loads(r.read())
        if 'csrf' in value:self.token=value['csrf']
        return r.code,value
    def ok(self,action,data=None,**params):
        status,value=self.call(action,data,**params);check(status<300,f'{action}: {status} {value}');return value
    def resource(self,path,**params):
        request=urllib.request.Request(self.base+'/'+path+'?'+urllib.parse.urlencode(params))
        try:r=self.opener.open(request,timeout=30)
        except urllib.error.HTTPError as e:r=e
        return r.code,r.read()
    def upload(self,action,fields):
        boundary='isolated-group-resource-test'
        payload=b''.join((f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n').encode() for key,value in fields.items())
        payload+=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="fixture.txt"\r\nContent-Type: text/plain\r\n\r\nFixture\r\n--{boundary}--\r\n').encode()
        r=self.opener.open(urllib.request.Request(self.base+'/api/?action='+action,data=payload,headers={'Content-Type':'multipart/form-data; boundary='+boundary,'X-CSRF-Token':self.token}),timeout=30)
        check(r.code<300,'Fixture upload');return json.loads(r.read())
import datetime, zoneinfo
with tempfile.TemporaryDirectory(prefix='academy-group-periods-') as private:
    with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
    env=dict(os.environ,APP_ENV='development',APP_KEY=base64.b64encode(os.urandom(32)).decode(),APP_DATA_DIR=private,APP_SETUP_TOKEN='isolated-group-periods-setup-2026-123456',PHP_CLI_SERVER_WORKERS='4')
    server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t','public','scripts/router.php'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
    try:
        base=f'http://127.0.0.1:{port}';admin=Client(base)
        for _ in range(60):
            try:admin.ok('bootstrap');break
            except urllib.error.URLError:time.sleep(.1)
        admin.ok('setup',{'token':env['APP_SETUP_TOKEN'],'name':'Admin','email':'admin@example.test','password':'secure-test-password'})
        admin.ok('login',{'portal':'admin','email':'admin@example.test','password':'secure-test-password'})
        today=datetime.datetime.now(zoneinfo.ZoneInfo('Europe/Berlin')).date()
        day=lambda delta:(today+datetime.timedelta(days=delta)).isoformat()
        first=admin.ok('admin.group.save',{'name':'Kurs A'})['id']
        backup=admin.ok('admin.group.save',{'name':'Kurs B','periods':{'access_start':day(7)}})['id']
        staff=admin.ok('admin.group.save',{'name':'Dozentenzugang'})['id']
        def group(gid):return next(g for g in admin.ok('admin.groups')['groups'] if g['id']==gid)
        def save(gid,**patch):
            old=group(gid)
            return admin.ok('admin.group.save',{'id':gid,'version':old['version'],'name':old['name'],**patch})
        def make(name,role,groups):
            uid=admin.ok('admin.user.save',{'name':name,'email':name+'@example.test','role':role,'password':'secure-test-password','must_change_password':False,'groups':groups})['id']
            c=Client(base);c.ok('bootstrap');return uid,c
        uid,learner=make('learner','user',[first,backup]);tid,teacher=make('teacher','teacher',[first,staff]);_,future=make('future','user',[backup]);_,ungrouped=make('ungrouped','user',[])
        for c,name in [(learner,'learner'),(teacher,'teacher'),(ungrouped,'ungrouped')]:c.ok('login',{'portal':'user','email':name+'@example.test','password':'secure-test-password'})
        status,body=future.call('login',{'portal':'user','email':'future@example.test','password':'secure-test-password'})
        check(status==403 and body.get('code')=='access_period','Valid credentials cannot bypass a future window')
        check(future.call('login',{'portal':'user','email':'future@example.test','password':'wrong-password'})[0]==401,'Window details require valid credentials')
        check(ungrouped.ok('bootstrap')['user']['access']['allowed'],'Legacy personal accounts without groups remain unrestricted')
        project=learner.ok('project.create',{'name':'Gruppenprojekt','template':'web','group':first})['id']
        personal=learner.ok('project.create',{'name':'Persönlich','template':'web'})['id']
        asset=learner.upload('file.upload',{'project':project,'path':'fixture.pdf'})['file']['id']
        learner.upload('chat.upload',{'group':first,'body':'Synthetic fixture'})
        chat_asset=learner.ok('chat',group=first)['messages'][-1]['attachment']['id']
        private_canvas=learner.ok('canvas.create',{'kind':'business','name':'Privates Geschäftsmodell'})['canvas']['id']
        shared_canvas=learner.ok('canvas.create',{'kind':'business','name':'Gruppenmodell','group':first})['canvas']['id']
        dataset={'columns':[{'name':'Wert','type':'number'}],'rows':[{'Wert':12}]}
        shared_lab=learner.ok('lab.save',{'project':project,'kind':'dataset','name':'Gruppendaten','content':dataset})['object']['id']
        template=admin.ok('admin.template.save',{'name':'Nur Kurs A','language':'web','active':True,'version':0,'files':[],'labs':{'tools':['graph'],'entry':'graph','groups':[first],'seeds':[]}})['id']
        check(template in [t['id'] for t in learner.ok('templates')['templates']],'Active group offers its assigned project types')
        teacher.ok('files',project=personal)
        check(group(first)['address_mode']=='formal','Existing groups default to Siezen')
        check(learner.ok('bootstrap')['user']['address']['mode']=='formal','Default frontend address is formal')
        before_address=group(first)
        save(first,address_mode='informal')
        boot=learner.ok('bootstrap');check(boot['user']['address']['mode']=='informal' and boot['user']['address']['group_id']==first,'Single accessible group controls whole frontend voice')
        status,error=learner.call('file.save',{'project':personal,'path':'invalid?.txt','content':'not saved','version':0})
        check(status==422 and error['error'].startswith('Bitte verwende'),'Authenticated API errors follow group voice')
        save(first,description='Preference survives metadata edit')
        check(group(first)['address_mode']=='informal','Older clients omitting address preserve it')
        check(admin.call('admin.group.save',{'id':first,'version':before_address['version'],'name':'Stale','address_mode':'formal'})[0]==409,'Stale editor cannot overwrite address')
        current_address=group(first)
        for mode in [None,True,1,[],{},'du','FORMAL']:
            check(admin.call('admin.group.save',{'id':first,'version':current_address['version'],'name':'Must not persist','address_mode':mode})[0]==422,'Address enum is strict')
        check(group(first)==current_address,'Invalid address is atomic')
        payload={'id':first,'version':current_address['version'],'name':current_address['name'],'address_mode':'formal'}
        check(admin.call('admin.group.save',payload,csrf=False)[0]==403,'Address setting requires CSRF')
        check(learner.call('admin.group.save',payload)[0]==403 and teacher.call('admin.group.save',payload)[0]==403,'Only administrators can change group address')
        original=group(first)
        for periods in [ {'access_start':day(3),'access_end':day(2)}, {'access_start':'2026-02-29'}, {'course_start':day(1)}, {'access_start':day(1),'course_start':day(0),'course_end':day(2)}, {'access_end':day(1),'course_start':day(0),'course_end':day(2)}, {'access_start':False}, {'access_start_at':0} ]:
            check(admin.call('admin.group.save',{'id':first,'version':original['version'],'name':'Must not persist','periods':periods})[0]==422,'Malformed or out-of-bounds dates rejected atomically')
        check(group(first)==original,'Invalid schedule leaves group, version and membership unchanged')
        check(admin.call('admin.group.save',{'id':first,'version':original['version'],'name':'Unauthorized','periods':{'access_end':day(-1)}},csrf=False)[0]==403,'Scheduling requires CSRF')
        check(learner.call('admin.group.save',{'id':first,'version':original['version'],'name':'Unauthorized','periods':{'access_end':day(-1)}})[0]==403,'Learner cannot change dates')
        save(first,periods={'access_start':day(-7),'access_end':day(0),'course_start':day(-2),'course_end':day(0)})
        check(group(first)['periods']['state']=='active','Today is included in end date')
        check(teacher.ok('bootstrap')['user']['address']['mode']=='informal','Current course wins over a second formal staff group')
        save(staff,periods={'course_start':day(-1),'course_end':day(1)})
        check(teacher.ok('bootstrap')['user']['address']['mode']=='formal' and teacher.ok('bootstrap')['user']['address']['conflict'],'Conflicting overlapping courses fall back to Siezen')
        check(learner.ok('bootstrap')['user']['address']['mode']=='informal','Foreign course preferences do not affect another user')
        save(staff,periods={'course_start':None,'course_end':None})
        boot=learner.ok('bootstrap');check(boot['user']['access']['next_transition']>time.time(),'Server provides next boundary for open browsers')
        preserved=group(first)['periods']
        check(admin.call('admin.group.save',{'id':first,'version':original['version'],'name':'Stale','periods':{'access_end':day(2)}})[0]==409,'Stale dialogs cannot overwrite newer periods')
        save(first,description='Only metadata changed')
        check(group(first)['periods']==preserved,'Older client omitting periods preserves existing dates')
        current=group(first);admin.ok('admin.group.features.save',{'id':first,'version':current['version'],'features':{'graph':False}})
        check(group(first)['periods']==preserved,'Rights-only editor cannot clear dates')
        save(first,periods={'access_end':day(-1),'course_start':None,'course_end':None})
        blocked=learner.ok('bootstrap');check(not blocked['user']['access']['allowed'] and not any(blocked['features'].values()),'Existing session closes when all groups are inactive')
        for action,params in [('dashboard',{}),('files',{'project':personal}),('files',{'project':project}),('ai.connections',{}),('db.info',{})]:
            status,body=learner.call(action,**params);check(status==403 and body.get('code')=='access_period','Existing sessions are blocked across learning APIs')
        check(learner.call('file.save',{'project':personal,'path':'blocked.txt','content':'cannot save','version':0})[0]==403,'Closed access cannot write personal files')
        check(teacher.call('files',project=personal)[0]==200,'Teacher project supervision remains available after a course closes')
        teacher.ok('project.rename',{'id':project,'name':'Teacher renamed expired group project'})
        check(teacher.call('chat',group=first)[0]==403,'Closed group chat remains closed even with another active group')
        save(backup,periods={'access_start':None})
        check(learner.ok('bootstrap')['user']['access']['allowed'],'Reopening another assigned group restores the same authenticated session')
        learner.ok('files',project=personal)
        check(learner.call('files',project=project)[0]==404,'Reopening global access does not reopen another expired group project')
        check(first not in [g['id'] for g in learner.ok('bootstrap')['user']['groups']],'Only active groups offered to learner')
        check(learner.ok('bootstrap')['features']['graph'],'Expired group restrictions no longer constrain the active course')
        check(first not in [g['id'] for g in teacher.ok('teacher.participants')['groups']],'Teacher selector omits expired groups')
        check(learner.call('project.create',{'name':'Forbidden','template':'web','group':first})[0]==403,'No new projects in expired groups')
        check(learner.call('project.share',{'id':personal,'group':first})[0]==403,'No sharing into expired groups')
        check(learner.call('team',group=first)[0]==403,'Expired team profiles remain inaccessible')
        active_ids=lambda response:[g['id'] for g in response['groups']]
        check(active_ids(learner.ok('profile')['user'])==[backup],'Profile does not reintroduce expired groups')
        check(active_ids(learner.ok('team'))==[backup],'Team picker offers only accessible memberships')
        profile=learner.ok('profile')['user']['profile']
        updated=learner.ok('profile.save',{'name':'learner','version':profile['version']})['user']
        check(active_ids(updated)==[backup],'Saving the profile keeps the filtered membership scope')
        canvas_list=learner.ok('canvas.list')
        check(active_ids(canvas_list)==[backup] and [c['id'] for c in canvas_list['canvases']]==[private_canvas],'Private canvases remain; expired shared canvases and groups disappear')
        learner.ok('canvas.get',id=private_canvas)
        check(learner.call('canvas.get',id=shared_canvas)[0]==404,'An active backup group cannot reopen a different shared canvas')
        check(learner.call('canvas.create',{'name':'Forbidden','kind':'business','group':first})[0]==404,'Expired canvas scope cannot be forged')
        check(learner.call('lab.object',id=shared_lab)[0]==404,'Saved lab objects inherit the exact project group')
        check(project not in [p['id'] for p in learner.ok('lab.projects')['projects']] and personal in [p['id'] for p in learner.ok('lab.projects')['projects']],'Lab project selectors keep personal work and omit expired shared projects')
        check(template not in [t['id'] for t in learner.ok('templates')['templates']],'Expired group-specific templates disappear')
        check(learner.call('project.create',{'name':'Forbidden template','template':template})[0]==403,'Expired group-specific template cannot be used by ID')
        # Surface context scopes administrator accounts in the learning UI while
        # retaining complete memberships and artifacts for backend management.
        admin_uid=admin.ok('bootstrap')['user']['id']
        admin.ok('admin.user.save',{'id':admin_uid,'name':'Admin','email':'admin@example.test','role':'admin','active':True,'groups':[first,backup]})
        frontend_admin=Client(base);frontend_admin.opener=admin.opener;frontend_admin.token=admin.token;frontend_admin.portal='frontend'
        admin_personal=frontend_admin.ok('project.create',{'name':'Admin persönlich','template':'web'})['id']
        check(active_ids(frontend_admin.ok('bootstrap')['user'])==[backup],'Frontend administrator sees only active memberships')
        check(active_ids(frontend_admin.ok('profile')['user'])==[backup] and active_ids(frontend_admin.ok('team'))==[backup],'Frontend administrator profile and team use the same scope')
        check(set(active_ids(admin.ok('bootstrap')['user']))=={first,backup},'Backend administrator retains every assigned group')
        check({first,backup,staff}.issubset(set(g['id'] for g in admin.ok('admin.groups')['groups'])),'Expired groups remain manageable in backend')
        managed=next(u for u in admin.ok('admin.users')['users'] if u['id']==uid)
        check(set(active_ids(managed))=={first,backup},'Backend user editing retains inactive memberships')
        check([p['id'] for p in frontend_admin.ok('lab.projects')['projects']]==[admin_personal],'Frontend admin project picker omits expired and foreign private projects')
        for action,params in [('files',{'project':project}),('files',{'project':personal}),('lab.object',{'id':shared_lab}),('canvas.get',{'id':shared_canvas})]:
            check(frontend_admin.call(action,**params)[0]==404,'Frontend admin cannot reopen foreign or expired artifacts by ID')
        check(active_ids(frontend_admin.ok('canvas.list'))==[backup],'Frontend canvas picker applies administrator membership scope')
        check(template not in [t['id'] for t in frontend_admin.ok('templates')['templates']],'Frontend admin cannot see expired assigned project types')
        check(frontend_admin.call('project.create',{'name':'Forbidden','template':'web','group':first})[0]==403,'Frontend admin cannot create in an expired group')
        check(frontend_admin.call('project.share',{'id':admin_personal,'group':first})[0]==403,'Frontend admin cannot share into an expired group')
        check(frontend_admin.call('canvas.create',{'kind':'business','name':'Forbidden','group':first})[0]==404,'Frontend admin cannot create an expired shared canvas')
        admin.ok('files',project=project)
        admin.ok('canvas.get',id=shared_canvas)
        admin.ok('admin.chat',group=first)
        for endpoint,resource_id,denied in [('workspace-file.php',asset,404),('chat-file.php',chat_asset,403)]:
            check(frontend_admin.resource(endpoint,id=resource_id,workspace_portal='frontend')[0]==denied,'Native frontend resource links preserve access scope')
            check(admin.resource(endpoint,id=resource_id,workspace_portal='admin')[0]==200,'Backend resource access remains available')
            check(learner.resource(endpoint,id=resource_id,workspace_portal='admin')[0]==denied,'A query parameter cannot elevate the user role')
        check(frontend_admin.call('db.info',participant=uid,group=first)[0]==403,'Frontend admin cannot reuse management participant selectors')
        learner.portal='admin'
        check(learner.call('files',project=project)[0]==404,'Forging management context never elevates a user role')
        del learner.portal
        save(backup,periods={'access_end':day(-1)})
        check(not frontend_admin.ok('bootstrap')['user']['access']['allowed'],'Frontend administrators follow the closed learning window')
        check(frontend_admin.call('files',project=admin_personal)[0]==403,'Frontend admin personal work closes when all assigned groups close')
        check(ungrouped.ok('bootstrap')['user']['access']['allowed'],'Accounts without any memberships still retain personal access')
        learner.ok('logout',{})
        learner.ok('bootstrap')
        status,body=learner.call('login',{'portal':'user','email':'learner@example.test','password':'secure-test-password'})
        check(status==403 and body.get('code')=='access_period',f'New login denied after access expires: {status} {body}')
        admin.ok('admin.user.save',{'id':admin_uid,'name':'Admin','email':'admin@example.test','role':'admin','active':True,'groups':[first]})
        check(admin.ok('bootstrap')['user']['access']['allowed'],'Administrator cannot be locked out by course dates')
        admin.ok('admin.groups')
        print(f'{checks} group-window API checks passed: validation, existing sessions, multiple groups, login, projects, chat, roles and admin access.')
    finally:
        os.killpg(server.pid,signal.SIGTERM);server.wait(timeout=10)
