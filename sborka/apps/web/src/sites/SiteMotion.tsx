"use client";

import { useEffect, useRef } from "react";
import s from "./site.module.css";

/**
 * Анимации клиентского сайта. Разметка и стили готовы на сервере, здесь только:
 * — отмечаем блоки, попавшие в экран (data-in), а CSS проигрывает их появление;
 * — параллакс фото (data-px — сила сдвига);
 * — счётчики в блоке цифр (data-countup);
 * — фото услуги рядом с курсором в прайсе (data-img);
 * — шапка поверх фото становится плотной после прокрутки (data-scrolled);
 * — прогресс закреплённых секций (data-progress, data-hscroll) и проявление текста (data-hl) в --p;
 * — свой курсор, «магнитные» кнопки (data-magnetic) и наклон фото за курсором (data-tilt).
 * При prefers-reduced-motion всё показывается сразу, без движения.
 */
export function SiteMotion() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>("[data-site]");
    if (!root) return;
    const reveal = Array.from(root.querySelectorAll<HTMLElement>("[data-r]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      reveal.forEach((el) => el.setAttribute("data-in", ""));
      return;
    }
    const cleanups: Array<() => void> = [];

    // Появление блоков
    const counters = new Map<Element, () => void>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-in", "");
          entry.target.querySelectorAll("[data-countup]").forEach((el) => counters.get(el)?.());
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    reveal.forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    // Счётчики: число растёт от нуля, единицы измерения остаются как есть
    root.querySelectorAll<HTMLElement>("[data-countup]").forEach((el) => {
      const value = el.dataset.countup ?? "";
      const m = value.match(/^(\D*?)(\d{1,3}(?:[\s ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(.*)$/);
      if (!m) return;
      const [, prefix, num, suffix] = m;
      const decimals = num.match(/[.,](\d+)$/)?.[1].length ?? 0;
      const target = parseFloat(num.replace(/[\s ]/g, "").replace(",", "."));
      const grouped = /\s| /.test(num);
      const comma = num.includes(",");
      const format = (n: number) => {
        let out = n.toFixed(decimals);
        if (comma) out = out.replace(".", ",");
        if (grouped) out = out.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        return prefix + out + suffix;
      };
      if (el.getBoundingClientRect().top > window.innerHeight) el.textContent = format(0);
      counters.set(el, () => {
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / 1600);
          el.textContent = format(target * (1 - Math.pow(2, -10 * t)));
          if (t < 1) requestAnimationFrame(tick);
          else el.textContent = value;
        };
        requestAnimationFrame(tick);
      });
    });

    // Параллакс и плотная шапка
    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-px]"));
    // Закреплённые секции: --p от 0 до 1, пока секция прокручивается под закреплённым содержимым
    const pinned = Array.from(root.querySelectorAll<HTMLElement>("[data-progress], [data-hscroll]"));
    // Текст, который проявляется по словам по мере прокрутки
    const highlights = Array.from(root.querySelectorAll<HTMLElement>("[data-hl]"));
    const wide = window.matchMedia("(min-width: 961px)");

    // Горизонтальная галерея: насколько сдвинуть ленту, чтобы показать последнее фото
    const measure = () => {
      root.querySelectorAll<HTMLElement>("[data-hscroll]").forEach((section) => {
        const track = section.querySelector<HTMLElement>("ul");
        if (!track || !wide.matches) {
          section.removeAttribute("data-hready");
          return;
        }
        const shift = Math.max(0, track.scrollWidth - window.innerWidth);
        section.style.setProperty("--shift", `${shift}px`);
        section.toggleAttribute("data-hready", shift > 0);
      });
    };
    measure();

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const visible = (r: DOMRect) => r.bottom > -100 && r.top < vh + 100;
      for (const el of layers) {
        const r = el.getBoundingClientRect();
        if (!visible(r)) continue;
        const progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        el.style.setProperty("--py", `${(-progress * Number(el.dataset.px) * r.height).toFixed(1)}px`);
      }
      for (const el of pinned) {
        const r = el.getBoundingClientRect();
        if (!visible(r)) continue;
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
        el.style.setProperty("--p", p.toFixed(4));
      }
      for (const el of highlights) {
        const r = el.getBoundingClientRect();
        if (!visible(r)) continue;
        const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.45)));
        el.style.setProperty("--p", p.toFixed(4));
      }
      root.toggleAttribute("data-scrolled", window.scrollY > 40);
      // Плавающая кнопка записи — после первого экрана
      root.toggleAttribute("data-deep", window.scrollY > vh * 0.8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // Фото в ленте догружаются лениво — пересчитываем ширину, когда они загрузятся
    root.querySelectorAll<HTMLImageElement>("[data-hscroll] img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", onResize, { once: true });
    });
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    });

    // Фото услуги у курсора — только для мыши
    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-img]"));
    if (rows.length && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const float = document.createElement("div");
      float.className = s.hoverImg;
      float.setAttribute("aria-hidden", "true");
      const img = document.createElement("img");
      img.alt = "";
      float.append(img);
      root.append(float);
      let x = 0;
      let y = 0;
      let cx = 0;
      let cy = 0;
      let raf = 0;
      const follow = () => {
        cx += (x - cx) * 0.18;
        cy += (y - cy) * 0.18;
        float.style.translate = `${cx}px ${cy}px`;
        float.style.rotate = `${Math.max(-8, Math.min(8, (x - cx) * 0.08))}deg`;
        raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.5 ? requestAnimationFrame(follow) : 0;
      };
      const move = (e: MouseEvent) => {
        x = e.clientX + 24;
        y = e.clientY - 90;
        if (!raf) raf = requestAnimationFrame(follow);
      };
      rows.forEach((row) => {
        const enter = (e: MouseEvent) => {
          img.src = row.dataset.img ?? "";
          if (!float.hasAttribute("data-on")) {
            cx = x = e.clientX + 24;
            cy = y = e.clientY - 90;
          }
          float.setAttribute("data-on", "");
        };
        const leave = () => float.removeAttribute("data-on");
        row.addEventListener("mouseenter", enter);
        row.addEventListener("mousemove", move);
        row.addEventListener("mouseleave", leave);
        cleanups.push(() => {
          row.removeEventListener("mouseenter", enter);
          row.removeEventListener("mousemove", move);
          row.removeEventListener("mouseleave", leave);
        });
      });
      cleanups.push(() => {
        cancelAnimationFrame(raf);
        float.remove();
      });
    }

    // Свой курсор, наклон фото и «магнитные» кнопки — только для мыши
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (fine && root.dataset.cursor !== "none") {
      const ring = document.createElement("div");
      ring.className = s.cursor;
      ring.setAttribute("aria-hidden", "true");
      root.append(ring);
      let tx = -100;
      let ty = -100;
      let rx = -100;
      let ry = -100;
      let raf = 0;
      const loop = () => {
        rx += (tx - rx) * 0.2;
        ry += (ty - ry) * 0.2;
        ring.style.translate = `${rx}px ${ry}px`;
        raf = Math.abs(tx - rx) + Math.abs(ty - ry) > 0.3 ? requestAnimationFrame(loop) : 0;
      };
      const move = (e: PointerEvent) => {
        tx = e.clientX;
        ty = e.clientY;
        ring.setAttribute("data-on", "");
        const target = e.target as Element | null;
        const view = target?.closest("[data-view], [data-hscroll] li, [data-img]");
        const link = target?.closest("a, button, summary, input, textarea");
        ring.toggleAttribute("data-view", Boolean(view));
        ring.toggleAttribute("data-link", Boolean(link) && !view);
        if (!raf) raf = requestAnimationFrame(loop);
      };
      const leave = () => ring.removeAttribute("data-on");
      root.addEventListener("pointermove", move);
      root.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        root.removeEventListener("pointermove", move);
        root.removeEventListener("pointerleave", leave);
        cancelAnimationFrame(raf);
        ring.remove();
      });
    }

    if (fine) {
      // Фото первого экрана слегка поворачивается вслед за курсором
      root.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => {
        const area = el.closest("section") ?? el;
        const tilt = (e: Event) => {
          const { clientX, clientY } = e as PointerEvent;
          const r = area.getBoundingClientRect();
          const nx = (clientX - r.left) / r.width - 0.5;
          const ny = (clientY - r.top) / r.height - 0.5;
          el.style.setProperty("--ry", `${(nx * 7).toFixed(2)}deg`);
          el.style.setProperty("--rx", `${(-ny * 6).toFixed(2)}deg`);
        };
        const reset = () => {
          el.style.removeProperty("--ry");
          el.style.removeProperty("--rx");
        };
        area.addEventListener("pointermove", tilt);
        area.addEventListener("pointerleave", reset);
        cleanups.push(() => {
          area.removeEventListener("pointermove", tilt);
          area.removeEventListener("pointerleave", reset);
        });
      });

      root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((btn) => {
        const pull = (e: PointerEvent) => {
          const r = btn.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          btn.style.translate = `${dx * 0.22}px ${dy * 0.32}px`;
        };
        const release = () => {
          btn.style.translate = "";
        };
        btn.addEventListener("pointermove", pull);
        btn.addEventListener("pointerleave", release);
        cleanups.push(() => {
          btn.removeEventListener("pointermove", pull);
          btn.removeEventListener("pointerleave", release);
        });
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return <span ref={ref} hidden />;
}
