import { SmoothScroll } from "@/components/SmoothScroll";
import { Examples } from "@/components/landing/Examples";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import type { AssemblyItem } from "@/components/landing/AssemblyWindow";
import { getGenerator } from "@/lib/sites/generator";
import { demoBrief } from "@/lib/sites/niches";
import { NICHE_IDS, type NicheId } from "@/lib/sites/schema";

const PROMPTS: Record<NicheId, { short: string; prompt: string }> = {
  nails: { short: "Маникюр", prompt: "Студия маникюра в Казани, три мастера, нежные тона, запись онлайн" },
  repair: { short: "Ремонт", prompt: "Ремонт квартир в Екатеринбурге под ключ, своя бригада, строгий стиль" },
  auto: { short: "Автосервис", prompt: "Автосервис в Новосибирске, тёмный сайт, цены на обслуживание" },
  psychologist: { short: "Психолог", prompt: "Психолог в Москве, спокойные цвета, встречи очно и онлайн" },
  coffee: { short: "Кофейня", prompt: "Кофейня в Петербурге, десерты и торты на заказ, уютно" },
};

export default async function Home() {
  const generator = getGenerator();
  const specs = await Promise.all(NICHE_IDS.map((id) => generator.generate({ brief: demoBrief(id), variant: 0 })));
  const items: AssemblyItem[] = specs.map((spec) => ({
    label: PROMPTS[spec.niche].short,
    prompt: PROMPTS[spec.niche].prompt,
    address: `Прототип: ${spec.business.name}`,
    spec,
  }));
  const coffee = specs.find((s) => s.niche === "coffee")!;

  return (
    <>
      <a href="#main" className="skip-link">
        Перейти к содержанию
      </a>
      <SmoothScroll />
      <Header />
      <main id="main">
        <Hero items={items} />
        <HowItWorks spec={coffee} />
        <Examples specs={specs} />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

