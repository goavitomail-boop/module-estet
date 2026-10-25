"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { gsap, prefersReducedMotion, SplitText } from "./motion";

/**
 * Заголовок, строки которого выезжают из-под маски при появлении на экране.
 */
export function RevealText({
  as: Tag = "h2",
  children,
  className,
  id,
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let split: SplitText | null = null;
    const ctx = gsap.context(() => {
      split = SplitText.create(el, { type: "lines", mask: "lines", autoSplit: true, onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 110,
          rotate: 2,
          duration: 1.1,
          stagger: 0.1,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        }),
      });
    });
    return () => {
      ctx.revert();
      split?.revert();
    };
  }, []);

  return (
    <Tag ref={ref} className={className} id={id}>
      {children}
    </Tag>
  );
}
