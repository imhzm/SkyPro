# SkyPro Desktop - Update & Deployment Guide

## Server Details

| Item | Value |
|------|-------|
| Server IP | `147.79.66.116` |
| SSH User | `root` |
| Web App Path | `/var/www/skypro.skywaveads.com/skypro-web` |
| Downloads Path | `/var/www/downloads.skywaveads.com/skypro/` |
| PM2 Process | `skypro` (id: 41, port: 3200) |
| Database | MySQL `skypro` on `127.0.0.1:3306` |
| DB User | `skypro_app` |
| GitHub Repo | `https://github.com/imhzm/SkyPro.git` |
| Download URL | `https://downloads.skywaveads.com/skypro/latest` |
| Auto-Update URL | `https://downloads.skywaveads.com/skypro/latest.yml` |

---

## How Auto-Updates Work

1. The desktop app uses `electron-updater` with "generic" provider
2. On startup (and via the update button), the app fetches `latest.yml` from `https://downloads.skywaveads.com/skypro/`
3. If the version in `latest.yml` is newer than the installed version, the app shows an update prompt
4. User clicks "Download" → app downloads the new `.exe` using delta updates (`.blockmap`)
5. User clicks "Install & Restart" → app quits and runs the installer

---

## How to Release a New Version (Step by Step)

### Method 1: Automatic (Recommended) - Push to GitHub

This is the easiest way. Just change code and push:

```bash
# 1. Edit your code in skypro-desktop/

# 2. Bump the version in package.json
cd skypro-desktop
# Change "version": "1.1.0" to "version": "1.2.0" (or whatever)

# 3. Commit and push to main
git add .
git commit -m "feat: your change description"
git push origin main
```

**What happens automatically:**
- GitHub Actions detects the push (because `skypro-desktop/**` changed)
- Builds the app on `windows-latest`
- Creates `SkyPro Setup X.X.X.exe`, `latest.yml`, `.blockmap`, `version.json`
- Deploys all files to the server via SCP
- Updates the `latest.exe` symlink

**Monitor the build:**
```bash
gh run list --limit 3
gh run view <run-id> --log
```

### Method 2: Manual Trigger (No Code Changes)

```bash
gh workflow run build-desktop.yml
```

### Method 3: Manual Build & Deploy (Local Machine)

```bash
# 1. Build locally
cd skypro-desktop
npm run build:desktop

# 2. Files will be in skypro-desktop/dist/release/
# - SkyPro Setup X.X.X.exe
# - latest.yml
# - SkyPro Setup X.X.X.exe.blockmap

# 3. Upload to server
scp "dist/release/SkyPro Setup"*.exe dist/release/latest.yml dist/release/*.blockmap root@147.79.66.116:/var/www/downloads.skywaveads.com/skypro/

# 4. Generate and upload version.json
VERSION=$(node -p "require('./package.json').version")
cat > /tmp/version.json << EOF
{
  "version": "$VERSION",
  "releaseDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "setupFile": "SkyPro Setup $VERSION.exe",
  "downloadUrl": "https://downloads.skywaveads.com/skypro/latest"
}
EOF
scp /tmp/version.json root@147.79.66.116:/var/www/downloads.skywaveads.com/skypro/

# 5. Update the latest.exe symlink on server
ssh root@147.79.66.116 "cd /var/www/downloads.skywaveads.com/skypro && ln -sf 'SkyPro Setup $VERSION.exe' latest.exe"
```

---

## How to Update the Web App (Server-Side)

```bash
ssh root@147.79.66.116

cd /var/www/skypro.skywaveads.com/skypro-web

# Pull latest code
git pull origin main

# Rebuild
npm run build

# Restart
pm2 restart skypro

# Verify
pm2 status skypro
curl -s https://skypro.skywaveads.com/api/health
```

---

## Important Files on the Server

### Downloads Directory (`/var/www/downloads.skywaveads.com/skypro/`)

| File | Purpose |
|------|---------|
| `SkyPro Setup X.X.X.exe` | Installer for each version |
| `latest.yml` | electron-updater reads this to check for updates |
| `latest.exe` | Symlink to the newest .exe (for download link) |
| `version.json` | Version info (for web dashboard) |
| `*.blockmap` | Delta update data (smaller downloads) |

### Nginx Config

```
/etc/nginx/sites-available/downloads.skywaveads.com
```

Key rules:
- `/skypro/latest` → 302 redirect to `/skypro/latest.exe`
- `latest.yml` → no-cache (electron-updater must always get fresh data)
- `version.json` → no-cache + CORS
- `.exe` files → immutable cache (versioned by filename)

---

## Version Bumping Rules

The version in `skypro-desktop/package.json` controls everything:
- **Patch** (1.0.0 → 1.0.1): Bug fixes only
- **Minor** (1.0.0 → 1.1.0): New features
- **Major** (1.0.0 → 2.0.0): Breaking changes

**IMPORTANT:** You MUST bump the version before pushing, otherwise:
- The build will overwrite the existing version files
- Users won't see an update (same version number)

---

## Troubleshooting

### Build fails on GitHub Actions

```bash
# Check the logs
gh run view <run-id> --log-failed

# Common issues:
# - TypeScript errors → fix locally first: cd skypro-desktop && npx tsc --noEmit
# - Missing dependencies → npm ci
# - Icon issues → verify public/icon.ico exists
```

### Users don't see the update

```bash
# Check latest.yml on server
curl -s https://downloads.skywaveads.com/skypro/latest.yml

# Should show the new version number
# If it shows the old version, the deploy step failed

# Check the symlink
ssh root@147.79.66.116 "ls -la /var/www/downloads.skywaveads.com/skypro/latest.exe"

# Should point to the newest .exe
```

### Login fails for a user

```bash
ssh root@147.79.66.116

# Check user status
mysql -u skypro_app -p'F4-ejjoe_0k2qpNX2Q3hZ-REyoFtebuR' skypro -e "SELECT id, email, status, email_verified_at FROM users WHERE email='USER_EMAIL';"

# If status is 'pending_verification', the user hasn't verified their email
# To manually activate:
mysql -u skypro_app -p'F4-ejjoe_0k2qpNX2Q3hZ-REyoFtebuR' skypro -e "UPDATE users SET status='active', email_verified_at=NOW() WHERE email='USER_EMAIL';"

# Check activation key
mysql -u skypro_app -p'F4-ejjoe_0k2qpNX2Q3hZ-REyoFtebuR' skypro -e "SELECT id, key_code, status, user_id, expires_at FROM activation_keys WHERE user_id=(SELECT id FROM users WHERE email='USER_EMAIL');"

# If key status is 'pending', activate it:
mysql -u skypro_app -p'F4-ejjoe_0k2qpNX2Q3hZ-REyoFtebuR' skypro -e "UPDATE activation_keys SET status='active', activated_at=NOW(), expires_at=DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE user_id=(SELECT id FROM users WHERE email='USER_EMAIL') AND status='pending';"
```

### Reset a user's password

```bash
ssh root@147.79.66.116
cd /var/www/skypro.skywaveads.com/skypro-web

# Generate new hash and update (replace NEW_PASSWORD)
node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const hash = bcrypt.hashSync('NEW_PASSWORD', 12);
  await prisma.user.update({ where: { email: 'USER_EMAIL' }, data: { passwordHash: hash } });
  console.log('Password updated');
  await prisma.\$disconnect();
}
main();
"
```

### PM2 Commands

```bash
pm2 status                  # List all processes
pm2 restart skypro          # Restart the web app
pm2 logs skypro             # View logs
pm2 logs skypro --lines 50  # View last 50 lines
pm2 monit                   # Live monitoring
```

### Nginx Commands

```bash
nginx -t                    # Test config
systemctl reload nginx      # Apply changes
systemctl status nginx      # Check status
```

---

## GitHub Secrets Required

The CI/CD pipeline needs this secret in your GitHub repo settings:

| Secret Name | Value | Purpose |
|------------|-------|---------|
| `DEPLOY_SSH_KEY` | SSH private key for root@147.79.66.116 | SCP deploy to server |

To update: GitHub Repo → Settings → Secrets and variables → Actions → `DEPLOY_SSH_KEY`

---

## Full Deployment Checklist

1. [ ] Bump version in `skypro-desktop/package.json`
2. [ ] Test locally: `cd skypro-desktop && npx tsc --noEmit`
3. [ ] Commit and push to `main`
4. [ ] Monitor CI: `gh run list --limit 1`
5. [ ] Verify download: `curl -s https://downloads.skywaveads.com/skypro/version.json`
6. [ ] Verify auto-update: `curl -s https://downloads.skywaveads.com/skypro/latest.yml`
7. [ ] Test download link: `https://downloads.skywaveads.com/skypro/latest`
8. [ ] Open the desktop app → login page → "Check for updates" button
