'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowRight, Check, Clock3, Home, RotateCcw, Smartphone, Sparkles, Users, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import './vizkit-intro.css'

/**
 * Вступительный ролик визуализатора: за 12 секунд показывает клиенту,
 * как это работает и зачем ему. Четыре сцены — каталог, фото, нейросеть,
 * польза — на одной шкале времени в vizkit-intro.css.
 */

/** Время слоя: задержка, длительность и откуда/куда он двигается */
const at = (d: number, t?: number, from?: string, to?: string, hold?: string) =>
  ({
    '--d': `${d}s`,
    ...(t !== undefined && { '--t': `${t}s` }),
    ...(from && { '--from': from }),
    ...(to && { '--to': to }),
    ...(hold && { '--hold': hold }),
  }) as CSSProperties

const SCENES = [
  { d: 0, t: 3.3 },
  { d: 3.3, t: 3.1 },
  { d: 6.4, t: 4.4 },
  { d: 10.8, t: 1.2 },
]

const captions = [
  { step: '01 · Каталог', title: 'Соберите мебель из нашего каталога', text: 'Коллекция, цвет фасадов, столешница и ручки — те же, что у нас на производстве.' },
  { step: '02 · Фото', title: 'Сфотографируйте своё помещение', text: 'Пустую комнату или старую кухню — её заменим. Достаточно телефона.' },
  { step: '03 · Нейросеть', title: 'ИИ примеряет мебель в вашу комнату', text: 'Сохраняет стены, окна и свет — меняет только мебель, по выбранным образцам.' },
  { step: '04 · Результат', title: 'Увидите кухню до покупки', text: 'Сравните «было» и «станет», покажите семье и приходите на замер уже с решением.' },
]

const benefits: Array<{ icon: typeof Wallet; text: string; place: string }> = [
  { icon: Wallet, text: 'Бесплатно', place: 'left-[4%] top-[15%]' },
  { icon: Clock3, text: 'Около минуты', place: 'right-[4%] top-[15%]' },
  { icon: Home, text: 'Без выезда и ожидания', place: 'left-[4%] bottom-[24%]' },
  { icon: Sparkles, text: 'Видно, как впишется', place: 'right-[4%] bottom-[24%]' },
  { icon: Users, text: 'Можно показать семье', place: 'left-1/2 bottom-[6%] -translate-x-1/2' },
]

const SWATCHES = ['white', 'cashmere', 'grey-stone', 'anthracite', 'oak-kasella-natural', 'oak-craft-gold']

function Layer({ className, style, children }: { className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div className={cn('absolute', className)} style={style} aria-hidden="true">
      {children}
    </div>
  )
}

export function VizKitIntro({ onStart }: { onStart: () => void }) {
  // Новый ключ — ролик начинается сначала
  const [run, setRun] = useState(0)

  return (
    <section data-own-motion aria-labelledby="vzi-title" className="bg-foreground pt-16 text-background md:pt-20">
      <div key={run} className="vzi relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl flex-col justify-start gap-6 px-4 pb-10 pt-12 sm:justify-center sm:gap-8 sm:py-10 md:min-h-[calc(100dvh-5rem)] md:px-8 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:items-center lg:gap-14">
        <button
          type="button"
          onClick={onStart}
          className="vzi-skip absolute right-4 top-2 z-20 md:top-4 rounded-full border border-background/25 px-4 py-1.5 text-xs font-semibold text-background/80 transition-colors hover:border-primary hover:text-primary md:right-8"
          style={at(0, 11)}
        >
          Пропустить
        </button>

        {/* ── Подписи сцен. На телефоне — под сценой, чтобы анимация была на первом экране ── */}
        <div className="order-2 flex flex-col lg:order-none">
          <p className="vzi-in text-[11px] font-bold uppercase tracking-[0.26em] text-primary md:text-xs" style={at(0)}>
            Визуализатор «Модуль Эстет»
          </p>
          <h1 id="vzi-title" className="sr-only">
            Как работает визуализатор мебели
          </h1>
          <div className="relative mt-4 min-h-[11.5rem] sm:min-h-[13rem] md:min-h-[19rem]">
            {captions.map((c, i) => {
              const last = i === captions.length - 1
              const scene = SCENES[i]
              return (
                <div
                  key={c.step}
                  className={cn('absolute inset-x-0 top-0', last ? 'vzi-in' : 'vzi-inout')}
                  style={last ? at(scene.d + 0.1, 0.8, 'translateY(18px)') : at(scene.d + 0.1, scene.t, 'translateY(18px)', 'translateY(-14px)')}
                >
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-background/50">{c.step}</p>
                  <p className="flyer-title mt-3 text-balance text-4xl leading-[1.05] md:text-6xl">{c.title}</p>
                  <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-background/65 md:text-base">{c.text}</p>
                </div>
              )
            })}
          </div>

          <ul className="mt-4 flex flex-wrap gap-2 sm:hidden" aria-label="Чем полезно">
            {benefits.map((b, i) => (
              <li
                key={b.text}
                className="vzi-pop flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-semibold"
                style={at(10.9 + i * 0.12)}
              >
                <b.icon className="size-3.5 text-primary" aria-hidden="true" />
                {b.text}
              </li>
            ))}
          </ul>

          {/* Прогресс по сценам */}
          <div className="mt-6 flex gap-1.5" aria-hidden="true">
            {SCENES.map((s, i) => (
              <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-background/15">
                <span className="vzi-progress block h-full bg-primary" style={at(s.d, s.t)} />
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="relative inline-flex">
              <span className="vzi-pulse pointer-events-none absolute inset-0 rounded-full bg-primary" style={at(11.8)} aria-hidden="true" />
              <button
                type="button"
                onClick={onStart}
                className="relative inline-flex min-h-14 items-center gap-3 rounded-full bg-primary pl-7 pr-2 font-bold text-primary-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                Собрать свою кухню
                <span className="flex size-10 items-center justify-center rounded-full bg-foreground/15">
                  <ArrowRight className="size-5" aria-hidden="true" />
                </span>
              </button>
            </span>
            <button
              type="button"
              onClick={() => setRun((r) => r + 1)}
              className="vzi-in inline-flex min-h-12 items-center gap-2 rounded-full border border-background/25 px-5 text-sm font-semibold text-background/80 transition-colors hover:border-primary hover:text-primary"
              style={at(11.4, 0.6, 'none')}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Смотреть ещё раз
            </button>
          </div>
        </div>

        {/* ── Сцена ── */}
        <div className="relative order-1 aspect-[4/3] w-full overflow-hidden rounded-3xl border border-primary/30 lg:order-none bg-[#161412] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]">
          <span
            className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(var(--primary)_1px,transparent_1px),linear-gradient(90deg,var(--primary)_1px,transparent_1px)] [background-size:40px_40px]"
            aria-hidden="true"
          />

          {/* Сцена 1: веер коллекций и образцы цветов */}
          {[
            ['/catalog/collections/touch-hero.webp', 'rotate(-10deg) translateX(-34%)', 0.2],
            ['/catalog/collections/velvet-hero.webp', 'rotate(10deg) translateX(34%)', 0.34],
            ['/catalog/collections/soft-wood-hero.webp', 'none', 0.48],
          ].map(([src, pose, d]) => (
            <Layer key={src as string} className="left-1/2 top-[8%] w-[44%] -translate-x-1/2">
              <div style={{ transform: pose as string }}>
                <div
                  className="vzi-inout aspect-[4/5] overflow-hidden rounded-2xl border border-background/15 shadow-2xl"
                  style={at(d as number, 3.3 - (d as number), 'translateY(70px) scale(0.85)', 'translateY(-30px) scale(0.9)')}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src as string} alt="" className="size-full object-cover" />
                </div>
              </div>
            </Layer>
          ))}
          <Layer className="bottom-[7%] left-1/2 flex -translate-x-1/2 gap-2 md:gap-3">
            {SWATCHES.map((name, i) => (
              <div
                key={name}
                className="vzi-inout size-9 overflow-hidden rounded-lg border-2 border-background/80 shadow-lg md:size-12"
                style={at(1 + i * 0.1, 2.3 - i * 0.1, 'translateY(-40px) rotate(-12deg)', 'translateY(10px)')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/catalog/facades/soft-wood/${name}.webp`} alt="" className="size-full object-cover" />
              </div>
            ))}
          </Layer>

          {/* Сцена 2: телефон, вспышка, снимок старой кухни */}
          <Layer className="left-1/2 top-1/2 w-[30%] -translate-x-1/2 -translate-y-1/2">
            <div
              className="vzi-inout relative aspect-[9/18] overflow-hidden rounded-[1.6rem] border-[5px] border-[#0d0c0b] bg-[#0d0c0b] shadow-2xl"
              style={at(3.3, 3.1, 'translateY(90px)', 'scale(1.6)')}
            >
              <span className="absolute left-1/2 top-1.5 z-10 h-1.5 w-10 -translate-x-1/2 rounded-full bg-black" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vizkit/sample-old-kitchen.webp" alt="" className="vzi-in absolute inset-0 size-full object-cover" style={at(3.9, 0.5, 'scale(1.08)')} />
              <span className="vzi-flash absolute inset-0 bg-white" style={at(4.35)} />
              <span className="absolute bottom-3 left-1/2 size-9 -translate-x-1/2 rounded-full border-[3px] border-white/90 bg-white/30" />
            </div>
          </Layer>
          <Layer className="left-[62%] top-[18%]">
            <div
              className="vzi-inout flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-xl md:text-sm"
              style={at(4.6, 1.8, 'scale(0.6)', 'scale(0.9)')}
            >
              <Smartphone className="size-4 text-primary" aria-hidden="true" />
              Снимите всю стену
            </div>
          </Layer>

          {/* Сцена 3: фото на весь кадр, сканирование, разметка и шторка «стало» */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/vizkit/sample-old-kitchen.webp" alt="" aria-hidden="true" className="vzi-in absolute inset-0 size-full object-cover" style={at(6.2, 0.9, 'scale(0.4)')} />
          <Layer
            className="vzi-inout inset-0 [background-image:linear-gradient(rgba(216,191,138,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(216,191,138,0.35)_1px,transparent_1px)] [background-size:56px_56px]"
            style={at(6.9, 2.4, 'none', 'none')}
          />
          <Layer className="vzi-scan inset-0" style={at(7)}>
            <span className="absolute inset-x-0 top-0 h-0.5 bg-[#ffe3ad] shadow-[0_0_24px_8px_rgba(216,191,138,0.7)]" />
            <span className="absolute inset-x-0 bottom-full h-24 bg-gradient-to-t from-[rgba(216,191,138,0.28)] to-transparent" />
          </Layer>
          {[
            ['Стена', 'left-[8%] top-[10%] h-[52%] w-[36%]', 7.5],
            ['Окно', 'right-[10%] top-[12%] h-[34%] w-[22%]', 7.8],
            ['Пол', 'bottom-[6%] left-[8%] h-[16%] w-[84%]', 8.1],
          ].map(([label, place, d]) => (
            <Layer key={label as string} className={place as string}>
              <div className="vzi-inout relative size-full rounded-md border-2 border-primary bg-primary/10" style={at(d as number, 9.3 - (d as number), 'scale(0.92)', 'none')}>
                <span className="absolute -top-3 left-2 rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground md:text-xs">{label}</span>
              </div>
            </Layer>
          ))}
          <div className="vzi-wipe absolute inset-0 overflow-hidden" aria-hidden="true" style={at(9.2)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/catalog/collections/soft-wood-1.webp" alt="" className="vzi-wipe-img absolute inset-0 size-full object-cover" style={at(9.2)} />
          </div>
          <Layer className="vzi-edge inset-y-0 left-0 w-full" style={at(9.2)}>
            <span className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-background shadow-[0_0_16px_rgba(255,236,205,0.8)]" />
          </Layer>
          <Layer className="left-3 top-3">
            <span className="vzi-in block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground" style={at(10.5, 0.5, 'translateY(-8px)')}>Станет</span>
          </Layer>
          <Layer className="right-3 top-3">
            <span className="vzi-in block rounded-full bg-foreground/75 px-3 py-1 text-xs font-semibold text-background" style={at(10.5, 0.5, 'translateY(-8px)')}>Было</span>
          </Layer>

          {/* Сцена 4: польза для клиента */}
          {benefits.map((b, i) => (
            <Layer key={b.text} className={cn('max-sm:hidden', b.place)}>
              <div
                className="vzi-pop flex items-center gap-2 whitespace-nowrap rounded-full border border-primary/40 bg-foreground/85 px-3 py-1.5 text-xs font-semibold text-background shadow-xl md:px-4 md:py-2 md:text-sm"
                style={at(10.9 + i * 0.18)}
              >
                <b.icon className="size-4 text-primary" aria-hidden="true" />
                {b.text}
              </div>
            </Layer>
          ))}
          <Layer className="left-1/2 top-[40%] -translate-x-1/2">
            <div className="vzi-pop flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_0_8px_rgba(216,191,138,0.25)] md:size-16" style={at(10.75)}>
              <Check className="size-7" aria-hidden="true" />
            </div>
          </Layer>
        </div>
      </div>
    </section>
  )
}
