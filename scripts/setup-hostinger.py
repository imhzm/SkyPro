import os
import paramiko

HOST = os.getenv('SKYPRO_HOST', '')
PORT = int(os.getenv('SKYPRO_PORT', '22'))
USER = os.getenv('SKYPRO_USER', '')
PASSWORD = os.getenv('SKYPRO_PASSWORD', '')
DB_ROOT_PASSWORD = os.getenv('SKYPRO_DB_ROOT_PASSWORD', '')

if not HOST or not USER or not PASSWORD or not DB_ROOT_PASSWORD:
    raise SystemExit(
        'Missing required env vars: SKYPRO_HOST, SKYPRO_USER, SKYPRO_PASSWORD, SKYPRO_DB_ROOT_PASSWORD'
    )

def run_command(ssh, command):
    stdin, stdout, stderr = ssh.exec_command(command)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD)

print('Connected to Hostinger VPS')

# Check if MySQL is installed and running
out, err = run_command(ssh, 'mysql --version')
print(f'MySQL version: {out}')

if err:
    print(f'MySQL error: {err}')
    print('Attempting to install MySQL...')
    out, err = run_command(ssh, 'apt-get update && apt-get install -y mysql-server')
    print(out)
    if err:
        print(f'Install error: {err}')

# Check if database exists
out, err = run_command(ssh, f"mysql -u root -p'{DB_ROOT_PASSWORD}' -e \"SHOW DATABASES LIKE 'senderpro';\"")
print(f'Database check: {out}')

if 'senderpro' not in out:
    print('Creating database senderpro...')
    out, err = run_command(ssh, f"mysql -u root -p'{DB_ROOT_PASSWORD}' -e \"CREATE DATABASE IF NOT EXISTS senderpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\"")
    if err:
        print(f'Create DB error: {err}')
    else:
        print('Database created')
else:
    print('Database senderpro already exists')

# Import SQL schema
print('Importing SQL schema...')
out, err = run_command(ssh, f"mysql -u root -p'{DB_ROOT_PASSWORD}' senderpro < /var/www/html/sender-pro-api/sender_pro_database.sql")
if err:
    print(f'Import error: {err}')
else:
    print('SQL imported successfully')

# Check if PHP is installed
out, err = run_command(ssh, 'php --version')
print(f'PHP version: {out}')
if err:
    print('Installing PHP and required extensions...')
    run_command(ssh, 'apt-get install -y php php-mysql php-pdo')

# Restart Apache or Nginx
out, err = run_command(ssh, 'systemctl restart apache2 || systemctl restart nginx || service apache2 restart || service nginx restart')
print(f'Web server restart: {out} {err}')

# Test API endpoint
out, err = run_command(ssh, 'curl -s http://localhost/sender-pro-api/validate.php')
print(f'API test: {out}')

ssh.close()
print('Done!')
