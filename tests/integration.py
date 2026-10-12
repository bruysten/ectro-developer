"""Integration/security checks against an isolated PHP server and disposable SQLite DB."""
import base64
import http.cookiejar
import json
import os
import pathlib
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHECKS = 0
def check(value, label):
    global CHECKS
    assert value, label
    CHECKS += 1

class Client:
    def __init__(self, base):
        self.base = base
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.token = ''
    def call(self, action, data=None, csrf=True, **params):
        url = self.base + '/api/?' + urllib.parse.urlencode(dict(action=action, **params))
        headers = {}
        if data is not None:
            headers['Content-Type'] = 'application/json'
            if csrf: headers['X-CSRF-Token'] = self.token
        request = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None, headers=headers)
        try:
            response = self.opener.open(request, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        result = json.loads(response.read())
        if 'csrf' in result: self.token = result['csrf']
        return response.code, result
    def ok(self, action, data=None, **params):
        status, result = self.call(action, data, **params)
        check(status < 300, f'{action}: {status} {result}')
        return result

with tempfile.TemporaryDirectory(prefix='ectro-test-') as private:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
    env = dict(os.environ, APP_ENV='development', APP_KEY=base64.b64encode(os.urandom(32)).decode(), APP_DATA_DIR=private, APP_SETUP_TOKEN='isolated-test-setup-token-2026-12345')
    server = subprocess.Popen(['php', '-S', f'127.0.0.1:{port}', '-t', 'public', 'scripts/router.php'], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = f'http://127.0.0.1:{port}'
    try:
        admin = Client(base)
        for attempt in range(40):
            try: admin.ok('bootstrap'); break
            except urllib.error.URLError: time.sleep(.1)
        status, _ = admin.call('setup', {'token': env['APP_SETUP_TOKEN'], 'name':'Admin', 'email':'admin@test.invalid','password':'secure-test-password'},csrf=False)
        check(status == 403, 'Setup requires CSRF')
        admin.ok('setup', {'token':env['APP_SETUP_TOKEN'],'name':'Admin','email':'admin@test.invalid','password':'secure-test-password'})
        check(admin.call('setup', {'token':env['APP_SETUP_TOKEN'],'name':'Admin','email':'admin2@test.invalid','password':'secure-test-password'})[0] == 409, 'Setup cannot repeat')
        check(admin.call('login', {'portal':'user','email':'admin@test.invalid','password':'secure-test-password'})[0]==401, 'Admin portal enforced')
        me = admin.ok('login', {'portal':'admin','email':'admin@test.invalid','password':'secure-test-password'})['user']
        check(admin.call('admin.user.save', {'id':me['id'],'name':'Admin','email':'admin@test.invalid','role':'user','password':'','active':True,'groups':[]})[0]==422, 'Cannot demote self')
        check(admin.call('password',{'current':'secure-test-password','password':'x'*73})[0]==422, 'Bcrypt passwords cannot be silently truncated')
        group = admin.ok('admin.group.save', {'name':'Training','description':'','features':{}})['id']
        other_group = admin.ok('admin.group.save', {'name':'Private group','description':'','features':{}})['id']
        users = []
        for n in [1,2]:
            uid = admin.ok('admin.user.save', {'name':f'User {n}','email':f'user{n}@test.invalid','password':'secure-test-password','groups':[group] if n==1 else [other_group]})['id']
            client = Client(base);client.ok('bootstrap')
            client.ok('login', {'portal':'user','email':f'user{n}@test.invalid','password':'secure-test-password'})
            check(client.call('projects')[0]==403, 'Temporary password gate')
            client.ok('password', {'current':'secure-test-password','password':'changed-secure-password'})
            users.append((uid,client))
        uid, alice = users[0]; _, bob = users[1]
        check(alice.call('admin.users')[0]==403, 'Learner cannot access admin')
        pid = alice.ok('project.create', {'name':'HTML project','template':'web'})['id']
        check(bob.call('files', project=pid)[0]==404, 'No cross-user file listings')
        check(bob.call('project.bundle', {'project':pid})[0]==404, 'No cross-user content bundles')
        check(alice.call('project.delete', {'id':pid},csrf=False)[0]==403, 'Mutation CSRF enforced')
        for path in ['../secret.php','/app.php','a/../../test','a//b','.env','a\\b']:
            check(alice.call('file.save', {'project':pid,'path':path,'content':'test','version':0})[0]==422, f'Path rejected: {path}')
        f = alice.ok('file', project=pid,path='index.html')['file']
        saved = alice.ok('file.save', {'project':pid,'path':f['path'],'content':'<h1>Changed</h1>','version':f['version']})['file']
        check(alice.call('file.save', {'project':pid,'path':f['path'],'content':'stale','version':f['version']})[0]==409, 'Optimistic concurrency')
        check(alice.ok('file',project=pid,path='index.html')['file']['content']=='<h1>Changed</h1>', 'No stale overwrite')
        alice.ok('file.save', {'project':pid,'path':'src/main.js','content':'console.log(1)','version':0})
        check(alice.call('file.save', {'project':pid,'path':'src','content':'collision','version':0})[0]==409, 'No file-folder collision')
        alice.ok('folder.create', {'project':pid,'path':'src'})
        check(alice.call('folder.create',{'project':pid,'path':'index.html/nested'})[0]==409, 'Folder cannot live below a file')
        alice.ok('file.rename', {'project':pid,'path':'src','new_path':'scripts'})
        check(alice.ok('file',project=pid,path='scripts/main.js')['file']['content']=='console.log(1)', 'Folder rename preserves descendants')
        alice.ok('file.save',{'project':pid,'path':'a_b/keep.js','content':'kept','version':0})
        alice.ok('file.save',{'project':pid,'path':'acb/keep.js','content':'kept too','version':0})
        alice.ok('file.delete',{'project':pid,'path':'a_b'})
        check(alice.ok('file',project=pid,path='acb/keep.js')['file']['content']=='kept too', 'Underscores are not deletion wildcards')
        check(alice.call('chat',group=other_group)[0]==403, 'No cross-group chat reads')
        check(alice.call('chat.send',{'group':other_group,'body':'no'})[0]==403, 'No cross-group chat writes')
        alice.ok('chat.send', {'group':group,'body':'<script>test</script>'})
        check(alice.ok('chat',group=group)['messages'][0]['body']=='<script>test</script>', 'Chat preserves plain text')
        admin.ok('admin.group.save',{'id':group,'name':'Training','description':'','features':{'python':False}})
        check(alice.call('project.create',{'name':'Blocked','template':'python'})[0]==403, 'Group feature restriction')
        check(alice.call('run.record',{'project':pid,'language':'python'})[0]==403, 'Run permission enforced')
        admin.ok('admin.settings', {'features':{'files':False},'hosts':['localhost']})
        check(alice.call('files',project=pid)[0]==403, 'Global feature restriction')
        admin.ok('admin.settings', {'features':{'files':True},'hosts':['localhost']})
        admin.ok('admin.user.save',{'id':uid,'name':'User 1','email':'user1@test.invalid','password':'','active':True,'groups':[group],'features':{'database':False}})
        alice.ok('bootstrap');alice.ok('login',{'portal':'user','email':'user1@test.invalid','password':'changed-secure-password'})
        check(alice.call('db.info')[0]==403, 'Individual feature restriction')
        admin.ok('admin.user.save',{'id':uid,'name':'User 1','email':'user1@test.invalid','password':'','active':True,'groups':[group],'features':{}})
        alice.ok('bootstrap');alice.ok('login',{'portal':'user','email':'user1@test.invalid','password':'changed-secure-password'})
        check(alice.call('db.connect',{'host':'169.254.169.254','db_name':'test','username':'test','password':'test'})[0]==403, 'Unapproved database hosts blocked')
        conn = alice.ok('db.info')
        check(conn['connection'] is None, 'Failed connection is not persisted')
        admin.ok('admin.user.save', {'id':uid,'name':'User 1','email':'user1@test.invalid','password':'','active':False,'groups':[group]})
        check(alice.call('projects')[0]==401, 'Disabled user session immediately revoked')
        overview = admin.ok('admin.overview')
        check(overview['counts']['users']==2 and overview['counts']['projects']==1, 'Statistics grounded in stored activity')
        anonymous = Client(base)
        check(anonymous.call('dashboard')[0]==401, 'Anonymous access denied')
        check(anonymous.call('file.save')[0]==405, 'Mutation cannot use GET')
        check(anonymous.call('db.query')[0]==405, 'SQL cannot use GET')
        # Memberships are editable from either side and group writes are atomic.
        bob_id = users[1][0]
        assigned = admin.ok('admin.group.save', {'name':'Assignments','users':[uid,bob_id,uid]})['id']
        def read_group(gid):
            return next(g for g in admin.ok('admin.groups')['groups'] if g['id']==gid)
        def user_groups(user_id):
            return {g['id'] for g in next(u for u in admin.ok('admin.users')['users'] if u['id']==user_id)['groups']}
        check(set(read_group(assigned)['user_ids'])=={uid,bob_id} and read_group(assigned)['members']==2, 'Create group assigns and deduplicates members')
        check(user_groups(uid)=={group,assigned} and user_groups(bob_id)=={other_group,assigned}, 'Group assignment appears in user dialogs')
        admin.ok('admin.group.save', {'id':assigned,'name':'Assignments','users':[bob_id]})
        check(user_groups(uid)=={group} and user_groups(bob_id)=={other_group,assigned}, 'Removing group member preserves other memberships')
        admin.ok('admin.group.save', {'id':assigned,'name':'Renamed'})
        check(read_group(assigned)['user_ids']==[bob_id], 'Omitted members preserve existing membership')
        for invalid in [['missing-user'],[bob_id,{'id':uid}],None,'invalid']:
            check(admin.call('admin.group.save', {'id':assigned,'name':'Must not persist','users':invalid})[0]==422, 'Invalid members rejected')
            saved_group=read_group(assigned)
            check(saved_group['name']=='Renamed' and saved_group['user_ids']==[bob_id], 'Invalid group write preserves metadata and members')
        count_before=len(admin.ok('admin.groups')['groups'])
        check(admin.call('admin.group.save', {'name':'Must not exist','users':['missing-user']})[0]==422, 'Invalid new group rejected')
        check(len(admin.ok('admin.groups')['groups'])==count_before, 'Invalid creation leaves no group')
        admin.ok('admin.user.save', {'id':bob_id,'name':'User 2','email':'user2@test.invalid','groups':[other_group,assigned]})
        check(read_group(assigned)['user_ids']==[bob_id], 'User assignment appears in group dialog')
        admin.ok('admin.user.save', {'id':bob_id,'name':'User 2','email':'user2@test.invalid','groups':[other_group]})
        check(read_group(assigned)['user_ids']==[] and user_groups(bob_id)=={other_group}, 'User removal updates group members')
        admin.ok('admin.group.save', {'id':assigned,'name':'Renamed','users':[bob_id]})
        admin.ok('admin.group.save', {'id':assigned,'name':'Renamed','users':[]})
        check(read_group(assigned)['members']==0 and user_groups(bob_id)=={other_group}, 'Explicit empty selection removes all members')
        check(anonymous.call('admin.groups')[0]==401, 'Member IDs unavailable anonymously')
        bob.ok('bootstrap');bob.ok('login',{'portal':'user','email':'user2@test.invalid','password':'changed-secure-password'})
        check(bob.call('admin.group.save',{'id':assigned,'name':'Renamed','users':[bob_id]})[0]==403, 'Learners cannot change memberships')
        admin.ok('admin.group.delete', {'id':assigned})
        print(f'{CHECKS} API/security integration checks passed.')
    finally:
        server.terminate();server.wait(timeout=10)
