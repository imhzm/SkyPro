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

function htmlShell(content: string) {
  return `
    <div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;color:#0f172a;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="padding:22px;background:#0f172a;color:#ffffff;text-align:center;">
          <h1 style="margin:0;font-size:24px;line-height:1.5;">${APP_NAME}</h1>
        </div>
        <div style="padding:24px;line-height:1.8;font-size:15px;">
          ${content}
          <p style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:10px;padding:12px;font-size:13px;line-height:1.7;">
            ${SPAM_NOTICE_TEXT}
          </p>
        </div>
      </div>
      <p style="text-align:center;color:#64748b;font-size:12px;margin-top:18px;">
        ${APP_NAME}<br />
        <a href="${APP_WEBSITE_URL}" style="color:#0A6CF1;text-decoration:none;">${APP_WEBSITE_LABEL}</a>
      </p>
    </div>
  `
}

export async function sendEmail({ to, subject, text, html }: EmailOptions): Promise<EmailResult> {
  const host = env('SMTP_HOST')
  const port = parseInt(env('SMTP_PORT') || '465', 10)
  const user = env('SMTP_USER')
  const pass = env('SMTP_PASS')
  const fromEmail = env('SMTP_FROM') || DEFAULT_FROM_EMAIL
  const fromName = env('SMTP_FROM_NAME') || APP_NAME

  if (!host || !user || !pass) {
    return { success: false, error: 'SMTP configuration is incomplete' }
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  })

  try {
    const recipients = to
      .split(',')
      .map((recipient) => recipient.trim())
      .filter(Boolean)

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      envelope: { from: user, to: recipients.length > 0 ? recipients : [to] },
      replyTo: fromEmail,
      to,
      subject,
      text,
      html: html || text,
      headers: {
        'X-Entity-Ref-ID': `${APP_NAME}-${Date.now()}`,
        Organization: APP_NAME,
      },
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Email sending failed:', message)
    return { success: false, error: message }
  }
}

export function generateWelcomeEmailText(data: WelcomeEmailData): string {
  const name = data.name || 'عميلنا الكريم'
  const loginLine = `طريقة الدخول: ${data.loginMethod || 'استخدم كلمة المرور التي اخترتها عند التسجيل'}\n`

  return `مرحباً ${name}

تم إنشاء حسابك في ${APP_NAME} بنجاح.

بيانات الحساب والتفعيل:
البريد: ${data.email}
${loginLine}السيريال: ${data.serial}
الخطة: ${data.planLabel || 'تجربة مجانية لمدة يومين'}
تاريخ الانتهاء: ${data.expiryDate}

يمكنك تسجيل الدخول من لوحة الويب أو استخدام السيريال داخل تطبيق الديسكتوب.
${data.verifyLink ? `\n⚠️ يجب تأكيد بريدك الإلكترونـي أولاً لتفعيل الحساب:\n${data.verifyLink}\n` : ''}\n${baseTextFooter()}`
}

export function generateWelcomeEmail(data: WelcomeEmailData): string {
  const name = escapeHtml(data.name || 'عميلنا الكريم')
  const email = escapeHtml(data.email)
  const serial = escapeHtml(data.serial)
  const expiryDate = escapeHtml(data.expiryDate)
  const planLabel = escapeHtml(data.planLabel || 'تجربة مجانية لمدة يومين')
  const loginRow = `<p><strong>طريقة الدخول:</strong> ${escapeHtml(data.loginMethod || 'استخدم كلمة المرور التي اخترتها عند التسجيل')}</p>`

  return htmlShell(`
    <p style="margin-top:0;">مرحباً ${name}</p>
    <p>تم إنشاء حسابك في ${APP_NAME} بنجاح. هذه بيانات الحساب والتفعيل الخاصة بك:</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:18px 0;">
      <p><strong>البريد الإلكتروني:</strong> ${email}</p>
      ${loginRow}
      <p><strong>السيريال:</strong> <code style="background:#eef2ff;padding:4px 8px;border-radius:6px;font-size:15px;">${serial}</code></p>
      <p><strong>الخطة:</strong> ${planLabel}</p>
      <p><strong>تاريخ الانتهاء:</strong> ${expiryDate}</p>
    </div>
    <p>يمكنك تسجيل الدخول من لوحة الويب أو استخدام السيريال داخل تطبيق الديسكتوب.</p>
    ${data.verifyLink ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:18px;margin:18px 0;text-align:center;">
      <p style="margin:0 0 12px;font-weight:bold;color:#1e40af;">⚠️ يجب تأكيد بريدك الإلكتروني لتفعيل الحساب</p>
      <a href="${escapeHtml(data.verifyLink)}" style="display:inline-block;background:#0A6CF1;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">تأكيد البريد الإلكتروني</a>
    </div>
    ` : ''}
    <p style="margin-bottom:0;color:#64748b;font-size:13px;">لو لم تطلب هذا الحساب، تجاهل هذه الرسالة.</p>
  `)
}

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
