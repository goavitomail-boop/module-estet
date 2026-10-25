"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, prefersReducedMotion } from "../motion";
import s from "./Examples.module.css";

/**
 * На десктопе секция закрепляется, и вертикальная прокрутка двигает
 * карточки по горизонтали; карточки наклоняются от скорости.
 * На телефоне — обычная горизонтальная лента со свайпом.
 */
export function HorizontalGallery({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1100px)", () => {
      const track = el.querySelector<HTMLElement>("[data-gallery-track]")!;
      const bar = el.querySelector<HTMLElement>("[data-gallery-bar]");
      const cards = gsap.utils.toArray<HTMLElement>("[data-gallery-card]", el);
      el.classList.add(s.pinned);
      const distance = () => track.scrollWidth - window.innerWidth;
      const skew = gsap.quickTo(cards, "skewX", { duration: 0.5, ease: "power3" });
      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: el.closest("section"),
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            skew(gsap.utils.clamp(-6, 6, self.getVelocity() / -400));
            if (bar) gsap.set(bar, { scaleX: self.progress });
          },
          onScrubComplete: () => skew(0),
        },
      });
      // Внутри каждой карточки сайт слегка смещается — эффект глубины
      cards.forEach((card) => {
        const inner = card.querySelector("[data-parallax]");
        if (!inner) return;
        gsap.fromTo(
          inner,
          { xPercent: 4 },
          {
            xPercent: -4,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              containerAnimation: tween,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          },
        );
      });
      return () => el.classList.remove(s.pinned);
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={root} className={s.gallery}>
      {children}
      <div className={`container ${s.progress}`} aria-hidden="true">
        <i data-gallery-bar />
      </div>
    </div>
  );
}
