"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import s from "./interactive.module.css";

/**
 * Шлейф из фото за курсором в первом экране (как у портфолио фотографов).
 * Фото появляются через каждые ~90 px пути мыши и тают через секунду.
 */
export function ImageTrail({ images }: { images: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    const area = layer?.closest("section");
    if (!layer || !area || images.length === 0) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lastX = 0;
    let lastY = 0;
    let n = 0;
    const move = (e: PointerEvent) => {
      const r = area.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (Math.hypot(x - lastX, y - lastY) < 90) return;
      lastX = x;
      lastY = y;
      const img = document.createElement("img");
      img.src = images[n++ % images.length];
      img.alt = "";
      img.className = s.trailImg;
      img.style.left = `${x}px`;
      img.style.top = `${y}px`;
      img.style.rotate = `${(Math.random() - 0.5) * 16}deg`;
      layer.append(img);
      window.setTimeout(() => img.remove(), 1400);
    };
    area.addEventListener("pointermove", move);
    return () => area.removeEventListener("pointermove", move);
  }, [images]);

  return <div ref={ref} className={s.trail} aria-hidden="true" />;
}

/** Просмотр фото во весь экран: клик по фото в галерее с data-full, стрелки и Esc. */
export function Lightbox() {
  const ref = useRef<HTMLSpanElement>(null);
  const [list, setList] = useState<Array<{ src: string; caption: string }>>([]);
  const [index, setIndex] = useState<number | null>(null);

  const close = useCallback(() => {
    setIndex(null);
    document.documentElement.style.overflow = "";
  }, []);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>("[data-site]");
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const item = (e.target as Element | null)?.closest<HTMLElement>("[data-full]");
      if (!item || !root.contains(item)) return;
      e.preventDefault();
      const all = Array.from(root.querySelectorAll<HTMLElement>("[data-full]"));
      setList(all.map((el) => ({ src: el.dataset.full ?? "", caption: el.dataset.caption ?? "" })));
      setIndex(all.indexOf(item));
      document.documentElement.style.overflow = "hidden";
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setIndex((i) => (i === null ? i : (i + 1) % list.length));
      if (e.key === "ArrowLeft") setIndex((i) => (i === null ? i : (i - 1 + list.length) % list.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, list.length, close]);

  const item = index === null ? null : list[index];
  return (
    <>
      <span ref={ref} hidden />
      {item && (
        <div className={s.lightbox} role="dialog" aria-modal="true" aria-label="Просмотр фото">
          <button type="button" className={s.lbBackdrop} onClick={close} aria-label="Закрыть" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={item.src} src={item.src} alt={item.caption} className={s.lbImg} />
          <p className={s.lbCaption}>
            <span>
              {String((index ?? 0) + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}
            </span>
            {item.caption}
          </p>
          <button type="button" className={`${s.lbNav} ${s.lbPrev}`} onClick={() => setIndex(((index ?? 0) - 1 + list.length) % list.length)} aria-label="Предыдущее фото">
            ←
          </button>
          <button type="button" className={`${s.lbNav} ${s.lbNext}`} onClick={() => setIndex(((index ?? 0) + 1) % list.length)} aria-label="Следующее фото">
            →
          </button>
          <button type="button" className={s.lbClose} onClick={close} aria-label="Закрыть">
            ✕
          </button>
        </div>
      )}
    </>
  );
}

/** Отзывы по одному: крупная цитата, стрелки и автопрокрутка. */
export function ReviewsSlider({ items }: { items: Array<{ name: string; meta: string; text: string }> }) {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (hold || items.length < 2) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % items.length), 6000);
    return () => window.clearInterval(id);
  }, [hold, items.length]);

  const r = items[i];
  return (
    <div className={s.slider} onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      <blockquote key={i} className={s.sliderQuote}>
        <p>{r.text}</p>
        <footer>
          <b>{r.name}</b>
          {r.meta && <span>{r.meta}</span>}
        </footer>
      </blockquote>
      <div className={s.sliderNav}>
        <button type="button" onClick={() => setI((i - 1 + items.length) % items.length)} aria-label="Предыдущий отзыв">
          ←
        </button>
        <span className={s.sliderDots}>
          {items.map((_, k) => (
            <button key={k} type="button" aria-label={`Отзыв ${k + 1}`} aria-pressed={k === i} onClick={() => setI(k)} />
          ))}
        </span>
        <button type="button" onClick={() => setI((i + 1) % items.length)} aria-label="Следующий отзыв">
          →
        </button>
      </div>
    </div>
  );
}
