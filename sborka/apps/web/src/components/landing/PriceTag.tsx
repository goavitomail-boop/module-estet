"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../motion";

/** Цена «перебирает» цифры, когда появляется на экране. */
export function PriceTag({ className }: { className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.to(el, {
        duration: 1.6,
        scrambleText: { text: "4 999 ₽", chars: "0123456789", speed: 0.4, revealDelay: 0.4 },
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    });
    return () => ctx.revert();
  }, []);
  return (
    <p ref={ref} className={className}>
      4 999 ₽
    </p>
  );
}
