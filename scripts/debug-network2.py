import os
import paramiko

HOST = os.environ.get('SKYPRO_SSH_HOST', '147.79.66.116')
PORT = int(os.environ.get('SKYPRO_SSH_PORT', '22'))
USER = os.environ.get('SKYPRO_SSH_USER', 'root')
PASSWORD = os.environ.get('SKYPRO_SSH_PASSWORD')

def run_command(ssh, command, timeout=15):
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
if not PASSWORD:
    raise RuntimeError('Set SKYPRO_SSH_PASSWORD before running this script.')
ssh.connect(HOST, PORT, USER, PASSWORD)

print('Network debugging...')

# Check if in container (cgroup check quick)
out, err = run_command(ssh, 'ls -la /proc/1/cgroup')
print('Cgroup check:', out[:50])
print()

# Test with timeout
out, err = run_command(ssh, 'timeout 3 wget -qO- http://127.0.0.1/ 2>&1 || echo "WGET_FAIL"')
print('Wget 127.0.0.1:', out[:100])
print()

# TCP test
out, err = run_command(ssh, 'timeout 2 bash -c "echo > /dev/tcp/127.0.0.1/80" && echo "TCP_OK" || echo "TCP_FAIL"')
print('TCP test:', out)
print()

# Check iptables
out, err = run_command(ssh, 'iptables -L -n 2>/dev/null | head -5 || echo "No iptables"')
print('IPTables:', out[:100])
print()

# Check ufw
out, err = run_command(ssh, 'ufw status 2>/dev/null || echo "No ufw"')
print('UFW:', out[:50])
print()

# Check hosts
out, err = run_command(ssh, 'cat /etc/hosts')
print('Hosts:')
print(out)
print()

# Check resolve
out, err = run_command(ssh, 'getent hosts localhost || echo "No resolve"')
print('Resolve:', out)
print()

# Check Nginx default page exists
out, err = run_command(ssh, 'cat /var/www/html/index.nginx-debian.html | head -3')
print('Default page exists:', out[:50])
print()

# Check Nginx config test again
out, err = run_command(ssh, 'nginx -t 2>&1')
print('Nginx test:', out)
print()

# Check Nginx error log
out, err = run_command(ssh, 'tail -5 /var/log/nginx/error.log')
print('Nginx errors:', out)
print()

# Check access log
out, err = run_command(ssh, 'tail -3 /var/log/nginx/access.log')
print('Nginx access:', out)
print()

ssh.close()
print('Done')
