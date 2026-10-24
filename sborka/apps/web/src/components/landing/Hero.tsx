"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../motion";
import { AssemblyWindow, type AssemblyItem } from "./AssemblyWindow";
import { BlueprintCanvas } from "./BlueprintCanvas";
import s from "./Hero.module.css";

const LINES = ["Сайт", "за 24 часа", "за 4 999 ₽"];

export function Hero({ items }: { items: AssemblyItem[] }) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.fromTo(
        "[data-line-skel]",
        { opacity: 1, scaleX: 0, transformOrigin: "left center" },
        { scaleX: 1, duration: 0.8, stagger: 0.1 },
      )
        .from("[data-line-text]", { clipPath: "inset(0 100% 0 0)", duration: 1.1, stagger: 0.12 }, "-=0.3")
        .to("[data-line-skel]", { opacity: 0, duration: 0.6, stagger: 0.12, ease: "power2.out" }, "<0.2")
        .from("[data-hero-rest]", { opacity: 0, y: 16, duration: 0.9, stagger: 0.08 }, "-=0.7")
        .from("[data-hero-window]", { opacity: 0, x: 40, duration: 1.2 }, "<");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className={s.hero} aria-labelledby="hero-title">
      <BlueprintCanvas className={s.canvas} />
      <div className={`container ${s.inner}`}>
        <div className={s.text}>
          <h1 id="hero-title" className={s.title}>
            {LINES.map((line) => (
              <span key={line} className={s.line}>
                <span className={s.lineSkel} data-line-skel aria-hidden="true" />
                <span className={s.lineText} data-line-text>
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <p className={s.lead} data-hero-rest>
            Опишите бизнес — ИИ соберёт сайт из блоков, которые сделали дизайнеры. Вы смотрите прототип и платите,
            только если он понравился.
          </p>
          <div className={s.actions} data-hero-rest>
            <Link href="/brief" className="btn btn-primary">
              Собрать сайт
            </Link>
            <a href="#examples" className="btn btn-secondary">
              Посмотреть примеры
            </a>
          </div>
          <ul className={s.facts} data-hero-rest>
            <li>Бриф — около 5 минут</li>
            <li>Оплата после просмотра</li>
            <li>3 правки бесплатно</li>
          </ul>
        </div>
        <div className={s.window} data-hero-window>
          <AssemblyWindow items={items} />
        </div>
      </div>
    </section>
  );
}
