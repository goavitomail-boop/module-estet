"use client";

import { useEffect, useRef } from "react";
import { gsap, isFinePointer, prefersReducedMotion } from "./motion";
import s from "./Cursor.module.css";

/**
 * Курсор: точка и кольцо с запаздыванием. Над ссылками кольцо растёт,
 * над элементами с data-cursor показывает подпись.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isFinePointer() || prefersReducedMotion() || !dot.current || !ring.current) return;
    const html = document.documentElement;
    html.classList.add("has-cursor");

    const dx = gsap.quickTo(dot.current, "x", { duration: 0.08, ease: "power3" });
    const dy = gsap.quickTo(dot.current, "y", { duration: 0.08, ease: "power3" });
    const rx = gsap.quickTo(ring.current, "x", { duration: 0.45, ease: "power3" });
    const ry = gsap.quickTo(ring.current, "y", { duration: 0.45, ease: "power3" });

    const onMove = (e: PointerEvent) => {
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
      html.classList.add("cursor-visible");
    };
    const onOver = (e: Event) => {
      const target = (e.target as Element).closest("a, button, summary, label, [data-cursor]");
      const text = target?.getAttribute("data-cursor") ?? "";
      ring.current!.dataset.state = text ? "label" : target ? "hover" : "";
      label.current!.textContent = text;
    };
    const onDown = () => ring.current!.classList.add(s.down);
    const onUp = () => ring.current!.classList.remove(s.down);
    const onLeave = () => html.classList.remove("cursor-visible");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    html.addEventListener("pointerleave", onLeave);
    return () => {
      html.classList.remove("has-cursor", "cursor-visible");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      html.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className={s.cursor} aria-hidden="true">
      <div ref={ring} className={s.ring}>
        <span ref={label} className={s.label} />
      </div>
      <div ref={dot} className={s.dot} />
    </div>
  );
}
