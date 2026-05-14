export const platformGradients: Record<string, string> = {
  dashboard: 'linear-gradient(135deg, #0A6CF1, #8B2CF5)',
  accounts: 'linear-gradient(135deg, #22c55e, #16a34a)',
  facebook: 'linear-gradient(135deg, #1877f2, #0A6CF1)',
  whatsapp: 'linear-gradient(135deg, #25d366, #128C7E)',
  instagram: 'linear-gradient(135deg, #e4405f, #f77737)',
  twitter: 'linear-gradient(135deg, #1da1f2, #0A6CF1)',
  linkedin: 'linear-gradient(135deg, #0a66c2, #004182)',
  telegram: 'linear-gradient(135deg, #0088cc, #005f8f)',
  snapchat: 'linear-gradient(135deg, #fffc00, #ff7700)',
  pinterest: 'linear-gradient(135deg, #e60023, #ad081b)',
  reddit: 'linear-gradient(135deg, #ff4500, #dc2626)',
  tiktok: 'linear-gradient(135deg, #69c9d0, #ee1d52)',
  threads: 'linear-gradient(135deg, #000000, #8B2CF5)',
  google: 'linear-gradient(135deg, #4285f4, #34a853)',
  'send-emails': 'linear-gradient(135deg, #ea4335, #dd4b39)',
  'auto-point': 'linear-gradient(135deg, #f97316, #ea580c)',
  security: 'linear-gradient(135deg, #10b981, #059669)',
  account: 'linear-gradient(135deg, #8B2CF5, #0A6CF1)',
  'other-tools': 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  settings: 'linear-gradient(135deg, #64748b, #475569)',
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #0A6CF1, #8B2CF5)'

export const getPlatformGradient = (id: string): string =>
  platformGradients[id] || DEFAULT_GRADIENT
