#!/bin/bash
# Launch readiness audit script — run on the production server.
# Verifies: env vars, disk, memory, DB connectivity, recent errors,
#           critical routes, migrations, SSL, security headers.

set +e

cd /var/www/skypro.skywaveads.com 2>/dev/null

OK="\033[0;32m✓\033[0m"
FAIL="\033[0;31m✗\033[0m"
WARN="\033[0;33m⚠\033[0m"

section() { echo ""; echo "═══════════════════════════════════════"; echo "$1"; echo "═══════════════════════════════════════"; }

section "🖥️  SYSTEM HEALTH"
uptime | tr -s ' '
echo ""
echo "Disk:"
df -h /var/www | tail -1
echo ""
echo "Memory:"
free -h | head -2
echo ""
echo "Load:"
cat /proc/loadavg

section "🔐 ENVIRONMENT VARIABLES"
REQUIRED_VARS="DATABASE_URL NEXTAUTH_URL NEXTAUTH_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM DEFAULT_TRIAL_DAYS DEFAULT_MAX_DEVICES"
for v in $REQUIRED_VARS; do
  if grep -q "^$v=" .env 2>/dev/null; then
    val=$(grep "^$v=" .env | head -1 | cut -d= -f2-)
    len=${#val}
    if [ "$v" = "DATABASE_URL" ] || [ "$v" = "NEXTAUTH_SECRET" ] || [ "$v" = "GOOGLE_CLIENT_SECRET" ] || [ "$v" = "SMTP_PASS" ]; then
      echo -e "  $OK $v (set, $len chars)"
    else
      echo -e "  $OK $v = ${val:0:60}"
    fi
  else
    echo -e "  $FAIL MISSING: $v"
  fi
done

section "🗄️  DATABASE"
echo -n "Connectivity: "
DB_OK=$(npx --no-install prisma db execute --stdin <<< "SELECT 1" 2>&1 | grep -c "executed" || echo 0)
if [ "$DB_OK" -gt 0 ]; then
  echo -e "$OK responsive"
else
  echo -e "$WARN check manual"
fi
echo ""
echo "Migrations:"
npx --no-install prisma migrate status 2>&1 | grep -E "Database schema is|migration" | head -5

section "🔄 PROCESS HEALTH"
pm2 jlist 2>/dev/null | python3 -c "
import json, sys
try:
    apps = json.loads(sys.stdin.read())
    for a in apps:
        if a['name'] == 'skypro':
            print(f\"  Status: {a['pm2_env']['status']}\")
            print(f\"  Uptime: {(int(__import__('time').time()*1000)-a['pm2_env']['pm_uptime'])/1000/60:.0f} minutes\")
            print(f\"  Restarts: {a['pm2_env']['restart_time']}\")
            print(f\"  Memory: {a['monit']['memory']/1024/1024:.0f} MB\")
            print(f\"  CPU: {a['monit']['cpu']}%\")
            print(f\"  PID: {a['pid']}\")
            break
except Exception as e:
    print(f\"  ERROR: {e}\")
"

section "🌐 ROUTE SMOKE TEST"
declare -A routes=(
  ["/"]="200"
  ["/auth/login"]="200"
  ["/auth/register"]="200"
  ["/platforms"]="200"
  ["/privacy"]="200"
  ["/terms"]="200"
  ["/dashboard"]="307"
  ["/admin"]="307"
  ["/sitemap.xml"]="200"
  ["/robots.txt"]="200"
  ["/manifest.webmanifest"]="200"
  ["/.well-known/security.txt"]="200"
  ["/icon.png"]="200"
  ["/api/health"]="200"
  ["/api/auth/google"]="307"
  ["/api/account/notifications"]="401"
  ["/api/admin/export?type=users"]="403"
)
for path in "${!routes[@]}"; do
  expected="${routes[$path]}"
  actual=$(curl -s -o /dev/null -w "%{http_code}" "https://skypro.skywaveads.com$path" 2>&1)
  if [ "$actual" = "$expected" ]; then
    echo -e "  $OK $path → $actual"
  else
    echo -e "  $FAIL $path → $actual (expected $expected)"
  fi
done

section "🛡️  SECURITY HEADERS"
HDRS=$(curl -sI https://skypro.skywaveads.com/ 2>&1)
for h in "Strict-Transport-Security" "Content-Security-Policy" "X-Frame-Options" "X-Content-Type-Options" "Referrer-Policy" "Permissions-Policy" "Cross-Origin-Opener-Policy"; do
  if echo "$HDRS" | grep -qi "^$h:"; then
    echo -e "  $OK $h"
  else
    echo -e "  $FAIL MISSING: $h"
  fi
done

section "🔒 SSL CERT"
ssl_info=$(echo | openssl s_client -servername skypro.skywaveads.com -connect skypro.skywaveads.com:443 2>/dev/null | openssl x509 -noout -dates -subject 2>/dev/null)
if [ -n "$ssl_info" ]; then
  echo -e "$OK SSL active"
  echo "$ssl_info" | sed 's/^/  /'
else
  echo -e "$FAIL SSL check failed"
fi

section "📧 EMAIL CONFIG"
if grep -q "^SMTP_HOST=" .env && grep -q "^SMTP_USER=" .env && grep -q "^SMTP_PASS=" .env; then
  echo -e "$OK SMTP configured"
  grep -E "^SMTP_(HOST|PORT|USER|FROM)=" .env | sed 's/=.*/= (set)/' | sed 's/^/  /'
else
  echo -e "$FAIL SMTP not fully configured"
fi

section "🚨 RECENT ERRORS (last 100 log lines)"
err_count=$(pm2 logs skypro --lines 100 --nostream 2>&1 | grep -ciE "error|fail|exception" || echo 0)
if [ "$err_count" -lt 5 ]; then
  echo -e "$OK only $err_count error mentions in last 100 lines"
else
  echo -e "$WARN $err_count error mentions — review pm2 logs skypro"
fi

section "🛠️  FAIL2BAN + UFW"
echo "fail2ban: $(systemctl is-active fail2ban 2>/dev/null)"
echo "ufw: $(ufw status 2>/dev/null | head -1)"
echo "nginx: $(systemctl is-active nginx 2>/dev/null)"

section "✅ AUDIT COMPLETE"
