import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface WelcomeEmailData {
  name?: string | null
  email: string
  password?: string | null
  serial: string
  expiryDate: string
  planLabel?: string
  loginMethod?: string
  verifyLink?: string
}

export interface ActivationConfirmEmailData {
  name?: string | null
  email: string
  serial: string
  expiryDate: string
  planLabel?: string
}

export interface PasswordResetEmailData {
  name?: string | null
  resetUrl: string
  expiresMinutes: number
}

export interface AccountSuspendedEmailData {
  name?: string | null
  email: string
  reason?: string | null
}

const APP_NAME = 'SkyPro'
const APP_WEBSITE_URL = 'https://www.skywaveads.com'
const APP_WEBSITE_LABEL = 'www.skywaveads.com'
const DEFAULT_FROM_EMAIL = 'admin@skywaveads.com'
const SPAM_NOTICE_TEXT = 'تنبيه مهم: إذا لم تجد هذه الرسالة في البريد الوارد، يرجى مراجعة قسم البريد غير الهام أو Spam/Junk ثم نقل الرسالة إلى الوارد.'

function env(name: string): string {
  return (process.env[name] || '').trim().replace(/^['"]|['"]$/g, '')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function baseTextFooter() {
  return `${SPAM_NOTICE_TEXT}

فريق ${APP_NAME}
الموقع: ${APP_WEBSITE_LABEL}`
}

/* ------------------------------------------------------------------ */
/*  SMTP Connection Pooling                                           */
/* ------------------------------------------------------------------ */

let _transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (_transporter) return _transporter

  const host = env('SMTP_HOST')
  const port = parseInt(env('SMTP_PORT') || '465', 10)
  const user = env('SMTP_USER')
  const pass = env('SMTP_PASS')

  if (!host || !user || !pass) return null

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })

  return _transporter
}

/* ------------------------------------------------------------------ */
/*  HTML Shell                                                        */
/* ------------------------------------------------------------------ */

function htmlShell(content: string) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Tahoma,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <!-- Header -->
  <tr><td style="background:#0a1628;padding:28px 32px;text-align:center;">
    <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:1px;">${APP_NAME}</h1>
    <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">منصة إدارة الحملات التسويقية</p>
  </td></tr>
  <!-- Accent line -->
  <tr><td style="height:3px;background:linear-gradient(90deg,#0ea5e9,#6366f1);font-size:0;line-height:0;">&nbsp;</td></tr>
  <!-- Body -->
  <tr><td style="padding:32px;line-height:1.9;font-size:15px;color:#1e293b;">
    ${content}
  </td></tr>
  <!-- Spam Notice -->
  <tr><td style="padding:0 32px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;">
      <p style="margin:0;font-size:12px;line-height:1.8;color:#92400e;">
        ⚠️ ${SPAM_NOTICE_TEXT}
      </p>
    </td></tr>
    </table>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">
      &copy; ${new Date().getFullYear()} ${APP_NAME} &mdash;
      <a href="${APP_WEBSITE_URL}" style="color:#0ea5e9;text-decoration:none;">${APP_WEBSITE_LABEL}</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

/* ------------------------------------------------------------------ */
/*  sendEmail                                                         */
/* ------------------------------------------------------------------ */

export async function sendEmail({ to, subject, text, html }: EmailOptions): Promise<EmailResult> {
  const fromEmail = env('SMTP_FROM') || DEFAULT_FROM_EMAIL
  const fromName = env('SMTP_FROM_NAME') || APP_NAME

  const transporter = getTransporter()
  if (!transporter) {
    return { success: false, error: 'SMTP configuration is incomplete' }
  }

  try {
    const recipients = to
      .split(',')
      .map((recipient) => recipient.trim())
      .filter(Boolean)

    const domain = fromEmail.split('@')[1] || 'skywaveads.com'
    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${domain}>`
    const unsubMailto = `mailto:${fromEmail}?subject=unsubscribe`
    const unsubUrl = `${APP_WEBSITE_URL}/unsubscribe`

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      sender: fromEmail,
      replyTo: fromEmail,
      to,
      subject,
      text,
      html: html || text,
      messageId,
      headers: {
        'Message-ID': messageId,
        'X-Mailer': `${APP_NAME} Mailer`,
        'X-Entity-Ref-ID': `${APP_NAME}-${Date.now()}`,
        'X-Priority': '3',
        Organization: APP_NAME,
        'List-Unsubscribe': `<${unsubMailto}>, <${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })

    console.log(`[Email] Sent to ${recipients.join(',')}: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Email sending failed:', message)
    return { success: false, error: message }
  }
}

/* ------------------------------------------------------------------ */
/*  Welcome Email                                                     */
/* ------------------------------------------------------------------ */

export function generateWelcomeEmailText(data: WelcomeEmailData): string {
  const name = data.name || 'عميلنا الكريم'

  return `مرحباً ${name}

تم إنشاء حسابك في ${APP_NAME} بنجاح.

بيانات الحساب والتفعيل:
البريد: ${data.email}
${data.password ? `كلمة المرور: ${data.password}\n` : ''}السيريال: ${data.serial}
الخطة: ${data.planLabel || 'تجربة مجانية لمدة يومين'}
تاريخ الانتهاء: ${data.expiryDate}
${data.verifyLink ? `\n⚠️ يجب تأكيد بريدك الإلكترونـي أولاً لتفعيل الحساب:\n${data.verifyLink}\n` : ''}
الخطوات التالية:
${data.verifyLink ? '1. أكّد بريدك الإلكتروني\n' : ''}${data.verifyLink ? '2' : '1'}. سجّل دخول إلى لوحة التحكم
${data.verifyLink ? '3' : '2'}. حمّل تطبيق SkyPro Desktop
${data.verifyLink ? '4' : '3'}. استخدم السيريال لتفعيل التطبيق

${baseTextFooter()}`
}

export function generateWelcomeEmail(data: WelcomeEmailData): string {
  const name = escapeHtml(data.name || 'عميلنا الكريم')
  const email = escapeHtml(data.email)
  const serial = escapeHtml(data.serial)
  const expiryDate = escapeHtml(data.expiryDate)
  const planLabel = escapeHtml(data.planLabel || 'تجربة مجانية لمدة يومين')

  const passwordRow = data.password
    ? `<tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;white-space:nowrap;">كلمة المرور</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;">${escapeHtml(data.password)}</td>
      </tr>`
    : ''

  const verifyBlock = data.verifyLink
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:24px;text-align:center;">
        <p style="margin:0 0 16px;font-weight:700;color:#1e40af;font-size:15px;">⚠️ يجب تأكيد بريدك الإلكتروني لتفعيل الحساب</p>
        <a href="${escapeHtml(data.verifyLink)}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.5px;">تأكيد البريد الإلكتروني</a>
      </td></tr>
      </table>`
    : ''

  let stepNum = 1
  const steps: string[] = []
  if (data.verifyLink) {
    steps.push(`<tr><td style="padding:6px 0;"><span style="display:inline-block;width:28px;height:28px;background:#0ea5e9;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">${stepNum++}</span></td><td style="padding:6px 12px;color:#1e293b;">أكّد بريدك الإلكتروني عبر الزر أعلاه</td></tr>`)
  }
  steps.push(`<tr><td style="padding:6px 0;"><span style="display:inline-block;width:28px;height:28px;background:#0ea5e9;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">${stepNum++}</span></td><td style="padding:6px 12px;color:#1e293b;">سجّل دخول إلى <a href="${APP_WEBSITE_URL}/auth/login" style="color:#0ea5e9;text-decoration:none;font-weight:600;">لوحة التحكم</a></td></tr>`)
  steps.push(`<tr><td style="padding:6px 0;"><span style="display:inline-block;width:28px;height:28px;background:#0ea5e9;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">${stepNum++}</span></td><td style="padding:6px 12px;color:#1e293b;">حمّل تطبيق SkyPro Desktop من لوحة التحكم</td></tr>`)
  steps.push(`<tr><td style="padding:6px 0;"><span style="display:inline-block;width:28px;height:28px;background:#0ea5e9;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;">${stepNum++}</span></td><td style="padding:6px 12px;color:#1e293b;">استخدم السيريال لتفعيل التطبيق</td></tr>`)

  return htmlShell(`
    <p style="margin-top:0;font-size:17px;">مرحباً <strong>${name}</strong> 👋</p>
    <p>تم إنشاء حسابك في <strong>${APP_NAME}</strong> بنجاح! هذه بيانات حسابك ومفتاح التفعيل:</p>

    <!-- Account Data Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;white-space:nowrap;">البريد الإلكتروني</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;">${email}</td>
      </tr>
      ${passwordRow}
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;white-space:nowrap;">الخطة</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;">${planLabel}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;color:#64748b;font-size:13px;white-space:nowrap;">تاريخ الانتهاء</td>
        <td style="padding:10px 16px;font-weight:600;color:#1e293b;">${expiryDate}</td>
      </tr>
    </table>

    <!-- Serial Key Box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr><td style="background:#f0f9ff;border:2px dashed #0ea5e9;border-radius:12px;padding:18px;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#64748b;font-weight:600;">مفتاح التفعيل (Serial Key)</p>
        <p style="margin:0;font-size:20px;font-weight:800;color:#0ea5e9;letter-spacing:2px;font-family:Consolas,monospace;direction:ltr;">${serial}</p>
      </td></tr>
    </table>

    ${verifyBlock}

    <!-- Steps -->
    <p style="margin:24px 0 12px;font-weight:700;font-size:15px;color:#0f172a;">الخطوات التالية:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${steps.join('\n      ')}
    </table>

    <p style="margin-bottom:0;color:#94a3b8;font-size:12px;">لو لم تطلب هذا الحساب، تجاهل هذه الرسالة.</p>
  `)
}

/* ------------------------------------------------------------------ */
/*  Password Reset Email (unchanged)                                  */
/* ------------------------------------------------------------------ */

export function generatePasswordResetEmailText(data: PasswordResetEmailData): string {
  const name = data.name || 'عميلنا الكريم'

  return `مرحباً ${name}

وصلنا طلب إعادة تعيين كلمة مرور حسابك في ${APP_NAME}.

استخدم الرابط التالي خلال ${data.expiresMinutes} دقيقة:
${data.resetUrl}

لو لم تطلب إعادة التعيين، تجاهل هذه الرسالة ولن يتم تغيير كلمة المرور.

${baseTextFooter()}`
}

export function generatePasswordResetEmail(data: PasswordResetEmailData): string {
  const name = escapeHtml(data.name || 'عميلنا الكريم')
  const resetUrl = escapeHtml(data.resetUrl)

  return htmlShell(`
    <p style="margin-top:0;">مرحباً ${name}</p>
    <p>وصلنا طلب إعادة تعيين كلمة مرور حسابك في ${APP_NAME}.</p>
    <p>
      <a href="${resetUrl}" style="display:inline-block;background:#0A6CF1;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold;">
        إعادة تعيين كلمة المرور
      </a>
    </p>
    <p>ينتهي هذا الرابط خلال ${data.expiresMinutes} دقيقة.</p>
    <p style="margin-bottom:0;color:#64748b;font-size:13px;">لو لم تطلب إعادة التعيين، تجاهل هذه الرسالة ولن يتم تغيير كلمة المرور.</p>
  `)
}

/* ------------------------------------------------------------------ */
/*  Account Suspended Email (unchanged)                               */
/* ------------------------------------------------------------------ */

export function generateAccountSuspendedEmailText(data: AccountSuspendedEmailData): string {
  const name = data.name || 'عميلنا الكريم'
  const reasonLine = data.reason ? `سبب الحظر: ${data.reason}\n` : ''

  return `مرحباً ${name}

تم حظر حسابك في ${APP_NAME} وإيقاف إمكانية الدخول إلى برنامج الديسكتوب.

بيانات الحساب:
البريد: ${data.email}
الحالة: محظور
${reasonLine}
إذا كنت تعتقد أن هذا القرار تم بالخطأ، يرجى التواصل مع الدعم من خلال الموقع:
${APP_WEBSITE_LABEL}

فريق ${APP_NAME}`
}

export function generateAccountSuspendedEmail(data: AccountSuspendedEmailData): string {
  const name = escapeHtml(data.name || 'عميلنا الكريم')
  const email = escapeHtml(data.email)
  const reason = data.reason?.trim()

  return htmlShell(`
    <p style="margin-top:0;">مرحباً ${name}</p>
    <p>تم حظر هذا الحساب وإيقاف السيريالات والأجهزة المرتبطة به.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:18px;margin:18px 0;">
      <p><strong>البريد الإلكتروني:</strong> ${email}</p>
      <p><strong>الحالة:</strong> محظور</p>
      ${reason ? `<p><strong>سبب الحظر:</strong> ${escapeHtml(reason)}</p>` : ''}
    </div>
    <p>إذا كنت تعتقد أن هذا القرار تم بالخطأ، يرجى التواصل مع الدعم من خلال الموقع.</p>
  `)
}

/* ------------------------------------------------------------------ */
/*  Activation Confirm Email (unchanged)                              */
/* ------------------------------------------------------------------ */

export function generateActivationConfirmEmailText(data: ActivationConfirmEmailData): string {
  const name = data.name || 'عميلنا الكريم'

  return `مرحباً ${name}

تم تأكيد بريدك الإلكتروني وتفعيل حسابك في ${APP_NAME} بنجاح!

بيانات حسابك:
البريد: ${data.email}
السيريال: ${data.serial}
الخطة: ${data.planLabel || 'تجربة مجانية'}
تاريخ الانتهاء: ${data.expiryDate}

يمكنك الآن:
- تسجيل الدخول إلى لوحة التحكم من الموقع
- تحميل تطبيق SkyPro Desktop واستخدام السيريال لتفعيله على جهازك

${baseTextFooter()}`
}

export function generateActivationConfirmEmail(data: ActivationConfirmEmailData): string {
  const name = escapeHtml(data.name || 'عميلنا الكريم')
  const email = escapeHtml(data.email)
  const serial = escapeHtml(data.serial)
  const expiryDate = escapeHtml(data.expiryDate)
  const planLabel = escapeHtml(data.planLabel || 'تجربة مجانية')

  return htmlShell(`
    <p style="margin-top:0;">مرحباً ${name} 🎉</p>
    <p>تم تأكيد بريدك الإلكتروني وتفعيل حسابك في ${APP_NAME} بنجاح!</p>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:18px;margin:18px 0;">
      <p style="color:#065f46;font-weight:bold;margin-top:0;">✅ حسابك مفعّل الآن</p>
      <p><strong>البريد الإلكتروني:</strong> ${email}</p>
      <p><strong>السيريال:</strong> <code style="background:#d1fae5;padding:4px 10px;border-radius:6px;font-size:15px;color:#065f46;font-weight:bold;">${serial}</code></p>
      <p><strong>الخطة:</strong> ${planLabel}</p>
      <p><strong>تاريخ الانتهاء:</strong> ${expiryDate}</p>
    </div>
    <p><strong>الخطوات التالية:</strong></p>
    <ol style="padding-right:18px;line-height:2;">
      <li>سجّل الدخول إلى <a href="${APP_WEBSITE_URL}/auth/login" style="color:#0A6CF1;text-decoration:none;font-weight:bold;">لوحة التحكم</a></li>
      <li>حمّل تطبيق SkyPro Desktop من لوحة التحكم</li>
      <li>استخدم السيريال أعلاه لتفعيل التطبيق على جهازك</li>
    </ol>
    <p style="margin-bottom:0;color:#64748b;font-size:13px;">لو لم تطلب هذا الحساب، تجاهل هذه الرسالة.</p>
  `)
}
