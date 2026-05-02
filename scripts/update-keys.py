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
    raise RuntimeError('Set SKYPRO_MYSQL_ROOT_PASSWORD before updating keys.')

print('Updating activation keys status...')

# Set all keys to active and update expiry date
mysql_shell_password = shlex.quote(MYSQL_ROOT_PASSWORD)
out, err = run_command(ssh, f'''mysql -u root -p{mysql_shell_password} senderpro -e "UPDATE activation_keys SET status='active', expiry_date='2027-04-23';" 2>&1''')
print('Update:', out if out else 'OK')
if err:
    print('Error:', err)
print()

# Verify
out, err = run_command(ssh, f'''mysql -u root -p{mysql_shell_password} senderpro -e "SELECT `key`, status, expiry_date FROM activation_keys;" 2>&1''')
print('Keys:')
print(out)
print()

# Test API again
out, err = run_command(ssh, '''curl -s -k -X POST https://www.skywaveads.com/sender-pro-api/validate.php -H "Content-Type: application/json" -d '{"key":"SKY1-PRO2-0001-2026","deviceId":"test"}' 2>&1''')
print('API test:', out)
print()

ssh.close()
print('Done')
