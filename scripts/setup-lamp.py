import paramiko
import os

HOST = os.getenv('SKYPRO_HOST', '')
PORT = int(os.getenv('SKYPRO_PORT', '22'))
USER = os.getenv('SKYPRO_USER', '')
PASSWORD = os.getenv('SKYPRO_PASSWORD', '')
DB_ROOT_PASSWORD = os.getenv('SKYPRO_DB_ROOT_PASSWORD', '')

if not HOST or not USER or not PASSWORD or not DB_ROOT_PASSWORD:
    raise SystemExit(
        'Missing required env vars: SKYPRO_HOST, SKYPRO_USER, SKYPRO_PASSWORD, SKYPRO_DB_ROOT_PASSWORD'
    )

def run_command(ssh, command, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD)

print('Connected to Hostinger VPS')

# Check OS version
out, err = run_command(ssh, 'cat /etc/os-release | head -5')
print('OS Info:')
print(out.encode('ascii', 'replace').decode('ascii'))
print()

# Check installed packages
out, err = run_command(ssh, 'dpkg -l | grep -E "apache|nginx|php|mysql|mariadb" | awk \'{print $2, $3}\'')
print('Installed web packages:')
print(out.encode('ascii', 'replace').decode('ascii') if out else 'None found')
print()

# Check what's in /var/www/html
out, err = run_command(ssh, 'ls -la /var/www/html/')
print('Web root:')
print(out.encode('ascii', 'replace').decode('ascii'))
print()

# Check API files
out, err = run_command(ssh, 'ls -la /var/www/html/sender-pro-api/')
print('API files:')
print(out.encode('ascii', 'replace').decode('ascii'))
print()

# Try to install LAMP stack
print('Installing Apache, PHP, MySQL...')
out, err = run_command(ssh, 'apt-get update -qq && apt-get install -y -qq apache2 php php-mysql php-pdo mysql-server 2>&1', timeout=300)
print('Install output (last 500 chars):')
print(out[-500:].encode('ascii', 'replace').decode('ascii') if out else 'No output')
if err:
    print('Install errors:')
    print(err[-500:].encode('ascii', 'replace').decode('ascii'))
print()

# Check MySQL status
out, err = run_command(ssh, 'systemctl status mysql --no-pager 2>/dev/null | head -3 || echo "MySQL not running"')
print('MySQL status:')
print(out.encode('ascii', 'replace').decode('ascii'))
print()

# Secure MySQL and set root password
out, err = run_command(ssh, f'mysql -u root -e "ALTER USER \'root\'@\'localhost\' IDENTIFIED WITH mysql_native_password BY \'{DB_ROOT_PASSWORD}\'; FLUSH PRIVILEGES;" 2>&1')
print('MySQL root password set:')
print(out.encode('ascii', 'replace').decode('ascii') if out else 'OK')
if err:
    print('MySQL error:')
    print(err.encode('ascii', 'replace').decode('ascii'))
print()

# Create database
out, err = run_command(ssh, f'mysql -u root -p{DB_ROOT_PASSWORD} -e "CREATE DATABASE IF NOT EXISTS senderpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1')
print('Database creation:')
print(out.encode('ascii', 'replace').decode('ascii') if out else 'OK')
if err:
    print('DB error:')
    print(err.encode('ascii', 'replace').decode('ascii'))
print()

# Import SQL
out, err = run_command(ssh, f'mysql -u root -p{DB_ROOT_PASSWORD} senderpro < /var/www/html/sender-pro-api/sender_pro_database.sql 2>&1')
print('SQL import:')
print(out.encode('ascii', 'replace').decode('ascii') if out else 'OK')
if err:
    print('Import error:')
    print(err.encode('ascii', 'replace').decode('ascii'))
print()

# Restart Apache
out, err = run_command(ssh, 'systemctl restart apache2 2>&1 && echo "Apache restarted"')
print('Apache restart:')
print(out.encode('ascii', 'replace').decode('ascii'))
print()

# Test API
out, err = run_command(ssh, 'curl -s http://localhost/sender-pro-api/validate.php 2>&1')
print('API test:')
print(out.encode('ascii', 'replace').decode('ascii'))
print()

ssh.close()
print('Setup complete!')
