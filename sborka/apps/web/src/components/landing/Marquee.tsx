"use client";

import { Fragment, useEffect, useRef } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger } from "../motion";
import s from "./Marquee.module.css";

const TOP = ["Сайт за 24 часа", "4 999 ₽", "Оплата после просмотра", "3 правки бесплатно"];
const BOTTOM = ["Маникюр", "Ремонт", "Автосервис", "Психолог", "Кофейня", "Ваш бизнес"];

/** Две бегущие строки крест-накрест. Скорость и наклон зависят от скорости прокрутки. */
export function Marquee() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    let decay = () => {};
    const ctx = gsap.context(() => {
      const tracks = gsap.utils.toArray<HTMLElement>("[data-track]");
      const loops = tracks.map((t, i) =>
        gsap.fromTo(t, { xPercent: i === 0 ? 0 : -50 }, { xPercent: i === 0 ? -50 : 0, duration: 36, ease: "none", repeat: -1 }),
      );
      const skew = gsap.quickTo(tracks, "skewX", { duration: 0.4, ease: "power3" });
      let dir = 1;
      let lastUpdate = 0;
      let skewed = false;
      ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          const v = self.getVelocity();
          dir = self.direction;
          // Разгон от прокрутки; в покое скорость возвращается к обычной (см. decay)
          const boost = dir * (1 + Math.min(Math.abs(v) / 250, 8));
          loops.forEach((l) => l.timeScale(boost));
          skew(gsap.utils.clamp(-12, 12, v / -180));
          lastUpdate = performance.now();
          skewed = true;
        },
        onToggle: (self) => loops.forEach((l) => (self.isActive ? l.play() : l.pause())),
      });
      decay = () => {
        if (skewed && performance.now() - lastUpdate > 120) {
          skewed = false;
          skew(0);
        }
        loops.forEach((l) => {
          const ts = l.timeScale();
          if (Math.abs(ts - dir) > 0.01) l.timeScale(ts + (dir - ts) * 0.06);
        });
      };
      gsap.ticker.add(decay);
    }, el);
    return () => {
      gsap.ticker.remove(decay);
      ctx.revert();
    };
  }, []);

  return (
    <section ref={root} className={s.section} aria-label="Коротко о главном">
      <div className={`${s.band} ${s.lime}`}>
        <div className={s.track} data-track>
          {[0, 1].map((k) => (
            <Fragment key={k}>
              {TOP.map((t) => (
                <span key={`${k}${t}`} className={s.item} aria-hidden={k === 1 || undefined}>
                  {t}
                  <i className={s.sep} />
                </span>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
      <div className={`${s.band} ${s.outline}`} aria-hidden="true">
        <div className={s.track} data-track>
          {[0, 1].map((k) => (
            <Fragment key={k}>
              {BOTTOM.map((t) => (
                <span key={`${k}${t}`} className={s.item}>
                  {t}
                  <i className={s.sep} />
                </span>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
