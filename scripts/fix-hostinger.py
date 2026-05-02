import os
import paramiko

HOST = os.environ.get('SKYPRO_SSH_HOST', '147.79.66.116')
PORT = int(os.environ.get('SKYPRO_SSH_PORT', '22'))
USER = os.environ.get('SKYPRO_SSH_USER', 'root')
PASSWORD = os.environ.get('SKYPRO_SSH_PASSWORD')
MYSQL_ROOT_PASSWORD = os.environ.get('SKYPRO_MYSQL_ROOT_PASSWORD')

def run_command(ssh, command, timeout=120):
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
    raise RuntimeError('Set SKYPRO_MYSQL_ROOT_PASSWORD before changing MySQL authentication.')

print('Connected - fixing issues...')

# 1. Fix MySQL authentication for MySQL 8.4
mysql_sql_password = MYSQL_ROOT_PASSWORD.replace("'", "''")
out, err = run_command(ssh, f'''mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '{mysql_sql_password}'; FLUSH PRIVILEGES;" 2>&1''')
print('MySQL password fix:')
print(out if out else 'OK')
if err:
    print('MySQL error:', err)
print()

# 2. Create database if not exists
out, err = run_command(ssh, '''mysql -u root -e "CREATE DATABASE IF NOT EXISTS senderpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1''')
print('DB creation:')
print(out if out else 'OK')
if err:
    print('DB error:', err)
print()

# 3. Import SQL
out, err = run_command(ssh, '''mysql -u root senderpro < /var/www/html/sender-pro-api/sender_pro_database.sql 2>&1''')
print('SQL import:')
print(out if out else 'OK')
if err:
    print('Import error:', err)
print()

# 4. Install PHP-FPM for Nginx
out, err = run_command(ssh, '''apt-get install -y -qq php-fpm php-mysql php-pdo 2>&1''', timeout=180)
print('PHP-FPM install (last 300 chars):')
print(out[-300:] if out else 'No output')
if err:
    print('PHP install error:', err[-300:])
print()

# 5. Check PHP-FPM socket
out, err = run_command(ssh, '''ls /run/php/ 2>/dev/null || ls /var/run/php/ 2>/dev/null || echo "No PHP socket found"''')
print('PHP socket:')
print(out)
print()

# 6. Configure Nginx for PHP
nginx_config = '''server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.php index.html;

    location /sender-pro-api {
        root /var/www/html;
        index index.php;
        try_files $uri $uri/ =404;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php-fpm.sock;
    }

    location ~ /\\.ht {
        deny all;
    }
}
'''

# Write nginx config
sftp = ssh.open_sftp()
with sftp.file('/etc/nginx/sites-available/sender-pro', 'w') as f:
    f.write(nginx_config)
sftp.close()

print('Nginx config written')

# Enable site
out, err = run_command(ssh, '''ln -sf /etc/nginx/sites-available/sender-pro /etc/nginx/sites-enabled/sender-pro && rm -f /etc/nginx/sites-enabled/default 2>/dev/null; nginx -t 2>&1''')
print('Nginx test:')
print(out)
if err:
    print('Nginx error:', err)
print()

# Restart Nginx and PHP-FPM
out, err = run_command(ssh, '''systemctl restart php*-fpm.service 2>/dev/null; systemctl restart nginx 2>&1 && echo "Nginx restarted"''')
print('Restart:')
print(out)
if err:
    print('Restart error:', err)
print()

# 7. Test API
out, err = run_command(ssh, '''curl -s -X POST http://localhost/sender-pro-api/validate.php -H "Content-Type: application/json" -d '{"key":"SKY1-PRO2-0001-2026","deviceId":"test"}' 2>&1''')
print('API validate test:')
print(out)
print()

out, err = run_command(ssh, '''curl -s http://localhost/sender-pro-api/status.php?key=SKY1-PRO2-0001-2026 2>&1''')
print('API status test:')
print(out)
print()

ssh.close()
print('Fixes applied!')
