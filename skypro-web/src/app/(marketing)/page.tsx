import { Navbar } from '@/components/marketing/Navbar'
import { HeroSection } from '@/components/marketing/HeroSection'
import { FeaturesSection } from '@/components/marketing/FeaturesSection'
import { HowItWorksSection } from '@/components/marketing/HowItWorksSection'
import { TestimonialsSection } from '@/components/marketing/TestimonialsSection'
import { PricingSection } from '@/components/marketing/PricingSection'
import { FaqSection } from '@/components/marketing/FaqSection'
import { CtaSection } from '@/components/marketing/CtaSection'
import { Footer } from '@/components/marketing/Footer'
import { WhatsAppButton } from '@/components/marketing/WhatsAppButton'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#060d1b]">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <Footer />
      <WhatsAppButton />
    </main>
  )
}
