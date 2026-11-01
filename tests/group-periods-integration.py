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
        if csrf:headers['X-CSRF-Token']=self.token
        req=urllib.request.Request(self.base+'/api/?'+urllib.parse.urlencode({'action':action,**params}),data=None if data is None else json.dumps(data).encode(),headers=headers)
        try:r=self.opener.open(req,timeout=30)
        except urllib.error.HTTPError as e:r=e
        value=json.loads(r.read())
        if 'csrf' in value:self.token=value['csrf']
        return r.code,value
    def ok(self,action,data=None,**params):
        status,value=self.call(action,data,**params);check(status<300,f'{action}: {status} {value}');return value
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
        teacher.ok('files',project=personal)
        original=group(first)
        for periods in [ {'access_start':day(3),'access_end':day(2)}, {'access_start':'2026-02-29'}, {'course_start':day(1)}, {'access_start':day(1),'course_start':day(0),'course_end':day(2)}, {'access_end':day(1),'course_start':day(0),'course_end':day(2)}, {'access_start':False}, {'access_start_at':0} ]:
            check(admin.call('admin.group.save',{'id':first,'version':original['version'],'name':'Must not persist','periods':periods})[0]==422,'Malformed or out-of-bounds dates rejected atomically')
        check(group(first)==original,'Invalid schedule leaves group, version and membership unchanged')
        check(admin.call('admin.group.save',{'id':first,'version':original['version'],'name':'Unauthorized','periods':{'access_end':day(-1)}},csrf=False)[0]==403,'Scheduling requires CSRF')
        check(learner.call('admin.group.save',{'id':first,'version':original['version'],'name':'Unauthorized','periods':{'access_end':day(-1)}})[0]==403,'Learner cannot change dates')
        save(first,periods={'access_start':day(-7),'access_end':day(0),'course_start':day(-2),'course_end':day(0)})
        check(group(first)['periods']['state']=='active','Today is included in end date')
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
        check(teacher.call('files',project=personal)[0]==404,'A separate active teacher group does not reveal learners from a closed group')
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
        save(backup,periods={'access_end':day(-1)})
        learner.ok('logout',{})
        learner.ok('bootstrap')
        status,body=learner.call('login',{'portal':'user','email':'learner@example.test','password':'secure-test-password'})
        check(status==403 and body.get('code')=='access_period',f'New login denied after access expires: {status} {body}')
        admin_uid=admin.ok('bootstrap')['user']['id']
        admin.ok('admin.user.save',{'id':admin_uid,'name':'Admin','email':'admin@example.test','role':'admin','active':True,'groups':[first]})
        check(admin.ok('bootstrap')['user']['access']['allowed'],'Administrator cannot be locked out by course dates')
        admin.ok('admin.groups')
        print(f'{checks} group-window API checks passed: validation, existing sessions, multiple groups, login, projects, chat, roles and admin access.')
    finally:
        os.killpg(server.pid,signal.SIGTERM);server.wait(timeout=10)
