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

# Find skywaveads.com nginx config
out, err = run_command(ssh, 'grep -r "skywaveads.com" /etc/nginx/sites-enabled/ -l')
print('Skywaveads config files:', out)
print()

for f in out.split('\n') if out else []:
    print(f'=== {f} ===')
    o, e = run_command(ssh, f'cat {f}')
    print(o[:800])
    print()

ssh.close()
print('Done')
