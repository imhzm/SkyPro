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

print('Adding API location to www.skywaveads.com...')

# Read current config
out, err = run_command(ssh, 'cat /etc/nginx/sites-available/www.skywaveads.com')
print('Current config:')
print(out)
print()

# New config with API location
new_config = '''server {
  listen 80;
  server_name www.skywaveads.com skywaveads.com;

  client_max_body_size 32m;

  location /sender-pro-api {
    root /var/www/html;
    index index.php;
    try_files $uri $uri/ =404;

    location ~ \\.php$ {
      include snippets/fastcgi-php.conf;
      fastcgi_pass unix:/run/php/php-fpm.sock;
    }
  }

  location / {
    proxy_pass http://127.0.0.1:3010;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
'''

sftp = ssh.open_sftp()
with sftp.file('/etc/nginx/sites-available/www.skywaveads.com', 'w') as f:
    f.write(new_config)
sftp.close()

print('Config updated')

# Also update skywaveads.com (443) config
sky_ssl = '''server {
    listen 80;
    server_name skywaveads.com www.skywaveads.com;
    return 301 https://www.skywaveads.com$request_uri;
}

server {
    listen 443 ssl;
    server_name skywaveads.com;

    ssl_certificate /etc/letsencrypt/live/skywaveads.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/skywaveads.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://www.skywaveads.com$request_uri;
}

server {
    listen 443 ssl;
    server_name www.skywaveads.com;

    ssl_certificate /etc/letsencrypt/live/skywaveads.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/skywaveads.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 32m;

    location /sender-pro-api {
      root /var/www/html;
      index index.php;
      try_files $uri $uri/ =404;

      location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php-fpm.sock;
      }
    }

    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
'''

with sftp.file('/etc/nginx/sites-available/skywaveads.com', 'w') as f:
    f.write(sky_ssl)
sftp.close()

print('SSL config updated')

# Remove our custom sender-pro site to avoid conflicts
run_command(ssh, 'rm -f /etc/nginx/sites-enabled/sender-pro /etc/nginx/sites-available/sender-pro')

# Test and reload
out, err = run_command(ssh, 'nginx -t 2>&1')
print('Nginx test:')
print(out)
print()

out, err = run_command(ssh, 'systemctl reload nginx 2>&1 && echo "Nginx reloaded"')
print('Reload:', out)
print()

ssh.close()
print('Done!')
