"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { SiteSpec } from "@/lib/sites/schema";
import { SiteRenderer } from "@/sites/SiteRenderer";
import p from "./preview.module.css";

/**
 * Сайт клиента рядом с брифом: собирается заново, пока человек заполняет поля.
 * Рендерится в настоящую ширину (1280 или 390 px) и уменьшается под колонку;
 * focus — блоки, к которым подъехать на текущем шаге.
 */
export function LivePreview({
  spec,
  focus,
  loading,
  phone = false,
  title,
}: {
  spec: SiteSpec | null;
  focus: string[] | null;
  loading: boolean;
  phone?: boolean;
  title: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [offset, setOffset] = useState(0);
  const [flash, setFlash] = useState(0);
  const siteW = phone ? 390 : 1280;
  const scale = size.w ? size.w / siteW : 0;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Подсвечиваем рамку, когда сайт пересобрался
  useEffect(() => {
    if (spec) setFlash((n) => n + 1);
  }, [spec]);

  // Подъезжаем к блоку текущего шага
  useLayoutEffect(() => {
    const root = page.current;
    if (!root || !scale) return;
    const el = focus?.map((id) => root.querySelector<HTMLElement>(`#${id}`)).find(Boolean);
    const max = Math.max(0, root.offsetHeight - size.h / scale);
    const top = el ? (el.getBoundingClientRect().top - root.getBoundingClientRect().top) / scale - 40 : 0;
    setOffset(Math.max(0, Math.min(max, top)));
  }, [spec, focus, scale, size.h]);

  return (
    <div className={p.frame} data-phone={phone || undefined}>
      <div className={p.bar}>
        <i />
        <i />
        <i />
        <span>{title}</span>
        <em className={p.status} data-loading={loading || undefined}>
          {loading ? "Собираем…" : "Обновлено"}
        </em>
      </div>
      {/* Два одинаковых значения по очереди — чтобы анимация вспышки запускалась заново без перерисовки сайта */}
      <div ref={box} className={p.viewport} data-flash={flash > 1 ? (flash % 2 ? "a" : "b") : undefined} inert aria-hidden="true">
        {spec && scale > 0 ? (
          <div ref={page} className={p.page} style={{ width: siteW, transform: `scale(${scale}) translateY(${-offset}px)` }}>
            <SiteRenderer spec={spec} mode="example" motion={false} />
          </div>
        ) : (
          <div className={p.empty}>
            <b>Здесь появится ваш сайт</b>
            <span>Выберите сферу — и он начнёт собираться прямо по ходу брифа.</span>
          </div>
        )}
      </div>
    </div>
  );
}
