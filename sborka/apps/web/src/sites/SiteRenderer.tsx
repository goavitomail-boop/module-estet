import type { CSSProperties, ReactNode } from "react";
import { NICHES } from "@/lib/sites/niches";
import type { Block, IconName, SiteSpec } from "@/lib/sites/schema";
import { getTheme, type SiteTheme } from "@/lib/sites/themes";
import { Icon } from "./icons";
import { MoodArt } from "./MoodArt";
import s from "./site.module.css";
import "./fonts";

export type SiteMode = "preview" | "example" | "live";
type Item = Extract<Block, { type: "services" }>["items"][number];

interface Ctx {
  spec: SiteSpec;
  theme: SiteTheme;
  variant: number;
  icon: IconName;
  mode: SiteMode;
}

/** Рендерит клиентский сайт из SiteSpec: первый экран, блоки по порядку, контакты. */
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
  const ctx: Ctx = { spec, theme, variant, icon: spec.business.logoIcon, mode };
  const live = mode === "live";
  const phoneHref = `tel:${spec.contacts.phone.replace(/[^\d+]/g, "")}`;
  const shape = spec.heroVariant === "stacked" && theme.heroShape === "fade" ? "rounded" : theme.heroShape;
  const location = [spec.business.city, spec.contacts.address].filter(Boolean).join(", ");
  const services = spec.blocks.find((b) => b.type === "services");
  const about = spec.blocks.find((b) => b.type === "about");
  const seen = new Set<string>();

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
            {services && <a href="#services">{services.eyebrow || services.title}</a>}
            {about && <a href="#about">{about.title}</a>}
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
              <Media src={spec.images?.hero} ctx={ctx} eager />
              {mode === "preview" && <span className={s.artNote}>Здесь будет ваше фото</span>}
            </div>
          </div>
        </section>

        {spec.blocks.map((block, i) => {
          // Якорь — у первого блока каждого типа, чтобы работали ссылки меню
          const id = seen.has(block.type) ? undefined : block.type;
          seen.add(block.type);
          return <BlockView key={i} block={block} id={id} ctx={ctx} />;
        })}

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
              <div className={s.map} aria-hidden="true">
                <span className={s.mapPin}>
                  <Icon name="pin" size={22} />
                </span>
              </div>
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
                <label>
                  Комментарий
                  <textarea name="comment" rows={3} />
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
        {spec.business.disclaimer && <p className={`${s.wrap} ${s.disclaimer}`}>{spec.business.disclaimer}</p>}
      </footer>

      {mode === "preview" && (
        <div className={s.watermark} style={{ backgroundImage: WATERMARK }} aria-hidden="true" />
      )}
    </div>
  );
}

function BlockView({ block, id, ctx }: { block: Block; id?: string; ctx: Ctx }) {
  switch (block.type) {
    case "services":
      return <ServicesBlock block={block} id={id} ctx={ctx} />;
    case "strip":
      return <StripBlock block={block} />;
    case "about":
      return <AboutBlock block={block} id={id} ctx={ctx} />;
    case "gallery":
      return <GalleryBlock block={block} id={id} ctx={ctx} />;
    case "steps":
      return <StepsBlock block={block} id={id} />;
    case "team":
      return <TeamBlock block={block} id={id} />;
    case "reviews":
      return <ReviewsBlock block={block} id={id} />;
    case "pricing":
      return <PricingBlock block={block} id={id} />;
    case "stats":
      return <StatsBlock block={block} />;
    case "schedule":
      return <ScheduleBlock block={block} id={id} />;
    case "cta":
      return <CtaBlock block={block} />;
    case "faq":
      return <FaqBlock block={block} id={id} />;
  }
}

/* ——— Заголовок блока ——— */

function Head({ eyebrow, title, lead, action, center }: { eyebrow?: string; title: string; lead?: string; action?: ReactNode; center?: boolean }) {
  return (
    <div className={`${s.blockHead} ${center ? s.blockHeadCenter : ""}`}>
      <div>
        {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
        <h2 className={s.h2}>{title}</h2>
        {lead && <p className={s.blockLead}>{lead}</p>}
      </div>
      {action}
    </div>
  );
}

function More({ label }: { label: string }) {
  return (
    <a href="#contacts" className={s.more}>
      {label}
      <Icon name="arrow" size={18} />
    </a>
  );
}

/* ——— Услуги ——— */

function ServicesBlock({ block, id, ctx }: { block: Extract<Block, { type: "services" }>; id?: string; ctx: Ctx }) {
  const style = block.style ?? ctx.theme.serviceStyle;
  const head = <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} action={<More label={ctx.spec.contacts.formCta} />} />;

  if (style === "list") {
    return (
      <section id={id} className={s.section}>
        <div className={`${s.wrap} ${s.listGrid}`}>
          {head}
          <PriceList items={block.items} />
        </div>
      </section>
    );
  }

  if (style === "arch") {
    const withPhoto = block.items.filter((i) => i.image).slice(0, 2);
    const rest = block.items.filter((i) => !withPhoto.includes(i));
    return (
      <section id={id} className={s.section}>
        <div className={s.wrap}>
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
        </div>
      </section>
    );
  }

  // Фото-карточки — только для услуг с фото; остальные идут списком цен
  const cards = style === "photo" ? block.items.filter((i) => i.image) : block.items;
  const rest = block.items.filter((i) => !cards.includes(i));
  return (
    <section id={id} className={s.section}>
      <div className={s.wrap}>
        {head}
        {cards.length > 0 && (
          <ul className={`${s.cards} ${style === "icon" ? s.iconCards : s.photoCards}`}>
            {cards.map((item, i) => (
              <ServiceCard key={item.name} item={item} style={style} index={i} cta={ctx.spec.contacts.formCta} />
            ))}
          </ul>
        )}
        {rest.length > 0 && <PriceList items={rest} />}
      </div>
    </section>
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
          <span className={s.priceName}>
            {item.name}
            {item.note && <small>{item.note}</small>}
          </span>
          <span className={s.leader} aria-hidden="true" />
          <b>{item.price}</b>
        </li>
      ))}
    </ul>
  );
}

/* ——— Полоса ——— */

function StripBlock({ block }: { block: Extract<Block, { type: "strip" }> }) {
  if (block.items?.length) {
    return (
      <section className={s.stripItems}>
        <ul className={s.wrap}>
          {block.items.map((it) => (
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
  if (!block.quote) return null;
  return (
    <section className={s.stripQuote}>
      <div className={s.wrap}>
        <div className={s.quoteBand}>
          <p className={s.quote}>{block.quote}</p>
          {block.caption && <p className={s.quoteCaption}>{block.caption}</p>}
        </div>
      </div>
    </section>
  );
}

/* ——— О нас ——— */

function AboutBlock({ block, id, ctx }: { block: Extract<Block, { type: "about" }>; id?: string; ctx: Ctx }) {
  return (
    <section id={id} className={`${s.section} ${s.about}`}>
      <div className={`${s.wrap} ${s.aboutGrid}`}>
        <div className={s.aboutMedia}>
          <Media src={block.image} ctx={{ ...ctx, variant: ctx.variant + 1 }} />
        </div>
        <div>
          <h2 className={s.h2}>{block.title}</h2>
          <p className={s.lead}>{block.text}</p>
          {block.points.length > 0 && (
            <ul className={s.reasons}>
              {block.points.map((r) => (
                <li key={r.title}>
                  <h3>{r.title}</h3>
                  <p>{r.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ——— Галерея ——— */

function GalleryBlock({ block, id, ctx }: { block: Extract<Block, { type: "gallery" }>; id?: string; ctx: Ctx }) {
  return (
    <section id={id} className={s.section}>
      <div className={s.wrap}>
        <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} />
        <ul className={s.gallery} data-count={block.images.length}>
          {block.images.map((img, i) => (
            <li key={i} className={s.galleryItem}>
              {img.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.src} alt={img.caption ?? ""} loading="lazy" />
              ) : (
                <Placeholder icon={ctx.icon} />
              )}
              {img.caption && <span className={s.galleryCaption}>{img.caption}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ——— Этапы ——— */

function StepsBlock({ block, id }: { block: Extract<Block, { type: "steps" }>; id?: string }) {
  return (
    <section id={id} className={`${s.section} ${s.tinted}`}>
      <div className={s.wrap}>
        <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} />
        <ol className={s.steps} data-count={block.items.length}>
          {block.items.map((st, i) => (
            <li key={st.title}>
              <span className={s.stepNum}>{String(i + 1).padStart(2, "0")}</span>
              <h3>{st.title}</h3>
              <p>{st.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ——— Команда ——— */

function TeamBlock({ block, id }: { block: Extract<Block, { type: "team" }>; id?: string }) {
  return (
    <section id={id} className={s.section}>
      <div className={s.wrap}>
        <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} />
        <ul className={s.team}>
          {block.people.map((p) => (
            <li key={p.name} className={s.person}>
              <div className={s.avatar}>
                {p.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo} alt="" loading="lazy" />
                ) : (
                  <span>{initials(p.name)}</span>
                )}
              </div>
              <h3>{p.name}</h3>
              <p>{p.role}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ——— Отзывы ——— */

function ReviewsBlock({ block, id }: { block: Extract<Block, { type: "reviews" }>; id?: string }) {
  return (
    <section id={id} className={`${s.section} ${s.tinted}`}>
      <div className={s.wrap}>
        <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} />
        <ul className={s.reviews}>
          {block.items.map((r) => (
            <li key={r.name} className={s.review}>
              <span className={s.stars} aria-hidden="true">
                {[0, 1, 2, 3, 4].map((k) => (
                  <Icon key={k} name="star" size={16} />
                ))}
              </span>
              <p>{r.text}</p>
              <footer>
                <span className={s.reviewAvatar}>{initials(r.name)}</span>
                <span>
                  <b>{r.name}</b>
                  {r.meta && <small>{r.meta}</small>}
                </span>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ——— Тарифы ——— */

function PricingBlock({ block, id }: { block: Extract<Block, { type: "pricing" }>; id?: string }) {
  return (
    <section id={id} className={s.section}>
      <div className={s.wrap}>
        <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} center />
        <ul className={s.plans}>
          {block.plans.map((p) => (
            <li key={p.name} className={`${s.plan} ${p.featured ? s.planFeatured : ""}`}>
              {p.featured && <span className={s.planBadge}>Популярный</span>}
              <h3>{p.name}</h3>
              <p className={s.planPrice}>
                {p.price}
                {p.period && <small> {p.period}</small>}
              </p>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>
                    <Icon name="check" size={18} />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#contacts" className={p.featured ? s.button : s.buttonOutline}>
                Выбрать
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ——— Цифры ——— */

function StatsBlock({ block }: { block: Extract<Block, { type: "stats" }> }) {
  return (
    <section className={s.stats}>
      <ul className={s.wrap}>
        {block.items.map((it) => (
          <li key={it.label}>
            <b>{it.value}</b>
            <span>{it.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ——— Расписание ——— */

function ScheduleBlock({ block, id }: { block: Extract<Block, { type: "schedule" }>; id?: string }) {
  return (
    <section id={id} className={`${s.section} ${s.tinted}`}>
      <div className={s.wrap}>
        <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} />
        <div className={s.schedule}>
          {block.days.map((d) => (
            <div key={d.day} className={s.day}>
              <b>{d.day}</b>
              <ul>
                {d.items.map((it) => (
                  <li key={it.time + it.name}>
                    <time>{it.time}</time>
                    <span>{it.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ——— Призыв ——— */

function CtaBlock({ block }: { block: Extract<Block, { type: "cta" }> }) {
  return (
    <section className={s.ctaSection}>
      <div className={s.wrap}>
        <div className={s.cta}>
          <div>
            <h2>{block.title}</h2>
            {block.text && <p>{block.text}</p>}
          </div>
          <a href="#contacts" className={s.ctaButton}>
            {block.button}
            <Icon name="arrow" size={20} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ——— Вопросы ——— */

function FaqBlock({ block, id }: { block: Extract<Block, { type: "faq" }>; id?: string }) {
  return (
    <section id={id} className={s.section}>
      <div className={`${s.wrap} ${s.faqGrid}`}>
        <h2 className={s.h2}>{block.title}</h2>
        <div className={s.faq}>
          {block.items.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ——— Общие ——— */

function Media({ src, ctx, eager }: { src?: string; ctx: Ctx; eager?: boolean }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={s.photo} src={src} alt="" loading={eager ? "eager" : "lazy"} />;
  }
  return <MoodArt niche={ctx.spec.niche} variant={ctx.variant} icon={ctx.icon} />;
}

function Placeholder({ icon }: { icon: IconName }) {
  return (
    <span className={s.placeholder}>
      <Icon name={icon} size={40} />
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
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
