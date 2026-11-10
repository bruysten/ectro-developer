"""Exercise the actual standalone MCP/OAuth endpoints against a disposable local Academy."""
import base64,hashlib,http.cookiejar,json,os,re,socket,subprocess,tempfile,time,urllib.error,urllib.parse,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args): return None
with tempfile.TemporaryDirectory(prefix='ectro-agent-http-') as private:
    env={**os.environ,'APP_DATA_DIR':private,'APP_ENV':'development','APP_KEY':base64.b64encode(os.urandom(32)).decode()}
    seed=r'''require 'app/bootstrap.php';require 'app/templates.php';require 'app/mysql.php';require 'app/lab-api.php';$uid=id();query('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',[$uid,'MCP HTTP Test','mcp-http@example.test',password_hash('synthetic-local-password',PASSWORD_DEFAULT),'user',now()]);query('INSERT INTO connections VALUES(?,?,?,?,?)',[$uid,'localhost','synthetic','synthetic',encryptSecret('synthetic-fake')]);$u=one('SELECT * FROM users WHERE id=?',[$uid]);$hash=agentMcpConnectionHash(agentMcpConnection($u,null));query('INSERT INTO agent_mcp_profiles(user_id,selection,max_rows,enabled,connection_hash,updated_at) VALUES(?,?,?,?,?,?)',[$uid,'{"courses":["id","name"]}',5,1,$hash,now()]);'''
    subprocess.run(['php','-r',seed],cwd=root,env=env,check=True,capture_output=True)
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    base=f'http://127.0.0.1:{port}'
    with open(Path(private)/'server.log','w') as log:
        server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t','public','scripts/router.php'],cwd=root,env=env,stdout=log,stderr=log)
        try:
            cookie=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()),NoRedirect())
            external=urllib.request.build_opener(NoRedirect())
            def request(path,data=None,headers=None,client=external,form=False):
                if data is not None:
                    encoded=urllib.parse.urlencode(data).encode() if form else json.dumps(data).encode()
                else:encoded=None
                h={'Content-Type':'application/x-www-form-urlencoded' if form else 'application/json',**(headers or {})}
                req=urllib.request.Request(base+path,data=encoded,headers=h)
                try:r=client.open(req,timeout=5)
                except urllib.error.HTTPError as e:r=e
                raw=r.read().decode();return r.code,r.headers,raw
            for _ in range(80):
                try:
                    status,_,raw=request('/api/?action=bootstrap',client=cookie)
                    if status==200:break
                except urllib.error.URLError:time.sleep(.03)
            csrf=json.loads(raw)['csrf']
            status,_,raw=request('/api/?action=login',{'email':'mcp-http@example.test','password':'synthetic-local-password','portal':'user'},{'X-CSRF-Token':csrf},cookie);assert status==200,raw
            csrf=json.loads(raw)['csrf']
            def api(name,data):
                status,_,raw=request('/api/?action='+name,data,{'X-CSRF-Token':csrf},cookie);assert status==200,(name,status,raw);return json.loads(raw)
            status,headers,raw=request('/mcp/',{'jsonrpc':'2.0','id':1,'method':'initialize'});assert status==401 and 'resource_metadata=' in headers['WWW-Authenticate']
            status,_,raw=request('/.well-known/oauth-protected-resource/mcp');assert status==200 and json.loads(raw)['resource']==base+'/mcp/'
            status,_,raw=request('/.well-known/oauth-authorization-server');assert status==200 and json.loads(raw)['issuer']==base
            redirect='https://chatgpt.com/connector_platform_oauth_redirect'
            status,_,raw=request('/oauth/register/',{'redirect_uris':[redirect],'client_name':'Synthetic test','token_endpoint_auth_method':'none'});assert status==201,raw
            client_id=json.loads(raw)['client_id'];verifier='v'*64;challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
            args={'client_id':client_id,'redirect_uri':redirect,'response_type':'code','code_challenge_method':'S256','code_challenge':challenge,'resource':base+'/mcp/','scope':'db:read','state':'synthetic-state'}
            status,headers,html=request('/oauth/authorize/?'+urllib.parse.urlencode(args),client=cookie);assert "form-action 'self' "+redirect in headers['Content-Security-Policy'];assert status==200 and 'courses' in html and 'Verbinden &amp;' not in html
            nonce=re.search(r'name="nonce" value="([a-f0-9]+)"',html).group(1)
            status,_,_=request('/oauth/authorize/',{'csrf':'wrong','nonce':nonce,'decision':'allow'},client=cookie,form=True);assert status==403 # Human-readable error page, never a redirect.
            status,_,html=request('/oauth/authorize/?'+urllib.parse.urlencode(args),client=cookie);nonce=re.search(r'name="nonce" value="([a-f0-9]+)"',html).group(1)
            status,headers,_=request('/oauth/authorize/',{'csrf':csrf,'nonce':nonce,'decision':'allow'},client=cookie,form=True);assert status==303
            callback=urllib.parse.parse_qs(urllib.parse.urlsplit(headers['Location']).query);assert callback['state']==['synthetic-state'] and callback['iss']==[base]
            token_data={'grant_type':'authorization_code','client_id':client_id,'code':callback['code'][0],'redirect_uri':redirect,'resource':base+'/mcp/','code_verifier':verifier}
            status,_,raw=request('/oauth/token/',token_data,form=True);assert status==200,raw
            tokens=json.loads(raw);auth={'Authorization':'Bearer '+tokens['access_token']}
            for method,params in [('initialize',{'protocolVersion':'2025-11-25'}),('tools/list',{}),('tools/call',{'name':'db.list_tables','arguments':{}})]:
                status,_,raw=request('/mcp/',{'jsonrpc':'2.0','id':1,'method':method,'params':params},auth);assert status==200 and 'result' in json.loads(raw),(method,status,raw)
            assert json.loads(raw)['result']['isError'] is False and 'courses' in raw
            status,_,_=request('/mcp/',{'jsonrpc':'2.0','method':'notifications/initialized'},auth);assert status==202
            status,_,_=request('/mcp/',{'jsonrpc':'2.0','id':2,'method':'tools/list'},{**auth,'Origin':'https://evil.example'});assert status==403
            status,_,raw=request('/mcp/',{'jsonrpc':'2.0','id':3,'method':'tools/call','params':{'name':'db.read_rows','arguments':{'table':'secrets'}}},auth);assert status==200 and json.loads(raw)['result']['isError']
            status,_,_=request('/oauth/token/',token_data,form=True);assert status==400
            refreshed={'grant_type':'refresh_token','client_id':client_id,'resource':base+'/mcp/','refresh_token':tokens['refresh_token']}
            status,_,raw=request('/oauth/token/',refreshed,form=True);assert status==200
            new=json.loads(raw)
            # A write-capable profile never broadens an existing read-only OAuth consent.
            write_seed=r"""require 'app/bootstrap.php';query('UPDATE agent_mcp_profiles SET write_selection=?',[json_encode(['courses'=>['columns'=>['name'],'insert'=>true,'update'=>true]])]);"""
            subprocess.run(['php','-r',write_seed],cwd=root,env=env,check=True,capture_output=True)
            status,_,raw=request('/mcp/',{'jsonrpc':'2.0','id':5,'method':'tools/list'},auth);assert status==200 and len(json.loads(raw)['result']['tools'])==3
            status,_,raw=request('/mcp/',{'jsonrpc':'2.0','id':6,'method':'tools/call','params':{'name':'db.prepare_change','arguments':{'operation':'update','table':'courses','key':{'id':1},'values':{'name':'Forbidden'}}}},auth);assert status==200 and json.loads(raw)['result']['isError']
            def consent_write(approve):
                status,_,html=request('/oauth/authorize/?'+urllib.parse.urlencode({**args,'scope':'db:read db:write'}),client=cookie)
                assert status==200 and 'Auch Schreibzugriff erlauben' in html and 'name="write_access" value="yes"' in html and 'checked' not in html
                nonce=re.search(r'name="nonce" value="([a-f0-9]+)"',html).group(1)
                status,headers,_=request('/oauth/authorize/',{'csrf':csrf,'nonce':nonce,'decision':'allow',**({'write_access':'yes'} if approve else {})},client=cookie,form=True);assert status==303
                code=urllib.parse.parse_qs(urllib.parse.urlsplit(headers['Location']).query)['code'][0]
                status,_,raw=request('/oauth/token/',{**token_data,'code':code},form=True);assert status==200,raw
                return json.loads(raw)
            read_consent=consent_write(False);assert read_consent['scope']=='db:read'
            write_consent=consent_write(True);assert write_consent['scope']=='db:read db:write'
            write_auth={'Authorization':'Bearer '+write_consent['access_token']}
            status,_,raw=request('/mcp/',{'jsonrpc':'2.0','id':7,'method':'tools/list'},write_auth);assert status==200 and len(json.loads(raw)['result']['tools'])==5
            # Refresh can narrow scope, never enlarge it; rejected escalation must not consume the refresh token.
            ref={**refreshed,'refresh_token':read_consent['refresh_token']}
            status,_,_=request('/oauth/token/',{**ref,'scope':'db:read db:write'},form=True);assert status==400
            status,_,raw=request('/oauth/token/',ref,form=True);assert status==200 and json.loads(raw)['scope']=='db:read',raw
            status,_,raw=request('/oauth/token/',{**refreshed,'refresh_token':write_consent['refresh_token'],'scope':'db:read'},form=True);assert status==200 and json.loads(raw)['scope']=='db:read',raw
            status,_,raw=request('/mcp/',{'jsonrpc':'2.0','id':8,'method':'tools/list'},write_auth);assert status==200 and len(json.loads(raw)['result']['tools'])==3
            # Cross-site initial navigation cannot replace an existing Strict Academy session cookie.
            status,headers,html=request('/oauth/authorize/?'+urllib.parse.urlencode(args),client=external)
            assert status==200 and 'Mit Academy fortfahren' in html and 'Set-Cookie' not in headers
            status,_,raw=request('/api/?action=bootstrap',client=cookie);assert json.loads(raw)['user']['name']=='MCP HTTP Test'
            # More than five tabs and a refresh keep every independent request alive.
            tabs=[]
            for i in range(8):
                status,_,html=request('/oauth/authorize/?'+urllib.parse.urlencode({**args,'state':'parallel-'+str(i)}),client=cookie)
                assert status==200;tabs.append(re.search(r'name="nonce" value="([a-f0-9]+)"',html).group(1))
            status,_,html=request('/oauth/authorize/?'+urllib.parse.urlencode({**args,'state':'parallel-0'}),client=cookie)
            assert re.search(r'name="nonce" value="([a-f0-9]+)"',html).group(1)==tabs[0]
            status,headers,_=request('/oauth/authorize/',{'csrf':csrf,'nonce':tabs[0],'decision':'allow'},client=cookie,form=True);assert status==303
            callback=urllib.parse.parse_qs(urllib.parse.urlsplit(headers['Location']).query);assert callback['state']==['parallel-0']
            status,_,html=request('/oauth/authorize/',{'csrf':csrf,'nonce':tabs[0],'decision':'allow'},client=cookie,form=True)
            assert status==200 and 'Freigabe bereits bestätigt' in html and 'name="nonce"' not in html
            # Expiry always returns to a fresh review on this server, never silently approving.
            expire="require 'app/bootstrap.php';query('UPDATE mcp_oauth_consents SET expires=? WHERE hash=?',[time()-1,'"+hashlib.sha256(tabs[1].encode()).hexdigest()+"']);"
            subprocess.run(['php','-r',expire],cwd=root,env=env,check=True,capture_output=True)
            status,headers,_=request('/oauth/authorize/',{'csrf':csrf,'nonce':tabs[1],'decision':'allow'},client=cookie,form=True)
            assert status==303 and headers['Location'].startswith('/oauth/authorize/?resume=')
            status,_,html=request(headers['Location'],client=cookie);assert status==200 and 'aktuelle Auswahl erneut prüfen' in html
            renewed_nonce=re.search(r'name="nonce" value="([a-f0-9]+)"',html).group(1);assert renewed_nonce!=tabs[1]
            status,headers,_=request('/oauth/authorize/',{'csrf':csrf,'nonce':renewed_nonce,'decision':'allow'},client=cookie,form=True);assert status==303
            assert urllib.parse.parse_qs(urllib.parse.urlsplit(headers['Location']).query)['state']==['parallel-1']
            # Re-login rotates session and CSRF, but server-side consent can still be reviewed again.
            old_csrf=csrf;api('login',{'email':'mcp-http@example.test','password':'synthetic-local-password','portal':'user'})
            status,_,raw=request('/api/?action=bootstrap',client=cookie);csrf=json.loads(raw)['csrf'];assert csrf!=old_csrf
            status,_,html=request('/oauth/authorize/',{'csrf':old_csrf,'nonce':tabs[2],'decision':'allow'},client=cookie,form=True)
            assert status==403 and 'Freigabe erneut prüfen' in html
            status,_,html=request('/oauth/authorize/?resume='+tabs[2],client=cookie);assert status==200 and 'name="nonce"' in html
            # A missing session gets a recovery route without overwriting the main cookie.
            status,headers,html=request('/oauth/authorize/',{'csrf':csrf,'nonce':tabs[3],'decision':'allow'},client=external,form=True)
            assert status==403 and 'Freigabe erneut prüfen' in html and 'Set-Cookie' not in headers
            status,headers,_=request('/oauth/authorize/',{'csrf':csrf,'nonce':tabs[4],'decision':'deny'},client=cookie,form=True);assert status==303 and 'access_denied' in headers['Location']
            status,_,html=request('/oauth/authorize/',{'csrf':csrf,'nonce':tabs[4],'decision':'allow'},client=cookie,form=True);assert status==200 and 'Verbindung abgebrochen' in html
            api('studio.mcp.disable',{})
            status,_,_=request('/mcp/',{'jsonrpc':'2.0','id':4,'method':'tools/list'},{'Authorization':'Bearer '+new['access_token']});assert status in (401,403)
            status,_,_=request('/oauth/token/',{**refreshed,'refresh_token':new['refresh_token']},form=True);assert status==400
            print('Standalone MCP/OAuth HTTP flow verified: discovery, login/consent, CSRF, DCR, PKCE, tools, Origin, code replay, refresh, explicit read/write consent, scope narrowing, parallel tabs, re-login, expiry recovery, repeated submits and immediate disable. No third-party requests.')
        finally:
            server.terminate();server.wait(timeout=5)
