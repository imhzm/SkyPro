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

print('Updating Nginx configs...')

# Update www.skywaveads.com via heredoc
www_config = r'''cat > /etc/nginx/sites-available/www.skywaveads.com << 'EOF'
server {
  listen 80;
  server_name www.skywaveads.com skywaveads.com;

  client_max_body_size 32m;

  location /sender-pro-api {
    root /var/www/html;
    index index.php;
    try_files $uri $uri/ =404;

    location ~ \.php$ {
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
EOF'''

out, err = run_command(ssh, www_config)
print('www config:', 'OK' if not err else err[:100])

# Update skywaveads.com (SSL) via heredoc
ssl_config = r'''cat > /etc/nginx/sites-available/skywaveads.com << 'EOF'
server {
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

      location ~ \.php$ {
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
EOF'''

out, err = run_command(ssh, ssl_config)
print('ssl config:', 'OK' if not err else err[:100])

# Remove conflicting sender-pro site
run_command(ssh, 'rm -f /etc/nginx/sites-enabled/sender-pro /etc/nginx/sites-available/sender-pro')

# Test nginx
out, err = run_command(ssh, 'nginx -t 2>&1')
print('Nginx test:')
print(out[-300:] if out else 'No output')
print()

# Reload
out, err = run_command(ssh, 'systemctl reload nginx 2>&1 && echo "Reloaded"')
print('Reload:', out)
print()

ssh.close()
print('Done')
