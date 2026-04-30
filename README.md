# سيندر برو - Sender Pro

تطبيق تسويق إلكتروني احترافي لأتمتة المتصفح عبر 18+ منصة

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Vite
- **Backend**: Electron 41 + Node.js + Playwright
- **Database**: SQLite (محلي) + MySQL (Hostinger للمفاتيح)
- **Automation**: Playwright with Chrome

## المتطلبات

- Node.js 20+
- npm
- Chrome مثبت (Playwright يثبته تلقائياً)

## التشغيل

```bash
npm install
npm run dev          # وضع التطوير
npm run build        # بناء الواجهة فقط
npm run build:desktop # بناء التطبيق الكامل
```

## المميزات

### المنصات المدعومة
- Facebook (تسجيل دخول، بحث، استخراج، نشر، رسائل)
- WhatsApp Web (إرسال، استخراج مجموعات، فلترة أرقام)
- Instagram (تسجيل دخول، استخراج متابعين/تعليقات/هاشتاج، متابعة تلقائية)
- Twitter/X (تسجيل دخول، تغريد، استخراج متابعين، جدولة، ريتويت)
- LinkedIn (تسجيل دخول، بحث، استخراج شركات، رسائل)
- Telegram Web (تسجيل دخول، استخراج أعضاء، إضافة مستخدمين)
- TikTok (استخراج تعليقات/متابعين)
- Pinterest (تسجيل دخول، بحث، استخراج)
- Snapchat Web
- Threads (استخراج، منشن)
- Reddit (تسجيل دخول، بحث، نشر)
- VK (تسجيل دخول، بحث، استخراج أعضاء)
- X Plus
- Google Maps (استخراج أعمال)
- OLX (استخراج إعلانات)
- إرسال إيميلات عبر SMTP
- Auto Point (تفاعل تلقائي)

### الأدوات المساعدة
- إدارة بروكسيات (حفظ، اختبار)
- جدولة الحملات (تنفيذ تلقائي)
- تصدير CSV/Excel
- نظام مفاتيح تفعيل

## تنشيط التطبيق

### التحقق المحلي (افتراضي)
مفاتيح صالحة: `SKY1-PRO2-0001-2026` حتى `SKY1-PRO2-0010-2026`
السعر: 2000 جنيه مصري/سنة
الصلاحية: حتى 2027-04-23

### التحقق عبر Hostinger API
1. ارفع ملفات `sender-pro-api/` إلى `/var/www/html/sender-pro-api/`
2. أنشئ قاعدة البيانات MySQL واستورد `sender_pro_database.sql`
3. عدّل `sender-pro-api/config.php` ببيانات قاعدة البيانات
4. غيّر `USE_LOCAL_VALIDATION = false` في `src/services/api/activation.ts`

## Hostinger Upload Guide

### الاتصال بالسيرفر
```bash
ssh root@147.79.66.116
# Password: Newjoker2k333
```

### رفع ملفات API
```bash
# من جهازك (Windows PowerShell):
scp -r sender-pro-api/*.php root@147.79.66.116:/var/www/html/sender-pro-api/

# أو استخدم WinSCP/FileZilla برفع المجلد كاملاً
```

### إعداد قاعدة البيانات
```bash
# داخل السيرفر:
mysql -u root -p
CREATE DATABASE senderpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE senderpro;
SOURCE /var/www/html/sender-pro-api/sender_pro_database.sql;
```

### إنشاء مفاتيح جديدة
```bash
curl -X POST http://147.79.66.116/sender-pro-api/generate_keys.php \
  -H "Content-Type: application/json" \
  -d '{"count":10,"admin_key":"skypro-admin-2026"}'
```

## ملاحظات هامة

- Playwright selectors قد تحتاج تحديثاً مع تغيير مواقع التواصل
- يُنصح باستخدام بروكسي لتجنب الحظر
- `signAndEditExecutable: false` مفعّل لتجنب مشاكل Windows symlinks

## License

Proprietary - SkyPro
