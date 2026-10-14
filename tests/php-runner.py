"""Exercise the production PHP runner against a disposable MySQL protocol fixture."""
import base64
import json
import os
from pathlib import Path
import shlex
import shutil
import socket
import struct
import subprocess
import tempfile
import threading

ROOT = Path(__file__).resolve().parents[1]
PHP = shutil.which('php')
HARNESS = r'''
require $argv[1].'/app/bootstrap.php';
require $argv[1].'/app/mysql.php';
require $argv[1].'/app/php-runner.php';
$source=json_decode(stream_get_contents(STDIN),true,512,JSON_THROW_ON_ERROR);
$uid=str_repeat('a',32);$pid=str_repeat('b',32);
query("INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)",[$uid,'Runner test','runner@test.invalid','unused','user',now()]);
query("INSERT INTO projects(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)",[$pid,$uid,'Runner test',now(),now()]);
query("INSERT INTO files(id,project_id,path,content,updated_at) VALUES(?,?,?,?,?)",[id(),$pid,'db.php',$source,now()]);
query("INSERT INTO files(id,project_id,path,content,updated_at) VALUES(?,?,?,?,?)",[id(),$pid,'private.txt','project-secret-must-not-be-imported',now()]);
query("INSERT INTO settings(key,value) VALUES('php_execution_mode','\"server\"'),('db_allowed_hosts','[\"127.0.0.1\"]')");
$result=runProjectPhp(one('SELECT * FROM users WHERE id=?',[$uid]),['project'=>$pid,'path'=>'db.php','query'=>'']);
$result['temporary_runs']=count(glob(dataDir().'/php-runs/*'));
echo json_encode($result,JSON_THROW_ON_ERROR);
'''


def packet(connection, payload, sequence):
    connection.sendall(len(payload).to_bytes(3, 'little') + bytes([sequence]) + payload)


def read_packet(connection):
    def read(size):
        data = b''
        while len(data) < size:
            chunk = connection.recv(size - len(data))
            if not chunk:
                raise EOFError('MySQL fixture connection closed')
            data += chunk
        return data
    header = read(4)
    return read(int.from_bytes(header[:3], 'little'))


def mysql_fixture(listener, imported, errors):
    try:
        with listener.accept()[0] as connection:
            connection.settimeout(10)
            capabilities = 0x000AA28D  # Protocol 4.1, secure auth, database, local files.
            greeting = (b'\x0a8.0.0-fixture\x00' + struct.pack('<I', 1)
                        + b'12345678\x00' + struct.pack('<H', capabilities & 0xffff)
                        + b'\x2d' + struct.pack('<HH', 2, capabilities >> 16)
                        + b'\x15' + b'\x00' * 10 + b'abcdefghijkl\x00mysql_native_password\x00')
            packet(connection, greeting, 0)
            read_packet(connection)  # Authentication uses disposable fixture credentials.
            packet(connection, b'\x00\x00\x00\x02\x00\x00\x00', 2)
            while True:
                command = read_packet(connection)
                if command[0] == 1:  # COM_QUIT
                    break
                assert command[0] == 3, f'Unexpected MySQL command: {command[0]}'
                packet(connection, b'\xfbprivate.txt', 1)  # Server requests a local file.
                imported.append(read_packet(connection))
                packet(connection, b'\x00\x00\x00\x02\x00\x00\x00', 3)
    except Exception as error:
        errors.append(error)


with tempfile.TemporaryDirectory(prefix='ectro-php-runner-') as scratch:
    scratch = Path(scratch).resolve()
    app = scratch / 'application'
    shutil.copytree(ROOT / 'app', app / 'app')
    wrapper = scratch / 'php-cli'
    # Reproduce hosting php.ini files that explicitly set an empty import directory.
    wrapper.write_text('#!/bin/sh\nexec ' + shlex.quote(PHP) + ' -d mysqli.local_infile_directory= "$@"\n')
    wrapper.chmod(0o700)
    (app / 'config.local.php').write_text('<?php return ["php_cli_binary"=>' + json.dumps(str(wrapper)) + '];')
    for index, method in enumerate(['constructor', 'procedural', 'real_connect', 'local_infile']):
        with socket.socket() as listener:
            listener.bind(('127.0.0.1', 0))
            listener.listen(1)
            listener.settimeout(10)
            port = listener.getsockname()[1]
            imported, errors = [], []
            thread = threading.Thread(target=mysql_fixture, args=(listener, imported, errors), daemon=True)
            thread.start()
            args = f'"127.0.0.1","fixture","unused","fixture",{port}'
            connect = {
                'procedural': f'$conn=mysqli_connect({args});',
                'real_connect': f'$conn=mysqli_init();$conn->real_connect({args});',
            }.get(method, f'$conn=new mysqli({args});')
            source = '<?php ' + connect + '\n'
            source += 'if(ini_get("mysqli.allow_local_infile")!=="0")throw new Exception("Local infile enabled");'
            source += 'if(@file_get_contents(dirname($_SERVER["DOCUMENT_ROOT"],2)."/app.sqlite")!==false)throw new Exception("Private storage accessible");'
            if method == 'local_infile':
                source += 'try{@$conn->query("LOAD DATA LOCAL INFILE \'private.txt\' INTO TABLE fixture");throw new Exception("Local import accepted");}catch(mysqli_sql_exception $e){echo "IMPORT_BLOCKED";}'
            else:
                source += 'echo "CONNECTED";'
            source += '$conn->close();'
            env = dict(os.environ, APP_DATA_DIR=str(scratch / f'data-{index}'), APP_KEY=base64.b64encode(os.urandom(32)).decode())
            run = subprocess.run([PHP, '-r', HARNESS, str(app)], input=json.dumps(source), text=True, capture_output=True, env=env, timeout=15)
            thread.join(10)
            assert not thread.is_alive(), 'MySQL fixture did not finish'
            assert not errors, errors
            assert run.returncode == 0 and not run.stderr, run.stdout + run.stderr
            result = json.loads(run.stdout)
            assert result['exit_code'] == 0 and not result['errors'], result
            assert result['output'] == ('IMPORT_BLOCKED' if method == 'local_infile' else 'CONNECTED'), result
            assert result['temporary_runs'] == 0, 'Run directory was not cleaned'
            assert imported == ([b''] if method == 'local_infile' else []), 'Project files were sent to the database'
            print(f'{method}: passed')
