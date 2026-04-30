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

# Search all nginx configs for skywaveads
out, err = run_command(ssh, 'grep -r "skywaveads" /etc/nginx/ -l 2>/dev/null')
print('Nginx files with skywaveads:')
print(out if out else 'None')
print()

# List all sites enabled
out, err = run_command(ssh, 'ls -la /etc/nginx/sites-enabled/')
print('Sites enabled:')
print(out)
print()

# Check each site
for site in out.split('\n') if out else []:
    if site.startswith('total') or site.startswith('d'):
        continue
    name = site.split()[-1]
    o, e = run_command(ssh, f'echo "=== {name} ==="; cat /etc/nginx/sites-enabled/{name} | head -20')
    print(o)
    print()

ssh.close()
print('Done')
