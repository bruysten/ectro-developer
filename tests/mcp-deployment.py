"""Canonical server publication survives deployment upgrades; no hosting credentials or network calls."""
import json,os,shutil,subprocess,tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='ectro-mcp-deploy-') as tmp:
    base=Path(tmp);shutil.copytree(root/'app',base/'app');(base/'scripts').mkdir();shutil.copy2(root/'scripts/prepare.php',base/'scripts/prepare.php')
    for name in ['assets/app.js','assets/runtime/php/8_4_25/php_8_4.wasm','assets/runtime/python/python_stdlib.zip','assets/fonts/fonts.css']:
        f=base/'public'/name;f.parent.mkdir(parents=True,exist_ok=True);f.write_text('synthetic-preflight-file')
    env={k:v for k,v in os.environ.items() if k not in ['APP_PUBLIC_URL','APP_DATA_DIR','APP_ENV','APP_KEY','APP_SETUP_TOKEN']}
    def prepare(data,ok=True):
        p=subprocess.run(['php','scripts/prepare.php','--stdin'],cwd=base,env=env,input=json.dumps(data),text=True,capture_output=True)
        assert (p.returncode==0)==ok,p.stdout+p.stderr
        return p
    def inspect(extra=''):
        code="require 'app/bootstrap.php';require 'app/templates.php';require 'app/mysql.php';require 'app/lab-api.php';"+extra+"echo json_encode(['origin'=>settings()['mcp_public_url']??null,'endpoint'=>agentMcpEndpoint(),'metadata'=>agentMcpEndpoint()['public']?mcpOAuthMetadata(false):null]);"
        return json.loads(subprocess.check_output(['php','-r',code],cwd=base,env=env,text=True))
    token='synthetic-deployment-setup-token-at-least-32'
    prepare({'setup_token':token,'public_url':'http://localhost'},False);assert not (base/'config.local.php').exists()
    prepare({'setup_token':token,'public_url':'https://ectro-academy.de/'})
    before=(base/'config.local.php').read_bytes();r=inspect();assert r['endpoint']=={'url':'https://ectro-academy.de/mcp/','public':True};assert r['metadata']['issuer']=='https://ectro-academy.de'
    prepare({'setup_token':'replacement-token-must-not-replace-existing-key','public_url':'https://academy.example.org'})
    assert (base/'config.local.php').read_bytes()==before
    assert inspect()['endpoint']['url']=='https://academy.example.org/mcp/'
    prepare({'setup_token':token});assert inspect()['origin']=='https://academy.example.org'
    for invalid in ['https://localhost','https://a.internal','https://example.org/path','https://user:pass@example.org','https://example.org?x=1','https://example.org:8443',None]:
        prepare({'public_url':invalid},False);assert inspect()['origin']=='https://academy.example.org';assert (base/'config.local.php').read_bytes()==before
    prepare({'public_url':''});r=inspect("$_SERVER['HTTP_HOST']='evil.example';$_SERVER['HTTP_X_FORWARDED_HOST']='ectro-academy.de';$_SERVER['HTTPS']='on';")
    assert r['endpoint']=={'url':'','public':False},'Request headers cannot invent an OAuth issuer'
    assert 'key' not in prepare({'public_url':'https://ectro-academy.de'}).stdout.lower()
print('MCP deployment verified: fresh install, upgrade, canonical discovery, preserved encryption/config, no-op and invalid inputs, no Host/Forwarded inference.')
