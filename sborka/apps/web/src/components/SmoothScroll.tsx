"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { gsap, prefersReducedMotion, ScrollTrigger } from "./motion";

/** Плавный скролл Lenis, синхронизированный с GSAP ScrollTrigger. */
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ anchors: { offset: -80 }, lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
  return null;
}
