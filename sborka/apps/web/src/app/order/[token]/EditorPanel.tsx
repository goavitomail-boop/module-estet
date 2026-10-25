"use client";

import { useRef, useState } from "react";
import type { EffectGroup, SiteEffects } from "@/lib/sites/effects";
import { ACCENTS, DISPLAY_FONTS, HERO_LAYOUTS, RADII, type DisplayFont, type HeroLayoutId, type Radius, type SiteStyle } from "@/lib/sites/style";
import { EffectsPanel } from "./EffectsPanel";
import { ServicesEditor, type SaveEdit } from "./EditTab";
import e from "./editor.module.css";

export type EditorContext =
  | { kind: "design" }
  | { kind: "effects"; group?: EffectGroup; block?: string }
  | { kind: "photo"; path: string; src: string }
  | { kind: "service"; name: string };

export interface EffectsData {
  /** Что стоит на сайте сейчас. */
  current: SiteEffects;
  /** Как задумано для сферы, без выбора клиента. */
  defaults: Required<SiteEffects>;
  /** Группы блоков, которые есть на сайте. */
  groups: EffectGroup[];
  scenePrice: number;
}

/**
 * Панель режима «Редактировать на сайте»: подсказки, «Отменить», оформление,
 * анимации и эффекты, выбор фото и список услуг — смотря на что нажали на сайте.
 */
export function EditorPanel({
  context,
  setContext,
  style,
  defaults,
  library,
  uploads,
  services,
  effects,
  canUndo,
  busy,
  onStyle,
  onEffects,
  onReplayIntro,
  onPhoto,
  onUpload,
  onUndo,
  onDone,
  onSave,
}: {
  context: EditorContext;
  setContext: (c: EditorContext) => void;
  style: SiteStyle;
  /** Как в теме, без правок: акцент, шрифт и композиция. */
  defaults: { accent: string; font: string; layout: string };
  library: string[];
  uploads: string[];
  services: { name: string; price: string }[];
  effects: EffectsData;
  canUndo: boolean;
  busy: string | null;
  onStyle: (style: SiteStyle) => void;
  onEffects: (effects: SiteEffects, group: EffectGroup, block?: string) => void;
  onReplayIntro: () => void;
  onPhoto: (path: string, src: string) => void;
  onUpload: (file: File) => Promise<string | null>;
  onUndo: () => void;
  onDone: () => void;
  onSave: SaveEdit;
}) {
  return (
    <div className={e.panel}>
      <section className={e.intro} aria-labelledby="editor-title">
        <div className={e.introHead}>
          <h2 id="editor-title" className={e.h2}>
            Редактор
          </h2>
          <div className={e.introActions}>
            <button type="button" className="btn btn-secondary btn-small" onClick={onUndo} disabled={!canUndo || busy !== null}>
              ↶ Отменить
            </button>
            <button type="button" className="btn btn-primary btn-small" onClick={onDone}>
              Готово
            </button>
          </div>
        </div>
        <ul className={e.tips}>
          <li>
            <b>Текст</b> — нажмите на любой заголовок или абзац и пишите прямо на сайте. Enter — сохранить, Esc — отменить.
          </li>
          <li>
            <b>Фото</b> — нажмите на фото, чтобы выбрать другое или загрузить своё.
          </li>
          <li>
            <b>Блоки</b> — наведите на блок: стрелки меняют порядок, «Скрыть» убирает его, «Эффект» — вид и анимация.
          </li>
        </ul>
      </section>

      {(context.kind === "design" || context.kind === "effects") && (
        <div className={e.modes} role="tablist" aria-label="Что настраиваем">
          <button type="button" role="tab" aria-selected={context.kind === "design"} onClick={() => setContext({ kind: "design" })}>
            Оформление
          </button>
          <button type="button" role="tab" aria-selected={context.kind === "effects"} onClick={() => setContext({ kind: "effects" })}>
            Анимации и эффекты
          </button>
        </div>
      )}

      {context.kind === "effects" && (
        <EffectsPanel
          key={context.group ?? "all"}
          effects={effects.current}
          defaults={effects.defaults}
          groups={effects.groups}
          focus={context.group}
          scenePrice={effects.scenePrice}
          busy={busy}
          onChange={(next, group) => onEffects(next, group, context.block)}
          onReplayIntro={onReplayIntro}
          onAll={() => setContext({ kind: "effects" })}
        />
      )}

      {context.kind === "photo" && (
        <PhotoPicker
          key={context.path}
          current={context.src}
          library={library}
          uploads={uploads}
          busy={busy}
          onPick={(src) => onPhoto(context.path, src)}
          onUpload={onUpload}
          onBack={() => setContext({ kind: "design" })}
        />
      )}

      {context.kind === "service" && (
        <div className={e.block}>
          <button type="button" className={e.back} onClick={() => setContext({ kind: "design" })}>
            ← К оформлению
          </button>
          <ServicesEditor key={context.name} initial={services} onSave={onSave} busy={busy} focus={context.name} />
        </div>
      )}

      {context.kind === "design" && <Design style={style} defaults={defaults} busy={busy} onStyle={onStyle} />}
    </div>
  );
}

function Design({ style, defaults, busy, onStyle }: { style: SiteStyle; defaults: { accent: string; font: string; layout: string }; busy: string | null; onStyle: (s: SiteStyle) => void }) {
  const set = (patch: Partial<SiteStyle>) => onStyle({ ...style, ...patch });
  const accent = style.accent ?? defaults.accent;
  const customAccent = style.accent && !ACCENTS.includes(style.accent);
  return (
    <>
      <section className={e.block} aria-labelledby="accent-title">
        <h3 id="accent-title" className={e.h3}>
          Главный цвет
        </h3>
        <p className={e.hint}>Кнопки, выделенные слова и акценты.</p>
        <div className={e.swatches} role="radiogroup" aria-label="Главный цвет">
          <button type="button" role="radio" aria-checked={!style.accent} className={e.swatch} style={{ background: defaults.accent }} onClick={() => set({ accent: undefined })} disabled={busy !== null} title="Как было">
            <span className="visually-hidden">Как было</span>
          </button>
          {ACCENTS.filter((c) => c.toLowerCase() !== defaults.accent.toLowerCase()).map((c) => (
            <button key={c} type="button" role="radio" aria-checked={style.accent === c} className={e.swatch} style={{ background: c }} onClick={() => set({ accent: c })} disabled={busy !== null} title={c}>
              <span className="visually-hidden">{c}</span>
            </button>
          ))}
          <label className={`${e.swatch} ${e.picker}`} data-on={customAccent || undefined} title="Свой цвет">
            <input type="color" value={accent} onChange={(ev) => set({ accent: ev.target.value })} aria-label="Свой цвет" />
          </label>
        </div>
      </section>

      <section className={e.block} aria-labelledby="font-title">
        <h3 id="font-title" className={e.h3}>
          Шрифт заголовков
        </h3>
        <div className={e.fonts} role="radiogroup" aria-label="Шрифт заголовков">
          <button type="button" role="radio" aria-checked={!style.display} className={e.font} onClick={() => set({ display: undefined })} disabled={busy !== null}>
            <em style={{ fontFamily: defaults.font }}>Аа</em>
            <span>Как было</span>
          </button>
          {(Object.keys(DISPLAY_FONTS) as DisplayFont[]).map((id) => {
            const f = DISPLAY_FONTS[id];
            return (
              <button key={id} type="button" role="radio" aria-checked={style.display === id} className={e.font} onClick={() => set({ display: id })} disabled={busy !== null}>
                <em style={{ fontFamily: f.css, fontWeight: f.weight }}>Аа</em>
                <span>
                  {f.title}
                  <small>{f.mood}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={e.block} aria-labelledby="radius-title">
        <h3 id="radius-title" className={e.h3}>
          Кнопки
        </h3>
        <div className={e.radii} role="radiogroup" aria-label="Форма кнопок">
          {(Object.keys(RADII) as Radius[]).map((id) => (
            <button key={id} type="button" role="radio" aria-checked={(style.radius ?? null) === id} className={e.radius} onClick={() => set({ radius: style.radius === id ? undefined : id })} disabled={busy !== null}>
              <i style={{ borderRadius: RADII[id].value, background: accent }} />
              {RADII[id].title}
            </button>
          ))}
        </div>
      </section>

      <section className={e.block} aria-labelledby="hero-title">
        <h3 id="hero-title" className={e.h3}>
          Первый экран
        </h3>
        <p className={e.hint}>Сейчас: {defaults.layout}</p>
        <div className={e.layouts} role="radiogroup" aria-label="Первый экран">
          {(Object.keys(HERO_LAYOUTS) as HeroLayoutId[]).map((id) => (
            <button key={id} type="button" role="radio" aria-checked={style.hero === id} className={e.layout} data-layout={id} onClick={() => set({ hero: style.hero === id ? undefined : id })} disabled={busy !== null}>
              <span className={e.thumb} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {HERO_LAYOUTS[id]}
            </button>
          ))}
        </div>
      </section>

      {(style.accent || style.display || style.radius || style.hero) && (
        <button type="button" className={e.reset} onClick={() => onStyle({})} disabled={busy !== null}>
          Вернуть оформление как было
        </button>
      )}
    </>
  );
}

function PhotoPicker({
  current,
  library,
  uploads,
  busy,
  onPick,
  onUpload,
  onBack,
}: {
  current: string;
  library: string[];
  uploads: string[];
  busy: string | null;
  onPick: (src: string) => void;
  onUpload: (file: File) => Promise<string | null>;
  onBack: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const own = new Set(uploads);
  return (
    <section className={e.block} aria-labelledby="photo-title">
      <button type="button" className={e.back} onClick={onBack}>
        ← К оформлению
      </button>
      <h3 id="photo-title" className={e.h3}>
        Фото
      </h3>
      <p className={e.hint}>Загрузите своё — мы уменьшим и сожмём его, чтобы сайт открывался быстро. Или выберите из библиотеки.</p>
      <div className={e.photoTop}>
        {current && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="Сейчас на сайте" className={e.current} />
        )}
        <div className={e.photoActions}>
          <button type="button" className="btn btn-primary btn-small" onClick={() => input.current?.click()} disabled={uploading || busy !== null}>
            {uploading ? "Загружаем…" : "Загрузить своё фото"}
          </button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={async (ev) => {
              const file = ev.target.files?.[0];
              ev.target.value = "";
              if (!file) return;
              setUploading(true);
              const url = await onUpload(file);
              setUploading(false);
              if (url) onPick(url);
            }}
          />
          <button type="button" className={e.reset} onClick={() => onPick("")} disabled={busy !== null}>
            Вернуть как было
          </button>
        </div>
      </div>
      <ul className={e.library} aria-label="Библиотека фото">
        {library.map((src) => (
          <li key={src}>
            <button type="button" aria-pressed={src === current} onClick={() => onPick(src)} disabled={busy !== null} aria-label={own.has(src) ? "Ваше фото" : "Фото из библиотеки"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
              {own.has(src) && <span>ваше</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
