import { z } from 'zod'

const emailSchema = z.string()
  .trim()
  .toLowerCase()
  .email('بريد إلكتروني غير صالح')

export const strongPasswordSchema = z.string()
  .min(10, 'كلمة المرور يجب أن تكون 10 أحرف على الأقل')
  .max(128, 'كلمة المرور طويلة جداً')
  .regex(/[a-z]/, 'كلمة المرور يجب أن تحتوي على حرف صغير')
  .regex(/[A-Z]/, 'كلمة المرور يجب أن تحتوي على حرف كبير')
  .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي على رقم')
  .regex(/[^A-Za-z0-9]/, 'كلمة المرور يجب أن تحتوي على رمز خاص')

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'الاسم يجب أن يكون حرفين على الأقل').max(120, 'الاسم طويل جداً'),
  email: emailSchema,
  password: strongPasswordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمة المرور غير متطابقة',
  path: ['confirmPassword']
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'أدخل كلمة المرور').max(128, 'كلمة المرور طويلة جداً')
})

export const forgotPasswordSchema = z.object({
  email: emailSchema
})

export const resetPasswordSchema = z.object({
  password: strongPasswordSchema,
  confirmPassword: z.string(),
  token: z.string().trim().min(32, 'رابط إعادة التعيين غير صالح').max(256, 'رابط إعادة التعيين غير صالح').optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمة المرور غير متطابقة',
  path: ['confirmPassword']
})

export const verifyDeviceSchema = z.object({
  key: z.string().trim().min(1, 'مفتاح التفعيل مطلوب').max(64, 'مفتاح التفعيل غير صالح'),
  deviceFingerprint: z.string().trim().min(8, 'بصمة الجهاز مطلوبة').max(256, 'بصمة الجهاز طويلة جداً'),
  deviceInfo: z.object({
    hostname: z.string().max(255).optional(),
    platform: z.string().max(120).optional(),
    arch: z.string().max(120).optional(),
    cpu: z.string().max(255).optional(),
    cpuCores: z.number().int().min(1).max(512).optional(),
    ram: z.string().max(120).optional(),
    gpu: z.string().max(255).optional(),
    screenResolution: z.string().max(80).optional()
  }).strict().optional()
})

export const resetDeviceSchema = z.object({
  key: z.string().trim().min(1, 'مفتاح التفعيل مطلوب').max(64, 'مفتاح التفعيل غير صالح'),
  deviceFingerprint: z.string().trim().min(8, 'بصمة الجهاز مطلوبة').max(256, 'بصمة الجهاز طويلة جداً')
})

export const generateKeysSchema = z.object({
  count: z.coerce.number().int().min(1).max(100),
  plan: z.string().trim().min(1).max(50).default('pro'),
  durationDays: z.coerce.number().int().min(1).max(3650).default(365),
  maxDevices: z.coerce.number().int().min(1).max(25).default(1)
})

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(2).max(120).optional(),
  sendEmail: z.boolean().default(true)
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type VerifyDeviceInput = z.infer<typeof verifyDeviceSchema>
export type ResetDeviceInput = z.infer<typeof resetDeviceSchema>
export type GenerateKeysInput = z.infer<typeof generateKeysSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
