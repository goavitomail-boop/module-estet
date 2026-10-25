"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import type { ShowcasePhotos } from "@/lib/showcase";
import type { IconName } from "@/lib/sites/schema";
import { Icon } from "@/sites/icons";
import { ArrowIcon } from "../ArrowIcon";
import { Magnetic } from "../Magnetic";
import { gsap, onReady, prefersReducedMotion, SplitText } from "../motion";
import { GlowLines } from "./GlowLines";
import { HeroShowcase } from "./HeroShowcase";
import { LiquidBlob } from "./LiquidBlob";
import s from "./Hero.module.css";

const FEATURES: { icon: IconName; text: string }[] = [
  { icon: "sparkle", text: "ИИ + дизайн-шаблоны" },
  { icon: "text", text: "Тексты под ваш бизнес" },
  { icon: "clock", text: "Готовый сайт за 24 часа" },
  { icon: "lock", text: "Без регистрации на первом этапе" },
  { icon: "eye", text: "Оплата после просмотра" },
];

export function Hero({ photos }: { photos: ShowcasePhotos }) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const splits: SplitText[] = [];
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>("[data-split]").forEach((t) =>
        splits.push(SplitText.create(t, { type: "words,chars", mask: "chars" })),
      );
      gsap.set(splits.flatMap((sp) => sp.chars), { yPercent: 110 });
      gsap.set("[data-price]", { opacity: 0 });
      gsap.set("[data-rest]", { opacity: 0, y: 20 });
    }, el);

    const off = onReady(() => {
      ctx.add(() => {
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .to("[data-rest=pills]", { opacity: 1, y: 0, duration: 0.8 })
          .to(splits.flatMap((sp) => sp.chars), { yPercent: 0, duration: 1.1, stagger: 0.022 }, "-=0.5")
          .to("[data-price]", { opacity: 1, duration: 0.1 }, "-=0.6")
          .to(
            "[data-price]",
            { duration: 1.3, scrambleText: { text: "4 999 ₽", chars: "0123456789", speed: 0.5, revealDelay: 0.2 } },
            "<",
          )
          .to("[data-rest]:not([data-rest=pills])", { opacity: 1, y: 0, duration: 1, stagger: 0.08 }, "-=1");
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
      <div className={s.bg} aria-hidden="true">
        <GlowLines set="hero" />
        <LiquidBlob className={s.blob} />
      </div>

      <div className={`container ${s.grid}`}>
        <div className={s.text}>
          <div className={s.pills} data-rest="pills">
            <span className="pill pill-lime">ИИ-конструктор сайтов</span>
            <span className="pill">от 4 999 ₽</span>
          </div>
          <h1 id="hero-title" className={s.title}>
            <span data-split>Сайт за 24 часа.</span>
            <span className={s.price} data-price>
              4 999 ₽
            </span>
          </h1>
          <p className={s.lead} data-rest>
            Опишите свой бизнес — мы соберём для вас современный сайт с текстами, дизайном и адаптацией под все
            устройства. Быстро. Красиво. Без лишних сложностей.
          </p>
          <div className={s.actions} data-rest>
            <Magnetic>
              <Link href="/brief" className="btn btn-primary btn-dot">
                Создать мой сайт
                <ArrowIcon />
              </Link>
            </Magnetic>
            <a href="#how" className={s.play}>
              <Icon name="play" size={34} />
              Как это работает
            </a>
          </div>
        </div>
        <div className={s.showcase}>
          <HeroShowcase photos={photos} />
        </div>
      </div>

      <ul className={`container ${s.features}`} data-rest>
        {FEATURES.map((f) => (
          <li key={f.text}>
            <span className={s.featureIcon}>
              <Icon name={f.icon} size={18} />
            </span>
            {f.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
