# ⚠️ SECURITY WARNING — Maintenance Scripts

**These scripts are DANGEROUS and should NEVER be included in production builds or deployments.**

## Known Risks:

1. **`debug-api.py`** — Writes MySQL password to a PHP file in the web root (`/var/www/html/test-db.php`). This file is accessible from the internet.
2. **`update-keys.py`** — Bulk-activates ALL activation keys in the database, bypassing admin approval.
3. **`fix-hostinger.py`** — Executes shell commands as root via SSH.
4. **`setup-lamp.py`** — Installs and configures server software via SSH.
5. **`fix-mysql-auth.py`** — Resets MySQL authentication settings.
6. **`fix-nginx-api*.py`** — Modifies Nginx configuration remotely.

## Required Safeguards:

All dangerous scripts require:
- `SKYPRO_ENABLE_DANGEROUS_MAINTENANCE=true` environment variable
- `SKYPRO_SSH_PASSWORD` — never hardcoded
- `SKYPRO_MYSQL_ROOT_PASSWORD` — never hardcoded

## Recommendation:

Move these scripts to a separate, private infrastructure repository.
Do NOT include them in the desktop application package or web build.

Add this to `.gitignore`:
```
scripts/debug-*.py
scripts/fix-*.py
scripts/setup-*.py
scripts/update-keys.py
scripts/upload-*.py
scripts/diagnose-*.py
```
