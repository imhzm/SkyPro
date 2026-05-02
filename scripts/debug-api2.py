import os
import paramiko

HOST = os.environ.get('SKYPRO_SSH_HOST', '147.79.66.116')
PORT = int(os.environ.get('SKYPRO_SSH_PORT', '22'))
USER = os.environ.get('SKYPRO_SSH_USER', 'root')
PASSWORD = os.environ.get('SKYPRO_SSH_PASSWORD')
MYSQL_ROOT_PASSWORD = os.environ.get('SKYPRO_MYSQL_ROOT_PASSWORD')

def run_command(ssh, command, timeout=30):
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

# Check Nginx error log
out, err = run_command(ssh, 'cat /var/log/nginx/error.log | tail -20')
print('Nginx errors:')
print(out if out else 'None')
print()

# Test PHP syntax only
out, err = run_command(ssh, 'php -l /var/www/html/sender-pro-api/validate.php')
print('PHP syntax check:')
print(out if out else 'Syntax OK')
if err:
    print('Syntax error:', err)
print()

# Test config.php syntax
out, err = run_command(ssh, 'php -l /var/www/html/sender-pro-api/config.php')
print('Config syntax:')
print(out if out else 'Syntax OK')
print()

# Test with curl (POST with data)
out, err = run_command(ssh, 'curl -s -w "\\nHTTP_CODE:%{http_code}" -X POST http://127.0.0.1/sender-pro-api/validate.php -H "Content-Type: application/json" -d \'{"key":"SKY1-PRO2-0001-2026","deviceId":"test"}\' 2>&1')
print('Curl POST test:')
print(out[-500:] if out else 'No output')
print()

# Test status.php (GET)
out, err = run_command(ssh, 'curl -s -w "\\nHTTP_CODE:%{http_code}" "http://127.0.0.1/sender-pro-api/status.php?key=SKY1-PRO2-0001-2026" 2>&1')
print('Curl GET test:')
print(out[-500:] if out else 'No output')
print()

# Check file permissions
out, err = run_command(ssh, 'ls -la /var/www/html/sender-pro-api/')
print('File permissions:')
print(out)
print()

# Check PHP-FPM
out, err = run_command(ssh, 'systemctl is-active php8.4-fpm')
print('PHP-FPM active:', out)
print()

# Test DB connection via simple PHP
php_password = MYSQL_ROOT_PASSWORD.replace('\\', '\\\\').replace('"', '\\"')
php_test = '''<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=senderpro;charset=utf8mb4", "root", "__MYSQL_PASSWORD__");
    echo "DB_OK";
} catch (PDOException $e) {
    echo "DB_FAIL:" . $e->getMessage();
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

# Clean up test file
run_command(ssh, 'rm -f /var/www/html/test-db.php')

ssh.close()
print('Debug complete')
