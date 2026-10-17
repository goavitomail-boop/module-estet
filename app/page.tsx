import { SiteHeader } from '@/components/site-header'
import { HeroSection } from '@/components/hero-section'
import { ServicesSection } from '@/components/services-section'
import { GallerySection } from '@/components/gallery-section'
import { AssemblySection } from '@/components/assembly-section'
import { MaterialsSection } from '@/components/materials-section'
import { FillingSection } from '@/components/filling-section'
import { AdvantagesSection } from '@/components/advantages-section'
import { ProcessSection } from '@/components/process-section'
import { FaqSection } from '@/components/faq-section'
import { CtaSection } from '@/components/cta-section'
import { SiteFooter } from '@/components/site-footer'
import { QuizBanner } from '@/components/quiz-banner'
import { JsonLd } from '@/components/json-ld'
import { businessJsonLd, faqJsonLd, websiteJsonLd } from '@/lib/seo'

export default function Page() {
  return (
    <>
      <JsonLd data={[websiteJsonLd, businessJsonLd, faqJsonLd]} />
      <SiteHeader overHero />
      <main>
        <HeroSection />
        <QuizBanner />
        <ServicesSection />
        <GallerySection />
        <AssemblySection />
        <MaterialsSection />
        <FillingSection />
        <AdvantagesSection />
        <ProcessSection />
        <FaqSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  )
}
