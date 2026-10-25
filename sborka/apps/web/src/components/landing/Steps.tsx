"use client";

import { useEffect, useRef } from "react";
import type { IconName } from "@/lib/sites/schema";
import { Icon } from "@/sites/icons";
import { ArrowIcon } from "../ArrowIcon";
import { gsap, prefersReducedMotion } from "../motion";
import { RevealText } from "../RevealText";
import s from "./Steps.module.css";

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "chat", title: "Бриф", text: "Расскажите о своём бизнесе, выберите стиль и добавьте контент (необязательно)." },
  { icon: "lock", title: "Вход", text: "Без паролей: ссылка на личный кабинет появляется сразу. Запускается генерация." },
  { icon: "sparkle", title: "Генерация", text: "2–5 минут. ИИ создаёт сайт: тексты, дизайн, структуру и адаптацию под все устройства." },
  { icon: "eye", title: "Прототип", text: "Вы смотрите готовый сайт, можете внести до 3 правок и создать 2 варианта." },
  { icon: "card", title: "Оплата", text: "4 999 ₽ картой или через СБП — только когда сайт вам понравился." },
  { icon: "globe", title: "Публикация", text: "Мы публикуем сайт на хостинге с вашим доменом." },
];

/** Как это работает: шесть шагов, иконки загораются по очереди. */
export function Steps() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 70%", once: true } })
        .from("[data-step]", { opacity: 0, y: 30, duration: 0.9, stagger: 0.1, ease: "expo.out" })
        .from("[data-chevron]", { opacity: 0, x: -10, duration: 0.5, stagger: 0.1 }, "-=0.8");
      // Иконки шагов вспыхивают по кругу
      gsap.to("[data-step-icon]", {
        keyframes: [
          { boxShadow: "0 0 0 1px rgba(200,255,61,.7), 0 0 36px rgba(200,255,61,.55)", duration: 0.4 },
          { boxShadow: "0 0 0 1px rgba(200,255,61,.35), 0 0 18px rgba(200,255,61,.18)", duration: 0.8 },
        ],
        stagger: { each: 0.6, repeat: -1, repeatDelay: 3 },
        ease: "power2.out",
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section id="how" ref={root} className={s.section} aria-labelledby="how-title">
      <div className="container">
        <div className={s.head}>
          <div>
            <RevealText id="how-title" className="section-title">
              Как это работает
            </RevealText>
            <p className="section-sub">
              Весь процесс — от идеи до опубликованного сайта — занимает 24 часа. Вы просто описываете свой бизнес, а мы
              делаем всё остальное.
            </p>
          </div>
          <a href="#faq" className={s.more}>
            Подробнее о процессе
            <ArrowIcon size={16} />
          </a>
        </div>
        <ol className={s.list}>
          {STEPS.map((st, i) => (
            <li key={st.title} className={s.step} data-step>
              <div className={s.iconRow}>
                <span className={s.icon} data-step-icon>
                  <Icon name={st.icon} size={24} />
                </span>
                {i < STEPS.length - 1 && (
                  <span className={s.chevron} data-chevron aria-hidden="true">
                    ›
                  </span>
                )}
              </div>
              <h3>{st.title}</h3>
              <p>{st.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
