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

print('Network debugging...')

# Check if in container
out, err = run_command(ssh, 'cat /proc/1/cgroup | head -5')
print('Cgroup:')
print(out)
print()

# Check curl version
out, err = run_command(ssh, 'curl --version | head -1')
print('Curl version:', out)
print()

# Test with wget
out, err = run_command(ssh, 'wget -qO- http://localhost/ 2>&1 | head -5')
print('Wget localhost:', out[:100])
print()

# Test with telnet
out, err = run_command(ssh, 'timeout 2 bash -c "echo > /dev/tcp/localhost/80" && echo "TCP_OK" || echo "TCP_FAIL"')
print('TCP test:', out)
print()

# Check iptables
out, err = run_command(ssh, 'iptables -L -n 2>/dev/null | head -10')
print('IPTables:')
print(out if out else 'None or no permission')
print()

# Check ufw
out, err = run_command(ssh, 'ufw status 2>/dev/null')
print('UFW:', out)
print()

# Check hosts file
out, err = run_command(ssh, 'cat /etc/hosts')
print('Hosts:')
print(out)
print()

# Check if localhost resolves
out, err = run_command(ssh, 'getent hosts localhost')
print('Localhost resolve:', out)
print()

# Try 127.0.0.1 explicitly
out, err = run_command(ssh, 'wget -qO- http://127.0.0.1/ 2>&1 | head -5')
print('Wget 127.0.0.1:', out[:100])
print()

ssh.close()
print('Done')
