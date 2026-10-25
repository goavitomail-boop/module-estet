"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { rub } from "@/lib/addons";
import { EFFECT_GROUPS, SITE_GROUPS, type EffectGroup, type EffectOption, type SiteEffects } from "@/lib/sites/effects";
import e from "./editor.module.css";

type Defaults = Required<SiteEffects>;

/** Что сейчас стоит в группе; «on»/«off» — у переключателей. */
function valueOf(effects: SiteEffects, defaults: Defaults, group: EffectGroup) {
  const v = effects[group] ?? defaults[group];
  return typeof v === "boolean" ? (v ? "on" : "off") : v;
}

/** Выбор совпал с задуманным для сферы — не храним его, чтобы сайт шёл за шаблоном. */
function withValue(effects: SiteEffects, defaults: Defaults, group: EffectGroup, id: string): SiteEffects {
  const next: Record<string, unknown> = { ...effects };
  const value = group === "cinema" || group === "highlight" ? id === "on" : id;
  if (value === defaults[group]) delete next[group];
  else next[group] = value;
  return next as SiteEffects;
}

function withDecor(effects: SiteEffects, defaults: Defaults, id: string): SiteEffects {
  const current = effects.decor ?? defaults.decor;
  const decor = (current.includes(id as never) ? current.filter((d) => d !== id) : [...current, id]) as Defaults["decor"];
  const same = decor.length === defaults.decor.length && decor.every((d) => defaults.decor.includes(d));
  const next = { ...effects };
  if (same) delete next.decor;
  else next.decor = decor;
  return next;
}

/** Ролик-пример варианта (записывает scripts/effect-previews.mjs); у «выключить» примера нет. */
const clipOf = (group: EffectGroup, id: string) => (id === "none" ? null : `/effects/${group}-${id}.mp4`);

/** rect — вариант, edge — левый край панели: окно встаёт левее неё, чтобы не закрывать другие варианты. */
type Peek = { src: string; title: string; rect: DOMRect; edge: number; touch: boolean };

const PEEK_W = 400;
const PEEK_H = 250 + 76;

/**
 * Окно с примером эффекта: на компьютере — сбоку от варианта, пока на него наведён курсор;
 * на телефоне — внизу экрана по кнопке «Пример», закрывается касанием.
 */
function PeekWindow({ peek, onClose }: { peek: Peek; onClose: () => void }) {
  const [ready, setReady] = useState(false);
  const { rect, edge, touch } = peek;
  let style: React.CSSProperties;
  if (touch) style = { left: 16, right: 16, bottom: 16 };
  else if (edge > PEEK_W + 32) {
    // Слева от панели, по высоте — напротив варианта
    style = {
      right: window.innerWidth - edge + 12,
      top: Math.max(12, Math.min(window.innerHeight - PEEK_H - 12, rect.top + rect.height / 2 - PEEK_H / 2)),
    };
  } else {
    // Узкий экран: над вариантом или под ним
    const above = rect.top > PEEK_H + 24;
    style = {
      left: Math.max(12, Math.min(window.innerWidth - PEEK_W - 12, rect.left)),
      top: above ? rect.top - PEEK_H - 10 : rect.bottom + 10,
    };
  }
  return createPortal(
    <>
      {touch && <div className={e.peekShade} onClick={onClose} aria-hidden="true" />}
      <figure className={e.peek} style={style} data-touch={touch || undefined} onClick={touch ? onClose : undefined}>
        <div className={e.peekMedia} data-ready={ready || undefined}>
          <video key={peek.src} src={peek.src} autoPlay muted loop playsInline onPlaying={() => setReady(true)} />
        </div>
        <figcaption>
          <b>{peek.title}</b>
          <span>Пример на демо-сайте — у вас будет в цветах и с фото вашего сайта</span>
        </figcaption>
      </figure>
    </>,
    document.body,
  );
}

/**
 * Анимации и эффекты: для всего сайта и для отдельных блоков. Выбор сразу виден
 * на сайте слева; 3D-сцена добавляет в заказ дополнение «3D-графика».
 * Наведите на вариант — всплывёт ролик с примером.
 */
export function EffectsPanel({
  effects,
  defaults,
  groups,
  focus,
  scenePrice,
  busy,
  onChange,
  onReplayIntro,
  onAll,
}: {
  effects: SiteEffects;
  defaults: Defaults;
  /** Группы блоков, которые есть на сайте. */
  groups: EffectGroup[];
  /** Открыли с кнопки «Эффект» на блоке — показываем только его. */
  focus?: EffectGroup;
  scenePrice: number;
  busy: string | null;
  onChange: (effects: SiteEffects, group: EffectGroup) => void;
  onReplayIntro: () => void;
  onAll: () => void;
}) {
  const list: EffectGroup[] = focus ? [focus] : [...SITE_GROUPS, ...groups];
  const changed = Object.keys(effects).some((k) => k !== "fx" || !effects.fx?.startsWith("scene-"));
  const [peek, setPeek] = useState<Peek | null>(null);
  const timer = useRef(0);
  // Панель листается — окно с примером остаётся у варианта, поэтому просто закрываем его
  useEffect(() => {
    if (!peek || peek.touch) return;
    const close = () => setPeek(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [peek]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = (el: HTMLElement, group: EffectGroup, id: string, title: string, touch: boolean) => {
    const src = clipOf(group, id);
    const edge = (el.closest("section") ?? el).getBoundingClientRect().left;
    if (src) setPeek({ src, title, rect: el.getBoundingClientRect(), edge, touch });
  };
  /** Курсор задержался на варианте — показываем пример; просто провели мимо — нет. */
  const hover = (el: HTMLElement, group: EffectGroup, id: string, title: string) => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => show(el, group, id, title, false), 180);
  };
  const unhover = () => {
    clearTimeout(timer.current);
    setPeek(null);
  };

  return (
    <>
      {focus && (
        <button type="button" className={e.back} onClick={onAll}>
          ← Все анимации и эффекты
        </button>
      )}
      {list.map((group) => {
        const info = EFFECT_GROUPS[group];
        const current = valueOf(effects, defaults, group);
        const base = valueOf({}, defaults, group);
        const multi = group === "decor";
        const card = (o: EffectOption) => {
          const on = multi ? (current as string[]).includes(o.id) : current === o.id;
          const original = multi ? (base as string[]).includes(o.id) : base === o.id;
          const clip = clipOf(group, o.id);
          return (
            <div key={o.id} className={e.fxCell}>
              <button
                type="button"
                role={multi ? "checkbox" : "radio"}
                aria-checked={on}
                className={e.fxOption}
                data-paid={o.paid || undefined}
                disabled={busy !== null}
                onPointerEnter={(ev) => ev.pointerType === "mouse" && hover(ev.currentTarget, group, o.id, o.title)}
                onPointerLeave={(ev) => ev.pointerType === "mouse" && unhover()}
                onFocus={(ev) => ev.currentTarget.matches(":focus-visible") && show(ev.currentTarget, group, o.id, o.title, false)}
                onBlur={unhover}
                onClick={() => {
                  if (!multi && on) return;
                  onChange(multi ? withDecor(effects, defaults, o.id) : withValue(effects, defaults, group, o.id), group);
                }}
              >
                <b>
                  {o.title}
                  {original && <em>как было</em>}
                </b>
                <small>{o.text}</small>
                {(o.paid || o.heavy) && (
                  <span className={e.fxTags}>
                    {o.paid && <i className={e.fxPaid}>3D</i>}
                    {o.heavy && !o.paid && <i>Тяжелее остальных</i>}
                  </span>
                )}
              </button>
              {clip && (
                // На телефоне наводить нечем — пример открывается кнопкой
                <button
                  type="button"
                  className={e.peekButton}
                  onClick={(ev) => show(ev.currentTarget.parentElement!, group, o.id, o.title, true)}
                >
                  ▶ Пример
                </button>
              )}
            </div>
          );
        };
        const plain = info.options.filter((o) => !o.paid);
        const scenes = info.options.filter((o) => o.paid);
        return (
          <section key={group} className={e.block} aria-labelledby={`fx-${group}`}>
            <h3 id={`fx-${group}`} className={e.h3}>
              {info.title}
            </h3>
            {info.lead && <p className={e.hint}>{info.lead}</p>}
            {group === "cursor" && <p className={e.hint}>В редакторе курсор обычный — свой появится, когда нажмёте «Готово».</p>}
            <div className={e.fxGrid} role={multi ? "group" : "radiogroup"} aria-labelledby={`fx-${group}`}>
              {plain.map(card)}
            </div>
            {scenes.length > 0 && (
              <div className={e.fxScenes}>
                <h4 id={`fx-${group}-3d`} className={e.h4}>
                  3D-графика <span>+{rub(scenePrice)} за любую сцену</span>
                </h4>
                <p className={e.hint}>
                  Объёмная сцена в цветах вашего сайта. Выберите сцену — дополнение добавится в заказ, выберите обычный эффект — уберётся.
                  На слабых телефонах сцена упрощается.
                </p>
                <div className={e.fxGrid} role="radiogroup" aria-labelledby={`fx-${group}-3d`}>
                  {scenes.map(card)}
                </div>
              </div>
            )}
            {group === "intro" && current !== "none" && (
              <button type="button" className={e.reset} onClick={onReplayIntro} disabled={busy !== null}>
                ▶ Показать заставку
              </button>
            )}
          </section>
        );
      })}
      {peek && <PeekWindow peek={peek} onClose={() => setPeek(null)} />}
      {!focus && changed && (
        <button
          type="button"
          className={e.reset}
          onClick={() => onChange(effects.fx?.startsWith("scene-") ? { fx: effects.fx } : {}, "fx")}
          disabled={busy !== null}
        >
          Вернуть анимации как было
        </button>
      )}
    </>
  );
}
