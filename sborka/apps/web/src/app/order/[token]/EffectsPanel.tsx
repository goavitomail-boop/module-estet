"use client";

import { useEffect, useRef } from "react";
import { rub } from "@/lib/addons";
import {
  EFFECT_GROUPS,
  SCENE_CATS,
  SITE_GROUPS,
  type EffectGroup,
  type EffectOption,
  type SceneCat,
  type SiteEffects,
} from "@/lib/sites/effects";
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

/**
 * Живая миниатюра варианта: ролик грузится, только когда карточка показалась на экране,
 * и играет, пока она видна, — десятки карточек не тормозят панель.
 */
function Thumb({ src }: { src: string | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!video.src) video.src = src;
          video.play().catch(() => {});
        } else video.pause();
      },
      { rootMargin: "120px" },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [src]);
  if (!src) {
    return (
      <span className={e.thumbNone} aria-hidden="true">
        —
      </span>
    );
  }
  return <video ref={ref} className={e.thumbVideo} muted loop playsInline preload="none" aria-hidden="true" />;
}

/**
 * Анимации и эффекты: для всего сайта и для отдельных блоков. Каждый вариант — живая миниатюра
 * на всю карточку, все сняты на одном шаблоне; название и описание — при наведении. Выбор сразу виден на сайте слева;
 * 3D-графика добавляет в заказ дополнение.
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
          return (
            <button
              key={o.id}
              type="button"
              role={multi ? "checkbox" : "radio"}
              aria-checked={on}
              aria-label={`${o.title}. ${o.text}`}
              className={e.fxOption}
              disabled={busy !== null}
              onClick={() => {
                if (!multi && on) return;
                onChange(multi ? withDecor(effects, defaults, o.id) : withValue(effects, defaults, group, o.id), group);
              }}
            >
              <Thumb src={clipOf(group, o.id)} />
              {original && <em className={e.thumbTag}>как было</em>}
              {/* Название и описание проявляются при наведении; на телефоне название видно всегда */}
              <span className={e.fxInfo}>
                <b>{o.title}</b>
                <small>{o.text}</small>
              </span>
            </button>
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
                <h4 className={e.h4}>
                  3D-графика <span>+{rub(scenePrice)} за любую сцену</span>
                </h4>
                <p className={e.hint}>
                  Живые фоны, объекты и 3D в цветах вашего сайта. Выберите сцену — дополнение добавится в заказ, выберите обычный эффект —
                  уберётся.
                </p>
                {(Object.keys(SCENE_CATS) as SceneCat[]).map((cat) => (
                  <div key={cat} className={e.fxCat}>
                    <h5 id={`fx-${group}-${cat}`} className={e.h5}>
                      {SCENE_CATS[cat]}
                    </h5>
                    <div className={e.fxGrid} role="radiogroup" aria-labelledby={`fx-${group}-${cat}`}>
                      {scenes.filter((o) => o.cat === cat).map(card)}
                    </div>
                  </div>
                ))}
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
