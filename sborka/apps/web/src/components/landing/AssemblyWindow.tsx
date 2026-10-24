"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { SiteSpec } from "@/lib/sites/schema";
import { getTheme } from "@/lib/sites/themes";
import { MoodArt } from "@/sites/MoodArt";
import { BrowserFrame } from "../BrowserFrame";
import { gsap, prefersReducedMotion } from "../motion";
import s from "./AssemblyWindow.module.css";

export interface AssemblyItem {
  label: string;
  prompt: string;
  address: string;
  spec: SiteSpec;
}

/**
 * Главный момент страницы: по брифу из фиолетового каркаса
 * собирается настоящий сайт выбранной ниши.
 */
export function AssemblyWindow({ items }: { items: AssemblyItem[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [assembled, setAssembled] = useState(false);
  const paused = useRef(false);
  const pendingAdvance = useRef(false);
  const item = items[active];

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    const mock = el.querySelector<HTMLElement>(`[data-mock="${active}"]`)!;
    const prompt = el.querySelector<HTMLElement>("[data-prompt]")!;

    const ctx = gsap.context(() => {
      gsap.set(el.querySelectorAll("[data-mock]"), { autoAlpha: 0 });
      gsap.set(mock, { autoAlpha: 1 });
      const skels = mock.querySelectorAll("[data-skel]");
      const fills = mock.querySelectorAll("[data-fill]");
      const bg = mock.querySelector("[data-bg]");

      if (reduced) {
        prompt.textContent = item.prompt;
        gsap.set(skels, { opacity: 0 });
        gsap.set(fills, { opacity: 1, clipPath: "inset(0 0% 0 0)" });
        gsap.set(bg, { opacity: 1 });
        setAssembled(true);
        return;
      }

      setAssembled(false);
      gsap.set(skels, { opacity: 0, scaleX: 0.4, transformOrigin: "left center" });
      gsap.set(fills, { opacity: 0, clipPath: "inset(0 100% 0 0)" });
      gsap.set(bg, { opacity: 0 });
      const typed = { n: 0 };
      prompt.textContent = "";

      gsap
        .timeline({
          onComplete: () => {
            if (paused.current) pendingAdvance.current = true;
            else setActive((i) => (i + 1) % items.length);
          },
        })
        .to(typed, {
          n: item.prompt.length,
          duration: item.prompt.length * 0.028,
          ease: "none",
          onUpdate: () => {
            prompt.textContent = item.prompt.slice(0, Math.round(typed.n));
          },
        })
        .to(skels, { opacity: 1, scaleX: 1, duration: 0.7, stagger: 0.07, ease: "expo.out" }, "+=0.15")
        .to(bg, { opacity: 1, duration: 0.8, ease: "power2.inOut" }, "+=0.2")
        .to(skels, { opacity: 0, duration: 0.5, stagger: 0.16, ease: "power2.out" }, "<0.2")
        .to(fills, { opacity: 1, clipPath: "inset(0 0% 0 0)", duration: 0.8, stagger: 0.16, ease: "expo.out" }, "<")
        .call(() => setAssembled(true))
        .to({}, { duration: 2.8 })
        .to(mock, { autoAlpha: 0, duration: 0.4, ease: "power1.in" });
    }, el);

    return () => ctx.revert();
  }, [active, item.prompt, items.length]);

  const pause = () => (paused.current = true);
  const resume = () => {
    paused.current = false;
    if (pendingAdvance.current) {
      pendingAdvance.current = false;
      setActive((i) => (i + 1) % items.length);
    }
  };

  return (
    <div ref={root} className={s.root} onPointerEnter={pause} onPointerLeave={resume} onFocus={pause} onBlur={resume}>
      <BrowserFrame address={item.address} className={s.frame}>
        <div className={s.grid} aria-hidden="true" />
        {items.map((it, i) => (
          <Mock key={it.spec.niche} index={i} spec={it.spec} />
        ))}
      </BrowserFrame>

      <div className={s.prompt}>
        <span className={s.promptLabel}>Бриф</span>
        <p>
          <span data-prompt>{item.prompt}</span>
          <span className={s.caret} aria-hidden="true" />
        </p>
      </div>

      <div className={`${s.status} ${assembled ? s.done : ""}`} aria-live="polite">
        {assembled ? "Собрано" : "Собираем"}
      </div>

      <div className={s.tabs} role="group" aria-label="Пример ниши">
        {items.map((it, i) => (
          <button
            key={it.spec.niche}
            type="button"
            aria-pressed={i === active}
            className={s.tab}
            onClick={() => setActive(i)}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Mock({ spec, index }: { spec: SiteSpec; index: number }) {
  return <SiteMock spec={spec} index={index} />;
}

/**
 * Уменьшенный макет сайта. В режиме assembled — сразу собранный, без каркаса.
 */
export function SiteMock({ spec, index, assembled = false }: { spec: SiteSpec; index?: number; assembled?: boolean }) {
  const t = getTheme(spec.themeId);
  const vars = {
    "--s-bg": t.bg,
    "--s-surface": t.surface,
    "--s-text": t.text,
    "--s-muted": t.muted,
    "--s-accent": t.accent,
    "--s-accent-text": t.accentText,
    "--s-line": t.line,
    "--s-display": t.display,
    "--s-display-weight": t.displayWeight,
    "--s-body": t.body,
    "--s-radius": t.radius,
  } as CSSProperties;

  return (
    <div className={`${s.mock} ${assembled ? s.assembled : ""}`} style={vars} data-mock={index} aria-hidden="true">
      <div className={s.mockBg} data-bg />
      <Block className={s.mNav}>
        <span className={s.mBrand}>{spec.business.name}</span>
        <span className={s.mPhone}>{spec.contacts.phone}</span>
      </Block>
      <div className={s.mHero}>
        <div className={s.mHeroText}>
          <Block className={s.mTitle}>{spec.hero.title}</Block>
          <Block className={s.mSub}>{spec.hero.subtitle}</Block>
          <Block className={s.mBtnWrap}>
            <span className={s.mBtn}>{spec.hero.cta}</span>
          </Block>
        </div>
        <Block className={s.mArt}>
          <MoodArt niche={spec.niche} />
        </Block>
      </div>
      <Block className={s.mList}>
        {spec.services.items.slice(0, 3).map((it, i) => (
          <span key={i} className={s.mRow}>
            <span>{it.name}</span>
            <b>{it.price}</b>
          </span>
        ))}
      </Block>
    </div>
  );
}

function Block({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <div className={`${s.block} ${className}`}>
      <span className={s.skel} data-skel />
      <div className={s.fill} data-fill>
        {children}
      </div>
    </div>
  );
}
