"use client";

import { useEffect, useRef, useState } from "react";
import type { SiteSpec } from "@/lib/sites/schema";
import { SiteRenderer } from "@/sites/SiteRenderer";
import s from "./Examples.module.css";

/** Живая уменьшенная копия сайта: рендерится шириной 1280px и масштабируется под карточку. */
export function SiteThumb({ spec }: { spec: SiteSpec }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1280));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={s.thumb} style={{ ["--scale" as string]: scale }} inert aria-hidden="true">
      <div className={s.scaler}>
        <SiteRenderer spec={spec} mode="example" motion={false} />
      </div>
    </div>
  );
}
