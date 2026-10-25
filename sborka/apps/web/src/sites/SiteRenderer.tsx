import type { CSSProperties, ReactNode } from "react";
import { NICHES } from "@/lib/sites/niches";
import type { SiteSpec } from "@/lib/sites/schema";
import { getTheme, type SiteTheme } from "@/lib/sites/themes";
import { Icon } from "./icons";
import { MoodArt } from "./MoodArt";
import s from "./site.module.css";
import "./fonts";

export type SiteMode = "preview" | "example" | "live";
type Item = SiteSpec["services"]["items"][number];

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
  const shape = spec.heroVariant === "stacked" && theme.heroShape === "fade" ? "rounded" : theme.heroShape;
  const location = [spec.business.city, spec.contacts.address].filter(Boolean).join(", ");

  return (
    <div className={s.site} style={vars} data-niche={spec.niche} data-shape={shape}>
      <header className={s.top}>
        <div className={`${s.wrap} ${s.topInner}`}>
          <span className={s.logo}>
            <Icon name={spec.business.logoIcon} size={30} className={s.logoIcon} />
            <span>
              <b>{spec.business.name}</b>
              {spec.business.tagline && <small>{spec.business.tagline}</small>}
            </span>
          </span>
          <nav className={s.nav} aria-label="Разделы сайта">
            <a href="#services">{spec.services.eyebrow || spec.services.title}</a>
            <a href="#about">{spec.about.title}</a>
            <a href="#contacts">Контакты</a>
          </nav>
          <span className={s.phone}>
            <Icon name="phone" size={18} />
            <Phone live={live} href={phoneHref} phone={spec.contacts.phone} />
          </span>
        </div>
      </header>

      <main>
        <section className={`${s.hero} ${spec.heroVariant === "stacked" ? s.heroStacked : s.heroSplit}`}>
          <div className={`${s.wrap} ${s.heroGrid}`}>
            <div className={s.heroText}>
              {spec.hero.eyebrow && <p className={s.eyebrow}>{spec.hero.eyebrow}</p>}
              <h1 className={s.heroTitle}>
                <Accent text={spec.hero.title} accent={spec.hero.accent} />
              </h1>
              <p className={s.heroSub}>{spec.hero.subtitle}</p>
              <a className={s.button} href="#contacts">
                {spec.hero.cta}
                <Icon name="arrow" size={20} />
              </a>
              {spec.hero.features.length > 0 && (
                <ul className={s.features}>
                  {spec.hero.features.map((f) => (
                    <li key={f.text}>
                      <Icon name={f.icon} size={26} />
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {location && (
                <p className={s.location}>
                  <Icon name="pin" size={16} />
                  {location}
                </p>
              )}
            </div>
            <div className={s.heroMedia}>
              <Media src={spec.images?.hero} niche={spec.niche} variant={variant} eager />
              {mode === "preview" && <span className={s.artNote}>Здесь будет ваше фото</span>}
            </div>
          </div>
        </section>

        <section id="services" className={s.section}>
          <div className={s.wrap}>
            <Services spec={spec} theme={theme} />
          </div>
        </section>

        <Strip spec={spec} />

        <section id="about" className={`${s.section} ${s.about}`}>
          <div className={`${s.wrap} ${s.aboutGrid}`}>
            <div className={s.aboutMedia}>
              <Media src={spec.images?.about} niche={spec.niche} variant={variant + 1} />
            </div>
            <div>
              <h2 className={s.h2}>{spec.about.title}</h2>
              <p className={s.lead}>{spec.about.text}</p>
              <ul className={s.reasons}>
                {spec.reasons.items.map((r) => (
                  <li key={r.title}>
                    <h3>{r.title}</h3>
                    <p>{r.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <div className={`${s.wrap} ${s.faqGrid}`}>
            <h2 className={s.h2}>{spec.faq.title}</h2>
            <div className={s.faq}>
              {spec.faq.items.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="contacts" className={`${s.section} ${s.contacts}`}>
          <div className={`${s.wrap} ${s.contactsGrid}`}>
            <div>
              <h2 className={s.h2}>{spec.contacts.title}</h2>
              <ul className={s.contactList}>
                <li>
                  <Icon name="phone" size={22} />
                  <Phone live={live} href={phoneHref} phone={spec.contacts.phone} />
                </li>
                {location && (
                  <li>
                    <Icon name="pin" size={22} />
                    <span>{location}</span>
                  </li>
                )}
                {spec.contacts.hours && (
                  <li>
                    <Icon name="clock" size={22} />
                    <span>{spec.contacts.hours}</span>
                  </li>
                )}
              </ul>
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
                  <Icon name="arrow" size={20} />
                </button>
                {!live && <p className={s.formNote}>Форма заработает после публикации сайта.</p>}
              </fieldset>
            </form>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={`${s.wrap} ${s.footerInner}`}>
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

function Services({ spec, theme }: { spec: SiteSpec; theme: SiteTheme }) {
  const { services } = spec;
  const head = (
    <div className={s.servicesHead}>
      <div>
        {services.eyebrow && <p className={s.eyebrow}>{services.eyebrow}</p>}
        <h2 className={s.h2}>{services.title}</h2>
        {services.lead && <p className={s.servicesLead}>{services.lead}</p>}
      </div>
      <a href="#contacts" className={s.more}>
        {spec.contacts.formCta}
        <Icon name="arrow" size={18} />
      </a>
    </div>
  );

  const style = theme.serviceStyle;
  if (style === "arch") {
    const withPhoto = services.items.filter((i) => i.image).slice(0, 2);
    const rest = services.items.filter((i) => !withPhoto.includes(i));
    return (
      <>
        <div className={s.archGrid}>
          {head}
          {withPhoto.map((item) => (
            <figure key={item.name} className={s.archCard}>
              <div className={s.archMedia}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt="" loading="lazy" />
              </div>
              <figcaption>
                <span>{item.name}</span>
                <b>{item.price}</b>
              </figcaption>
            </figure>
          ))}
        </div>
        {rest.length > 0 && <PriceList items={rest} />}
      </>
    );
  }

  const cards = style === "photo" ? services.items.filter((i) => i.image) : services.items;
  const rest = services.items.filter((i) => !cards.includes(i));
  return (
    <>
      {head}
      {cards.length > 0 && (
        <ul className={`${s.cards} ${style === "icon" ? s.iconCards : s.photoCards}`}>
          {cards.map((item, i) => (
            <ServiceCard key={item.name} item={item} style={style} index={i} cta={spec.contacts.formCta} />
          ))}
        </ul>
      )}
      {rest.length > 0 && <PriceList items={rest} />}
    </>
  );
}

function ServiceCard({ item, style, index, cta }: { item: Item; style: "photo" | "icon"; index: number; cta: string }) {
  const photo = style === "photo" && item.image;
  return (
    <li className={s.card}>
      {photo ? (
        <div className={s.cardMedia}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt="" loading="lazy" />
        </div>
      ) : (
        <span className={s.cardIcon}>
          <Icon name={item.icon ?? "sparkle"} size={28} />
        </span>
      )}
      <div className={s.cardBody}>
        <h3>{item.name}</h3>
        <p className={s.cardPrice}>{item.price}</p>
        {item.note && <p className={s.cardNote}>{item.note}</p>}
        {style === "icon" ? (
          <a href="#contacts" className={`${s.cardButton} ${index === 1 ? s.cardButtonFilled : ""}`}>
            {cta}
            <Icon name="arrow" size={18} />
          </a>
        ) : (
          <a href="#contacts" className={s.cardPlus} aria-label={`${cta}: ${item.name}`}>
            <Icon name="plus" size={18} />
          </a>
        )}
      </div>
    </li>
  );
}

function PriceList({ items }: { items: Item[] }) {
  return (
    <ul className={s.priceList}>
      {items.map((item) => (
        <li key={item.name}>
          <span>{item.name}</span>
          <span className={s.leader} aria-hidden="true" />
          <b>{item.price}</b>
        </li>
      ))}
    </ul>
  );
}

function Strip({ spec }: { spec: SiteSpec }) {
  const { strip } = spec;
  if (strip?.items?.length) {
    return (
      <section className={s.stripItems}>
        <ul className={s.wrap}>
          {strip.items.map((it) => (
            <li key={it.title}>
              <Icon name={it.icon} size={30} />
              <span>
                <b>{it.title}</b>
                <small>{it.text}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  if (!strip?.quote) return null;
  return (
    <section className={s.stripQuote}>
      <div className={s.wrap}>
        <div className={s.quoteBand}>
          <p className={s.quote}>{strip.quote}</p>
          {strip.caption && <p className={s.quoteCaption}>{strip.caption}</p>}
        </div>
      </div>
    </section>
  );
}

function Media({ src, niche, variant, eager }: { src?: string; niche: SiteSpec["niche"]; variant: number; eager?: boolean }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={s.photo} src={src} alt="" loading={eager ? "eager" : "lazy"} />;
  }
  return <MoodArt niche={niche} variant={variant} />;
}

function Accent({ text, accent }: { text: string; accent?: string }): ReactNode {
  const i = accent ? text.lastIndexOf(accent) : -1;
  if (!accent || i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className={s.accent}>{accent}</span>
      {text.slice(i + accent.length)}
    </>
  );
}

function Phone({ live, href, phone }: { live: boolean; href: string; phone: string }) {
  return live ? <a href={href}>{phone}</a> : <span>{phone}</span>;
}

const WATERMARK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="220"><text x="20" y="130" transform="rotate(-18 180 110)" font-family="sans-serif" font-size="22" font-weight="600" fill="rgba(128,128,128,0.22)">Прототип · Сборка</text></svg>`,
)}")`;
