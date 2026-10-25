import Link from "next/link";
import { NICHES } from "@/lib/sites/niches";
import type { SiteSpec } from "@/lib/sites/schema";
import { SiteRenderer } from "@/sites/SiteRenderer";
import { BrowserFrame } from "../BrowserFrame";
import { RevealText } from "../RevealText";
import { HorizontalGallery } from "./HorizontalGallery";
import s from "./Examples.module.css";

export function Examples({ specs }: { specs: SiteSpec[] }) {
  return (
    <section id="examples" className={s.section} aria-labelledby="examples-title">
      <HorizontalGallery>
        <div className={`container ${s.head}`}>
          <RevealText id="examples-title" className={s.title}>
            Примеры сайтов
          </RevealText>
          <p className={s.sub}>
            Каждый собран из брифа на 5 минут. Компании вымышленные: это демонстрация того, что получите вы.
          </p>
        </div>

        <ul className={s.track} data-gallery-track>
          {specs.map((spec, i) => (
            <li key={spec.niche} className={s.card} data-gallery-card>
              <div className={s.preview}>
                <BrowserFrame address={spec.business.name} className={s.frame}>
                  <div data-parallax className={s.parallax}>
                    <div className={s.scaler} inert aria-hidden="true">
                      <SiteRenderer spec={spec} mode="example" />
                    </div>
                  </div>
                </BrowserFrame>
                <Link
                  href={`/examples/${spec.niche}`}
                  className={s.overlay}
                  data-cursor="Открыть"
                  aria-label={`Открыть пример: ${spec.business.name}`}
                />
              </div>
              <div className={s.meta}>
                <span className={s.index} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className={s.metaText}>
                  <h3 className={s.name}>{spec.business.name}</h3>
                  <p className={s.niche}>{NICHES[spec.niche].label}</p>
                </div>
                <Link href={`/brief?niche=${spec.niche}`} className="link">
                  Хочу такой же
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </HorizontalGallery>
    </section>
  );
}
