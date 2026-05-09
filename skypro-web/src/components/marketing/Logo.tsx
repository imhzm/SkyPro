import Image from 'next/image'

interface LogoProps {
  /** Pixel size of the logo (square). Default 40 for navbar, 32 for footer/auth headers. */
  size?: number
  /** Optional extra className */
  className?: string
  /** Whether to mark this as priority (only true for the navbar/hero logo) */
  priority?: boolean
}

/**
 * SkyPro brand logo. Uses the official SP letter-mark.
 * Always alt-tagged for accessibility + SEO.
 */
export function Logo({ size = 40, className = '', priority = false }: LogoProps) {
  return (
    <Image
      src="/images/skypro-logo.png"
      alt="شعار SkyPro — منصة التسويق الآلي من Sky Wave"
      width={size}
      height={size}
      priority={priority}
      sizes={`${size}px`}
      className={`shrink-0 select-none object-contain drop-shadow-[0_0_12px_rgba(10,108,241,0.35)] ${className}`}
    />
  )
}
