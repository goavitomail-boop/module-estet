"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../motion";

/** Горы из светящихся лаймовых линий для финального блока. */
export function LightMountains({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const reduced = prefersReducedMotion();
    let raf = 0;
    let visible = true;

    const ridge = (x: number, k: number, t: number) =>
      Math.sin(x * 2.1 + k * 0.6 + t * 0.15) * 0.18 +
      Math.sin(x * 5.3 - k * 0.9 + t * 0.1) * 0.08 +
      Math.sin(x * 11.7 + k * 1.7) * 0.03 +
      Math.exp(-Math.pow((x - 0.62) * 4, 2)) * 0.35 +
      Math.exp(-Math.pow((x - 0.18) * 5, 2)) * 0.2;

    const draw = (t: number) => {
      const w = c.width;
      const h = c.height;
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = "lighter";
      const lines = 26;
      for (let k = 0; k < lines; k++) {
        const depth = k / lines;
        // k = 0 — ближний хребет: ниже, ярче; дальние — выше и тусклее
        const base = h * (1.02 - depth * 0.55);
        const amp = h * (0.3 + depth * 0.28);
        g.beginPath();
        for (let i = 0; i <= 160; i++) {
          const x = i / 160;
          const y = base - ridge(x, k, t) * amp;
          if (i === 0) g.moveTo(x * w, y);
          else g.lineTo(x * w, y);
        }
        const glow = Math.max(0, 1 - depth * 1.3);
        g.strokeStyle = `rgba(200, 255, 61, ${0.08 + glow * 0.55})`;
        g.lineWidth = (k === 0 ? 2 : 1) * dpr;
        g.shadowColor = "rgba(200, 255, 61, 0.9)";
        g.shadowBlur = k < 3 ? 18 * dpr : 0;
        g.stroke();
      }
      g.shadowBlur = 0;
    };

    const resize = () => {
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
      if (reduced) draw(0);
    };
    const loop = (ms: number) => {
      draw(ms / 1000);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    resize();
    if (reduced) return () => ro.disconnect();
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    });
    io.observe(c);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
