"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import s from "./interactive.module.css";

export interface FeatureItem {
  title: string;
  text?: string;
  price?: string;
  value?: number;
  color?: string;
  image?: string;
  x?: number;
  y?: number;
}

const rub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

/** Кнопка, открывающая окно записи с выбранной услугой. */
function Book({ service, children, className }: { service?: string; children: React.ReactNode; className?: string }) {
  return (
    <a href="#contacts" className={className ?? s.book} data-open="booking" data-service={service}>
      {children}
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12h14m-5-5 5 5-5 5" />
      </svg>
    </a>
  );
}

/* ——— Кофейня: витрина меню. Список слева, фото справа сменяется при наведении ——— */

export function MenuShowcase({ items, fallback }: { items: FeatureItem[]; fallback?: string }) {
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Пока секция в экране и посетитель не выбирает сам, позиции листаются сами
  useEffect(() => {
    if (hold || items.length < 2) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.4 });
    if (ref.current) io.observe(ref.current);
    const id = window.setInterval(() => visible && setActive((a) => (a + 1) % items.length), 3200);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, [hold, items.length]);

  return (
    <div className={s.menu} ref={ref} onMouseLeave={() => setHold(false)}>
      <ol className={s.menuList}>
        {items.map((it, i) => (
          <li key={it.title} data-on={i === active || undefined}>
            <button
              type="button"
              className={s.menuRow}
              onMouseEnter={() => {
                setHold(true);
                setActive(i);
              }}
              onFocus={() => setActive(i)}
              onClick={() => {
                setHold(true);
                setActive(i);
              }}
              aria-pressed={i === active}
            >
              <span className={s.menuIndex}>{String(i + 1).padStart(2, "0")}</span>
              <span className={s.menuName} data-svc={it.price ? it.title : undefined}>
                {it.title}
              </span>
              <span className={s.menuPrice} data-svc={it.price ? it.title : undefined}>
                {it.price}
              </span>
            </button>
            <div className={s.menuMore}>
              <div>
                {it.text && <p>{it.text}</p>}
                <Book service={it.title}>В предзаказ</Book>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className={s.menuStage} aria-hidden="true">
        {items.map((it, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={it.title} src={it.image ?? fallback} alt="" data-on={i === active || undefined} loading="lazy" />
        ))}
        <span className={s.menuTag}>
          <b>{items[active]?.title}</b>
          {items[active]?.price}
        </span>
      </div>
    </div>
  );
}

/* ——— Маникюр: подбор оттенка ——— */

const NAILS = [
  "M28 128c0-30 6-62 18-62s18 32 18 62c0 14-8 22-18 22s-18-8-18-22Z",
  "M76 112c0-34 7-70 20-70s20 36 20 70c0 15-9 24-20 24s-20-9-20-24Z",
  "M128 106c0-36 7-74 21-74s21 38 21 74c0 16-9 25-21 25s-21-9-21-25Z",
  "M182 112c0-34 7-70 20-70s20 36 20 70c0 15-9 24-20 24s-20-9-20-24Z",
  "M234 130c0-28 6-58 17-58s17 30 17 58c0 13-7 21-17 21s-17-8-17-21Z",
];

export function PalettePicker({ items }: { items: FeatureItem[] }) {
  const [active, setActive] = useState(0);
  const shade = items[active];
  return (
    <div className={s.palette} style={{ "--shade": shade?.color } as CSSProperties}>
      <div className={s.paletteStage} aria-hidden="true">
        <svg viewBox="0 0 300 190" className={s.nails}>
          <defs>
            <linearGradient id="nail-gloss" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {NAILS.map((d, i) => (
            <g key={i} style={{ "--i": i } as CSSProperties}>
              <path d={d} className={s.nail} />
              <path d={d} fill="url(#nail-gloss)" />
            </g>
          ))}
        </svg>
        <div className={s.bottle}>
          <span className={s.bottleCap} />
          <span className={s.bottleBody}>
            <i>{shade?.title}</i>
          </span>
        </div>
      </div>
      <div>
        <p className={s.paletteName} key={shade?.title}>
          {shade?.title}
        </p>
        <div className={s.swatches} role="radiogroup" aria-label="Оттенки">
          {items.map((it, i) => (
            <button
              key={it.title}
              type="button"
              role="radio"
              aria-checked={i === active}
              aria-label={it.title}
              className={s.swatch}
              style={{ "--c": it.color } as CSSProperties}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
        <Book service={undefined}>Записаться с оттенком «{shade?.title}»</Book>
      </div>
    </div>
  );
}

/* ——— Ремонт: калькулятор ——— */

export function Calculator({ items }: { items: FeatureItem[] }) {
  const [type, setType] = useState(0);
  const [area, setArea] = useState(54);
  const [shown, setShown] = useState(0);
  const target = (items[type]?.value ?? 0) * area;

  // Сумма «докручивается» до новой при каждом изменении
  useEffect(() => {
    let raf = 0;
    const from = shown;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      setShown(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={s.calc}>
      <div className={s.calcControls}>
        <p className={s.calcLabel}>Вид ремонта</p>
        <div className={s.calcTypes}>
          {items.map((it, i) => (
            <button key={it.title} type="button" aria-pressed={i === type} onClick={() => setType(i)}>
              {it.title}
              <small>{rub(it.value ?? 0)} за м²</small>
            </button>
          ))}
        </div>
        <label className={s.calcLabel} htmlFor="calc-area">
          Площадь: <b>{area} м²</b>
        </label>
        <input
          id="calc-area"
          className={s.range}
          type="range"
          min={15}
          max={200}
          value={area}
          onChange={(e) => setArea(Number(e.target.value))}
          style={{ "--fill": `${((area - 15) / 185) * 100}%` } as CSSProperties}
        />
        <div className={s.calcScale} aria-hidden="true">
          <span>15 м²</span>
          <span>200 м²</span>
        </div>
      </div>
      <div className={s.calcResult}>
        <p>Работы под ключ</p>
        <output className={s.calcSum}>{rub(shown)}</output>
        <p className={s.calcNote}>Предварительная оценка без материалов. Точную смету даст замерщик — бесплатно.</p>
        <Book service={items[type]?.title}>Зафиксировать цену на замере</Book>
      </div>
    </div>
  );
}

/* ——— Автосервис: точки на машине ——— */

export function Hotspots({ items, image }: { items: FeatureItem[]; image?: string }) {
  const [active, setActive] = useState<number | null>(0);
  const it = active === null ? null : items[active];
  return (
    <div className={s.hot}>
      <div className={s.hotStage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && <img src={image} alt="" loading="lazy" />}
        {items.map((p, i) => (
          <button
            key={p.title}
            type="button"
            className={s.hotDot}
            style={{ left: `${p.x}%`, top: `${p.y}%`, "--i": i } as CSSProperties}
            aria-pressed={active === i}
            aria-label={p.title}
            onClick={() => setActive(active === i ? null : i)}
          >
            <span>{i + 1}</span>
          </button>
        ))}
        {it && (
          <div
            className={s.hotCard}
            key={active}
            data-side={(it.x ?? 50) > 55 ? "left" : "right"}
            style={{ left: `${it.x}%`, top: `${it.y}%` } as CSSProperties}
          >
            <b>{it.title}</b>
            {it.text && <p>{it.text}</p>}
            <span className={s.hotPrice}>{it.price}</span>
            <Book service={it.title}>Записаться</Book>
          </div>
        )}
      </div>
      <ol className={s.hotList}>
        {items.map((p, i) => (
          <li key={p.title}>
            <button type="button" aria-pressed={active === i} onClick={() => setActive(i)}>
              <span>{i + 1}</span>
              {p.title}
              <small>{p.price}</small>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ——— Психолог: дыхательная практика ——— */

export function Breathe({ items }: { items: FeatureItem[] }) {
  const phases = items.length ? items : [{ title: "Вдох", value: 4 }, { title: "Выдох", value: 6 }];
  const [running, setRunning] = useState(false);
  const [st, setSt] = useState({ phase: 0, left: phases[0].value ?? 4, cycles: 0 });
  const finished = st.cycles >= 3;
  const { phase, left } = st;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(
      () =>
        setSt((p) => {
          if (p.left > 1) return { ...p, left: p.left - 1 };
          const next = (p.phase + 1) % phases.length;
          return { phase: next, left: phases[next].value ?? 4, cycles: next === 0 ? p.cycles + 1 : p.cycles };
        }),
      1000,
    );
    return () => window.clearInterval(id);
  }, [running, phases]);

  // Три круга — и практика заканчивается сама
  useEffect(() => {
    if (st.cycles >= 3) setRunning(false);
  }, [st.cycles]);

  const current = phases[phase];
  const kind = /выдох/i.test(current.title) ? "out" : /вдох/i.test(current.title) ? "in" : "hold";
  return (
    <div className={s.breathe}>
      <div
        className={s.breatheCircle}
        data-phase={running ? kind : "idle"}
        style={{ "--t": `${current.value ?? 4}s` } as CSSProperties}
        aria-live="polite"
      >
        <span className={s.breatheRing} />
        <span className={s.breatheCore}>
          {running ? (
            <>
              <b>{current.title}</b>
              <small>{left}</small>
            </>
          ) : finished ? (
            <b>Спасибо, что остановились</b>
          ) : (
            <b>Готовы?</b>
          )}
        </span>
      </div>
      <button
        type="button"
        className={s.breatheButton}
        onClick={() => {
          setSt({ phase: 0, left: phases[0].value ?? 4, cycles: 0 });
          setRunning(!running);
        }}
      >
        {running ? "Остановить" : finished ? "Ещё раз" : "Начать"}
      </button>
      <p className={s.breatheNote}>{phases.map((p) => `${p.title} — ${p.value} с`).join(" · ")}</p>
    </div>
  );
}

/* ——— Фитнес: тест «какая тренировка подойдёт» ——— */

export function Quiz({
  items,
  services,
  cta = "Записаться на пробную",
}: {
  items: FeatureItem[];
  services: Array<{ name: string; price: string; note?: string }>;
  /** Надпись кнопки после ответа; по умолчанию — для фитнеса. */
  cta?: string;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const done = step >= items.length;
  const pick = services.length ? services[(answers[0] ?? 0) % services.length] : undefined;
  return (
    <div className={s.quiz}>
      <div className={s.quizBar} aria-hidden="true">
        <span style={{ width: `${(Math.min(step, items.length) / items.length) * 100}%` }} />
      </div>
      {!done ? (
        <div className={s.quizStep} key={step}>
          <p className={s.quizCount}>
            Вопрос {step + 1} из {items.length}
          </p>
          <h3>{items[step].title}</h3>
          <div className={s.quizOptions}>
            {(items[step].text ?? "").split("|").map((o, i) => (
              <button
                key={o}
                type="button"
                style={{ "--i": i } as CSSProperties}
                onClick={() => {
                  setAnswers([...answers, i]);
                  setStep(step + 1);
                }}
              >
                <span>{String.fromCharCode(65 + i)}</span>
                {o}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={s.quizResult} key="result">
          <p className={s.quizCount}>Вам подойдёт</p>
          <h3>{pick?.name ?? services[0]?.name ?? "Пробная тренировка"}</h3>
          {pick?.note && <p>{pick.note}</p>}
          {pick?.price && <p className={s.quizPrice}>{pick.price}</p>}
          <div className={s.quizActions}>
            <Book service={pick?.name}>{cta}</Book>
            <button
              type="button"
              className={s.quizAgain}
              onClick={() => {
                setStep(0);
                setAnswers([]);
              }}
            >
              Пройти ещё раз
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ——— Юрист: навигатор по ситуациям ——— */

export function Navigator({ items }: { items: FeatureItem[] }) {
  const [active, setActive] = useState(0);
  const it = items[active];
  const points = (it?.text ?? "Расскажите о ситуации — объясним, что можно сделать").split("|");
  return (
    <div className={s.nav}>
      <div className={s.navTabs} role="tablist" aria-label="Ситуации">
        {items.map((x, i) => (
          <button key={x.title} type="button" role="tab" aria-selected={i === active} onClick={() => setActive(i)}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {x.title}
          </button>
        ))}
      </div>
      <div className={s.navPanel} role="tabpanel" key={active}>
        <h3>{it?.title}</h3>
        <ol>
          {points.map((p, i) => (
            <li key={p} style={{ "--i": i } as CSSProperties}>
              {p}
            </li>
          ))}
        </ol>
        <div className={s.navFoot}>
          {it?.price && <span className={s.navPrice}>{it.price}</span>}
          <Book service={it?.title}>Обсудить ситуацию</Book>
        </div>
      </div>
    </div>
  );
}

/* ——— Барбершоп: лукбук ——— */

export function Lookbook({ items }: { items: FeatureItem[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className={s.look}>
      <ol className={s.lookList}>
        {items.map((it, i) => (
          <li key={it.title} data-on={i === active || undefined} onMouseEnter={() => setActive(i)}>
            <a href="#contacts" data-open="booking" data-service={it.title} onFocus={() => setActive(i)}>
              <span className={s.lookIndex}>{String(i + 1).padStart(2, "0")}</span>
              <span className={s.lookName} data-svc={it.price ? it.title : undefined}>
                {it.title}
                {it.text && <small>{it.text}</small>}
              </span>
              <span className={s.lookPrice} data-svc={it.price ? it.title : undefined}>
                {it.price}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.image && <img className={s.lookThumb} src={it.image} alt="" loading="lazy" />}
            </a>
          </li>
        ))}
      </ol>
      <div className={s.lookStage} aria-hidden="true">
        {items.map((it, i) =>
          it.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={it.title} src={it.image} alt="" data-on={i === active || undefined} loading="lazy" />
          ) : null,
        )}
        <span className={s.lookCaption}>{items[active]?.title}</span>
      </div>
    </div>
  );
}

/* ——— Клининг: «проведите по фото» ——— */

export function Wipe({ image }: { image?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [clean, setClean] = useState(0);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    // «Грязь»: мутная плёнка, разводы и пятна
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(120, 104, 84, 0.82)";
    ctx.fillRect(0, 0, rect.width, rect.height);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * rect.width;
      const y = rnd() * rect.height;
      const r = 8 + rnd() * 60;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${70 + rnd() * 40}, ${60 + rnd() * 30}, ${45 + rnd() * 20}, ${0.25 + rnd() * 0.3})`);
      g.addColorStop(1, "rgba(80, 70, 55, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    for (let i = 0; i < 26; i++) {
      ctx.lineWidth = 6 + rnd() * 18;
      ctx.beginPath();
      ctx.moveTo(rnd() * rect.width, rnd() * rect.height);
      ctx.bezierCurveTo(rnd() * rect.width, rnd() * rect.height, rnd() * rect.width, rnd() * rect.height, rnd() * rect.width, rnd() * rect.height);
      ctx.stroke();
    }
    setClean(0);

    let last: { x: number; y: number } | null = null;
    let moves = 0;
    const wipe = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "#000";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(56, r.width * 0.09);
      ctx.beginPath();
      ctx.moveTo(last?.x ?? x, last?.y ?? y);
      ctx.lineTo(x, y);
      ctx.stroke();
      last = { x, y };
      // Считаем долю чистого раз в несколько движений — это дорогая операция
      if (++moves % 8 === 0) {
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        let empty = 0;
        for (let i = 3; i < data.length; i += 64) if (data[i] < 40) empty++;
        setClean(Math.round((empty / (data.length / 64)) * 100));
      }
    };
    const down = (e: PointerEvent) => {
      last = null;
      c.setPointerCapture?.(e.pointerId);
      wipe(e);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || e.buttons) wipe(e);
    };
    const up = () => (last = null);
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerleave", up);
    c.addEventListener("pointerup", up);
    return () => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerleave", up);
      c.removeEventListener("pointerup", up);
    };
  }, [round]);

  const done = clean >= 55;
  return (
    <div className={s.wipe} data-done={done || undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {image && <img src={image} alt="Чистая кухня после уборки" loading="lazy" />}
      <canvas ref={canvas} key={round} className={s.wipeCanvas} aria-hidden="true" />
      <span className={s.wipeHint} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0V12m0-.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L5.2 15a1.5 1.5 0 0 1 2.4-1.8L8 14" />
        </svg>
        Проведите по фото
      </span>
      <div className={s.wipeMeter}>
        <span className={s.wipeTrack}>
          <i style={{ width: `${Math.min(100, (clean / 55) * 100)}%` }} />
        </span>
        <b>{done ? "Чисто!" : `${Math.min(99, Math.round((clean / 55) * 100))}%`}</b>
      </div>
      {done && (
        <button type="button" className={s.wipeAgain} onClick={() => setRound(round + 1)}>
          Испачкать снова
        </button>
      )}
    </div>
  );
}

/* ——— Цветы: открытка к букету ——— */

export function Postcard({ items, image, signature }: { items: FeatureItem[]; image?: string; signature: string }) {
  const [text, setText] = useState(items[0]?.title ?? "");
  const [flipped, setFlipped] = useState(true);
  return (
    <div className={s.post}>
      <div className={s.postForm}>
        <div className={s.postTemplates}>
          {items.map((it) => (
            <button
              key={it.title}
              type="button"
              aria-pressed={text === it.title}
              onClick={() => {
                setText(it.title);
                setFlipped(true);
              }}
            >
              {it.title}
            </button>
          ))}
        </div>
        <label className={s.postLabel}>
          Или напишите своё
          <textarea
            rows={3}
            maxLength={140}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFlipped(true);
            }}
          />
          <small>{text.length} / 140</small>
        </label>
        <div className={s.postActions}>
          <Book>Заказать букет с открыткой</Book>
          <button type="button" className={s.postFlip} onClick={() => setFlipped(!flipped)}>
            Перевернуть
          </button>
        </div>
      </div>
      <div className={s.postScene} aria-live="polite">
        <div className={s.postCard} data-flipped={flipped || undefined}>
          <div className={s.postFront}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {image && <img src={image} alt="" loading="lazy" />}
          </div>
          <div className={s.postBack}>
            <p>{text || "…"}</p>
            <span>{signature}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
