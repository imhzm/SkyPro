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

print('Fixing MySQL authentication...')

# Use mysql client directly - in MySQL 8.4 root may use auth_socket
# We need to change plugin to caching_sha2_password or mysql_native_password
out, err = run_command(ssh, '''mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'Newjoker2k333'; FLUSH PRIVILEGES;" 2>&1''')
print('Alter user:', out if out else 'OK')
if err:
    print('Error:', err)
print()

# Test connection
out, err = run_command(ssh, '''mysql -u root -p'Newjoker2k333' -e "SELECT 1;" 2>&1''')
print('Test login:', out if out else 'OK')
if err:
    print('Login error:', err)
print()

# Ensure database exists
out, err = run_command(ssh, '''mysql -u root -p'Newjoker2k333' -e "CREATE DATABASE IF NOT EXISTS senderpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1''')
print('DB create:', out if out else 'OK')
print()

# Import SQL (ignore duplicates)
out, err = run_command(ssh, '''mysql -u root -p'Newjoker2k333' senderpro < /var/www/html/sender-pro-api/sender_pro_database.sql 2>&1''')
print('SQL import:', out if out else 'OK')
if err:
    print('Import error:', err)
print()

ssh.close()
print('Done')
