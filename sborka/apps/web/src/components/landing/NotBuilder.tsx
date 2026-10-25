"use client";

import { CheckIcon, XIcon } from "@phosphor-icons/react/ssr";
import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger } from "../motion";
import { RevealText } from "../RevealText";
import s from "./NotBuilder.module.css";

const VERSUS: { topic: string; builder: string; us: string }[] = [
  { topic: "Кто собирает", builder: "Вы сами, по вечерам", us: "Мы, за 24 часа" },
  { topic: "Дизайн", builder: "Шаблон, как у тысяч других", us: "Под вашу сферу и задачи" },
  { topic: "Чей сайт", builder: "Живёт на платформе конструктора", us: "Принадлежит вам" },
  { topic: "Анимации", builder: "Базовые, из библиотеки", us: "Студийные, как в примерах выше" },
];

const BENEFITS: { kind: Kind; title: string; text: string }[] = [
  {
    kind: "own",
    title: "Сайт принадлежит вам",
    text: "После оплаты права на сайт, тексты и дизайн переходят вам. Захотите переехать — отдадим файлы сайта.",
  },
  {
    kind: "speed",
    title: "Быстрая загрузка",
    text: "Страница приходит в браузер уже собранной, фото сжаты в формат WebP. Сайт быстро открывается даже на мобильном интернете.",
  },
  {
    kind: "code",
    title: "Современные технологии",
    text: "React, Next.js и TypeScript — на них делают крупные онлайн-сервисы. Без устаревших движков и тяжёлых плагинов.",
  },
  {
    kind: "seo",
    title: "Видно в Яндексе и Google",
    text: "Текст отдаётся готовым HTML, а не дорисовывается скриптами, поэтому поисковики видят всю страницу.",
  },
  {
    kind: "safe",
    title: "Нечего взламывать",
    text: "У сайта нет админки с паролями и сторонних плагинов — меньше мест, через которые ломают сайты. HTTPS подключаем при публикации.",
  },
  {
    kind: "brand",
    title: "Только ваш бренд",
    text: "Ни логотипа платформы, ни чужой рекламы. На сайте только ваше название, контакты и стиль.",
  },
];

type Kind = "own" | "speed" | "code" | "seo" | "safe" | "brand";

/** Почему это не конструктор: сравнение и шесть преимуществ с живыми иллюстрациями. */
export function NotBuilder() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.setAttribute("data-play", "");
      return;
    }
    const ctx = gsap.context(() => {
      gsap
        .timeline({ scrollTrigger: { trigger: "[data-nb-versus]", start: "top 75%", once: true } })
        .from("[data-nb-card=builder]", { x: -60, rotationY: 18, opacity: 0, duration: 1.2, ease: "expo.out", transformPerspective: 1400 })
        .from("[data-nb-card=us]", { x: 60, rotationY: -18, opacity: 0, duration: 1.2, ease: "expo.out", transformPerspective: 1400 }, "<0.1")
        .from("[data-nb-row]", { opacity: 0, y: 16, duration: 0.6, stagger: 0.08, ease: "expo.out" }, "-=0.8")
        .from("[data-nb-vs]", { scale: 0, rotation: -90, duration: 0.8, ease: "back.out(2)" }, "-=0.9");
      gsap.from("[data-nb-benefit]", {
        opacity: 0,
        y: 50,
        duration: 1,
        stagger: 0.09,
        ease: "expo.out",
        scrollTrigger: { trigger: "[data-nb-grid]", start: "top 80%", once: true },
      });
      // Иллюстрации крутятся, только пока блок на экране
      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        end: "bottom 15%",
        onToggle: (st) => el.toggleAttribute("data-play", st.isActive),
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section id="why" ref={root} className={s.section} aria-labelledby="why-title">
      <div className="container">
        <div className={s.head}>
          <span className="pill pill-lime">Почему не конструктор</span>
          <RevealText id="why-title" className="section-title">
            Настоящий сайт, а не страница в конструкторе
          </RevealText>
          <p className="section-sub">
            В конструкторе вы сами двигаете блоки по шаблону, а сайт остаётся на чужой платформе. Мы собираем сайт под ваш бизнес
            на современных технологиях, и он принадлежит вам.
          </p>
        </div>

        <div className={s.versus} data-nb-versus>
          <div className={`${s.card} ${s.builder}`} data-nb-card="builder">
            <p className={s.cardTitle}>Конструктор</p>
            <ul>
              {VERSUS.map((v) => (
                <li key={v.topic} data-nb-row>
                  <span className={s.topic}>{v.topic}</span>
                  <span className={s.value}>
                    <XIcon size={16} weight="bold" aria-hidden="true" />
                    {v.builder}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <span className={s.vs} data-nb-vs aria-hidden="true">
            vs
          </span>
          <div className={`${s.card} ${s.us}`} data-nb-card="us">
            <p className={s.cardTitle}>
              Сборка<i aria-hidden="true" />
            </p>
            <ul>
              {VERSUS.map((v) => (
                <li key={v.topic} data-nb-row>
                  <span className={s.topic}>{v.topic}</span>
                  <span className={s.value}>
                    <CheckIcon size={16} weight="bold" aria-hidden="true" />
                    {v.us}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ul className={s.grid} data-nb-grid>
          {BENEFITS.map((b) => (
            <li key={b.kind} className={s.benefit} data-nb-benefit>
              <div className={s.visual} data-kind={b.kind} aria-hidden="true">
                <Visual kind={b.kind} />
              </div>
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Маленькая живая иллюстрация к преимуществу. */
function Visual({ kind }: { kind: Kind }) {
  switch (kind) {
    case "own":
      return (
        <div className={s.doc}>
          <b>Права на сайт</b>
          <i />
          <i />
          <i />
          <span className={s.stamp}>ваш</span>
        </div>
      );
    case "speed":
      return (
        <div className={s.browser}>
          <span className={s.load} />
          <div className={s.blocks}>
            <i />
            <i />
            <i />
          </div>
          <span className={s.ready}>готово</span>
        </div>
      );
    case "code":
      return (
        <div className={s.code}>
          <span>
            &lt;<b>Hero</b> /&gt;
          </span>
          <span>
            &lt;<b>Services</b> /&gt;
          </span>
          <span>
            &lt;<b>Booking</b> /&gt;
          </span>
          <div className={s.chips}>
            <em>React</em>
            <em>Next.js</em>
            <em>TS</em>
          </div>
        </div>
      );
    case "seo":
      return (
        <div className={s.serp}>
          <span className={s.query}>барбершоп пермь</span>
          <span className={s.result} />
          <span className={`${s.result} ${s.mine}`}>ваш сайт</span>
          <span className={s.result} />
        </div>
      );
    case "safe":
      return (
        <div className={s.safe}>
          <span className={s.ring} />
          <span className={s.ring} />
          <svg width="40" height="44" viewBox="0 0 40 44">
            <rect x="5" y="19" width="30" height="22" rx="6" fill="currentColor" />
            <path d="M12 19v-6a8 8 0 0 1 16 0v6" fill="none" stroke="currentColor" strokeWidth="3.5" />
          </svg>
          <em>https://</em>
        </div>
      );
    case "brand":
      return (
        <div className={s.footer}>
          <span className={s.badge}>Сделано на конструкторе</span>
          <span className={s.own}>© Ваша компания</span>
        </div>
      );
  }
}
