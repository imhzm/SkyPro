# دليل تحديث تطبيق SkyPro Desktop

---

## الخطوات بالترتيب (من أول ما تعدل الكود لحد ما التحديث يوصل للعملاء)

### الخطوة 1: عدّل الكود اللي عايزه

عدّل أي ملف في مجلد `skypro-desktop/` — سواء إصلاح مشكلة أو إضافة ميزة جديدة.

---

### الخطوة 2: غيّر رقم الإصدار

افتح ملف `skypro-desktop/package.json` وغيّر رقم `version`:

```
مثال: غيّر "version": "1.1.0" إلى "version": "1.2.0"
```

> ⚠️ **مهم جداً:** لازم تغيّر الرقم! لو ما غيّرته، العملاء مش هيشوفوا التحديث.
>
> - إصلاح بسيط: غيّر الرقم الأخير (1.1.0 → 1.1.1)
> - ميزة جديدة: غيّر الرقم الأوسط (1.1.0 → 1.2.0)
> - تغيير كبير: غيّر الرقم الأول (1.0.0 → 2.0.0)

---

### الخطوة 3: تأكد إن الكود شغال قبل ما ترفعه

افتح Terminal في مجلد `skypro-desktop` وشغّل:

```bash
npx tsc --noEmit
```

لو طلعت أخطاء → صلّحها الأول. لو ما طلعش حاجة = كل حاجة تمام ✅

---

### الخطوة 4: ارفع الكود على GitHub

```bash
git add .
git commit -m "وصف التعديل اللي عملته"
git push origin main
```

بمجرد ما ترفع، GitHub Actions هيبدأ يبني التطبيق تلقائي (بياخد حوالي 15-25 دقيقة).

---

### الخطوة 5: تابع البناء على GitHub

```bash
gh run list --limit 1
```

هتشوف حاجة زي كده:

```
STATUS  NAME                         BRANCH
✓       Build & Deploy Desktop App   main
```

- ✅ `✓` = البناء نجح
- ❌ `X` = فيه مشكلة (شوف قسم "حل المشاكل" تحت)
- 🔄 `*` = لسه شغال، استنى شوية

---

### الخطوة 6: نزّل ملفات البناء من GitHub

بعد ما البناء ينجح، نزّل الملفات:

```bash
gh run download <run-id> --dir skypro-release
```

> **ملاحظة:** استبدل `<run-id>` بالرقم اللي ظهرلك في الخطوة 5.
>
> مثال: لو الرقم كان `12345`:
> ```bash
> gh run download 12345 --dir skypro-release
> ```

---

### الخطوة 7: ارفع الملفات على السيرفر

```bash
cd skypro-release/desktop-release-*

scp "SkyPro Setup"*.exe latest.yml *.blockmap version.json root@147.79.66.116:/var/www/downloads.skywaveads.com/skypro/
```

هيطلب منك باسورد السيرفر. بعد ما يخلص الرفع، شغّل سكريبت **التحديث + التنظيف التلقائي** (يحدّث الـ symlink ويحذف النسخ القديمة فيما عدا أحدث 2):

```bash
ssh root@147.79.66.116 'cd /var/www/downloads.skywaveads.com/skypro && ln -sf "SkyPro Setup VERSION.exe" latest.exe && mapfile -t EXES < <(ls -t1 SkyPro\ Setup\ *.exe 2>/dev/null) && if [ "${#EXES[@]}" -gt 2 ]; then for ((i=2; i<${#EXES[@]}; i++)); do rm -f -- "${EXES[$i]}" "${EXES[$i]}.blockmap"; echo "removed: ${EXES[$i]}"; done; fi'
```

> **مهم:** استبدل `VERSION` برقم الإصدار الفعلي (مثل `1.4.0`).
>
> هذا السكريبت:
> 1. يحدّث `latest.exe` ليشير للنسخة الجديدة
> 2. يحفظ أحدث نسختين فقط (الحالية + السابقة للـ rollback)
> 3. يحذف باقي النسخ القديمة + ملفات `.blockmap` بتاعتها لتخفيف الحمل على السيرفر
>
> CI deploy بيعمل نفس التنظيف تلقائي.

---

### الخطوة 8: تأكد إن كل حاجة شغالة

```bash
# تأكد إن رقم الإصدار اتغيّر
curl -s https://downloads.skywaveads.com/skypro/latest.yml

# تأكد إن رابط التحميل شغال
curl -sI https://downloads.skywaveads.com/skypro/latest
```

**كده خلاص!** ✅ العملاء هيشوفوا التحديث لما يفتحوا التطبيق أو يضغطوا "التحقق من التحديثات".

---

## ملخص سريع (الخطوات في سطور)

```
1. عدّل الكود
2. غيّر رقم الإصدار في package.json
3. شغّل npx tsc --noEmit (تأكد مفيش أخطاء)
4. git add . && git commit -m "وصف" && git push origin main
5. استنى البناء: gh run list --limit 1
6. نزّل الملفات: gh run download <run-id> --dir skypro-release
7. ارفع على السيرفر: scp + ssh (الأوامر فوق)
8. تأكد: curl https://downloads.skywaveads.com/skypro/latest.yml
```

---

## نسخ التحديثات على السيرفر

**مكان التخزين:** `/var/www/downloads.skywaveads.com/skypro/`

**سياسة الاحتفاظ:** السيرفر بيحتفظ بـ **أحدث نسختين فقط** (الحالية + السابقة).

النسخ الأقدم بتتحذف **تلقائياً** بعد كل deploy، سواء من:
- ✅ GitHub Actions CI (في خطوة "Deploy to server")
- ✅ السكريبت اليدوي في الخطوة 7 فوق

ده بيقلّل الحمل من ~110MB × N نسخة إلى ~220MB ثابت بغض النظر عن عدد الإصدارات.

**لتفقّد النسخ الموجودة دلوقتي:**

```bash
ssh root@147.79.66.116 "ls -lh /var/www/downloads.skywaveads.com/skypro/ | grep -E 'SkyPro Setup'"
```

---

## تحديث الموقع (Web App) - لو عدّلت ملفات في skypro-web

لو التعديل كان في مجلد `skypro-web/` (الموقع)، لازم تحدّث السيرفر كمان:

```bash
ssh root@147.79.66.116

cd /var/www/skypro.skywaveads.com/skypro-web
git pull origin main

# مهم لو في تعديل في Prisma schema:
npx prisma migrate deploy
npx prisma generate

npm run build
pm2 restart skypro
```

> **ملاحظة:** عند إضافة model جديد أو migration جديد، لازم `prisma generate` قبل `npm run build` وإلا الـ build هيفشل.

---

## حل المشاكل

### البناء فشل على GitHub

```bash
# شوف الأخطاء
gh run view <run-id> --log-failed
```

**أشهر المشاكل:**
- أخطاء TypeScript → صلّحها محلي: `cd skypro-desktop && npx tsc --noEmit`
- Dependencies مش موجودة → شغّل: `npm ci`

---

### العملاء مش شايفين التحديث

```bash
# شوف الإصدار اللي على السيرفر
curl -s https://downloads.skywaveads.com/skypro/latest.yml

# لو الرقم قديم = الرفع ما اشتغلش، أعد الخطوة 7
```

---

### مستخدم مش قادر يعمل لوجن

```bash
ssh root@147.79.66.116

# شوف حالة المستخدم (غيّر USER_EMAIL بإيميل المستخدم)
mysql -u skypro_app -p'F4-ejjoe_0k2qpNX2Q3hZ-REyoFtebuR' skypro -e "SELECT id, email, status FROM users WHERE email='USER_EMAIL';"

# لو الحالة pending_verification → فعّله يدوي:
mysql -u skypro_app -p'F4-ejjoe_0k2qpNX2Q3hZ-REyoFtebuR' skypro -e "UPDATE users SET status='active', email_verified_at=NOW() WHERE email='USER_EMAIL';"

# فعّل مفتاح التفعيل كمان:
mysql -u skypro_app -p'F4-ejjoe_0k2qpNX2Q3hZ-REyoFtebuR' skypro -e "UPDATE activation_keys SET status='active', activated_at=NOW(), expires_at=DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE user_id=(SELECT id FROM users WHERE email='USER_EMAIL') AND status='pending';"
```

---

### إعادة تعيين كلمة سر مستخدم

```bash
ssh root@147.79.66.116
cd /var/www/skypro.skywaveads.com/skypro-web

# غيّر USER_EMAIL و NEW_PASSWORD
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

---

## بيانات السيرفر (للرجوع إليها)

| البيان | القيمة |
|--------|--------|
| IP السيرفر | `147.79.66.116` |
| مستخدم SSH | `root` |
| مسار الموقع | `/var/www/skypro.skywaveads.com/skypro-web` |
| مسار التحميلات | `/var/www/downloads.skywaveads.com/skypro/` |
| GitHub Repo | `https://github.com/imhzm/SkyPro.git` |
| رابط التحميل | `https://downloads.skywaveads.com/skypro/latest` |
| قاعدة البيانات | MySQL `skypro` — مستخدم: `skypro_app` |
| PM2 Process | `skypro` (port 3200) |

---

## أوامر مفيدة

```bash
# حالة التطبيق على السيرفر
pm2 status skypro

# لوجات التطبيق
pm2 logs skypro --lines 50

# إعادة تشغيل التطبيق
pm2 restart skypro

# اختبار إعدادات Nginx
nginx -t

# تطبيق تعديلات Nginx
systemctl reload nginx
```
