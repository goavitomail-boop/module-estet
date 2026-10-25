"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { plural } from "@/lib/plural";
import type { BuildShowData, Section } from "@/lib/sites/presentation";
import b from "./build.module.css";

const STEP_MS = 1500;
const START_MS = 700;
/** После «Готово» сами переходим к сайту, если клиент не нажал кнопку раньше. */
const AUTO_DONE_MS = 2800;

interface Phase {
  title: string;
  detail: string;
  extra?: ReactNode;
}

/**
 * Экран сразу после брифа: сайт клиента собирается на глазах из его же данных.
 * Схема страницы — по настоящим блокам сайта, тексты, цвета, шрифт и фото — настоящие.
 */
export function BuildShow({ data, onDone }: { data: BuildShowData; onDone: () => void }) {
  const [phase, setPhase] = useState(-1);
  const [time, setTime] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const button = useRef<HTMLButtonElement>(null);
  const { style } = data;

  const phases: Phase[] = [
    { title: "Читаем бриф", detail: `${data.name} · ${data.city} · ${data.services} ${plural(data.services, "услуга", "услуги", "услуг")}` },
    { title: "Собираем структуру", detail: `${data.sections.length} ${plural(data.sections.length, "блок", "блока", "блоков")}: ${data.sections.map((s) => s.label.toLowerCase()).slice(0, 4).join(", ")}…` },
    { title: "Пишем тексты", detail: `«${data.hero.title}»` },
    {
      title: "Подбираем стиль",
      detail: `«${style.name}» · ${style.font}`,
      extra: (
        <span className={b.swatches}>
          {[style.colors.bg, style.colors.surface, style.colors.accent, style.colors.text].map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
          <em style={{ fontFamily: style.display, fontWeight: style.displayWeight }}>Аа</em>
        </span>
      ),
    },
    {
      title: "Подбираем фото",
      detail: `${data.photos.length} ${plural(data.photos.length, "фото", "фото", "фото")} под вашу сферу`,
      extra: (
        <span className={b.thumbs}>
          {data.photos.slice(0, 5).map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" />
          ))}
        </span>
      ),
    },
    { title: data.feature ? "Настраиваем запись и фишку" : "Настраиваем запись", detail: [data.booking.join(" → "), data.feature].filter(Boolean).join(" · ") },
    { title: "Проверяем на телефоне", detail: "Перестраиваем блоки под экран 390 px" },
  ];
  const done = phase >= phases.length;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doneRef.current();
      return;
    }
    const started = Date.now() + START_MS;
    const timers = phases.map((_, i) => setTimeout(() => setPhase(i), START_MS + i * STEP_MS));
    const total = START_MS + phases.length * STEP_MS;
    const clock = setInterval(() => setTime(Math.max(0, Date.now() - started) / 1000), 100);
    timers.push(
      setTimeout(() => {
        clearInterval(clock);
        setTime((total - START_MS) / 1000);
        setPhase(phases.length);
      }, total),
      setTimeout(() => doneRef.current(), total + AUTO_DONE_MS),
    );
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(clock);
    };
    // Сценарий запускается один раз при открытии
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (done) button.current?.focus();
  }, [done]);

  return (
    <div className={b.overlay} role="dialog" aria-modal="true" aria-labelledby="build-title">
      <header className={b.head}>
        <span className={b.logo} aria-hidden="true">
          сборка<i />
        </span>
        <span className={b.timer} aria-hidden="true">
          {time.toFixed(1).replace(".", ",")} с
        </span>
        <button type="button" className={b.skip} onClick={() => doneRef.current()}>
          Пропустить
        </button>
      </header>

      <div className={b.body}>
        <div className={b.side}>
          <p className={b.kicker}>{done ? `Готово за ${time.toFixed(1).replace(".", ",")} с` : "ИИ собирает сайт"}</p>
          <h1 id="build-title" className={b.title}>
            {done ? `Сайт для «${data.name}» готов` : `Собираем сайт для «${data.name}»`}
          </h1>
          <ol className={b.steps} aria-live="polite">
            {phases.map((p, i) => (
              <li key={p.title} data-state={i < phase || done ? "done" : i === phase ? "active" : "next"}>
                <span className={b.mark} aria-hidden="true" />
                <div>
                  <b>{p.title}</b>
                  <span>{p.detail}</span>
                  {p.extra && i <= phase && p.extra}
                </div>
              </li>
            ))}
          </ol>
          <div className={b.cta} data-show={done || undefined}>
            <button ref={button} type="button" className="btn btn-primary" onClick={() => doneRef.current()} tabIndex={done ? 0 : -1}>
              Смотреть сайт
            </button>
          </div>
        </div>

        <Blueprint data={data} phase={done ? phases.length : phase} />
      </div>
    </div>
  );
}

/** Схема страницы, которая по шагам превращается в сайт клиента. */
function Blueprint({ data, phase }: { data: BuildShowData; phase: number }) {
  const frame = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const [max, setMax] = useState(0);
  const { style } = data;

  useLayoutEffect(() => {
    const measure = () => setMax(Math.max(0, (page.current?.scrollHeight ?? 0) - (frame.current?.clientHeight ?? 0)));
    measure();
    const ro = new ResizeObserver(measure);
    if (page.current) ro.observe(page.current);
    if (frame.current) ro.observe(frame.current);
    return () => ro.disconnect();
  }, []);

  // Камера по странице: к последнему блоку, пока строим, потом медленно сверху вниз и обратно
  const pan =
    phase === 1 ? [max, STEP_MS * 0.9] : phase === 2 ? [0, 700] : phase === 3 || phase === 4 ? [max * (phase === 3 ? 0.45 : 1), STEP_MS * 1.1] : [0, 900];
  const vars = {
    "--t-bg": style.colors.bg,
    "--t-surface": style.colors.surface,
    "--t-text": style.colors.text,
    "--t-muted": style.colors.muted,
    "--t-accent": style.colors.accent,
    "--t-accent-text": style.colors.accentText,
    "--t-line": style.colors.line,
    "--t-display": style.display,
    "--t-weight": style.displayWeight,
  } as CSSProperties;
  let img = 0;
  const photo = () => data.photos[img++ % Math.max(1, data.photos.length)];

  return (
    <div
      className={b.bp}
      style={vars}
      data-rows={phase >= 1 || undefined}
      data-text={phase >= 2 || undefined}
      data-style={phase >= 3 || undefined}
      data-photos={phase >= 4 || undefined}
      data-booking={phase === 5 || undefined}
      data-phone={phase === 6 || undefined}
      data-done={phase >= 7 || undefined}
      aria-hidden="true"
    >
      <div className={b.browser}>
        <div className={b.bar}>
          <i />
          <i />
          <i />
          <span>Прототип · {data.name}</span>
        </div>
        <div ref={frame} className={b.frame}>
          <div
            ref={page}
            className={b.page}
            style={{ transform: `translateY(${-pan[0]}px)`, transitionDuration: `${pan[1]}ms` }}
          >
            {data.sections.map((sec, i) => (
              <Row key={i} sec={sec} i={i} data={data} photo={photo} />
            ))}
          </div>
          <div className={b.modal}>
            <b>{data.hero.cta}</b>
            {data.booking.map((st, i) => (
              <span key={st} data-on={i === 0 || undefined}>
                {i + 1}. {st}
              </span>
            ))}
            <em>Отправить</em>
          </div>
        </div>
      </div>
      <span className={b.size}>390 px</span>
    </div>
  );
}

function Row({ sec, i, data, photo }: { sec: Section; i: number; data: BuildShowData; photo: () => string | undefined }) {
  const style = { "--i": i } as CSSProperties;
  const title = (text: string, big?: boolean) => (
    <span className={`${b.t} ${big ? b.tBig : ""}`}>
      <span className={b.ph}>
        <i />
        {big && <i />}
      </span>
      <span className={b.tx}>{text}</span>
    </span>
  );
  const lines = (n: number) => (
    <span className={b.lines}>
      {Array.from({ length: n }, (_, k) => (
        <i key={k} />
      ))}
    </span>
  );
  const pic = (cls = "") => {
    const src = photo();
    return <span className={`${b.img} ${cls}`} style={src ? ({ "--src": `url("${src}")` } as CSSProperties) : undefined} />;
  };
  const head = title(sec.title);
  let body: ReactNode;

  switch (sec.type) {
    case "hero":
      body = (
        <div className={b.hero}>
          <div className={b.heroText}>
            <span className={b.eyebrow}>{data.hero.eyebrow}</span>
            {title(data.hero.title, true)}
            {lines(2)}
            <span className={b.btn}>{data.hero.cta}</span>
          </div>
          {pic(b.heroImg)}
        </div>
      );
      break;
    case "gallery":
      body = (
        <>
          {head}
          <div className={`${b.cols} ${b.four}`}>{[0, 1, 2, 3].map((k) => <span key={k}>{pic(b.tile)}</span>)}</div>
        </>
      );
      break;
    case "about":
      body = (
        <div className={b.cols}>
          {pic(b.tall)}
          <div className={b.stack}>
            {head}
            {lines(4)}
          </div>
        </div>
      );
      break;
    case "strip":
    case "stats":
      body = (
        <div className={b.band}>
          {title(sec.title)}
        </div>
      );
      break;
    case "steps":
      body = (
        <>
          {head}
          <div className={`${b.cols} ${b.four}`}>
            {[1, 2, 3, 4].map((k) => (
              <span key={k} className={b.stepItem}>
                <em>{k}</em>
                {lines(2)}
              </span>
            ))}
          </div>
        </>
      );
      break;
    case "cta":
      body = (
        <div className={b.ctaRow}>
          {title(sec.title)}
          <span className={b.btn}>{data.hero.cta}</span>
        </div>
      );
      break;
    case "faq":
      body = (
        <>
          {head}
          <div className={b.faq}>
            {[0, 1, 2].map((k) => (
              <span key={k}>{lines(1)}</span>
            ))}
          </div>
        </>
      );
      break;
    case "contacts":
      body = (
        <div className={b.cols}>
          <div className={b.stack}>
            {head}
            {lines(3)}
            <span className={b.btn}>{data.hero.cta}</span>
          </div>
          <span className={b.map} />
        </div>
      );
      break;
    default:
      // Услуги, фишка, отзывы, команда, тарифы, расписание — карточки
      body = (
        <>
          {head}
          <div className={`${b.cols} ${b.three}`} data-feature={sec.type === "feature" || undefined}>
            {[0, 1, 2].map((k) => (
              <span key={k} className={b.card}>
                {sec.type !== "reviews" && sec.type !== "schedule" && pic(b.cardImg)}
                {lines(2)}
              </span>
            ))}
          </div>
        </>
      );
  }

  return (
    <section className={b.row} style={style} data-type={sec.type}>
      <span className={b.tag}>{sec.label}</span>
      {body}
    </section>
  );
}
