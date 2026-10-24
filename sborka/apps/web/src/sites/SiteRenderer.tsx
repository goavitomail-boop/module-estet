import type { CSSProperties } from "react";
import { NICHES } from "@/lib/sites/niches";
import type { SiteSpec } from "@/lib/sites/schema";
import { getTheme } from "@/lib/sites/themes";
import { MoodArt } from "./MoodArt";
import s from "./site.module.css";
import "./fonts";

export type SiteMode = "preview" | "example" | "live";

/** Рендерит клиентский сайт из SiteSpec. */
export function SiteRenderer({ spec, mode }: { spec: SiteSpec; mode: SiteMode }) {
  const theme = getTheme(spec.themeId);
  const vars = {
    "--s-bg": theme.bg,
    "--s-surface": theme.surface,
    "--s-text": theme.text,
    "--s-muted": theme.muted,
    "--s-accent": theme.accent,
    "--s-accent-text": theme.accentText,
    "--s-line": theme.line,
    "--s-display": theme.display,
    "--s-display-weight": theme.displayWeight,
    "--s-body": theme.body,
    "--s-radius": theme.radius,
  } as CSSProperties;
  // У альтернативной темы композиции зеркалятся, чтобы варианты отличались сильнее.
  const variant = NICHES[spec.niche].themes.indexOf(spec.themeId) === 1 ? 1 : 0;
  const live = mode === "live";
  const phoneHref = `tel:${spec.contacts.phone.replace(/[^\d+]/g, "")}`;

  return (
    <div className={s.site} style={vars} data-niche={spec.niche}>
      <header className={s.top}>
        <div className={s.wrap}>
          <span className={s.brand}>{spec.business.name}</span>
          <nav className={s.nav} aria-label="Разделы сайта">
            <a href="#services">{spec.services.title}</a>
            <a href="#about">{spec.about.title}</a>
            <a href="#contacts">Контакты</a>
          </nav>
          {live ? (
            <a className={s.phone} href={phoneHref}>
              {spec.contacts.phone}
            </a>
          ) : (
            <span className={s.phone}>{spec.contacts.phone}</span>
          )}
        </div>
      </header>

      <main>
        <section className={`${s.hero} ${spec.heroVariant === "stacked" ? s.heroStacked : s.heroSplit}`}>
          <div className={s.wrap}>
            <div className={s.heroText}>
              <p className={s.location}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M7 13s4.5-4.2 4.5-7.5a4.5 4.5 0 0 0-9 0C2.5 8.8 7 13 7 13Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="7" cy="5.5" r="1.6" fill="currentColor" />
                </svg>
                {[spec.business.city, spec.contacts.address].filter(Boolean).join(", ")}
              </p>
              <h1 className={s.heroTitle}>{spec.hero.title}</h1>
              <p className={s.heroSub}>{spec.hero.subtitle}</p>
              <a className={s.button} href="#contacts">
                {spec.hero.cta}
              </a>
            </div>
            <div className={s.heroArt}>
              <MoodArt niche={spec.niche} variant={variant} />
              {mode === "preview" && <span className={s.artNote}>Здесь будет ваше фото</span>}
            </div>
          </div>
        </section>

        <section id="services" className={s.section}>
          <div className={s.wrap}>
            <h2 className={s.h2}>{spec.services.title}</h2>
            <ul className={s.services}>
              {spec.services.items.map((item, i) => (
                <li key={i}>
                  <span>{item.name}</span>
                  <span className={s.leader} aria-hidden="true" />
                  <span className={s.price}>{item.price}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="about" className={`${s.section} ${s.about}`}>
          <div className={s.wrap}>
            <div className={s.aboutArt}>
              <MoodArt niche={spec.niche} variant={variant + 1} />
            </div>
            <div>
              <h2 className={s.h2}>{spec.about.title}</h2>
              <p className={s.lead}>{spec.about.text}</p>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.wrap}>
            <h2 className={s.h2}>{spec.reasons.title}</h2>
            <div className={s.reasons}>
              {spec.reasons.items.map((r, i) => (
                <div key={i} className={s.reason}>
                  <h3>{r.title}</h3>
                  <p>{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={s.section}>
          <div className={`${s.wrap} ${s.faqWrap}`}>
            <h2 className={s.h2}>{spec.faq.title}</h2>
            <div className={s.faq}>
              {spec.faq.items.map((f, i) => (
                <details key={i}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="contacts" className={`${s.section} ${s.contacts}`}>
          <div className={s.wrap}>
            <div>
              <h2 className={s.h2}>{spec.contacts.title}</h2>
              <dl className={s.contactList}>
                <dt>Телефон</dt>
                <dd>{live ? <a href={phoneHref}>{spec.contacts.phone}</a> : spec.contacts.phone}</dd>
                {spec.contacts.address && (
                  <>
                    <dt>Адрес</dt>
                    <dd>{spec.contacts.address}</dd>
                  </>
                )}
                {spec.contacts.hours && (
                  <>
                    <dt>Часы работы</dt>
                    <dd>{spec.contacts.hours}</dd>
                  </>
                )}
              </dl>
            </div>
            <form className={s.form}>
              <fieldset disabled={!live}>
                <label>
                  Имя
                  <input name="name" autoComplete="name" />
                </label>
                <label>
                  Телефон
                  <input name="phone" type="tel" autoComplete="tel" />
                </label>
                <button className={s.button} type="submit">
                  {spec.contacts.formCta}
                </button>
                {!live && <p className={s.formNote}>Форма заработает после публикации сайта.</p>}
              </fieldset>
            </form>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.wrap}>
          <span>
            © {new Date().getFullYear()} {spec.business.name}
          </span>
          <span>{spec.business.city}</span>
        </div>
      </footer>

      {mode === "preview" && (
        <div className={s.watermark} style={{ backgroundImage: WATERMARK }} aria-hidden="true" />
      )}
    </div>
  );
}

const WATERMARK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="220"><text x="20" y="130" transform="rotate(-18 180 110)" font-family="sans-serif" font-size="22" font-weight="600" fill="rgba(128,128,128,0.22)">Прототип · Сборка</text></svg>`,
)}")`;
