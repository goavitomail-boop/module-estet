"use client";

import { useEffect, useRef, useState } from "react";
import type { ShowcasePhotos } from "@/lib/showcase";
import type { IconName } from "@/lib/sites/schema";
import { Icon } from "@/sites/icons";
import { gsap, onReady, prefersReducedMotion } from "../motion";
import { ShowcaseSite } from "./ShowcaseSite";
import { WaveCanvas } from "./WaveCanvas";
import s from "./HeroShowcase.module.css";

const CARDS: { title: string; text: string; icon: IconName; thumb: "text" | "design" | "pages" | "mobile" }[] = [
  { title: "Тексты", text: "ИИ пишет тексты под ваш бизнес", icon: "text", thumb: "text" },
  { title: "Дизайн", text: "Подбираем стиль, цвета и шрифты", icon: "palette", thumb: "design" },
  { title: "Страницы", text: "Собираем все блоки в единый сайт", icon: "layers", thumb: "pages" },
  { title: "Адаптив", text: "Проверяем на всех устройствах", icon: "mobile", thumb: "mobile" },
];

const STEPS = [
  "Анализируем ваш запрос…",
  "Пишем тексты для сайта…",
  "Подбираем цвета и стиль…",
  "Собираем страницы…",
  "Проверяем мобильную версию…",
  "Готово! Сайт собран",
];

const CODE = `{
  "business": "кофейня",
  "style": "modern",
  "colors": ["#1a1a1a", "#c8ff3d"],
  "pages": ["home", "menu", "about", "contacts"]
}`;

const W = 940;
const H = 640;
const STEP_MS = 1500;

/**
 * Витрина первого экрана: карточки этапов, окно с собирающимся сайтом
 * и панель «ИИ-генерация» с таймером, чек-листом и кодом.
 */
export function HeroShowcase({ photos }: { photos: ShowcasePhotos }) {
  const root = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [step, setStep] = useState(-1);
  const [built, setBuilt] = useState(-1);
  const [time, setTime] = useState(0);

  // Масштабируем композицию под ширину колонки
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1.1, el.clientWidth / W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Появление композиции и цикл генерации
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setStep(STEPS.length - 1);
      setBuilt(STEPS.length - 1);
      setTime(154);
      return;
    }
    let timers: ReturnType<typeof setTimeout>[] = [];
    let clock: ReturnType<typeof setInterval> | undefined;
    const ctx = gsap.context(() => {
      gsap.set("[data-anim]", { opacity: 0 });
    }, el);

    const run = () => {
      setTime(0);
      setStep(0);
      clearInterval(clock);
      const started = Date.now();
      clock = setInterval(() => setTime(Math.floor((Date.now() - started) / 100) / 10), 100);
      STEPS.forEach((_, i) => {
        timers.push(
          setTimeout(() => {
            setStep(i);
            setBuilt((b) => Math.max(b, i));
            if (i === STEPS.length - 1) clearInterval(clock);
          }, i * STEP_MS),
        );
      });
      timers.push(setTimeout(run, STEPS.length * STEP_MS + 3500));
    };

    const off = onReady(() => {
      ctx.add(() => {
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .fromTo("[data-anim=browser]", { opacity: 0, y: 40, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 1.4 })
          .fromTo("[data-anim=card]", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 1, stagger: 0.1 }, "-=1.1")
          .fromTo("[data-anim=panel]", { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 1.2 }, "<0.1")
          .fromTo("[data-anim=wires]", { opacity: 0 }, { opacity: 1, duration: 0.6 }, "-=0.6")
          .add(run, "-=0.4");
      });
    });

    return () => {
      off();
      timers.forEach(clearTimeout);
      timers = [];
      clearInterval(clock);
      ctx.revert();
    };
  }, []);

  const activeCard = step >= 1 && step <= 4 ? step - 1 : -1;
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  const progress = step < 0 ? 0 : (step + 1) / STEPS.length;
  const code = CODE.slice(0, Math.round(CODE.length * Math.min(1, progress * 1.25)));

  return (
    <div ref={root} className={s.root} style={{ height: H * scale }} aria-hidden="true">
      <div className={s.stage} style={{ width: W, height: H, transform: `scale(${scale})` }}>
        <svg className={s.wires} data-anim="wires" viewBox={`0 0 ${W} ${H}`}>
          {CARDS.map((_, i) => {
            const y1 = 112 + i * 120;
            const y2 = 150 + i * 105;
            return (
              <g key={i} className={i === activeCard ? s.wireOn : undefined}>
                <path d={`M206 ${y1} H222 C236 ${y1} 236 ${y2} 250 ${y2} H262`} className={s.wireGlow} />
                <path d={`M206 ${y1} H222 C236 ${y1} 236 ${y2} 250 ${y2} H262`} className={s.wire} />
                <circle cx="262" cy={y2} r="3" className={s.wireDot} />
              </g>
            );
          })}
        </svg>

        <ul className={s.cards}>
          {CARDS.map((c, i) => (
            <li key={c.title} data-anim="card" className={`${s.card} ${i === activeCard ? s.cardOn : ""} ${i < activeCard || built >= 5 ? s.cardDone : ""}`}>
              <span className={`${s.thumb} ${s[c.thumb]}`}>
                <i />
                <i />
                <i />
                <i />
              </span>
              <span>
                <b>{c.title}</b>
                <small>{c.text}</small>
              </span>
            </li>
          ))}
        </ul>

        <div className={s.browser} data-anim="browser" data-built={built}>
          <div className={s.bar}>
            <span className={s.dots}>
              <i />
              <i />
              <i />
            </span>
            <span className={s.address}>Прототип · Зерно и сахар</span>
          </div>
          <div className={s.viewport}>
            <ShowcaseSite photos={photos} />
          </div>
        </div>

        <div className={s.panel} data-anim="panel">
          <div className={s.panelHead}>
            <Icon name="sparkle" size={16} />
            <span>ИИ-генерация сайта</span>
            <time>
              {mins}:{String(secs).padStart(2, "0")}
            </time>
          </div>
          <ul className={s.checklist}>
            {STEPS.map((t, i) => (
              <li key={t} data-state={i < step || step === STEPS.length - 1 ? "done" : i === step ? "now" : "next"}>
                <span className={s.state}>{i < step || step === STEPS.length - 1 ? <Icon name="check" size={12} /> : null}</span>
                {t}
                {i === STEPS.length - 1 && <Icon name="bolt" size={12} />}
              </li>
            ))}
          </ul>
          <pre className={s.code}>
            <code>{code}</code>
            <i className={s.caret} />
          </pre>
          <WaveCanvas className={s.wave} />
          <p className={s.panelFoot}>{step === STEPS.length - 1 ? "Сайт собран" : "Собираем ваш сайт…"}</p>
        </div>
      </div>
    </div>
  );
}
