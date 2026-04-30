<div align="center">

![Sky Pro Banner](https://img.shields.io/badge/🚀%20Sky%20Pro-Sender%20Desktop-6366f1?style=for-the-badge&labelColor=1a1a2e)

### أقوى أداة تسويق آلي لمنصات التواصل الاجتماعي
**18+ منصة | أتمتة كاملة | حماية متقدمة**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-Automation-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)

[🌐 الموقع](https://skypro.skywaveads.com) · [📦 تحميل](https://skypro.skywaveads.com/download) · [💬 تواصل](mailto:support@skywaveads.com)

</div>

---

## 🎯 نظرة عامة

سيندر برو هو تطبيق سطح مكتب احترافي لأتمتة التسويق على منصات التواصل الاجتماعي. يتيح لك استخراج بيانات العملاء المحتملين، إرسال رسائل جماعية، وإدارة حسابات متعددة — كل ذلك من تطبيق واحد.

## ✨ المنصات المدعومة

| المنصة | المميزات |
|--------|----------|
| 📘 فيسبوك | استخراج الأعضاء/المعجبين/التعليقات، النشر في الجروبات، إرسال رسائل |
| 💬 واتساب | إرسال رسائل جماعية، استخراج المجموعات، تصفية الأرقام |
| 📸 انستغرام | استخراج المتابعين، إرسال رسائل، متابع تلقائي، إشارة |
| 🐦 تويتر / X | تغريدات، استخراج المتابعين، جدولة، إعادة تغريد |
| 💼 لينكد إن | بحث شركات، إرسال رسائل، استخراج بيانات |
| ✈️ تيليجرام | إرسال رسائل، استخراج أعضاء، إضافة مستخدمين |
| 🎵 تيك توك | استخراج متابعين، إعجاب تلقائي |
| 📌 بنترست | تثبيت تلقائي، استخراج بيانات |
| 👻 سناب شات | إرسال رسائل، إضافة أصدقاء |
| 🧵 ثريدز | نشر تلقائي، استخراج متابعين |
| 🔴 ريديت | نشر تلقائي، استخراج بيانات |
| 📍 خرائط جوجل | استخراج أعمال، بيانات اتصال |
| 📧 إيميلات | إرسال جماعي، قوالب، SMTP مخصص |
| 🎯 أوتو بوينت | نقاط تلقائية، إدارة حسابات |
| 🛡️ الحماية | مضاد الحظر، بروكسي، تغيير بصمة |

## 🏗️ البنية التقنية

```
sender-pro-desktop/
├── electron/
│   ├── main.cjs          # العمليات الرئيسية + Playwright + IPC
│   └── preload.cjs       # الجسر الآمن بين العمليات
├── src/
│   ├── main.tsx          # نقطة الدخول
│   ├── App.tsx           # الهيكل + التوجيه
│   ├── components/
│   │   ├── layout/      # الهيكل، الشريط الجانبي، شريط العنوان
│   │   └── common/       # التفعيل، البروكسي، الجداول، الحماية
│   ├── modules/          # 18+ وحدة منصة
│   ├── hooks/           # usePlatform, usePersistentState
│   ├── stores/          # Zustand state management
│   ├── services/api/    # Activation API
│   └── types/           # TypeScript definitions
├── sender-pro-api/       # PHP API (Hostinger)
└── scripts/              # أدوات التطوير والنشر
```

## 🚀 البدء السريع

### المتطلبات
- Node.js 18+
- npm أو yarn

### التثبيت

```bash
# استنساخ المشروع
git clone https://github.com/imhzm/SkyPro.git
cd SkyPro

# تثبيت التبعيات
npm install

# تشغيل في وضع التطوير
npm run dev

# بناء للإنتاج
npm run build:desktop
```

### التشغيل

```bash
# وضع التطوير (مع Hot Reload)
npm run dev

# بناء الإصدار النهائي
npm run build:desktop
```

## 🔑 نظام التفعيل

- اشتراك سنوي بقيمة **2,000 ج.م**
- كل مفتاح يسمح بجهاز واحد كحد أقصى
- إمكانية إعادة التعيين مرتين سنوياً
- التحقق عبر السيرفر مع fallback محلي
- فترة تجريبية يومين من [الموقع](https://skypro.skywaveads.com)

## 🛡️ الحماية والأمان

| الميزة | التفاصيل |
|--------|----------|
| عزل العمليات | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` |
| حماية الويب | `webSecurity: true`, CSP meta tag |
| كلمات المرور | bcrypt hash في العمليات الرئيسية فقط |
| قاعدة البيانات | SQLite مع allowed tables whitelist |
| حماية SQL | Parameterized queries + input sanitization |
| منع التكرار | `requestSingleInstanceLock()` |
| إغلاق آمن | `db.close()` + `safeSend()` checks |

## 🌐 الربط مع السيرفر

التطبيق يتصل بـ `https://skypro.skywaveads.com` للتحقق من:
- صلاحية مفتاح التفعيل
- بصمة الجهاز (Device Fingerprinting)
- حالة الاشتراك

مع **fallback محلي** عند انقطاع الاتصال.

## 📞 التواصل

- 📧 البريد: [support@skywaveads.com](mailto:support@skywaveads.com)
- 📱 واتساب: +20 106 789 4321
- 🌐 الموقع: [skypro.skywaveads.com](https://skypro.skywaveads.com)

---

<div align="center">

**صُنع بـ ❤️ في مصر 🇪🇬**

</div>