"use client";

import { useEffect, useRef, useState } from "react";
import type { SiteSpec } from "@/lib/sites/schema";
import { BrowserFrame } from "../BrowserFrame";
import { RevealText } from "../RevealText";
import { ScrollTrigger } from "../motion";
import { SiteMock } from "./AssemblyWindow";
import s from "./HowItWorks.module.css";

const STEPS = [
  {
    title: "Заполняете бриф",
    text: "Сфера, название, услуги и цены, контакты. Около пяти минут, регистрация не нужна.",
    address: "Бриф",
  },
  {
    title: "ИИ собирает сайт",
    text: "Пишет тексты под ваш бизнес и город и собирает страницу из готовых блоков, сделанных дизайнерами.",
    address: "Сборка",
  },
  {
    title: "Смотрите и правите",
    text: "Прототип появляется в личном кабинете. Три правки и два других варианта — бесплатно.",
    address: "Прототип",
  },
  {
    title: "Платите и получаете сайт",
    text: "Оплачиваете 4 999 ₽, и в течение 24 часов мы публикуем сайт на вашем домене.",
    address: "ваш-домен.ru",
  },
];

export function HowItWorks({ spec }: { spec: SiteSpec }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const steps = root.current?.querySelectorAll<HTMLElement>("[data-step]");
    if (!steps) return;
    const triggers = Array.from(steps).map((el, i) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) => self.isActive && setActive(i),
      }),
    );
    return () => triggers.forEach((t) => t.kill());
  }, []);

  return (
    <section id="how" ref={root} className={s.section} aria-labelledby="how-title">
      <div className="container">
        <header className={s.head}>
          <RevealText id="how-title" className={s.title}>
            Как это работает
          </RevealText>
          <p className={s.sub}>От брифа до сайта на вашем домене — четыре шага.</p>
        </header>

        <div className={s.layout}>
          <ol className={s.steps}>
            {STEPS.map((step, i) => (
              <li key={step.title} data-step className={s.step} data-active={i === active}>
                <span className={s.num} aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3 className={s.stepTitle}>{step.title}</h3>
                  <p className={s.stepText}>{step.text}</p>
                </div>
                <div className={s.inlineFrame}>
                  <BrowserFrame address={step.address} className={s.frame}>
                    <StepState step={i} spec={spec} />
                  </BrowserFrame>
                </div>
              </li>
            ))}
          </ol>

          <div className={s.sticky}>
            <BrowserFrame address={STEPS[active].address} className={s.frame}>
              {STEPS.map((step, i) => (
                <div key={step.title} className={s.layer} data-visible={i === active}>
                  <StepState step={i} spec={spec} />
                </div>
              ))}
            </BrowserFrame>
            <div className={s.progress} aria-hidden="true">
              {STEPS.map((step, i) => (
                <span key={step.title} data-state={i < active ? "done" : i === active ? "current" : "next"} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepState({ step, spec }: { step: number; spec: SiteSpec }) {
  if (step === 0) {
    const rows = [
      ["Сфера", "Кофейня и кондитерская"],
      ["Название", spec.business.name],
      ["Город", spec.business.city],
      ["Услуги", spec.services.items.map((i) => `${i.name} — ${i.price}`).join(", ")],
    ];
    return (
      <div className={s.brief} aria-hidden="true">
        {rows.map(([k, v], i) => (
          <div key={k} className={s.briefRow}>
            <span>{k}</span>
            <p>
              {v}
              {i === rows.length - 1 && <i className={s.caret} />}
            </p>
          </div>
        ))}
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className={s.wire} aria-hidden="true">
        <span className={s.wNav} />
        <div className={s.wHero}>
          <div className={s.wText}>
            <span style={{ width: "92%" }} />
            <span style={{ width: "70%" }} />
            <span className={s.wSmall} style={{ width: "80%" }} />
            <span className={s.wBtn} />
          </div>
          <span className={s.wArt} />
        </div>
        <div className={s.wList}>
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }
  return (
    <div className={s.mockWrap}>
      <SiteMock spec={spec} assembled />
      {step === 2 && (
        <div className={s.comment} aria-hidden="true">
          <span>Правка 1 из 3</span>
          <p>Сделайте фон потемнее и добавьте торты на заказ наверх</p>
        </div>
      )}
      {step === 3 && (
        <span className={s.published} aria-hidden="true">
          Опубликовано
        </span>
      )}
    </div>
  );
}
