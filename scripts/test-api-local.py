import paramiko

HOST = '147.79.66.116'
PORT = 22
USER = 'root'
PASSWORD = 'Newjoker2k333'

def run_command(ssh, command, timeout=30):
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD)

# Test API from server itself via localhost
out, err = run_command(ssh, '''curl -s -X POST http://127.0.0.1/sender-pro-api/validate.php -H "Content-Type: application/json" -d '{"key":"SKY1-PRO2-0001-2026","deviceId":"test"}' 2>&1''')
print('Localhost POST:', out)
print()

# Test with GET (should fail differently)
out, err = run_command(ssh, '''curl -s "http://127.0.0.1/sender-pro-api/validate.php?key=SKY1-PRO2-0001-2026" 2>&1''')
print('Localhost GET:', out)
print()

# Test status.php
out, err = run_command(ssh, '''curl -s "http://127.0.0.1/sender-pro-api/status.php?key=SKY1-PRO2-0001-2026" 2>&1''')
print('Status GET:', out)
print()

# Check PHP input issue - create debug script
debug_php = '''<?php
$data = json_decode(file_get_contents('php://input'), true);
echo json_encode([
    'method' => $_SERVER['REQUEST_METHOD'],
    'input' => file_get_contents('php://input'),
    'post' => $_POST,
    'get' => $_GET,
    'headers' => getallheaders(),
]);
'''

sftp = ssh.open_sftp()
with sftp.file('/var/www/html/sender-pro-api/debug.php', 'w') as f:
    f.write(debug_php)
sftp.close()

out, err = run_command(ssh, '''curl -s -X POST http://127.0.0.1/sender-pro-api/debug.php -H "Content-Type: application/json" -d '{"test":"value"}' 2>&1''')
print('Debug POST:', out)
print()

ssh.close()
print('Done')
