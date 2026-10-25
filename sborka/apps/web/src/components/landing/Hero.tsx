"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { Magnetic } from "../Magnetic";
import { gsap, onReady, prefersReducedMotion, SplitText } from "../motion";
import { BlueprintCanvas } from "./BlueprintCanvas";
import { HeroScene } from "./HeroScene";
import s from "./Hero.module.css";

export function Hero({ photo }: { photo?: string }) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const splits: SplitText[] = [];
    const ctx = gsap.context(() => {
      const targets = el.querySelectorAll<HTMLElement>("[data-split]");
      targets.forEach((t) => splits.push(SplitText.create(t, { type: "chars", mask: "chars" })));
      const chars = splits.flatMap((sp) => sp.chars);
      gsap.set(chars, { yPercent: 115 });
      gsap.set("[data-price]", { opacity: 0 });
      gsap.set("[data-hero-rest]", { opacity: 0, y: 24 });
      gsap.set("[data-scroll-hint]", { opacity: 0 });
    }, el);

    const off = onReady(() => {
      ctx.add(() => {
        const chars = splits.flatMap((sp) => sp.chars);
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .to(chars, { yPercent: 0, duration: 1.2, stagger: 0.028 })
          .to("[data-price]", { opacity: 1, duration: 0.2 }, "-=0.9")
          .to(
            "[data-price]",
            { duration: 1.4, scrambleText: { text: "4 999 ₽", chars: "0123456789", speed: 0.5, revealDelay: 0.3 } },
            "<",
          )
          .to("[data-hero-rest]", { opacity: 1, y: 0, duration: 1, stagger: 0.08 }, "-=1.1")
          .to("[data-scroll-hint]", { opacity: 1, duration: 0.8 }, "-=0.4");
      });
    });

    return () => {
      off();
      ctx.revert();
      splits.forEach((sp) => sp.revert());
    };
  }, []);

  return (
    <section ref={root} className={s.hero} aria-labelledby="hero-title">
      <BlueprintCanvas className={s.canvas} />
      <div className={`container ${s.inner}`}>
        <div className={s.text}>
          <h1 id="hero-title" className={s.title}>
            <span className={s.line} data-split>
              Сайт
            </span>
            <span className={s.line} data-split>
              за 24 часа
            </span>
            <span className={`${s.line} ${s.price}`}>
              <span data-split>за&nbsp;</span>
              <span data-price>4 999 ₽</span>
            </span>
          </h1>
          <p className={s.lead} data-hero-rest>
            Опишите бизнес — ИИ соберёт сайт из блоков, которые сделали дизайнеры. Вы смотрите прототип и платите,
            только если он понравился.
          </p>
          <div className={s.actions} data-hero-rest>
            <Magnetic>
              <Link href="/brief" className="btn btn-primary">
                Собрать сайт
              </Link>
            </Magnetic>
            <a href="#live" className="btn btn-secondary">
              Как это выглядит
            </a>
          </div>
          <ul className={s.facts} data-hero-rest>
            <li>Бриф — около 5 минут</li>
            <li>Оплата после просмотра</li>
            <li>3 правки бесплатно</li>
          </ul>
        </div>
      </div>
      <HeroScene className={s.scene} photo={photo} />
      <div className={s.scrollHint} data-scroll-hint aria-hidden="true">
        <span>Листайте</span>
        <i />
      </div>
    </section>
  );
}
