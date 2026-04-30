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

# Get skywaveads.com config
out, err = run_command(ssh, 'cat /etc/nginx/sites-available/skywaveads.com')
print('skywaveads.com config:')
print(out)
print()

# Get 00-catch-all config
out, err = run_command(ssh, 'cat /etc/nginx/sites-available/00-catch-all')
print('00-catch-all config:')
print(out)
print()

# Get www.skywaveads.com config
out, err = run_command(ssh, 'cat /etc/nginx/sites-available/www.skywaveads.com')
print('www.skywaveads.com config:')
print(out)
print()

ssh.close()
print('Done')
