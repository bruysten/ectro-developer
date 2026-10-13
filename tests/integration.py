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
        # Editable project types: defaults migrate once; new projects copy a snapshot.
        types=admin.ok('admin.templates')['templates']
        check([t['id'] for t in types]==['web','php','python'], 'Default project types seeded in original order')
        original=admin.ok('admin.template',id='web')['template']
        check(original['active'] and original['version']==1 and len(original['files'])==3, 'Editable default includes original start files')
        check(bob.call('admin.template',id='web')[0]==403, 'Learner cannot read admin template editor')
        check(anonymous.call('templates')[0]==401, 'Project type listing requires login')
        check(bob.call('admin.template.save',{'name':'Forbidden','files':[]})[0]==403, 'Learner cannot write project types')
        personal=bob.ok('project.create',{'name':'Before template change','template':'web'})['id']
        before=bob.ok('file',project=personal,path='index.html')['file']['content']
        template_data={'id':'web','version':1,'name':'HTML Training','description':'A custom start','language':'web','active':True,'files':[{'path':'index.html','content':'<h1>New start</h1>'},{'path':'css/theme.css','content':'h1 { color: red; }'}]}
        admin.ok('admin.template.save',template_data)
        revised=admin.ok('admin.template',id='web')['template']
        check(revised['version']==2 and len(revised['files'])==2 and revised['name']=='HTML Training', 'Metadata and all files saved together')
        check(admin.call('admin.template.save',{**template_data,'name':'Stale overwrite'})[0]==409, 'Stale admin write rejected')
        check(admin.ok('admin.template',id='web')['template']==revised, 'Stale write preserves complete template')
        visible=bob.ok('templates')['templates']
        check(visible[0]['name']=='HTML Training' and visible[0]['file_count']==2 and 'files' not in visible[0], 'Learner creation lists edited metadata without file contents')
        new_project=bob.ok('project.create',{'name':'After template change','template':'web'})['id']
        check({f['path'] for f in bob.ok('files',project=new_project)['files']}=={'index.html','css/theme.css'}, 'New project receives changed start file set')
        check(bob.ok('file',project=new_project,path='index.html')['file']['content']=='<h1>New start</h1>', 'New project receives edited content')
        check(bob.ok('file',project=personal,path='index.html')['file']['content']==before, 'Existing project content remains unchanged')
        check(bob.call('file',project=new_project,path='script.js')[0]==404, 'Removed template file is not copied')
        invalid_sets=[
            [{'path':'../secret.php','content':'bad'}], [{'path':'.env','content':'bad'}],
            [{'path':'same.txt','content':'one'},{'path':'same.txt','content':'two'}],
            [{'path':'folder','content':'file'},{'path':'folder/child.txt','content':'collision'}],
            [{'path':'folder/child.txt','content':'collision'},{'path':'folder','content':'file'}],
            [{'path':'index.html','content':{'bad':'data'}}],
            [{'path':'big.txt','content':'x'*524289}],
            [{'path':f'large{n}.txt','content':'x'*400000} for n in range(3)],
            [{'path':f'{n}.txt','content':''} for n in range(101)]
        ]
        for start_files in invalid_sets:
            check(admin.call('admin.template.save',{**template_data,'version':2,'name':'Must not persist','files':start_files})[0]==422, 'Invalid start files rejected')
            check(admin.ok('admin.template',id='web')['template']==revised, 'Invalid file batch preserves metadata and contents')
        check(admin.call('admin.template.save',{**template_data,'version':2,'language':'ruby'})[0]==422, 'Unsupported runtime cannot be introduced')
        check(admin.call('admin.template.save',{**template_data,'version':2,'active':1})[0]==422, 'Active state requires a boolean')
        disabled={**template_data,'version':2,'active':False}
        admin.ok('admin.template.save',disabled)
        check(all(t['id']!='web' for t in bob.ok('templates')['templates']), 'Disabled type absent from learner selection')
        check(bob.call('project.create',{'name':'Disabled','template':'web'})[0]==422, 'Disabled type cannot be used via forged request')
        check(bob.ok('file',project=new_project,path='index.html')['file']['content']=='<h1>New start</h1>', 'Disabling type leaves existing projects usable')
        custom={'name':'Python Workshop','description':'Custom Python exercise','language':'python','active':True,'files':[{'path':'main.py','content':'print("Custom start")\r\n'},{'path':'123','content':'numeric path'}]}
        custom_id=admin.ok('admin.template.save',custom)['id']
        check(custom_id not in ['web','php','python'], 'Additional project type has independent identity')
        custom_type=admin.ok('admin.template',id=custom_id)['template']
        check(next(f['content'] for f in custom_type['files'] if f['path']=='main.py')=='print("Custom start")\n', 'Start content normalized to LF')
        grouped=bob.ok('project.create',{'name':'Custom group project','template':custom_id,'group':other_group})['id']
        check(bob.ok('file',project=grouped,path='123')['file']['content']=='numeric path', 'Custom type files also copied into group projects')
        admin.ok('admin.settings',{'features':{'python':False},'hosts':['localhost']})
        check(all(t['language']!='python' for t in bob.ok('templates')['templates']), 'Language restriction filters custom and built-in types')
        check(bob.call('project.create',{'name':'Blocked custom','template':custom_id})[0]==403, 'Custom type cannot bypass language restrictions')
        admin.ok('admin.settings',{'features':{},'hosts':['localhost']})
        empty_id=admin.ok('admin.template.save',{'name':'Empty workspace','language':'web','files':[]})['id']
        empty_project=bob.ok('project.create',{'name':'Empty start','template':empty_id})['id']
        check(bob.ok('files',project=empty_project)['files']==[], 'Empty template creates a deliberate empty project')
        check(admin.call('admin.template.delete',{'id':'web','version':2})[0]==409, 'Stale deletion rejected')
        admin.ok('admin.template.delete',{'id':'web','version':3})
        check(all(t['id']!='web' for t in admin.ok('admin.templates')['templates']), 'Deleted default does not reappear after initialization')
        check(bob.ok('file',project=personal,path='index.html')['file']['content']==before, 'Deleting type preserves existing projects')
        check(bob.call('project.create',{'name':'Deleted','template':'web'})[0]==422, 'Deleted type unavailable to new projects')
        # Whole-project deletion removes nested files and folders, preserving other projects.
        bob.ok('folder.create', {'project':new_project,'path':'nested'})
        bob.ok('file.save', {'project':new_project,'path':'nested/example.txt','content':'Remove me','version':0})
        check(bob.call('project.delete', {'id':pid})[0]==404, 'Cannot delete another user project')
        bob.ok('project.delete', {'id':new_project})
        check(all(p['id']!=new_project for p in bob.ok('projects')['projects']), 'Deleted project disappears from overview')
        check(bob.call('files',project=new_project)[0]==404, 'Deleted project folders and files inaccessible')
        check(bob.call('file',project=new_project,path='nested/example.txt')[0]==404, 'Nested project file removed')
        check(bob.call('project.bundle',{'project':new_project})[0]==404, 'Deleted project cannot be previewed')
        check(bob.call('project.delete',{'id':new_project})[0]==404, 'Repeated deletion reports missing project')
        check(bob.ok('file',project=personal,path='index.html')['file']['content']==before, 'Deleting a project preserves other project files')
        # Chat uploads are private group data, never executable web files.
        def upload(client, group_id, filename, content, body='', csrf=True):
            boundary='ectro-test-boundary-2026'
            payload=(f'--{boundary}\r\nContent-Disposition: form-data; name="group"\r\n\r\n{group_id}\r\n--{boundary}\r\nContent-Disposition: form-data; name="body"\r\n\r\n{body}\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: application/octet-stream\r\n\r\n').encode()+content+f'\r\n--{boundary}--\r\n'.encode()
            request=urllib.request.Request(base+'/api/?action=chat.upload',data=payload,headers={'Content-Type':'multipart/form-data; boundary='+boundary,**({'X-CSRF-Token':client.token} if csrf else {})})
            try: response=client.opener.open(request,timeout=10)
            except urllib.error.HTTPError as error: response=error
            return response.code,json.loads(response.read())
        def attachment(client, file_id):
            try: response=client.opener.open(base+'/chat-file.php?id='+file_id,timeout=10)
            except urllib.error.HTTPError as error: response=error
            return response.code,response.headers,response.read()
        sharing=admin.ok('admin.overview')['sharing']
        check(sharing['enabled'] and all(t in sharing['types'] for t in ['pdf','php','docx','xlsx','pptx','odt']), 'Generous chat upload defaults')
        check(upload(bob,other_group,'source.php',b'<?php echo "must not execute"; ?>',csrf=False)[0]==403, 'Upload CSRF required')
        check(upload(bob,group,'source.php',b'code')[0]==403, 'No upload to another group')
        check(upload(bob,other_group,'program.exe',b'not executable')[0]==422, 'Unapproved extension rejected')
        check(upload(bob,other_group,'.env',b'secret')[0]==422, 'Hidden filename rejected')
        check(upload(bob,other_group,'empty.txt',b'')[0]==413, 'Empty attachment rejected')
        code=b'<?php echo "must not execute"; ?>'
        check(upload(bob,other_group,'source.php',code,body='A source file')[0]==200, 'Source attachment accepted')
        history=bob.ok('chat',group=other_group)
        entry=history['messages'][-1];file_id=entry['attachment']['id']
        check(entry['body']=='A source file' and entry['attachment']['name']=='source.php', 'Attachment metadata in chat history')
        check('content' not in entry['attachment'], 'History does not include binary payload')
        status,headers,content=attachment(bob,file_id)
        check(status==200 and content==code and headers['Content-Type']=='application/octet-stream', 'Source download is exact bytes and not executed')
        check(headers['Content-Disposition'].startswith('attachment;') and 'sandbox' in headers['Content-Security-Policy'], 'Download headers isolate active content')
        check(attachment(anonymous,file_id)[0]==401, 'Anonymous cannot download')
        check(attachment(admin,file_id)[0]==200, 'Administrator can review attachments outside own groups')
        check(bob.call('admin.chat',group=other_group)[0]==403, 'Learner cannot access moderation history')
        check(bob.call('admin.chat.delete',{'group':other_group,'message':entry['id']})[0]==403, 'Learner cannot moderate')
        check(admin.call('admin.chat.reset',{'group':other_group},csrf=False)[0]==403, 'Reset requires CSRF')
        check(admin.call('admin.chat.delete',{'group':group,'message':entry['id']})[0]==404, 'Moderation scoped to specified group')
        config={'enabled':False,'types':['txt'],'max_mb':1}
        admin.ok('admin.settings',{'features':{},'hosts':['localhost'],'chat_sharing':config})
        check(upload(bob,other_group,'note.txt',b'text')[0]==403, 'Global sharing disable enforced')
        check(attachment(bob,file_id)[0]==200, 'Sharing disable preserves existing downloads')
        admin.ok('admin.settings',{'features':{},'hosts':['localhost'],'chat_sharing':{**config,'enabled':True}})
        check(upload(bob,other_group,'source.php',b'code')[0]==422, 'Configured type restriction enforced')
        check(upload(bob,other_group,'big.txt',b'x'*1048577)[0]==413, 'Configured upload size enforced')
        check(admin.call('admin.settings',{'features':{},'hosts':['localhost'],'chat_sharing':{**config,'types':['../php']}})[0]==422, 'Invalid sharing settings rejected')
        check(bob.ok('chat',group=other_group)['sharing']['types']==['txt'], 'Failed settings save preserves configuration')
        bob_id=users[1][0]
        admin.ok('admin.group.save',{'id':other_group,'name':'Private group','users':[]})
        check(attachment(bob,file_id)[0]==403, 'Membership removal revokes saved attachment URL')
        admin.ok('admin.group.save',{'id':other_group,'name':'Private group','users':[bob_id]})
        admin.ok('admin.chat.delete',{'group':other_group,'message':entry['id']})
        check(attachment(bob,file_id)[0]==404, 'Deleting message cascades to attachment')
        revised=bob.ok('chat',group=other_group,after=entry['id'],revision=history['revision'])
        check(revised['reset'] and revised['revision']>history['revision'], 'Moderation invalidates open chat history')
        check(upload(bob,other_group,'note.txt',b'Test reset')[0]==200, 'Attachment-only message accepted')
        last=bob.ok('chat',group=other_group)['messages'][-1]['attachment']['id']
        admin.ok('admin.chat.reset',{'group':other_group})
        check(bob.ok('chat',group=other_group)['messages']==[] and attachment(bob,last)[0]==404, 'Group chat reset removes messages and attachments')
        check(bob.ok('files',project=grouped)['project']['id']==grouped, 'Chat reset preserves group projects')
        # History remains paginated and complete rather than truncating the group chat.
        seed=subprocess.run(['php','-r',"require 'app/bootstrap.php';for($i=0;$i<105;$i++)query('INSERT INTO messages(group_id,user_id,body,created_at) VALUES(?,?,?,?)',[$argv[1],$argv[2],'History '.$i,now()]);",other_group,bob_id],cwd=ROOT,env=env,capture_output=True)
        check(seed.returncode==0, 'Isolated pagination fixtures created')
        recent=bob.ok('chat',group=other_group)
        older=bob.ok('chat',group=other_group,before=recent['messages'][0]['id'])
        check(len(recent['messages'])==100 and recent['has_more'] and len(older['messages'])==5 and not older['has_more'], 'All history pages available')
        check(not ({m['id'] for m in recent['messages']} & {m['id'] for m in older['messages']}), 'History pages do not overlap')
        admin.ok('admin.chat.reset',{'group':other_group})
        # Personal SQL training runs real SQL without touching the connected database.
        training=bob.ok('training.info')
        check(training['tables']==['produkte','kontakte'] and not training['has_connection'], 'Training available without external database')
        sample=bob.ok('training.table',mode='practice',table='produkte')
        check(len(sample['rows'])==3 and sample['columns'][0]['Extra']=='auto_increment', 'Practice schema and sample records')
        selection={'table':'produkte','action':'select','columns':['name','preis'],'conditions':[{'column':'kategorie','operator':'=','value':'Büro'}],'order':[{'column':'preis','direction':'DESC'}],'limit':10}
        selected=bob.ok('training.preview',{'mode':'practice','model':selection})
        check(len(selected['rows'])==2 and selected['rows'][0]['name']=='Schreibtischlampe', 'Read-only live selection and ordering')
        check(len(bob.ok('training.table',mode='practice',table='produkte')['rows'])==3, 'Live preview does not write')
        insert={'table':'produkte','action':'insert','values':{'name':"O'Brien",'preis':'12.5'},'rows':[{'name':"O'Brien",'preis':'12.5'},{'name':'Second','preis':'3.2'}]}
        check(bob.ok('training.execute',{'mode':'practice','model':insert})['affected']==2, 'Real multi-row practice INSERT')
        rows=bob.ok('training.table',mode='practice',table='produkte')['rows']
        check(len(rows)==5 and rows[-2]['name']=="O'Brien" and rows[-2]['preis']==12.5, 'Inserted values and defaults visible')
        check(bob.call('training.execute',{'mode':'practice','model':{'table':'produkte','action':'delete'}})[0]==422, 'Unqualified DELETE blocked')
        change={'table':'produkte','action':'update','values':{'bestand':'99'},'conditions':[{'column':'id','operator':'>','value':'0'}],'limit':1}
        check(bob.ok('training.execute',{'mode':'practice','model':change})['affected']==1, 'Practice UPDATE obeys LIMIT')
        check(sum(r['bestand']==99 for r in bob.ok('training.table',mode='practice',table='produkte')['rows'])==1, 'UPDATE changes only limited selection')
        remove={'table':'produkte','action':'delete','conditions':[{'column':'id','operator':'=','value':str(rows[-1]['id'])}],'limit':1}
        check(bob.ok('training.execute',{'mode':'practice','model':remove})['affected']==1, 'Qualified practice DELETE')
        check(bob.call('training.table',mode='practice',table='training_meta')[0]==404, 'Practice metadata inaccessible')
        check(bob.call('training.execute',{'mode':'practice','model':insert},csrf=False)[0]==403, 'Training writes require CSRF')
        check(anonymous.call('training.info')[0]==401, 'Training requires authentication')
        invalid_batch={'table':'kontakte','action':'insert','values':{'name':'Rollback','email':'new@example.test'},'rows':[{'name':'Rollback','email':'new@example.test'},{'name':'Duplicate','email':'mara@example.test'}]}
        check(bob.call('training.execute',{'mode':'practice','model':invalid_batch})[0]==422, 'Duplicate batch rejected')
        check(len(bob.ok('training.table',mode='practice',table='kontakte')['rows'])==3, 'Failed batch fully rolls back')
        peer=admin.ok('admin.user.save',{'name':'Training Peer','email':'training-peer@test.invalid','password':'secure-test-password','groups':[]})['id']
        peer_client=Client(base);peer_client.ok('bootstrap');peer_client.ok('login',{'portal':'user','email':'training-peer@test.invalid','password':'secure-test-password'});peer_client.ok('password',{'current':'secure-test-password','password':'changed-secure-password'})
        check(len(peer_client.ok('training.table',mode='practice',table='produkte')['rows'])==3, 'Practice data isolated by authenticated user')
        admin.ok('admin.user.delete',{'id':peer})
        check(not (pathlib.Path(private)/'sql-training'/f'{peer}.sqlite').exists(), 'Deleting user removes personal practice storage')
        bob.ok('training.reset',{})
        check(len(bob.ok('training.table',mode='practice',table='produkte')['rows'])==3, 'Reset restores personal samples')
        admin.ok('admin.settings',{'features':{'database':False},'hosts':['localhost']})
        check(bob.call('training.info')[0]==403 and bob.call('training.reset',{})[0]==403, 'Database feature restriction also covers training')
        # Teacher access is scoped to current shared-group membership, never an admin shortcut.
        class_a=admin.ok('admin.group.save',{'name':'Teacher Class A','description':'','features':{}})['id']
        class_b=admin.ok('admin.group.save',{'name':'Teacher Class B','description':'','features':{}})['id']
        def teacher_fixture(name,role,groups):
            ident=admin.ok('admin.user.save',{'name':name,'email':name+'@teacher.test','role':role,'password':'secure-test-password','groups':groups})['id']
            session=Client(base);session.ok('bootstrap');session.ok('login',{'portal':'user','email':name+'@teacher.test','password':'secure-test-password'});session.ok('password',{'current':'secure-test-password','password':'changed-secure-password'})
            return ident,session
        teacher_id,teacher=teacher_fixture('Teacher','teacher',[class_a])
        pupil_id,pupil=teacher_fixture('Pupil','user',[class_a,class_b])
        outsider_id,outsider=teacher_fixture('Outsider','user',[class_b])
        teacher_template=admin.ok('admin.template.save',{'name':'Teacher fixture','description':'','language':'web','active':True,'files':[{'path':'index.html','content':'Student work'}]})['id']
        private_project=pupil.ok('project.create',{'name':'Pupil personal','template':teacher_template})['id']
        outside_project=outsider.ok('project.create',{'name':'Outside personal','template':teacher_template})['id']
        shared_a=pupil.ok('project.create',{'name':'Shared A','template':teacher_template,'group':class_a})['id']
        shared_b=pupil.ok('project.create',{'name':'Shared B','template':teacher_template,'group':class_b})['id']
        check(teacher.call('admin.users')[0]==403,'Teacher cannot enter administration')
        wrong_portal=Client(base);wrong_portal.ok('bootstrap')
        check(wrong_portal.call('login',{'portal':'admin','email':'Teacher@teacher.test','password':'changed-secure-password'})[0]==401,'Teacher uses frontend portal only')
        check(pupil.call('teacher.participants')[0]==403,'Learner cannot enumerate teacher participants')
        members=teacher.ok('teacher.participants')['groups']
        check(len(members)==1 and members[0]['id']==class_a and [m['id'] for m in members[0]['members']]==[pupil_id],'Teacher sees only own group participants')
        check(set(members[0]['members'][0])=={'id','name','role'},'Participant picker excludes credentials and email')
        check(private_project not in [p['id'] for p in teacher.ok('projects')['projects']],'Default teacher list remains own workspace')
        scoped=teacher.ok('projects',participant=pupil_id,group=class_a)['projects']
        check(set(p['id'] for p in scoped)=={private_project,shared_a},'Selected participant shows personal and selected group projects only')
        check(teacher.call('projects',participant=pupil_id,group=class_b)[0]==403,'Cannot browse learner other group')
        check(teacher.call('projects',participant=outsider_id,group=class_a)[0]==403,'Cannot forge participant selection')
        check(pupil.call('projects',participant=teacher_id,group=class_a)[0]==403,'Learner cannot forge teacher mode')
        check(teacher.call('files',project=outside_project)[0]==404 and teacher.call('files',project=shared_b)[0]==404,'Direct project IDs do not bypass teacher scope')
        opened=teacher.ok('file',project=private_project,path='index.html')['file']
        teacher.ok('file.save',{'project':private_project,'path':'index.html','content':'Teacher feedback','version':opened['version']})
        check(pupil.ok('file',project=private_project,path='index.html')['file']['content']=='Teacher feedback','Teacher edits persist in pupil workspace')
        check(pupil.call('file.save',{'project':private_project,'path':'index.html','content':'Stale pupil edit','version':opened['version']})[0]==409,'Teacher/pupil overlapping writes cannot overwrite silently')
        check(teacher.ok('project.bundle',{'project':private_project})['files'][0]['content']=='Teacher feedback','Teacher can load authorized preview bundle')
        teacher.ok('project.rename',{'id':private_project,'name':'Reviewed project'})
        check(teacher.call('project.delete',{'id':private_project})[0]==403,'Teacher cannot delete pupil personal project')
        check(teacher.call('project.share',{'id':private_project,'group':class_a})[0]==403,'Teacher cannot transfer pupil ownership')
        teacher.ok('folder.create',{'project':private_project,'path':'feedback'})
        teacher.ok('file.save',{'project':private_project,'path':'feedback/review.txt','content':'Review','version':0})
        teacher.ok('file.rename',{'project':private_project,'path':'feedback/review.txt','new_path':'feedback/notes.txt'})
        check(any(f['path']=='feedback/notes.txt' for f in pupil.ok('files',project=private_project)['files']),'Teacher file management stays in selected workspace')
        check(teacher.call('file.save',{'project':private_project,'path':'index.html','content':'CSRF bypass','version':opened['version']},csrf=False)[0]==403,'Teacher writes require CSRF')
        admin.ok('admin.group.save',{'id':class_a,'name':'Teacher Class A','description':'','features':{},'users':[pupil_id]})
        check(teacher.call('file',project=private_project,path='index.html')[0]==404,'Removing teacher membership revokes open file access')
        check(teacher.call('file.save',{'project':private_project,'path':'index.html','content':'After revoke','version':2})[0]==404,'Removing membership revokes saving immediately')
        check(teacher.call('project.bundle',{'project':private_project})[0]==404,'Removing membership revokes preview bundle')
        check(teacher.ok('teacher.participants')['groups']==[],'Removed group disappears from teacher picker')
        admin.ok('admin.group.save',{'id':class_a,'name':'Teacher Class A','description':'','features':{},'users':[teacher_id]})
        check(teacher.call('files',project=private_project)[0]==404,'Removing participant membership also revokes access')
        admin.ok('admin.user.save',{'id':teacher_id,'name':'Teacher','email':'Teacher@teacher.test','role':'user','password':'','groups':[class_a]})
        check(teacher.call('teacher.participants')[0]==401,'Changing teacher role revokes existing session')
        downgraded=Client(base);downgraded.ok('bootstrap');downgraded.ok('login',{'portal':'user','email':'Teacher@teacher.test','password':'changed-secure-password'})
        check(downgraded.call('teacher.participants')[0]==403,'Downgraded user cannot use teacher picker')
        check(downgraded.call('files',project=private_project)[0]==404,'Downgraded user cannot read former pupil files')
        print(f'{CHECKS} API/security integration checks passed.')
    finally:
        server.terminate();server.wait(timeout=10)
