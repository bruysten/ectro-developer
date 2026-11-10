"""Exercise shipped .htaccess with real Apache; synthetic CGI records transport only.
No PHP, credentials, database, external requests or system configuration changes.
"""
import json,os,shutil,socket,subprocess,sys,tempfile,time,urllib.error,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
apache=shutil.which('httpd') or shutil.which('apache2')
modules=next((p for p in [Path('/usr/libexec/apache2'),Path('/usr/lib/apache2/modules')] if (p/'mod_rewrite.so').exists()),None)
if not apache or not modules:
    if os.environ.get('CI'):raise RuntimeError('Apache is required for the production MCP routing regression test')
    print('Apache routing test skipped: Apache/modules unavailable.');sys.exit(0)
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args):return None
with tempfile.TemporaryDirectory(prefix='ectro-apache-mcp-') as td:
    base=Path(td);public=base/'public';public.mkdir();cgi=base/'cgi';cgi.mkdir()
    # Copy the real public routes, not unrelated runtimes or local configuration.
    for name in ['mcp','oauth','.well-known']:shutil.copytree(root/'public'/name,public/name)
    (public/'ordinary').mkdir();(public/'app').mkdir();(public/'app/private.php').write_text('private-fixture')
    shipped=(root/'public/.htaccess').read_text()
    # Baseline reproduces DirectorySlash's POST-breaking redirect independently.
    (public/'.htaccess').write_text('Options -Indexes\nRequire all granted\nDirectoryIndex index.php\n')
    probe=cgi/'probe.py';probe.write_text('#!'+sys.executable+'\n'+'''import os,sys,json
body=sys.stdin.read(int(os.environ.get('CONTENT_LENGTH',0)))
print('Content-Type: application/json\\n')
print(json.dumps({'uri':os.environ.get('REQUEST_URI'),'target':os.environ.get('PATH_TRANSLATED'),'method':os.environ.get('REQUEST_METHOD'),'authorization':os.environ.get('HTTP_AUTHORIZATION'),'body':body}))
''');probe.chmod(0o700)
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    mods=['mpm_prefork','authz_core','authz_host','unixd','dir','autoindex','mime','rewrite','headers','actions','alias','cgi']
    # Some Linux distributions compile unixd into the binary.
    builtin=subprocess.check_output([apache,'-l'],text=True)
    loads=[f'LoadModule {m}_module "{modules}/mod_{m}.so"' for m in mods if f'mod_{m}.c' not in builtin]
    conf=base/'httpd.conf';error=base/'error.log'
    conf.write_text('\n'.join([f'ServerRoot "{base}"',f'DefaultRuntimeDir "{base}"',f'Listen 127.0.0.1:{port}','ServerName localhost',f'PidFile "{base}/pid"',f'ErrorLog "{error}"','LogLevel warn',*loads,f'DocumentRoot "{public}"','<Directory />','AllowOverride None','Require all denied','</Directory>',f'<Directory "{public}">','AllowOverride All','Require all granted','</Directory>',f'ScriptAlias /_probe/ "{cgi}/"',f'<Directory "{cgi}">','Options +ExecCGI','CGIPassAuth On','Require all granted','</Directory>','AddHandler application/x-httpd-php .php','Action application/x-httpd-php /_probe/probe.py','TypesConfig /dev/null']))
    proc=subprocess.Popen([apache,'-f',str(conf),'-DFOREGROUND'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,start_new_session=True)
    client=urllib.request.build_opener(NoRedirect())
    def request(path,body=None):
        req=urllib.request.Request(f'http://127.0.0.1:{port}'+path,data=body.encode() if body is not None else None,headers={'Content-Type':'application/json','Authorization':'Bearer synthetic-transport-only'})
        try:r=client.open(req,timeout=4)
        except urllib.error.HTTPError as e:r=e
        return r.code,r.headers,r.read().decode()
    try:
        for _ in range(60):
            if proc.poll() is not None:raise RuntimeError(proc.stderr.read().decode())
            try:status,headers,_=request('/mcp','{}');break
            except urllib.error.URLError:time.sleep(.05)
        else:raise RuntimeError('Apache did not start')
        assert status==301 and headers['Location'].endswith('/mcp/'),'Baseline must reproduce the live-server redirect'
        (public/'.htaccess').write_text(shipped)
        routes=['/mcp','/oauth/authorize','/oauth/register','/oauth/token','/oauth/revoke','/.well-known/oauth-authorization-server','/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp']
        for route in routes:
            for slash in ['', '/']:
                path=route+slash
                for body in [None,'{"jsonrpc":"2.0","id":1,"method":"initialize"}']:
                    status,headers,raw=request(path,body)
                    assert status==200 and 'Location' not in headers,(path,status,raw,error.read_text())
                    data=json.loads(raw)
                    assert data['method']==('GET' if body is None else 'POST') and data['body']==(body or ''),(path,data)
                    assert data['uri']==path and data['target']==str(public/route.lstrip('/')/'index.php'),(path,data)
                    assert data['authorization']=='Bearer synthetic-transport-only',(path,data)
        status,_,raw=request('/oauth/authorize?state=synthetic%2Bstate');assert status==200 and json.loads(raw)['uri'].endswith('?state=synthetic%2Bstate')
        assert request('/app/private.php')[0]==403
        assert request('/ordinary')[0]==301 and request('/ordinary/')[0]==403,'Directory protection elsewhere must remain unchanged'
        print('Apache MCP routing verified: reproduced original 301; all 16 URL spellings preserve POST/GET, body, query, Bearer header and PHP target without redirects. Private paths and ordinary directories stay protected.')
    finally:
        proc.terminate();proc.wait(timeout=5)
