import { Cursor } from "@/components/Cursor";
import { Grain } from "@/components/Grain";
import { Preloader } from "@/components/Preloader";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Examples } from "@/components/landing/Examples";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { Pricing } from "@/components/landing/Pricing";
import { Reviews } from "@/components/landing/Reviews";
import { Steps } from "@/components/landing/Steps";
import { showcasePhotos } from "@/lib/showcase";
import { getGenerator } from "@/lib/sites/generator";
import { demoBrief } from "@/lib/sites/niches";
import { NICHE_IDS } from "@/lib/sites/schema";

// Выполняется до отрисовки: решает, показывать ли прелоадер, чтобы он не мигал при повторном заходе
const PRELOADER_SCRIPT = `try{var d=document.documentElement;if(sessionStorage.getItem('sborka-seen')==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('sb-seen')}else{d.classList.add('is-loading')}}catch(e){}`;

export default async function Home() {
  const generator = getGenerator();
  const specs = await Promise.all(NICHE_IDS.map((id) => generator.generate({ brief: demoBrief(id), variant: 0, demo: true })));
  const photos = showcasePhotos();

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PRELOADER_SCRIPT }} />
      <Preloader />
      <a href="#main" className="skip-link">
        Перейти к содержанию
      </a>
      <SmoothScroll />
      <Cursor />
      <Grain />
      <Header />
      <main id="main">
        <Hero photos={photos} />
        <Steps />
        <LiveDemo specs={specs} />
        <Examples specs={specs} photos={photos} />
        <Pricing />
        <Reviews />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
