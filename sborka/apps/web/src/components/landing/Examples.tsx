import Link from "next/link";
import type { ShowcasePhotos } from "@/lib/showcase";
import type { NicheId, SiteSpec } from "@/lib/sites/schema";
import { Icon } from "@/sites/icons";
import { RevealText } from "../RevealText";
import { GlowLines } from "./GlowLines";
import { ShowcaseSite } from "./ShowcaseSite";
import { SiteThumb } from "./SiteThumb";
import s from "./Examples.module.css";

/** Подписи к примерам на главной. «Другое» здесь не показываем — у него нет своего портфолио. */
const META: Record<Exclude<NicheId, "other">, { label: string; kind: string; tag: string }> = {
  coffee: { label: "Кофейня", kind: "Кафе", tag: "#cozy" },
  nails: { label: "Салон красоты", kind: "Услуги", tag: "#elegant" },
  repair: { label: "Ремонт квартир", kind: "Услуги", tag: "#strict" },
  auto: { label: "Автосервис", kind: "Авто", tag: "#dark" },
  psychologist: { label: "Психолог", kind: "Эксперт", tag: "#calm" },
  fitness: { label: "Фитнес-студия", kind: "Спорт", tag: "#bold" },
  legal: { label: "Юридическая практика", kind: "Услуги", tag: "#corporate" },
  barber: { label: "Барбершоп", kind: "Услуги", tag: "#brutal" },
  cleaning: { label: "Клининг", kind: "Услуги", tag: "#fresh" },
  dental: { label: "Стоматология", kind: "Медицина", tag: "#clean" },
  photo: { label: "Фотограф", kind: "Творчество", tag: "#minimal" },
  florist: { label: "Цветочный магазин", kind: "Магазин", tag: "#tender" },
};

export function Examples({ specs, photos }: { specs: SiteSpec[]; photos: ShowcasePhotos }) {
  return (
    <section id="examples" className={s.section} aria-labelledby="examples-title">
      <GlowLines set="examples" />
      <div className={`container ${s.head}`}>
        <div>
          <RevealText id="examples-title" className="section-title">
            Примеры сайтов
          </RevealText>
          <p className="section-sub">
            Каждый сайт уникален: мы подбираем стиль под ваш бизнес, а не наоборот. Компании в примерах вымышленные.
          </p>
        </div>

        <div className={s.cluster} aria-hidden="true">
          <div className={s.clusterBrowser}>
            <ShowcaseSite photos={photos} />
          </div>
          <div className={s.note}>
            <span>
              <Icon name="palette" size={14} />
            </span>
            Стиль подбирается под нишу и аудиторию
          </div>
          <div className={`${s.note} ${s.note2}`}>
            <span>
              <Icon name="clock" size={14} />
            </span>
            Первый вариант — за несколько минут
          </div>
        </div>
      </div>

      <ul className={`container ${s.grid}`}>
        {specs.map((spec) => {
          if (spec.niche === "other") return null;
          const m = META[spec.niche];
          return (
            <li key={spec.niche} className={s.card}>
              <div className={s.preview}>
                <SiteThumb spec={spec} />
                <Link
                  href={`/examples/${spec.niche}`}
                  className={s.overlay}
                  data-cursor="Открыть"
                  aria-label={`Открыть пример: ${m.label}, ${spec.business.name}`}
                />
              </div>
              <h3 className={s.name}>{m.label}</h3>
              <p className={s.meta}>
                {m.kind} · {spec.business.city}
              </p>
              <p className={s.tag}>{m.tag}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
