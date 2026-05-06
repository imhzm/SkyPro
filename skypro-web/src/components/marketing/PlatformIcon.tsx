'use client'

import {
  Globe,
  MessageCircle,
  Camera,
  Megaphone,
  Briefcase,
  Send,
  Music2,
  Pin,
  Ghost,
  Hash,
  Flame,
  MapPin,
  Mail,
  Store,
  Target,
  Shield,
  Users,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  facebook: Globe,
  whatsapp: MessageCircle,
  instagram: Camera,
  twitter: Megaphone,
  linkedin: Briefcase,
  telegram: Send,
  tiktok: Music2,
  pinterest: Pin,
  snapchat: Ghost,
  threads: Hash,
  reddit: Flame,
  'google-maps': MapPin,
  'send-emails': Mail,
  olx: Store,
  'auto-point': Target,
  security: Shield,
  accounts: Users,
  campaigns: BarChart3,
}

interface PlatformIconProps {
  id: string
  className?: string
  style?: React.CSSProperties
  size?: number
}

export function PlatformIcon({ id, className, style, size = 24 }: PlatformIconProps) {
  const Icon = iconMap[id]
  if (!Icon) return null
  return <Icon className={className} size={size} style={style} />
}

export { iconMap }