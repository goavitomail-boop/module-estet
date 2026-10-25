"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../motion";

/** Волна из лаймовых частиц — «ИИ думает». */
export function WaveCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduced = prefersReducedMotion();
    let raf = 0;
    let visible = true;
    const resize = () => {
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
    };
    const draw = (t: number) => {
      const w = c.width;
      const h = c.height;
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = "lighter";
      const cols = 90;
      for (let layer = 0; layer < 5; layer++) {
        for (let i = 0; i < cols; i++) {
          const x = (i / (cols - 1)) * w;
          const u = i / cols;
          const env = Math.sin(u * Math.PI);
          const y =
            h / 2 +
            Math.sin(u * 9 + t * 1.6 + layer * 0.7) * h * 0.22 * env +
            Math.sin(u * 23 - t * 2.1 + layer) * h * 0.06 * env +
            (layer - 2) * h * 0.04 * env;
          const a = (0.25 + 0.75 * env) * (1 - layer * 0.15);
          g.fillStyle = `rgba(200, 255, 61, ${a})`;
          g.beginPath();
          g.arc(x, y, (0.6 + env * 1.1) * dpr, 0, Math.PI * 2);
          g.fill();
        }
      }
    };
    const loop = (ms: number) => {
      draw(ms / 1000);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw(0);
    });
    ro.observe(c);
    resize();
    if (reduced) {
      draw(0);
      return () => ro.disconnect();
    }
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
