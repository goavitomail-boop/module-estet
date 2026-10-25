"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { TourStep } from "@/lib/sites/presentation";
import type { Device, Spotlight } from "./Stage";
import t from "./tour.module.css";

/**
 * Экскурсия по прототипу: листает сайт в iframe к нужному блоку, обводит его рамкой,
 * открывает окно записи и показывает версию для телефона. Последний шаг — оплата.
 */
export function Tour({
  steps,
  frameRef,
  scale,
  baseDevice,
  setDevice,
  onSpotlight,
  onClose,
  final,
}: {
  steps: TourStep[];
  frameRef: RefObject<HTMLIFrameElement | null>;
  scale: number;
  baseDevice: Device;
  setDevice: (d: Device) => void;
  onSpotlight: (s: Spotlight | null) => void;
  onClose: () => void;
  /** Кнопки последнего шага: оплата, другой вариант, правки. */
  final: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const last = index === steps.length - 1;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const go = useCallback((i: number) => setIndex(Math.max(0, Math.min(steps.length - 1, i))), [steps.length]);

  // Листаем сайт и обводим блок текущего шага
  useEffect(() => {
    const frame = frameRef.current;
    const win = frame?.contentWindow;
    const doc = frame?.contentDocument;
    if (!win || !doc) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf = 0;
    let target: HTMLElement | null = null;

    // Окно записи с прошлого шага закрываем
    win.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    onSpotlight(null);
    const device = step.action === "phone" || (step.action === "final" && index > 0 && steps[index - 1].action === "phone") ? "phone" : baseDevice;
    setDevice(device);

    const measure = () => {
      if (!target) return onSpotlight(null);
      const r = target.getBoundingClientRect();
      const vh = win.innerHeight;
      const top = Math.max(0, r.top);
      const bottom = Math.min(vh, r.bottom);
      if (bottom - top < 60) return onSpotlight(null);
      const k = scaleRef.current;
      const inset = 6;
      onSpotlight({
        top: top * k + inset,
        left: Math.max(0, r.left) * k + inset,
        width: Math.min(r.width, win.innerWidth) * k - inset * 2,
        height: (bottom - top) * k - inset * 2,
      });
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    // После смены устройства вёрстка перестраивается — даём ей время
    timers.push(
      setTimeout(() => {
        target = step.anchor ? doc.getElementById(step.anchor) : null;
        const top = target ? target.getBoundingClientRect().top + win.scrollY - 24 : 0;
        win.scrollTo({ top, behavior: "smooth" });
        if (step.action === "booking") {
          timers.push(setTimeout(() => doc.querySelector<HTMLElement>('[data-open="booking"]')?.click(), 600));
        }
        if (target) {
          win.addEventListener("scroll", onScroll, { passive: true });
          timers.push(setTimeout(measure, 900), setTimeout(measure, 1600));
        }
      }, device === "phone" ? 450 : 50),
    );

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      win.removeEventListener("scroll", onScroll);
    };
  }, [index, step, steps, frameRef, baseDevice, setDevice, onSpotlight]);

  // Рамку пересчитываем, если окно кабинета поменяло размер
  useEffect(() => {
    onSpotlight(null);
  }, [scale, onSpotlight]);

  // Стрелки листают шаги, Esc закрывает
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, onClose]);

  // Закрыли экскурсию — убираем рамку и окно записи
  useEffect(
    () => () => {
      onSpotlight(null);
      frameRef.current?.contentWindow?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    },
    [frameRef, onSpotlight],
  );

  return (
    <section className={t.tour} aria-labelledby="tour-title" data-final={last || undefined}>
      <div className={t.top}>
        <span className={t.count}>
          {index + 1} / {steps.length}
        </span>
        <div className={t.bars} aria-hidden="true">
          {steps.map((st, i) => (
            <button
              key={st.title}
              type="button"
              tabIndex={-1}
              data-state={i < index ? "done" : i === index ? "current" : "next"}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <button type="button" className={t.close} onClick={onClose} aria-label="Закрыть экскурсию">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div aria-live="polite" key={index} className={t.body}>
        <h2 id="tour-title" className={t.title}>
          {step.title}
        </h2>
        <p className={t.text}>{step.text}</p>
      </div>
      {last ? (
        <div className={t.final}>{final}</div>
      ) : (
        <div className={t.actions}>
          {index > 0 && (
            <button type="button" className="btn btn-secondary btn-small" onClick={() => go(index - 1)}>
              Назад
            </button>
          )}
          <button type="button" className="btn btn-primary btn-small" onClick={() => go(index + 1)}>
            Дальше
          </button>
        </div>
      )}
    </section>
  );
}
