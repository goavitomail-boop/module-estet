"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../motion";
import s from "./Facts.module.css";

const FACTS = [
  { from: 0, to: 5, unit: "мин", label: "на бриф" },
  { from: 0, to: 24, unit: "ч", label: "до публикации сайта" },
  { from: 0, to: 3, unit: "", label: "правки бесплатно" },
  { from: 4999, to: 0, unit: "₽", label: "предоплаты" },
];

/** Условия сервиса крупными цифрами со счётчиком. */
export function Facts() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((n, i) => {
        const f = FACTS[i];
        const v = { n: f.from };
        n.textContent = String(f.from);
        gsap.to(v, {
          n: f.to,
          duration: 1.8,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 80%", once: true },
          onUpdate: () => (n.textContent = Math.round(v.n).toLocaleString("ru-RU")),
        });
      });
      gsap.from("[data-fact-line]", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.2,
        stagger: 0.1,
        ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className={s.section} aria-label="Условия">
      <ul className={`container ${s.grid}`}>
        {FACTS.map((f) => (
          <li key={f.label} className={s.item}>
            <i className={s.line} data-fact-line aria-hidden="true" />
            <p className={s.value}>
              <span data-count>{f.to.toLocaleString("ru-RU")}</span>
              {f.unit && <span className={s.unit}>{f.unit}</span>}
            </p>
            <p className={s.label}>{f.label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
