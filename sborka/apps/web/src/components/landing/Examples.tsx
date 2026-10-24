import Link from "next/link";
import { NICHES } from "@/lib/sites/niches";
import type { SiteSpec } from "@/lib/sites/schema";
import { SiteRenderer } from "@/sites/SiteRenderer";
import { BrowserFrame } from "../BrowserFrame";
import s from "./Examples.module.css";

export function Examples({ specs }: { specs: SiteSpec[] }) {
  return (
    <section id="examples" className={s.section} aria-labelledby="examples-title">
      <div className={`container ${s.head}`}>
        <h2 id="examples-title" className={s.title}>
          Примеры сайтов
        </h2>
        <p className={s.sub}>
          Каждый собран из брифа на 5 минут. Компании вымышленные: это демонстрация того, что получите вы.
        </p>
      </div>

      <ul className={s.track}>
        {specs.map((spec) => (
          <li key={spec.niche} className={s.card}>
            <div className={s.preview}>
              <BrowserFrame address={spec.business.name} className={s.frame}>
                <div className={s.scaler} inert aria-hidden="true">
                  <SiteRenderer spec={spec} mode="example" />
                </div>
              </BrowserFrame>
              <Link
                href={`/examples/${spec.niche}`}
                className={s.overlay}
                aria-label={`Открыть пример: ${spec.business.name}`}
              />
            </div>
            <div className={s.meta}>
              <div>
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
    </section>
  );
}
