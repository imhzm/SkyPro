import os
import paramiko

HOST = os.environ.get('SKYPRO_SSH_HOST', '147.79.66.116')
PORT = int(os.environ.get('SKYPRO_SSH_PORT', '22'))
USER = os.environ.get('SKYPRO_SSH_USER', 'root')
PASSWORD = os.environ.get('SKYPRO_SSH_PASSWORD')

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

print('Deep debugging...')

# Check Nginx is listening
out, err = run_command(ssh, 'ss -tlnp | grep :80')
print('Port 80 listeners:')
print(out if out else 'Nothing on port 80')
print()

# Check Nginx processes
out, err = run_command(ssh, 'ps aux | grep nginx')
print('Nginx processes:')
print(out)
print()

# Check default site config
out, err = run_command(ssh, 'cat /etc/nginx/sites-enabled/default 2>/dev/null || echo "No default site"')
print('Default site:')
print(out[:300])
print()

# Check our site config
out, err = run_command(ssh, 'cat /etc/nginx/sites-enabled/sender-pro')
print('Sender-pro site:')
print(out)
print()

# Check nginx.conf
out, err = run_command(ssh, 'grep -n "include.*sites-enabled" /etc/nginx/nginx.conf')
print('sites-enabled include:')
print(out)
print()

# Check if curl to localhost works at all
out, err = run_command(ssh, 'curl -s -o /dev/null -w "%{http_code}" http://localhost/')
print('Localhost root HTTP code:', out)
print()

# Check if there is an index.html
out, err = run_command(ssh, 'curl -s http://localhost/index.nginx-debian.html | head -3')
print('Default page:', out[:100])
print()

# Test direct IP
out, err = run_command(ssh, 'curl -s -o /dev/null -w "%{http_code}" http://147.79.66.116/')
print('Direct IP HTTP code:', out)
print()

ssh.close()
print('Done')
