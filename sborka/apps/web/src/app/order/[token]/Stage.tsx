"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import s from "./stage.module.css";

export type Device = "desktop" | "phone";

/** Сайт показываем в настоящую ширину ноутбука и телефона, а потом уменьшаем под окно. */
export const SITE_W = 1440;
export const PHONE_W = 390;
export const PHONE_H = 844;
const PAD = 16;

export interface Spotlight {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Окно с прототипом. iframe всегда в натуральном размере (1440 или 390 px),
 * поэтому на «Компьютере» клиент видит именно десктопную вёрстку, а не урезанную.
 */
export function Stage({
  src,
  title,
  device,
  frameRef,
  onLoad,
  onScale,
  spotlight,
  compact,
}: {
  src: string | null;
  title: string;
  device: Device;
  frameRef: RefObject<HTMLIFrameElement | null>;
  onLoad?: () => void;
  onScale?: (scale: number) => void;
  spotlight?: Spotlight | null;
  /** На узком экране окно ниже, чтобы под ним поместилась подпись экскурсии. */
  compact?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const phone = device === "phone";
  const availW = Math.max(0, size.w - PAD * 2);
  const availH = Math.max(0, size.h - PAD * 2);
  const scale = phone ? Math.min(1, availH / PHONE_H, availW / PHONE_W) : availW / SITE_W;
  const frameW = phone ? PHONE_W : SITE_W;
  const frameH = phone ? PHONE_H : scale > 0 ? availH / scale : 0;

  useEffect(() => {
    if (scale > 0) onScale?.(scale);
  }, [scale, onScale]);

  return (
    <div ref={box} className={s.stage} data-device={device} data-compact={compact || undefined}>
      {size.w > 0 && (
        <div className={s.screen} style={{ width: frameW * scale, height: frameH * scale }}>
          <iframe
            ref={frameRef}
            title={title}
            src={src ?? undefined}
            className={s.frame}
            style={{ width: frameW, height: frameH, transform: `scale(${scale})` }}
            onLoad={onLoad}
          />
          {spotlight && (
            <span
              className={s.spotlight}
              style={{ top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height }}
              aria-hidden="true"
            />
          )}
        </div>
      )}
    </div>
  );
}
