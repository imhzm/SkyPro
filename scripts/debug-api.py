import os
import paramiko

HOST = os.environ.get('SKYPRO_SSH_HOST', '147.79.66.116')
PORT = int(os.environ.get('SKYPRO_SSH_PORT', '22'))
USER = os.environ.get('SKYPRO_SSH_USER', 'root')
PASSWORD = os.environ.get('SKYPRO_SSH_PASSWORD')
MYSQL_ROOT_PASSWORD = os.environ.get('SKYPRO_MYSQL_ROOT_PASSWORD')

def run_command(ssh, command, timeout=60):
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
if not PASSWORD:
    raise RuntimeError('Set SKYPRO_SSH_PASSWORD before running this script.')
ssh.connect(HOST, PORT, USER, PASSWORD)
if not MYSQL_ROOT_PASSWORD:
    raise RuntimeError('Set SKYPRO_MYSQL_ROOT_PASSWORD before running DB diagnostics.')

print('Debugging API...')

# Check PHP error log
out, err = run_command(ssh, 'cat /var/log/nginx/error.log | tail -20')
print('Nginx errors:')
print(out if out else 'None')
print()

# Test PHP directly
out, err = run_command(ssh, 'php /var/www/html/sender-pro-api/validate.php 2>&1')
print('PHP direct test:')
print(out[:500] if out else 'No output')
print()

# Check if curl gets any response
out, err = run_command(ssh, 'curl -v -X POST http://127.0.0.1/sender-pro-api/validate.php -H "Content-Type: application/json" -d \'{"key":"SKY1-PRO2-0001-2026","deviceId":"test"}\' 2>&1')
print('Curl verbose (last 400 chars):')
print(out[-400:] if out else 'No output')
print()

# Check file permissions
out, err = run_command(ssh, 'ls -la /var/www/html/sender-pro-api/')
print('File permissions:')
print(out)
print()

# Check PHP-FPM status
out, err = run_command(ssh, 'systemctl status php8.4-fpm --no-pager 2>/dev/null | head -5')
print('PHP-FPM status:')
print(out)
print()

# Check MySQL connection from PHP
php_password = MYSQL_ROOT_PASSWORD.replace('\\', '\\\\').replace('"', '\\"')
php_test = '''<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=senderpro;charset=utf8mb4", "root", "__MYSQL_PASSWORD__");
    echo "DB OK";
} catch (PDOException $e) {
    echo "DB FAIL: " . $e->getMessage();
}
'''.replace('__MYSQL_PASSWORD__', php_password)
sftp = ssh.open_sftp()
with sftp.file('/var/www/html/test-db.php', 'w') as f:
    f.write(php_test)
sftp.close()

out, err = run_command(ssh, 'curl -s http://127.0.0.1/test-db.php 2>&1')
print('DB connection test:')
print(out)
print()

ssh.close()
print('Debug complete')
