# سيندر برو — خطة الويب والبنية التحتية

## النطاق العام

بناء نظام ويب كامل يتكون من 3 أجزاء:
1. **Landing Page** — صفحة هبوط احترافية على `skypro.skywaveads.com`
2. **Admin Dashboard** — لوحة تحكم إدارية على نفس الدومين `/admin`
3. **ربط مع التطبيق المكتبي** — نظام مصادقة مركزي يتحقق من الصلاحيات

---

## 1. Landing Page

### الأقسام الرئيسية

| القسم | المحتوى |
|-------|---------|
| **Hero Section** | عنوان رئيسي + وصف مختصر + CTA (جرّب مجاناً) + فيديو ديمو |
| **المميزات** | 18+ منصة مدعومة مع أيقونات — كل منصة بطاقة منفصلة |
| **كيف يعمل** | 3 خطوات: سجّل → حمّل → ابدأ |
| **الأسعار** | خطة واحدة: 2,000 ج.م/سنة مع فترة ديمو يومين |
| **شهادات العملاء** | 3-6 شهادات واردية مع صور |
| **الأسئلة الشائعة** | 8-10 أسئلة مع أكورديون |
| **التذييل** | روابط + حقوق |

### التقنيات
- **Next.js 14** (App Router) مع TypeScript
- **Tailwind CSS** للتصميم
- **Framer Motion** للحركات
- **React Hook Form + Zod** للتحقق من المدخلات
- **Next Auth v5** للمصادقة (Google OAuth + Credentials)
- RTL كامل (العربية)

### نظام التسجيل والدخول

```
المستخدم يزور skypro.skywaveads.com
  ↓
يضغط "جرّب مجاناً" أو "سجّل الآن"
  ↓
خيارات:
  1. تسجيل بـ Google OAuth
  2. تسجيل بـ Email + Password
  ↓
يُنشأ حساب ديمو (2 يوم)
  ↓
يُرسل Email تأكيد
  ↓
بعد التأكيد → يُوجّه لتحميل التطبيق + مفتاح التفعيل
```

### صفحة التسجيل (Auth Pages)

| الصفحة | المسار | الوصف |
|--------|--------|-------|
| تسجيل حساب جديد | `/auth/register` | Email + Password + تأكيد Email + Google OAuth |
| تسجيل دخول | `/auth/login` | Email/Password أو Google |
| نسيت كلمة المرور | `/auth/forgot-password` | إرسال رابط إعادة التعيين |
| إعادة تعيين كلمة المرور | `/auth/reset-password` | إدخال كلمة المرور الجديدة |

---

## 2. نظام المصادقة المركزي

### قاعدة البيانات (MySQL — Hostinger)

```sql
-- المستخدمين
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),          -- NULL لو Google OAuth
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  role ENUM('user', 'admin') DEFAULT 'user',
  status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
  email_verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- مفاتيح التفعيل
CREATE TABLE activation_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  key_code VARCHAR(50) UNIQUE NOT NULL,    -- SKY1-PRO2-XXXX-2026
  status ENUM('available', 'assigned', 'active', 'expired', 'revoked') DEFAULT 'available',
  plan VARCHAR(50) DEFAULT 'pro',
  duration_days INT DEFAULT 365,
  max_devices INT DEFAULT 1,               -- عدد الأجهزة المسموحة
  activated_at DATETIME,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- الأجهزة (Device Fingerprinting)
CREATE TABLE devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  key_id INT NOT NULL,
  device_fingerprint VARCHAR(255) NOT NULL,  -- بصمة الجهاز
  device_name VARCHAR(255),                  -- اسم الجهاز
  os_info VARCHAR(100),                      -- نظام التشغيل
  cpu_info VARCHAR(100),                      -- المعالج
  ram_info VARCHAR(50),                       -- الرام
  disk_info VARCHAR(50),                     -- القرص
  gpu_info VARCHAR(100),                      -- كرت الشاشة
  screen_resolution VARCHAR(50),             -- دقة الشاشة
  is_active BOOLEAN DEFAULT TRUE,
  reset_count INT DEFAULT 0,                 -- عدد مرات إعادة التعيين
  max_resets_per_year INT DEFAULT 2,          -- حد أقصى لإعادة التعيين سنوياً
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (key_id) REFERENCES activation_keys(id),
  UNIQUE KEY unique_fingerprint (device_fingerprint, key_id)
);

-- الجلسات
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INT NOT NULL,
  device_fingerprint VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- الفوترة والاشتراكات
CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  key_id INT NOT NULL,
  status ENUM('trial', 'active', 'expired', 'cancelled') DEFAULT 'trial',
  trial_ends_at DATETIME,                    -- نهاية فترة الديمو (يومان)
  started_at DATETIME,
  expires_at DATETIME,
  auto_renew BOOLEAN DEFAULT FALSE,
  payment_method VARCHAR(50),
  amount DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'EGP',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (key_id) REFERENCES activation_keys(id)
);

-- سجل الأحداث (Audit Log)
CREATE TABLE audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,              -- login, register, activate, device_reset, etc.
  details JSON,
  ip_address VARCHAR(45),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- إعدادات النظام (للأدمن)
CREATE TABLE system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Device Fingerprinting (بصمة الجهاز)

```javascript
// في التطبيق المكتبي — main.cjs
function generateDeviceFingerprint() {
  const os = require('os')
  const crypto = require('crypto')
  
  const components = [
    os.hostname(),                    // اسم الجهاز
    os.platform(),                     // win32/darwin/linux
    os.arch(),                        // x64/arm64
    os.cpus()[0]?.model || '',         // المعالج
    String(os.totalmem()),             // الرام الإجمالي
    // معلومات إضافية من النظام
  ]
  
  const raw = components.join('|')
  return crypto.createHash('sha256').update(raw).digest('hex')
}

// معلومات الجهاز الكاملة
function getDeviceCapabilities() {
  const os = require('os')
  return {
    fingerprint: generateDeviceFingerprint(),
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()[0]?.model || 'Unknown',
    cpuCores: os.cpus().length,
    ram: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
    // GPU يُجلب من Playwright بعد فتح المتصفح عبر page.evaluate()
  }
}
```

### تدفق المصادقة (Auth Flow)

```
التطبيق المكتبي يبدأ:
  ↓
يتصل بـ API: POST /api/auth/verify-device
  → يرسل: { key, deviceFingerprint, deviceInfo }
  ↓
الـ API يتحقق:
  1. المفتاح صالح؟
  2. المفتاح منتهي؟
  3. الجهاز مسجل؟
  4. عدد الأجهزة <= max_devices؟
  ↓
إذا الجهاز جديد وعدد الأجهزة < max_devices:
  → يسجل الجهاز الجديد
  → يُرجع { success: true, sessionId }
  ↓
إذا الجهاز جديد وعدد الأجهزة >= max_devices:
  → يُرجع { success: false, error: 'تم تجاوز الحد الأقصى للأجهزة' }
  ↓
إذا الجهاز مسجل:
  → يحدّث last_seen_at
  → يُرجع { success: true, sessionId }
```

### إعادة تعيين الجهاز (Device Reset)

```
المستخدم يضغط "إعادة تعيين الجهاز" في التطبيق أو في الويب:
  ↓
POST /api/auth/reset-device
  → يتحقق: reset_count < max_resets_per_year (2)
  ↓
إذا مسموح:
  → يحذف بصمة الجهاز القديمة
  → يزيد reset_count بـ 1
  → يُرجع { success: true, message: 'تم إعادة تعيين الجهاز. سجّل الدخول مرة أخرى.' }
  ↓
إذا تجاوز الحد:
  → يُرجع { success: false, error: 'تم تجاوز الحد الأقصى لإعادة التعيين (2 مرات/سنة)' }
```

---

## 3. Admin Dashboard

### المسارات

| المسار | الصفحة | الوصف |
|--------|--------|-------|
| `/admin` | لوحة التحكم الرئيسية | إحصائيات عامة |
| `/admin/users` | إدارة المستخدمين | عرض، تعديل، تعليق، حذف |
| `/admin/keys` | إدارة مفاتيح التفعيل | إنشاء، تعيين، إلغاء |
| `/admin/devices` | إدارة الأجهزة | عرض الأجهزة، إعادة تعيين |
| `/admin/subscriptions` | إدارة الاشتراكات | تفعيل، تمديد، إلغاء |
| `/admin/billing` | الفوترة والمدفوعات | فواتير، سجل |
| `/admin/settings` | إعدادات النظام | تكوين عام |

### لوحة التحكم الرئيسية — البطاقات

| البطاقة | المحتوى |
|---------|---------|
| إجمالي المستخدمين | عدد + رسم بياني آخر 30 يوم |
| الاشتراكات النشطة | عدد + نسبة التجديد |
| الإيرادات الشهرية | المبلغ + مقارنة بالشهر السابق |
| الأجهزة النشطة | عدد + معدل إعادة التعيين |
| مفاتيح غير مستخدمة | عدد المفاتيح المتاحة |
| طلبات الدعم المفتوحة | عدد |

### صلاحيات الأدمن

| الصلاحية | الوصف |
|----------|-------|
| إدارة المستخدمين | عرض/تعديل/تعليق/حذف حسابات |
| إدارة المفاتيح | إنشاء/تعيين/إلغاء مفاتيح التفعيل |
| إدارة الأجهزة | عرض/إزالة/إعادة تعيين أجهزة المستخدمين |
| التحكم في max_devices | تحديد عدد الأجهزة لكل حساب فردي |
| إدارة الاشتراكات | تمديد/إلغاء/تحويل اشتراكات |
| عرض الفوترة | فواتير، مدفوعات، تقارير |
| إعدادات النظام | تكوين عام (سعر، فترة ديمو، حد أجهزة افتراضي) |

---

## 4. API Endpoints

### المصادقة

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/auth/register` | تسجيل حساب جديد |
| POST | `/api/auth/login` | تسجيل دخول (email/password) |
| POST | `/api/auth/google` | تسجيل دخول بـ Google OAuth |
| POST | `/api/auth/verify-email` | تأكيد البريد الإلكتروني |
| POST | `/api/auth/forgot-password` | إرسال رابط إعادة التعيين |
| POST | `/api/auth/reset-password` | إعادة تعيين كلمة المرور |
| POST | `/api/auth/verify-device` | التحقق من الجهاز (من التطبيق) |
| POST | `/api/auth/reset-device` | إعادة تعيين بصمة الجهاز |
| GET | `/api/auth/me` | بيانات المستخدم الحالي |
| POST | `/api/auth/logout` | تسجيل خروج |

### التفعيل والاشتراكات

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/keys/activate` | تفعيل مفتاح |
| GET | `/api/keys/status` | حالة المفتاح |
| POST | `/api/keys/generate` | إنشاء مفاتيح جديدة (أدمن) |

### الأدمن

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/admin/stats` | إحصائيات عامة |
| GET | `/api/admin/users` | قائمة المستخدمين |
| PUT | `/api/admin/users/:id` | تعديل مستخدم |
| DELETE | `/api/admin/users/:id` | حذف مستخدم |
| PUT | `/api/admin/users/:id/devices` | تعديل max_devices |
| POST | `/api/admin/users/:id/reset-device` | إعادة تعيين جهاز |
| GET | `/api/admin/keys` | قائمة المفاتيح |
| POST | `/api/admin/keys/generate` | إنشاء مفاتيح |
| GET | `/api/admin/subscriptions` | قائمة الاشتراكات |
| PUT | `/api/admin/subscriptions/:id` | تعديل اشتراك |
| GET | `/api/admin/devices` | قائمة الأجهزة |
| GET | `/api/admin/audit-log` | سجل الأحداث |

---

## 5. ربط التطبيق المكتبي بالـ API

### التغييرات في main.cjs

```javascript
// استبدال التحقق المحلي بالتحقق من السيرفر
ipcm('activate-key', async (e, { key, deviceId }) => {
  // 1. التحقق من السيرفر أولاً
  try {
    const response = await fetch('https://skypro.skywaveads.com/api/auth/verify-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, deviceFingerprint: getDeviceFingerprint() })
    })
    const result = await response.json()
    if (result.success) return result
  } catch (e) {
    console.error('Server verification failed:', e.message)
  }

  // 2. Fallback للتحقق المحلي (بدون اتصال)
  const check = isKeyValid(key)
  if (check.valid) {
    return { success: true, message: 'تم التفعيل بنجاح!', data: { key: check.key, status: 'active', expiryDate: check.expiryDate, deviceId } }
  }
  return { success: false, message: check.message }
})

// إرسال معلومات الجهاز عند التحقق
ipcm('get-device-info', async () => {
  return getDeviceCapabilities()
})
```

### التغييرات في activation.ts

```typescript
// استبدال المفاتيح المحلية بالاتصال بالسيرفر
export const activationApi = {
  activateKey: async (key: string, deviceId: string) => {
    // 1. محاولة عبر IPC (التحقق مع إرسال بصمة الجهاز)
    if (window.electronAPI?.activateKey) {
      try {
        const result = await window.electronAPI.activateKey({ key, deviceId })
        if (result) return result
      } catch (e) { console.error('IPC failed:', e) }
    }

    // 2. محاولة مباشرة عبر HTTP API
    try {
      const response = await fetch('https://skypro.skywaveads.com/api/keys/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, deviceFingerprint: deviceId })
      })
      return response.json()
    } catch {
      return { success: false, message: 'فشل الاتصال بالخادم' }
    }
  }
}
```

---

## 6. البنية التقنية

### Frontend (Next.js)
```
skypro-web/
├── app/
│   ├── (marketing)/          # Landing page
│   │   ├── page.tsx           # Hero + Features + Pricing
│   │   └── layout.tsx        # RTL + Arabic font
│   ├── auth/
│   │   ├── login/page.tsx     # تسجيل دخول
│   │   ├── register/page.tsx  # تسجيل حساب
│   │   └── callback/page.tsx # OAuth callback
│   ├── admin/                 # لوحة الأدمن
│   │   ├── page.tsx           # Dashboard
│   │   ├── users/page.tsx     # إدارة المستخدمين
│   │   ├── keys/page.tsx      # إدارة المفاتيح
│   │   ├── devices/page.tsx   # إدارة الأجهزة
│   │   └── settings/page.tsx  # إعدادات
│   └── api/                   # API routes
│       ├── auth/              # مصادقة
│       ├── keys/              # مفاتيح
│       └── admin/             # أدمن API
├── components/                # مكونات مشتركة
├── lib/                       # أدوات مساعدة
│   ├── db.ts                  # Prisma/MySQL
│   ├── auth.ts                # NextAuth config
│   └── device.ts              # Fingerprint utils
└── public/                    # ملفات ثابتة
```

### البنية التحتية

| المكون | التقنية |
|--------|---------|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Next.js API Routes (Node.js) |
| Database | MySQL 8 (Hostinger) |
| ORM | Prisma |
| Auth | NextAuth v5 (Google + Credentials) |
| Deployment | PM2 + Nginx reverse proxy |
| SSL | Let's Encrypt (auto) |
| Domain | `skypro.skywaveads.com` |
| Subdomain | DNS A record → 147.79.66.116 |

### متغيرات البيئة (.env)

```env
DATABASE_URL="mysql://user:password@localhost:3306/skypro"
NEXTAUTH_SECRET="<generated-secret>"
NEXTAUTH_URL="https://skypro.skywaveads.com"
GOOGLE_CLIENT_ID="<google-cloud-client-id>"
GOOGLE_CLIENT_SECRET="<google-cloud-client-secret>"
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT=465
SMTP_USER="noreply@skywaveads.com"
SMTP_PASS="<smtp-password>"
APP_URL="https://skypro.skywaveads.com"
DESKTOP_APP_DOWNLOAD_URL="https://skypro.skywaveads.com/download"
DEFAULT_TRIAL_DAYS=2
DEFAULT_MAX_DEVICES=1
DEFAULT_MAX_RESETS_PER_YEAR=2
DEFAULT_KEY_PRICE=2000
DEFAULT_KEY_CURRENCY=EGP
DEFAULT_KEY_DURATION_DAYS=365
```

---

## 7. خطة التنفيذ — المراحل

### المرحلة 1: البنية الأساسية (3 أيام)
- [ ] إعداد الخادم (Nginx + Node.js + PM2)
- [ ] إنشاء قاعدة البيانات MySQL
- [ ] إعداد مشروع Next.js
- [ ] تكوين NextAuth مع Google OAuth
- [ ] إعداد Prisma مع MySQL

### المرحلة 2: Landing Page (3 أيام)
- [ ] تصميم واجهة الهبوط (RTL + عربية)
- [ ] قسم Hero + فيديو
- [ ] قسم المميزات (18+ منصة)
- [ ] قسم الأسعار
- [ ] قسم الأسئلة الشائعة
- [ ] تأثيرات Framer Motion

### المرحلة 3: نظام المصادقة (3 أيام)
- [ ] صفحة التسجيل (Email + Google)
- [ ] صفحة تسجيل الدخول
- [ ] تأكيد البريد الإلكتروني
- [ ] نسيت كلمة المرور
- [ ] إنشاء حساب ديمو تلقائي (يومان)
- [ ] Device Fingerprinting

### المرحلة 4: لوحة الأدمن (4 أيام)
- [ ] لوحة التحكم الرئيسية + إحصائيات
- [ ] إدارة المستخدمين (CRUD + تعليق + حساسية)
- [ ] إدارة المفاتيح (إنشاء + تعيين + إلغاء)
- [ ] إدارة الأجهزة (عرض + إعادة تعيين + تحكم max_devices)
- [ ] إدارة الاشتراكات
- [ ] سجل الأحداث

### المرحلة 5: ربط التطبيق المكتبي (يومان)
- [ ] تعديل main.cjs للتحقق من السيرفر
- [ ] تعديل activation.ts
- [ ] إضافة Device Fingerprint في التطبيق
- [ ] اختبار شامل للتدفق

### المرحلة 6: الاختبار والإطلاق (يومان)
- [ ] اختبار شامل للanding page
- [ ] اختبار تدفق التسجيل والتحقق
- [ ] اختبار لوحة الأدمن
- [ ] اختبار ربط التطبيق
- [ ] إعداد SSL
- [ ] إطلاق

**إجمالي الوقت التقديري: 17 يوم عمل**

---

## 8. أمان الويب

| الإجراء | التفاصيل |
|---------|---------|
| **Rate Limiting** | 100 طلب/دقيقة لكل IP |
| **Brute Force Protection** | 5 محاولات دخول فاشلة → قفل 15 دقيقة |
| **CSRF** | NextAuth CSRF token |
| **XSS** | React自动escaping + CSP headers |
| **SQL Injection** | Prisma parameterized queries |
| **CORS** | API endpoints فقط من skypro.skywaveads.com |
| **Password Hashing** | bcrypt (10 rounds) |
| **JWT Sessions** | HttpOnly + Secure cookies |
| **HTTPS** | Let's Encrypt SSL certificate |
| **Input Validation** | Zod schemas على كل endpoint |