import paramiko

HOST = '147.79.66.116'
PORT = 22
USER = 'root'
PASSWORD = 'Newjoker2k333'

def run_command(ssh, command, timeout=60):
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD)

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
php_test = '''<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=senderpro;charset=utf8mb4", "root", "Newjoker2k333");
    echo "DB OK";
} catch (PDOException $e) {
    echo "DB FAIL: " . $e->getMessage();
}
'''
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
