import { Fragment, type CSSProperties, type ReactNode } from "react";
import { QuotesIcon } from "@phosphor-icons/react/ssr";
import { NICHES } from "@/lib/sites/niches";
import type { Block, IconName, SiteSpec } from "@/lib/sites/schema";
import { getTheme, heroLayout, type Decor, type HeroLayout, type SiteTheme } from "@/lib/sites/themes";
import { Icon } from "./icons";
import { MoodArt } from "./MoodArt";
import { MediaFx, SectionFx } from "./HeroFx";
import { BookingForm, BookingModal, type BookingService } from "./interactive/Booking";
import { Lightbox, ReviewsSlider } from "./interactive/Extras";
import { Breathe, Calculator, Hotspots, Lookbook, MenuShowcase, Navigator, PalettePicker, Postcard, Quiz, Wipe } from "./interactive/Features";
import { SIGNATURES, type Signature } from "./signature";
import { SiteMotion } from "./SiteMotion";
import f from "./fx.module.css";
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
  live: boolean;
  phoneHref: string;
  location: string;
  decor: Set<Decor>;
  /** Анимации включены (страница примера, прототип). */
  anim: boolean;
  layout: HeroLayout;
  /** Почерк ниши: эффекты, интро и вид блоков. */
  sig: Signature;
  /** Услуги с ценами — для окна записи и интерактивных блоков. */
  services: BookingService[];
}

/** Номер элемента для поочерёдной анимации. */
const order = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * Рендерит клиентский сайт из SiteSpec: первый экран, блоки по порядку, контакты.
 * motion — анимации появления и параллакс; в миниатюрах на лендинге выключены.
 */
export function SiteRenderer({
  spec,
  mode,
  motion = true,
  intro = true,
}: {
  spec: SiteSpec;
  mode: SiteMode;
  motion?: boolean;
  /** Заставка с названием при открытии. В кабинете после правок её не повторяем. */
  intro?: boolean;
}) {
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
  const layout = heroLayout(theme, spec.heroVariant);
  const header = layout === "overlay" ? "overlay" : theme.header === "overlay" ? "bar" : theme.header;
  const shape = theme.heroShape === "fade" ? "rounded" : theme.heroShape;
  const ctx: Ctx = {
    spec,
    theme,
    variant,
    icon: spec.business.logoIcon,
    mode,
    live: mode === "live",
    phoneHref: `tel:${spec.contacts.phone.replace(/[^\d+]/g, "")}`,
    location: [spec.business.city, spec.contacts.address].filter(Boolean).join(", "),
    decor: new Set(theme.decor),
    anim: motion,
    layout,
    sig: SIGNATURES[spec.niche],
    services: serviceList(spec),
  };
  const seen = new Set<string>();

  return (
    <div
      className={s.site}
      style={vars}
      data-site=""
      data-niche={spec.niche}
      data-shape={shape}
      data-hero={layout}
      data-header={header}
      data-upper={theme.upper ? "" : undefined}
      data-motion={theme.motion}
      data-anim={motion ? "" : undefined}
      data-intro={motion && intro ? undefined : "off"}
      data-cursor={ctx.sig.cursor}
    >
      {motion && intro && <Intro ctx={ctx} />}
      {ctx.decor.has("lines") && (
        <div className={s.gridLines} aria-hidden="true">
          <div className={s.wrap} />
        </div>
      )}

      <Header ctx={ctx} />

      <main>
        <Hero ctx={ctx} layout={layout} />
        {ctx.decor.has("marquee") && <Marquee ctx={ctx} />}

        {spec.blocks.map((block, i) => {
          // Якорь — у первого блока каждого типа, чтобы работали ссылки меню;
          // у добавленных фишек — свой, чтобы кабинет мог показать их на сайте
          const key = block.type === "feature" && seen.has("feature") ? `feature-${block.kind}` : block.type;
          const id = seen.has(key) ? undefined : key;
          seen.add(key);
          return <BlockView key={i} block={block} id={id} ctx={ctx} />;
        })}

        <Contacts ctx={ctx} />
      </main>

      <footer className={s.footer}>
        <div className={s.wrap}>
          <p className={s.footerWord} style={{ "--len": spec.business.name.length } as CSSProperties} data-r="words">
            <Split text={spec.business.name} />
          </p>
          <div className={s.footerInner}>
            <span>
              © {new Date().getFullYear()} {spec.business.name}
            </span>
            <span>{ctx.location}</span>
            <Phone ctx={ctx} />
          </div>
          {spec.business.disclaimer && <p className={s.disclaimer}>{spec.business.disclaimer}</p>}
        </div>
      </footer>

      {mode === "preview" && (
        <div className={s.watermark} style={{ backgroundImage: WATERMARK }} aria-hidden="true" />
      )}
      {/* В миниатюрах лендинга окна и плавающая кнопка не нужны */}
      {motion && <Fab ctx={ctx} />}
      {motion && <BookingModal config={ctx.sig.booking} services={ctx.services} masters={masters(spec)} live={ctx.live} />}
      {motion && ctx.sig.gallery === "masonry" && <Lightbox />}
      {motion && <SiteMotion />}
    </div>
  );
}

/* ——— Шапка ——— */

function Header({ ctx }: { ctx: Ctx }) {
  const { spec, theme } = ctx;
  const services = spec.blocks.find((b) => b.type === "services") ?? spec.blocks.find((b) => b.type === "feature");
  const about = spec.blocks.find((b) => b.type === "about");
  const logo = (
    <span className={s.logo}>
      <Icon name={spec.business.logoIcon} size={30} weight={theme.iconWeight} className={s.logoIcon} />
      <span>
        <b>{spec.business.name}</b>
        {spec.business.tagline && <small>{spec.business.tagline}</small>}
      </span>
    </span>
  );
  const nav = (
    <nav className={s.nav} aria-label="Разделы сайта">
      {services && <a href={`#${services.type}`}>{services.eyebrow || services.title}</a>}
      {about && <a href="#about">{about.title}</a>}
      <a href="#contacts">Контакты</a>
    </nav>
  );
  const phone = (
    <span className={s.phone}>
      <Icon name="phone" size={18} weight={theme.iconWeight} />
      <Phone ctx={ctx} />
    </span>
  );
  return (
    <header className={s.top}>
      <div className={`${s.wrap} ${s.topInner}`} data-e="" style={order(0)}>
        {theme.header === "center" ? (
          <>
            {nav}
            {logo}
            {phone}
          </>
        ) : (
          <>
            {logo}
            {nav}
            {phone}
          </>
        )}
      </div>
    </header>
  );
}

/* ——— Первый экран ——— */

function Hero({ ctx, layout }: { ctx: Ctx; layout: HeroLayout }) {
  const { spec } = ctx;
  const eyebrow = spec.hero.eyebrow && (
    <p className={s.eyebrow} data-e="" style={order(1)}>
      {spec.hero.eyebrow}
    </p>
  );
  const title = (
    <h1 className={s.heroTitle} style={{ "--len": spec.hero.title.length } as CSSProperties}>
      <Split text={spec.hero.title} accent={spec.hero.accent} />
    </h1>
  );
  const sub = (
    <p className={s.heroSub} data-e="" style={order(3)}>
      {spec.hero.subtitle}
    </p>
  );
  const actions = <HeroActions ctx={ctx} ghost={layout !== "split"} />;
  const note = ctx.mode === "preview" && <span className={s.artNote}>Здесь будет ваше фото</span>;
  const fx = <SectionFx fx={ctx.sig.fx} images={[spec.images.hero, ...spec.images.side].filter((x): x is string => Boolean(x))} />;
  const mediaFx = <MediaFx fx={ctx.sig.fx} name={spec.business.name} />;
  const blobs = ctx.decor.has("blobs") && ctx.sig.fx !== "aurora" && (
    <div className={s.blobs} aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );

  if (layout === "overlay") {
    return (
      <section className={`${s.hero} ${s.heroOverlay}`}>
        <div className={s.overlayBg} data-px="0.12">
          <Media src={spec.images.hero} ctx={ctx} eager />
        </div>
        {fx}
        <div className={`${s.wrap} ${s.overlayInner}`}>
          {eyebrow}
          {title}
          <div className={s.overlayRow}>
            <div>
              {sub}
              {actions}
            </div>
            <Features ctx={ctx} />
          </div>
        </div>
        <span className={s.scrollCue} aria-hidden="true" />
        {note}
      </section>
    );
  }

  if (layout === "editorial") {
    return (
      <section className={`${s.hero} ${s.heroEditorial}`}>
        {fx}
        <div className={s.wrap}>
          <div className={s.edMeta} data-e="" style={order(1)}>
            <span>{spec.hero.eyebrow || spec.business.tagline}</span>
            {ctx.location && (
              <span>
                <Icon name="pin" size={16} weight={ctx.theme.iconWeight} />
                {ctx.location}
              </span>
            )}
          </div>
          {title}
          <div className={s.edGrid}>
            <div className={s.edMedia} data-tilt="">
              <div className={s.heroMedia} data-e="media" data-px="0.08">
                <Media src={spec.images.hero} ctx={ctx} eager />
                {note}
              </div>
              {ctx.decor.has("badge") && <Badge ctx={ctx} />}
              {mediaFx}
            </div>
            <div className={s.edAside}>
              {sub}
              {actions}
              <Features ctx={ctx} numbered />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (layout === "centered") {
    return (
      <section className={`${s.hero} ${s.heroCentered}`}>
        {blobs}
        {fx}
        <div className={`${s.wrap} ${s.centerText}`}>
          {eyebrow}
          {title}
          {sub}
          {actions}
        </div>
        <div className={`${s.wrap} ${s.centerMediaWrap}`}>
          <div className={s.heroMedia} data-e="media" data-px="0.1">
            <Media src={spec.images.hero} ctx={ctx} eager />
            {note}
          </div>
          {ctx.decor.has("badge") && <Badge ctx={ctx} />}
          <Chips ctx={ctx} />
          {mediaFx}
        </div>
        <div className={s.wrap}>
          <Features ctx={ctx} />
        </div>
      </section>
    );
  }

  if (layout === "collage") {
    const [first, second] = spec.images.side;
    return (
      <section className={`${s.hero} ${s.heroCollage}`}>
        {blobs}
        {fx}
        <div className={`${s.wrap} ${s.collageGrid}`}>
          <div className={`${s.collageItem} ${s.collageLeft}`} data-e="media" data-tilt="" style={order(2)}>
            <div className={s.collageFloat}>
              <Media src={spec.images.hero} ctx={ctx} eager />
              {note}
            </div>
            {mediaFx}
          </div>
          <div className={s.centerText}>
            {eyebrow}
            {title}
            {sub}
            {actions}
          </div>
          <div className={`${s.collageItem} ${s.collageRight}`} data-e="media" data-tilt="" style={order(4)}>
            <div className={s.collageFloat}>
              <Media src={first} ctx={{ ...ctx, variant: ctx.variant + 1 }} />
            </div>
            {second && (
              <div className={s.collageSmall}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={second} alt="" />
              </div>
            )}
            {ctx.decor.has("badge") && <Badge ctx={ctx} />}
          </div>
        </div>
        <div className={s.wrap}>
          <Features ctx={ctx} />
        </div>
      </section>
    );
  }

  // split: текст слева, фото справа
  return (
    <section className={`${s.hero} ${s.heroSplit}`}>
      {blobs}
      {fx}
      <div className={`${s.wrap} ${s.heroGrid}`}>
        <div className={s.heroText}>
          {eyebrow}
          {title}
          {sub}
          {actions}
          <Features ctx={ctx} />
          {ctx.location && !ctx.decor.has("chips") && (
            <p className={s.location} data-e="" style={order(6)}>
              <Icon name="pin" size={16} weight={ctx.theme.iconWeight} />
              {ctx.location}
            </p>
          )}
        </div>
        <div className={s.heroMediaWrap} data-tilt="">
          <div className={s.heroMedia} data-e="media" data-px="0.08">
            <Media src={spec.images.hero} ctx={ctx} eager />
            {note}
          </div>
          {ctx.decor.has("badge") && <Badge ctx={ctx} />}
          <Chips ctx={ctx} />
          {mediaFx}
        </div>
      </div>
    </section>
  );
}

function HeroActions({ ctx, ghost }: { ctx: Ctx; ghost: boolean }) {
  return (
    <div className={s.heroActions} data-e="" style={order(4)}>
      <a className={s.button} href="#contacts" data-magnetic="" data-open="booking">
        <span>{ctx.spec.hero.cta}</span>
        <Icon name="arrow" size={20} weight="bold" />
      </a>
      {ghost && (
        <span className={s.ghost}>
          <Icon name="phone" size={18} weight={ctx.theme.iconWeight} />
          <Phone ctx={ctx} />
        </span>
      )}
    </div>
  );
}

function Features({ ctx, numbered }: { ctx: Ctx; numbered?: boolean }) {
  const features = ctx.spec.hero.features;
  if (!features.length) return null;
  return (
    <ul className={`${s.features} ${numbered ? s.featuresNumbered : ""}`} data-e="" style={order(5)}>
      {features.map((f, i) => (
        <li key={f.text}>
          {numbered ? (
            <span className={s.featureNum}>{String(i + 1).padStart(2, "0")}</span>
          ) : (
            <Icon name={f.icon} size={26} weight={ctx.theme.iconWeight} />
          )}
          <span>{f.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** Плашки поверх фото: адрес и часы работы из брифа. */
function Chips({ ctx }: { ctx: Ctx }) {
  if (!ctx.decor.has("chips")) return null;
  const { contacts } = ctx.spec;
  return (
    <>
      {ctx.location && (
        <span className={`${s.chip} ${s.chipTop}`} data-e="" style={order(6)}>
          <span className={s.chipIcon}>
            <Icon name="pin" size={20} weight={ctx.theme.iconWeight} />
          </span>
          <span>
            <small>Мы находимся</small>
            {ctx.location}
          </span>
        </span>
      )}
      {contacts.hours && (
        <span className={`${s.chip} ${s.chipBottom}`} data-e="" style={order(7)}>
          <span className={s.chipIcon}>
            <Icon name="clock" size={20} weight={ctx.theme.iconWeight} />
          </span>
          <span>
            <small>Часы работы</small>
            {contacts.hours}
          </span>
        </span>
      )}
    </>
  );
}

/** Вращающаяся печать с названием и городом. */
function Badge({ ctx }: { ctx: Ctx }) {
  const { name, city } = ctx.spec.business;
  let base = `${name} · ${city} · `;
  if (base.length > 48) base = `${name.slice(0, 40)} · `;
  const text = base.repeat(Math.max(1, Math.floor(50 / base.length))).toUpperCase();
  const id = `badge-${ctx.spec.niche}`;
  return (
    <span className={s.badge} aria-hidden="true">
      <svg viewBox="0 0 200 200" className={s.badgeRing}>
        <defs>
          <path id={id} d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0" />
        </defs>
        <text>
          <textPath href={`#${id}`} textLength="474" lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      <span className={s.badgeIcon}>
        <Icon name={ctx.icon} size={36} weight={ctx.theme.iconWeight} />
      </span>
    </span>
  );
}

/** Бегущая строка с услугами. */
function Marquee({ ctx }: { ctx: Ctx }) {
  const words = ctx.services.length ? ctx.services.map((i) => i.name) : ctx.spec.hero.features.map((x) => x.text);
  if (!words.length) return null;
  let list = words;
  while (list.length < 10) list = list.concat(words);
  const row = (
    <span className={s.marqueeRow}>
      {list.map((w, i) => (
        <Fragment key={i}>
          <span>{w}</span>
          <Icon name={ctx.icon} size={28} weight={ctx.theme.iconWeight} />
        </Fragment>
      ))}
    </span>
  );
  return (
    <div className={s.marquee} aria-hidden="true">
      <div className={s.marqueeTrack}>
        {row}
        {row}
      </div>
    </div>
  );
}

/**
 * Интро при открытии сайта: название компании и несколько фото сменяют друг друга,
 * затем занавес уезжает вверх и открывает первый экран. Только CSS, без скриптов.
 */
function Intro({ ctx }: { ctx: Ctx }) {
  const { spec } = ctx;
  const kind = ctx.sig.intro;
  const name = <Split text={spec.business.name} />;
  if (kind === "counter") {
    return (
      <div className={s.intro} data-intro="counter" aria-hidden="true">
        <span className={f.introCounter} />
        <p className={s.introName}>{name}</p>
      </div>
    );
  }
  if (kind === "split") {
    return (
      <div className={s.intro} data-intro="split" aria-hidden="true">
        <span className={f.introSplit} />
        <span className={f.introSplit} />
        <p className={s.introName}>{name}</p>
      </div>
    );
  }
  if (kind === "circle") {
    return (
      <div className={s.intro} data-intro="circle" aria-hidden="true">
        <Icon name={ctx.icon} size={56} weight={ctx.theme.iconWeight} />
        <p className={s.introName}>{name}</p>
      </div>
    );
  }
  if (kind === "letters") {
    let n = 0;
    return (
      <div className={s.intro} data-intro="letters" aria-hidden="true">
        <p className={`${s.introName} ${f.introLetters}`}>
          {Array.from(spec.business.name).map((ch, i) => (
            <span key={i} style={order(ch === " " ? n : n++)}>
              {ch === " " ? "\u00a0" : ch}
            </span>
          ))}
        </p>
        <span className={s.introLine} />
      </div>
    );
  }
  const photos = [spec.images.hero, ...spec.images.side].filter((src): src is string => Boolean(src)).slice(0, 4);
  return (
    <div className={s.intro} data-intro="photos" aria-hidden="true">
      {photos.length > 0 && (
        <div className={s.introPhotos}>
          {photos.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" style={order(i)} />
          ))}
        </div>
      )}
      <p className={s.introName}>{name}</p>
      <span className={s.introLine} />
    </div>
  );
}

/* ——— Блоки ——— */

function BlockView({ block, id, ctx }: { block: Block; id?: string; ctx: Ctx }) {
  switch (block.type) {
    case "services":
      return <ServicesBlock block={block} id={id} ctx={ctx} />;
    case "strip":
      return <StripBlock block={block} ctx={ctx} />;
    case "about":
      return <AboutBlock block={block} id={id} ctx={ctx} />;
    case "gallery":
      return <GalleryBlock block={block} id={id} ctx={ctx} />;
    case "steps":
      return <StepsBlock block={block} id={id} ctx={ctx} />;
    case "team":
      return <TeamBlock block={block} id={id} />;
    case "reviews":
      return <ReviewsBlock block={block} id={id} ctx={ctx} />;
    case "pricing":
      return <PricingBlock block={block} id={id} ctx={ctx} />;
    case "stats":
      return <StatsBlock block={block} />;
    case "schedule":
      return <ScheduleBlock block={block} id={id} />;
    case "cta":
      return <CtaBlock block={block} />;
    case "faq":
      return <FaqBlock block={block} id={id} ctx={ctx} />;
    case "feature":
      return <FeatureBlock block={block} id={id} ctx={ctx} />;
  }
}

function Head({ eyebrow, title, lead, action, center }: { eyebrow?: string; title: string; lead?: string; action?: ReactNode; center?: boolean }) {
  return (
    <div className={`${s.blockHead} ${center ? s.blockHeadCenter : ""}`}>
      <div>
        {eyebrow && (
          <p className={s.eyebrow} data-r="up">
            {eyebrow}
          </p>
        )}
        <h2 className={s.h2} data-r="words">
          <Split text={title} />
        </h2>
        {lead && (
          <p className={s.blockLead} data-r="up">
            {lead}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function More({ label }: { label: string }) {
  return (
    <a href="#contacts" className={s.more} data-r="up" data-open="booking">
      {label}
      <Icon name="arrow" size={18} weight="bold" />
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
          <PriceList items={block.items} hover />
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
          <div className={s.archGrid} data-r="stagger">
            {head}
            {withPhoto.map((item, i) => (
              <figure key={item.name} className={s.archCard} style={order(i + 1)}>
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
          <ul className={`${s.cards} ${style === "icon" ? s.iconCards : s.photoCards}`} data-count={cards.length} data-r="stagger">
            {cards.map((item, i) => (
              <ServiceCard key={item.name} item={item} style={style} index={i} ctx={ctx} />
            ))}
          </ul>
        )}
        {rest.length > 0 && <PriceList items={rest} />}
      </div>
    </section>
  );
}

function ServiceCard({ item, style, index, ctx }: { item: Item; style: "photo" | "icon"; index: number; ctx: Ctx }) {
  const photo = style === "photo" && item.image;
  const cta = ctx.spec.contacts.formCta;
  return (
    <li className={s.card} style={order(index)}>
      {photo ? (
        <div className={s.cardMedia}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt="" loading="lazy" />
        </div>
      ) : (
        <span className={s.cardIcon}>
          <Icon name={item.icon ?? "sparkle"} size={30} weight={ctx.theme.iconWeight} />
        </span>
      )}
      <div className={s.cardBody}>
        {style === "icon" && <span className={s.cardIndex}>{String(index + 1).padStart(2, "0")}</span>}
        <h3>{item.name}</h3>
        <p className={s.cardPrice}>{item.price}</p>
        {item.note && <p className={s.cardNote}>{item.note}</p>}
        {style === "icon" ? (
          <a href="#contacts" className={s.cardButton} data-open="booking" data-service={item.name}>
            {cta}
            <Icon name="arrow" size={18} weight="bold" />
          </a>
        ) : (
          <a href="#contacts" className={s.cardPlus} aria-label={`${cta}: ${item.name}`} data-open="booking" data-service={item.name}>
            <Icon name="plus" size={18} weight="bold" />
          </a>
        )}
      </div>
    </li>
  );
}

/** Прайс строками. hover — при наведении рядом с курсором появляется фото услуги. */
function PriceList({ items, hover }: { items: Item[]; hover?: boolean }) {
  return (
    <ul className={s.priceList} data-r="stagger">
      {items.map((item, i) => (
        <li key={item.name} style={order(i)} data-img={hover ? item.image : undefined}>
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

function StripBlock({ block, ctx }: { block: Extract<Block, { type: "strip" }>; ctx: Ctx }) {
  if (block.items?.length) {
    return (
      <section className={s.stripItems}>
        <ul className={s.wrap} data-r="stagger">
          {block.items.map((it, i) => (
            <li key={it.title} style={order(i)}>
              <span className={s.stripIcon}>
                <Icon name={it.icon} size={28} weight={ctx.theme.iconWeight} />
              </span>
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
  // Фото первого экрана, если там оно было небольшим; иначе — другое, чтобы не повторяться
  const { hero, side } = ctx.spec.images;
  const photo =
    ctx.layout === "overlay" || ctx.layout === "centered"
      ? (side[0] ?? hero)
      : ctx.layout === "collage"
        ? (side[1] ?? side[0] ?? hero)
        : (hero ?? side[0]);
  if (photo && ctx.sig.cinema) {
    // Фото раскрывается из карточки на весь экран, поверх проявляется цитата
    return (
      <section className={s.cinema} data-progress="">
        <div className={s.cinemaSticky}>
          <div className={s.cinemaMedia}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" loading="lazy" />
          </div>
          <div className={`${s.wrap} ${s.cinemaText}`}>
            <QuotesIcon className={s.cinemaMark} size={56} weight="fill" aria-hidden="true" />
            <p className={s.cinemaQuote} style={{ "--n": wordCount(block.quote) } as CSSProperties}>
              <Split text={block.quote} />
            </p>
            {block.caption && <p className={s.quoteCaption}>{block.caption}</p>}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className={s.stripQuote}>
      <div className={s.wrap}>
        <div className={s.quoteBand} data-r="up">
          <QuotesIcon className={s.quoteMark} size={44} weight="fill" aria-hidden="true" />
          <p className={s.quote} data-r="words">
            <Split text={block.quote} />
          </p>
          {block.caption && <p className={s.quoteCaption}>{block.caption}</p>}
        </div>
      </div>
    </section>
  );
}

/* ——— О нас ——— */

function AboutBlock({ block, id, ctx }: { block: Extract<Block, { type: "about" }>; id?: string; ctx: Ctx }) {
  const badge = ctx.decor.has("badge") && (ctx.theme.hero === "overlay" || ctx.theme.hero === "centered");
  return (
    <section id={id} className={`${s.section} ${s.about}`}>
      <div className={`${s.wrap} ${s.aboutGrid}`}>
        <div className={s.aboutMediaWrap}>
          <div className={s.aboutMedia} data-r="img" data-px="0.08">
            <Media src={block.image} ctx={{ ...ctx, variant: ctx.variant + 1 }} />
          </div>
          {badge && <Badge ctx={ctx} />}
        </div>
        <div>
          <h2 className={s.h2} data-r="words">
            <Split text={block.title} />
          </h2>
          {ctx.sig.highlight ? (
            <p className={s.aboutText} data-hl="" style={{ "--n": wordCount(block.text) } as CSSProperties}>
              <Split text={block.text} />
            </p>
          ) : (
            <p className={s.lead} data-r="up">
              {block.text}
            </p>
          )}
          {block.points.length > 0 && (
            <ul className={s.reasons} data-r="stagger">
              {block.points.map((r, i) => (
                <li key={r.title} style={order(i)}>
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
  const kind = ctx.sig.gallery;
  const images = block.images.filter((img): img is { src: string; caption?: string } => Boolean(img.src));
  const head = <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} />;

  if (kind === "polaroid" && images.length) {
    // Снимки разложены на столе, при наведении выпрямляются
    return (
      <section id={id} className={s.section}>
        <div className={s.wrap}>
          {head}
          <ul className={f.polaroids} data-r="stagger">
            {images.map((img, i) => (
              <li key={img.src} className={f.polaroid} style={order(i)} data-view="">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.caption ?? ""} loading="lazy" />
                {img.caption && <span>{img.caption}</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (kind === "filmstrip" && images.length) {
    // Две ленты фото едут навстречу друг другу; при наведении фото становится цветным
    const row = (list: typeof images, hidden?: boolean) => (
      <div className={f.filmRow} aria-hidden={hidden || undefined}>
        {[...list, ...list, ...list, ...list].map((img, i) => (
          <figure key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt={i < list.length && !hidden ? (img.caption ?? "") : ""} loading="lazy" />
            {img.caption && <figcaption>{img.caption}</figcaption>}
          </figure>
        ))}
      </div>
    );
    return (
      <section id={id} className={s.section}>
        <div className={s.wrap}>{head}</div>
        <div className={f.film} data-r="up">
          {row(images)}
          {row([...images].reverse(), true)}
        </div>
      </section>
    );
  }

  if (kind === "masonry" && images.length) {
    // Колонки разной высоты; по клику — просмотр во весь экран
    return (
      <section id={id} className={s.section}>
        <div className={s.wrap}>
          {head}
          <ul className={f.masonry} data-r="stagger">
            {images.map((img, i) => (
              <li key={img.src} style={order(i)}>
                <a href={img.src} data-full={img.src} data-caption={img.caption ?? ""} data-view="">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.src} alt={img.caption ?? ""} loading="lazy" />
                  {img.caption && <span>{img.caption}</span>}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (kind === "arches" && images.length) {
    return (
      <section id={id} className={s.section}>
        <div className={s.wrap}>
          {head}
          <ul className={f.arches} style={{ "--n": Math.min(images.length, 4) } as CSSProperties} data-r="stagger">
            {images.slice(0, 4).map((img, i) => (
              <li key={img.src} className={f.arch} style={order(i)} data-view="">
                <div className={f.archImg}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.src} alt={img.caption ?? ""} loading="lazy" />
                </div>
                {img.caption && <span>{img.caption}</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  // Галерея листается вбок, пока секция закреплена
  if (kind === "hscroll" && images.length) {
    return (
      <section id={id} className={s.hgallery} data-hscroll="">
        <div className={s.hSticky}>
          <div className={s.wrap}>
            <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} action={<span className={s.hHint}>Листайте</span>} />
          </div>
          <ul className={s.hTrack} data-r="stagger">
            {block.images.map((img, i) => (
              <li key={i} className={s.hItem} style={order(i)}>
                <div className={s.hMedia}>
                  {img.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.src} alt={img.caption ?? ""} loading="lazy" />
                  ) : (
                    <Placeholder ctx={ctx} />
                  )}
                </div>
                <p className={s.hCaption}>
                  <i>{String(i + 1).padStart(2, "0")}</i>
                  {img.caption}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }
  return (
    <section id={id} className={s.section}>
      <div className={s.wrap}>
        <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} />
        <ul className={s.gallery} data-count={block.images.length} data-r="stagger">
          {block.images.map((img, i) => (
            <li key={i} className={s.galleryItem} style={order(i)} data-view="">
              {img.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.src} alt={img.caption ?? ""} loading="lazy" />
              ) : (
                <Placeholder ctx={ctx} />
              )}
              {img.caption && (
                <span className={s.galleryCaption}>
                  <i>{String(i + 1).padStart(2, "0")}</i>
                  {img.caption}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ——— Этапы ——— */

function StepsBlock({ block, id, ctx }: { block: Extract<Block, { type: "steps" }>; id?: string; ctx: Ctx }) {
  const head = <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} />;
  if (ctx.sig.steps === "timeline") {
    // Линия по центру заполняется по мере прокрутки
    return (
      <section id={id} className={s.section}>
        <div className={s.wrap}>
          {head}
          <ol className={f.timeline} data-hl="">
            {block.items.map((st, i) => (
              <li key={st.title} className={f.tlItem}>
                <span className={f.tlDot}>{String(i + 1).padStart(2, "0")}</span>
                <div data-r="up">
                  <h3>{st.title}</h3>
                  <p>{st.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }
  if (ctx.sig.steps === "row") {
    return (
      <section id={id} className={`${s.section} ${s.tinted}`}>
        <div className={s.wrap}>
          {head}
          <ol className={f.row} data-r="stagger">
            {block.items.map((st, i) => (
              <li key={st.title} className={f.rowItem} style={order(i)}>
                <span className={f.rowNum}>{i + 1}</span>
                <h3>{st.title}</h3>
                <p>{st.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }
  if (ctx.sig.steps === "big") {
    return (
      <section id={id} className={s.section}>
        <div className={s.wrap}>
          {head}
          <ol className={f.big} data-r="stagger">
            {block.items.map((st, i) => (
              <li key={st.title} className={f.bigItem} style={order(i)}>
                <span className={f.bigNum}>{String(i + 1).padStart(2, "0")}</span>
                <h3>{st.title}</h3>
                <p>{st.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }
  return (
    <section id={id} className={`${s.section} ${s.tinted}`}>
      <div className={s.wrap}>
        <div className={s.stepsGrid}>
          <div className={s.stepsHead}>
            <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} />
          </div>
          {/* Карточки этапов складываются стопкой при прокрутке */}
          <ol className={s.steps} data-count={block.items.length}>
            {block.items.map((st, i) => (
              <li key={st.title} style={order(i)}>
                <span className={s.stepNum}>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{st.title}</h3>
                  <p>{st.text}</p>
                </div>
                <span className={s.stepOf}>
                  {i + 1} / {block.items.length}
                </span>
              </li>
            ))}
          </ol>
        </div>
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
        <ul className={s.team} data-r="stagger">
          {block.people.map((p, i) => (
            <li key={p.name} className={s.person} style={order(i)}>
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

function ReviewsBlock({ block, id, ctx }: { block: Extract<Block, { type: "reviews" }>; id?: string; ctx: Ctx }) {
  const head = <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} />;
  const kind = ctx.sig.reviews;
  if (kind === "notes") {
    // Записки от гостей на цветной бумаге, приклеенные скотчем
    return (
      <section id={id} className={s.section}>
        <div className={s.wrap}>
          {head}
          <ul className={f.notes} data-r="stagger">
            {block.items.map((r, i) => (
              <li key={r.name} className={f.note} style={order(i)}>
                <p>{r.text}</p>
                <footer>
                  — {r.name}
                  {r.meta && <small>{r.meta}</small>}
                </footer>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }
  if (kind === "marquee") {
    const card = (r: (typeof block.items)[number], key: number) => (
      <figure key={key} className={f.reviewCard}>
        <span className={f.reviewStars} aria-hidden="true">
          ★★★★★
        </span>
        <p>{r.text}</p>
        <footer>
          {r.name}
          <span>{r.meta}</span>
        </footer>
      </figure>
    );
    const list = [...block.items, ...block.items, ...block.items];
    return (
      <section id={id} className={`${s.section} ${s.tinted}`}>
        <div className={s.wrap}>{head}</div>
        <div className={f.reviewRows} data-r="up">
          <div className={f.reviewRow}>{[...list, ...list].map(card)}</div>
          <div className={f.reviewRow} aria-hidden="true">
            {[...list, ...list].reverse().map(card)}
          </div>
        </div>
      </section>
    );
  }
  if (kind === "slider") {
    return (
      <section id={id} className={`${s.section} ${s.tinted}`}>
        <div className={s.wrap}>
          {head}
          <ReviewsSlider items={block.items} />
        </div>
      </section>
    );
  }
  if (kind === "chat") {
    // Отзывы как сообщения в мессенджере
    return (
      <section id={id} className={s.section}>
        <div className={`${s.wrap} ${s.listGrid}`}>
          {head}
          <ol className={f.chat} data-r="stagger">
            {block.items.map((r, i) => (
              <li key={r.name} className={f.bubble} style={order(i)}>
                <b>
                  {r.name}
                  {r.meta && ` · ${r.meta}`}
                </b>
                <p>{r.text}</p>
                <small>✓✓</small>
              </li>
            ))}
            <li className={f.typing} aria-label="Новый отзыв печатается">
              <i />
              <i />
              <i />
            </li>
          </ol>
        </div>
      </section>
    );
  }
  return (
    <section id={id} className={`${s.section} ${s.tinted}`}>
      <div className={s.wrap}>
        <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} />
        <ul className={s.reviews} data-r="stagger">
          {block.items.map((r, i) => (
            <li key={r.name} className={s.review} style={order(i)}>
              <span className={s.stars} aria-hidden="true">
                {[0, 1, 2, 3, 4].map((k) => (
                  <Icon key={k} name="star" size={16} weight="fill" />
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
              <QuotesIcon className={s.reviewQuote} size={56} weight={ctx.theme.iconWeight === "fill" ? "fill" : "duotone"} aria-hidden="true" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ——— Тарифы ——— */

function PricingBlock({ block, id, ctx }: { block: Extract<Block, { type: "pricing" }>; id?: string; ctx: Ctx }) {
  return (
    <section id={id} className={s.section}>
      <div className={s.wrap}>
        <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} center />
        <ul className={s.plans} data-r="stagger">
          {block.plans.map((p, i) => (
            <li key={p.name} className={`${s.plan} ${p.featured ? s.planFeatured : ""}`} style={order(i)}>
              {p.featured && <span className={s.planBadge}>Популярный</span>}
              <h3>{p.name}</h3>
              <p className={s.planPrice}>
                {p.price}
                {p.period && <small> {p.period}</small>}
              </p>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>
                    <Icon name="check" size={18} weight="bold" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#contacts" className={p.featured ? s.button : s.buttonOutline} data-open="booking">
                <span>Выбрать</span>
                <Icon name="arrow" size={18} weight={ctx.theme.iconWeight === "thin" ? "light" : "bold"} />
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
      <ul className={s.wrap} data-r="stagger">
        {block.items.map((it, i) => (
          <li key={it.label} style={order(i)}>
            <b data-countup={it.value}>{it.value}</b>
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
        <div className={s.schedule} data-r="stagger">
          {block.days.map((d, i) => (
            <div key={d.day} className={s.day} style={order(i)}>
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
        <div className={s.cta} data-r="up">
          <div>
            <h2 data-r="words">
              <Split text={block.title} />
            </h2>
            {block.text && <p>{block.text}</p>}
          </div>
          <a href="#contacts" className={s.ctaButton} data-magnetic="" data-open="booking">
            <span>{block.button}</span>
            <Icon name="arrow" size={20} weight="bold" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ——— Вопросы ——— */

function FaqBlock({ block, id, ctx }: { block: Extract<Block, { type: "faq" }>; id?: string; ctx: Ctx }) {
  if (ctx.sig.faq === "numbered") {
    return (
      <section id={id} className={s.section}>
        <div className={s.wrap}>
          <h2 className={s.h2} data-r="words">
            <Split text={block.title} />
          </h2>
          <div className={f.faqNum} data-r="stagger" style={{ marginTop: 40 }}>
            {block.items.map((q, i) => (
              <details key={q.q} style={order(i)}>
                <summary>
                  <i>{String(i + 1).padStart(2, "0")}</i>
                  {q.q}
                </summary>
                <p>{q.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }
  if (ctx.sig.faq === "cards") {
    return (
      <section id={id} className={s.section}>
        <div className={s.wrap}>
          <Head title={block.title} />
          <ul className={f.faqCards} data-r="stagger">
            {block.items.map((q, i) => (
              <li key={q.q} className={f.faqCard} style={order(i)}>
                <h3>{q.q}</h3>
                <p>{q.a}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }
  return (
    <section id={id} className={s.section}>
      <div className={`${s.wrap} ${s.faqGrid}`}>
        <h2 className={s.h2} data-r="words">
          <Split text={block.title} />
        </h2>
        <div className={s.faq} data-r="stagger">
          {block.items.map((f, i) => (
            <details key={f.q} style={order(i)}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ——— Интерактивные блоки ——— */

function FeatureBlock({ block, id, ctx }: { block: Extract<Block, { type: "feature" }>; id?: string; ctx: Ctx }) {
  const head = <Head eyebrow={block.eyebrow} title={block.title} lead={block.lead} />;
  const wrap = (body: ReactNode, tinted?: boolean) => (
    <section id={id} className={`${s.section} ${tinted ? s.tinted : ""}`}>
      <div className={s.wrap}>
        {head}
        <div data-r="up">{body}</div>
      </div>
    </section>
  );
  const { items } = block;
  switch (block.kind) {
    case "menu":
      return wrap(<MenuShowcase items={items} fallback={ctx.spec.images.hero} />);
    case "palette":
      return wrap(<PalettePicker items={items} />);
    case "calculator":
      return wrap(<Calculator items={items} />);
    case "hotspots":
      return wrap(<Hotspots items={items} image={block.image ?? ctx.spec.images.hero} />, true);
    case "breathe":
      return wrap(<Breathe items={items} />, true);
    case "quiz": {
      const services = ctx.spec.blocks.find((b) => b.type === "services");
      return wrap(
        <Quiz
          items={items}
          services={services?.type === "services" ? services.items.map((x) => ({ name: x.name, price: x.price, note: x.note })) : ctx.services}
          cta={ctx.spec.niche === "fitness" ? undefined : ctx.spec.hero.cta}
        />,
      );
    }
    case "navigator":
      return wrap(<Navigator items={items} />);
    case "lookbook":
      return wrap(<Lookbook items={items} />);
    case "wipe":
      return wrap(<Wipe image={block.image ?? ctx.spec.images.side[0] ?? ctx.spec.images.hero} />);
    case "wizard":
      return wrap(
        <div className={s.wizard}>
          <div className={s.wizardAside}>
            <Icon name={ctx.icon} size={40} weight={ctx.theme.iconWeight} />
            <p>{ctx.sig.booking.lead}</p>
            <span>
              <Icon name="phone" size={18} weight={ctx.theme.iconWeight} />
              <Phone ctx={ctx} />
            </span>
            {ctx.spec.contacts.hours && (
              <span>
                <Icon name="clock" size={18} weight={ctx.theme.iconWeight} />
                {ctx.spec.contacts.hours}
              </span>
            )}
          </div>
          <BookingForm config={ctx.sig.booking} services={ctx.services} masters={masters(ctx.spec)} live={ctx.live} />
        </div>,
        true,
      );
    case "postcard":
      return wrap(<Postcard items={items} image={ctx.spec.images.side[0] ?? ctx.spec.images.hero} signature={ctx.spec.business.name} />);
  }
}

/** Плавающая кнопка записи: появляется, когда первый экран прокручен. */
function Fab({ ctx }: { ctx: Ctx }) {
  const label = ctx.sig.fabLabel;
  const kind = ctx.sig.fab;
  if (kind === "circle") {
    const text = `${label} · ${label} · `.toUpperCase();
    return (
      <a href="#contacts" className={`${f.fab} ${f.fabCircle}`} data-open="booking" aria-label={label}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <path id={`fab-${ctx.spec.niche}`} d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
          </defs>
          <text>
            <textPath href={`#fab-${ctx.spec.niche}`} textLength="234" lengthAdjust="spacing">
              {text}
            </textPath>
          </text>
        </svg>
        <Icon name={ctx.icon} size={30} weight={ctx.theme.iconWeight} />
      </a>
    );
  }
  const cls = kind === "pill" ? f.fabPill : kind === "square" ? f.fabSquare : f.fabTab;
  return (
    <a href="#contacts" className={`${f.fab} ${cls}`} data-open="booking">
      {kind === "pill" && <Icon name="calendar" size={20} weight="bold" />}
      {label}
    </a>
  );
}

/** Услуги с ценами из блока услуг или интерактивного блока. */
function serviceList(spec: SiteSpec): BookingService[] {
  const services = spec.blocks.find((b) => b.type === "services");
  if (services) return services.items.map((i) => ({ name: i.name, price: i.price }));
  const feature = spec.blocks.find((b) => b.type === "feature" && b.items.some((i) => i.price));
  if (feature?.type === "feature") return feature.items.map((i) => ({ name: i.title, price: i.price ?? "" }));
  return [];
}

/** Мастера из блока команды — для выбора в окне записи. */
function masters(spec: SiteSpec) {
  const team = spec.blocks.find((b) => b.type === "team");
  return team?.type === "team" ? team.people.map((p) => ({ name: p.name, role: p.role })) : [];
}

/* ——— Контакты ——— */

function Contacts({ ctx }: { ctx: Ctx }) {
  const { spec, theme, live } = ctx;
  return (
    <section id="contacts" className={`${s.section} ${s.contacts}`}>
      <div className={`${s.wrap} ${s.contactsGrid}`}>
        <div>
          <h2 className={s.h2} data-r="words">
            <Split text={spec.contacts.title} />
          </h2>
          <ul className={s.contactList} data-r="stagger">
            <li style={order(0)}>
              <Icon name="phone" size={22} weight={theme.iconWeight} />
              <Phone ctx={ctx} />
            </li>
            {ctx.location && (
              <li style={order(1)}>
                <Icon name="pin" size={22} weight={theme.iconWeight} />
                <span>{ctx.location}</span>
              </li>
            )}
            {spec.contacts.hours && (
              <li style={order(2)}>
                <Icon name="clock" size={22} weight={theme.iconWeight} />
                <span>{spec.contacts.hours}</span>
              </li>
            )}
          </ul>
          <div className={s.map} aria-hidden="true" data-r="img">
            <span className={s.mapPin}>
              <Icon name="pin" size={22} weight="fill" />
            </span>
          </div>
        </div>
        <form className={s.form} data-r="up">
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
              <span>{spec.contacts.formCta}</span>
              <Icon name="arrow" size={20} weight="bold" />
            </button>
            {!live && <p className={s.formNote}>Форма заработает после публикации сайта.</p>}
          </fieldset>
        </form>
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

function Placeholder({ ctx }: { ctx: Ctx }) {
  return (
    <span className={s.placeholder}>
      <Icon name={ctx.icon} size={40} weight={ctx.theme.iconWeight} />
    </span>
  );
}

/**
 * Текст по словам: каждое слово в «окошке», чтобы анимация поднимала слова снизу по очереди.
 * accent — часть текста, выделенная акцентным цветом.
 */
function Split({ text, accent }: { text: string; accent?: string }) {
  const at = accent ? text.lastIndexOf(accent) : -1;
  const parts =
    accent && at >= 0
      ? [
          { text: text.slice(0, at), accent: false },
          { text: accent, accent: true },
          { text: text.slice(at + accent.length), accent: false },
        ]
      : [{ text, accent: false }];
  let n = 0;
  return parts.map((part, k) => {
    const words = part.text.split(/(\s+)/).filter(Boolean);
    const out = words.map((w, j) =>
      /^\s+$/.test(w) ? (
        " "
      ) : (
        <span key={j} className={s.w}>
          <span style={order(n++)}>{w}</span>
        </span>
      ),
    );
    return part.accent ? (
      <span key={k} className={s.accent}>
        {out}
      </span>
    ) : (
      <Fragment key={k}>{out}</Fragment>
    );
  });
}

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function initials(name: string) {
  return name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function Phone({ ctx }: { ctx: Ctx }) {
  const phone = ctx.spec.contacts.phone;
  return ctx.live ? <a href={ctx.phoneHref}>{phone}</a> : <span>{phone}</span>;
}

const WATERMARK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="220"><text x="20" y="130" transform="rotate(-18 180 110)" font-family="sans-serif" font-size="22" font-weight="600" fill="rgba(128,128,128,0.22)">Прототип · Сборка</text></svg>`,
)}")`;
