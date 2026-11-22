import { decode, encode } from 'next-auth/jwt'
import { GOOGLE_CONVERSION_ENDPOINT } from './product-analytics'

export const GOOGLE_CONVERSION_COOKIE = 'skypro_google_conversion'
export const GOOGLE_CONVERSION_TTL = 90

export const googleConversionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: GOOGLE_CONVERSION_ENDPOINT,
}

export function safeGoogleConversionTarget(target: unknown) {
  if (typeof target !== 'string' || target.length > 1024 || !target.startsWith('/')
    || target.startsWith('//') || /[\\\u0000-\u001F\u007F]/.test(target)) return null
  try {
    const url = new URL(target, 'https://skypro.invalid')
    if (url.origin !== 'https://skypro.invalid' || url.pathname.startsWith('//') || url.pathname === '/auth/callback') return null
    return url.pathname + url.search + url.hash
  } catch { return null }
}

type GoogleConversion = {
  registrationCompleted: boolean
  trialActivated: boolean
  target: string
}

export async function issueGoogleConversionReceipt(userId: number, conversion: GoogleConversion, secret: string) {
  const target = safeGoogleConversionTarget(conversion.target)
  if (!target || (!conversion.registrationCompleted && !conversion.trialActivated)) return null
  return encode({
    token: { ...conversion, target, sub: String(userId) },
    secret,
    salt: GOOGLE_CONVERSION_COOKIE,
    maxAge: GOOGLE_CONVERSION_TTL,
  })
}

export async function readGoogleConversionReceipt(token: string, userId: string, secret: string) {
  try {
    const receipt = await decode({ token, secret, salt: GOOGLE_CONVERSION_COOKIE })
    const target = safeGoogleConversionTarget(receipt?.target)
    if (!target || receipt?.sub !== userId || typeof receipt.jti !== 'string'
      || typeof receipt.exp !== 'number' || Date.now() >= receipt.exp * 1000
      || typeof receipt.registrationCompleted !== 'boolean' || typeof receipt.trialActivated !== 'boolean') return null
    return {
      target,
      id: receipt.jti,
      registrationCompleted: receipt.registrationCompleted,
      trialActivated: receipt.trialActivated,
    }
  } catch { return null }
}
