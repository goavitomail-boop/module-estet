"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion, SplitText } from "../motion";
import s from "./Manifesto.module.css";

/** Крупный текст, слова которого «загораются» по мере прокрутки. */
export function Manifesto() {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let split: SplitText | null = null;
    const ctx = gsap.context(() => {
      split = SplitText.create(el, {
        type: "words",
        autoSplit: true,
        onSplit: (self) =>
          gsap.fromTo(
            self.words,
            { opacity: 0.14 },
            {
              opacity: 1,
              stagger: 0.1,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 42%", scrub: true },
            },
          ),
      });
    });
    return () => {
      ctx.revert();
      split?.revert();
    };
  }, []);

  return (
    <section className={s.section} aria-label="Почему так">
      <div className="container">
        <p ref={ref} className={s.text}>
          Обычно сайт делают неделями и просят предоплату. Мы собираем его за минуты, показываем прототип — а платите
          вы, только если он понравился.
        </p>
      </div>
    </section>
  );
}
