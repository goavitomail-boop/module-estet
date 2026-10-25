"use client";

import { useEffect, useRef } from "react";
import { gsap, markReady, prefersReducedMotion } from "./motion";
import s from "./Preloader.module.css";

const STAGES = ["Чертёж", "Каркас", "Тексты", "Цвета", "Сборка"];
const SEEN_KEY = "sborka-seen";

/**
 * Прелоадер: знак собирается из четырёх блоков, счётчик идёт до 100,
 * затем экран уходит вверх колоннами. Показывается один раз за сессию.
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const html = document.documentElement;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {}

    if (!el || seen || prefersReducedMotion()) {
      el?.remove();
      html.classList.remove("is-loading");
      markReady();
      return;
    }

    const num = el.querySelector<HTMLElement>("[data-num]")!;
    const stage = el.querySelector<HTMLElement>("[data-stage]")!;
    const counter = { v: 0 };
    let shown = -1;

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          onComplete: () => {
            try {
              sessionStorage.setItem(SEEN_KEY, "1");
            } catch {}
            el.remove();
          },
        })
        .from("[data-ch]", {
          yPercent: (i) => (i % 2 ? 120 : -120),
          rotate: (i) => (i % 2 ? 12 : -12),
          opacity: 0,
          filter: "blur(8px)",
          duration: 0.9,
          stagger: 0.06,
          ease: "expo.out",
        })
        .from("[data-dot]", { scale: 0, duration: 0.6, ease: "back.out(3)" }, "-=0.4")
        .to(
          counter,
          {
            v: 100,
            duration: 2.1,
            ease: "power2.inOut",
            onUpdate: () => {
              num.textContent = String(Math.round(counter.v)).padStart(3, "0");
              const i = Math.min(STAGES.length - 1, Math.floor(counter.v / 20));
              if (i !== shown) {
                shown = i;
                stage.textContent = STAGES[i];
                gsap.fromTo(stage, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
              }
            },
          },
          0.2,
        )
        .to("[data-bar]", { scaleX: 1, duration: 2.1, ease: "power2.inOut" }, 0.2)
        .to("[data-dot]", { scale: 2.2, duration: 0.5, ease: "expo.inOut" }, "-=0.3")
        .to("[data-content]", { yPercent: -30, opacity: 0, duration: 0.6, ease: "power3.in" }, "+=0.05")
        .add(() => {
          html.classList.remove("is-loading");
          markReady();
        }, "-=0.15")
        .to("[data-col]", { yPercent: -100, duration: 1, stagger: 0.07, ease: "expo.inOut" }, "-=0.25");
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className={s.preloader} role="status" aria-label="Загрузка">
      <div className={s.cols} aria-hidden="true">
        <i data-col />
        <i data-col />
        <i data-col />
        <i data-col />
      </div>
      <div className={s.content} data-content aria-hidden="true">
        <p className={s.word}>
          {"сборка".split("").map((ch, i) => (
            <span key={i} data-ch>
              {ch}
            </span>
          ))}
          <i data-dot />
        </p>
        <div className={s.counter}>
          <span data-num>000</span>
        </div>
        <div className={s.stageRow}>
          <span className={s.stage} data-stage>
            {STAGES[0]}
          </span>
        </div>
        <div className={s.bar}>
          <i data-bar />
        </div>
      </div>
    </div>
  );
}
