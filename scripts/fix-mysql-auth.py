import os
import shlex
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
    raise RuntimeError('Set SKYPRO_MYSQL_ROOT_PASSWORD before changing MySQL authentication.')

print('Fixing MySQL authentication...')

# Use mysql client directly - in MySQL 8.4 root may use auth_socket
# We need to change plugin to caching_sha2_password or mysql_native_password
mysql_sql_password = MYSQL_ROOT_PASSWORD.replace("'", "''")
mysql_shell_password = shlex.quote(MYSQL_ROOT_PASSWORD)
out, err = run_command(ssh, f'''mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH caching_sha2_password BY '{mysql_sql_password}'; FLUSH PRIVILEGES;" 2>&1''')
print('Alter user:', out if out else 'OK')
if err:
    print('Error:', err)
print()

# Test connection
out, err = run_command(ssh, f'''mysql -u root -p{mysql_shell_password} -e "SELECT 1;" 2>&1''')
print('Test login:', out if out else 'OK')
if err:
    print('Login error:', err)
print()

# Ensure database exists
out, err = run_command(ssh, f'''mysql -u root -p{mysql_shell_password} -e "CREATE DATABASE IF NOT EXISTS senderpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1''')
print('DB create:', out if out else 'OK')
print()

# Import SQL (ignore duplicates)
out, err = run_command(ssh, f'''mysql -u root -p{mysql_shell_password} senderpro < /var/www/html/sender-pro-api/sender_pro_database.sql 2>&1''')
print('SQL import:', out if out else 'OK')
if err:
    print('Import error:', err)
print()

ssh.close()
print('Done')
