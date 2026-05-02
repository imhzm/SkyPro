import os
import paramiko
import sys

HOST = os.environ.get('SKYPRO_SSH_HOST', '147.79.66.116')
PORT = int(os.environ.get('SKYPRO_SSH_PORT', '22'))
USER = os.environ.get('SKYPRO_SSH_USER', 'root')
PASSWORD = os.environ.get('SKYPRO_SSH_PASSWORD')

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

print('Connected to Hostinger VPS')

# Check OS version
out, err = run_command(ssh, 'cat /etc/os-release | head -5')
print(f'OS Info:\n{out}\n')

# Check if web server is running
out, err = run_command(ssh, 'systemctl status apache2 2>/dev/null || systemctl status nginx 2>/dev/null || echo "No web server found"')
print(f'Web server status: {out[:200]}...')

# Check if PHP is installed
out, err = run_command(ssh, 'php --version 2>/dev/null || echo "PHP not installed"')
print(f'PHP: {out[:100]}')

# Check if MySQL/MariaDB is installed
out, err = run_command(ssh, 'mysql --version 2>/dev/null || mariadb --version 2>/dev/null || echo "MySQL not installed"')
print(f'MySQL: {out[:100]}')

# Check what's in /var/www/html
out, err = run_command(ssh, 'ls -la /var/www/html/')
print(f'Web root:\n{out}')

# Check if sender-pro-api files are there
out, err = run_command(ssh, 'ls -la /var/www/html/sender-pro-api/')
print(f'API files:\n{out}')

ssh.close()
print('\nDiagnostics complete.')
