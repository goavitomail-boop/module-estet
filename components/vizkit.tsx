'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ImagePlus, RefreshCw, Sparkles, Upload, Wand2 } from 'lucide-react'
import { collections as kitchenCollections, handles, bracketHandles, neoclassicalHandles, profileHandles, materials } from '@/lib/pdf-catalog-data'
import { wardrobeCollections } from '@/lib/wardrobes-data'
import { BookingPlanButton } from '@/components/footer-actions'
import { PlanLabel } from '@/components/plan'
import { cn } from '@/lib/utils'

/**
 * Визуализатор — демо для показа идеи (/vizkit, на сайте не опубликован).
 *
 * Клиент собирает кухню или шкаф из настоящего каталога, загружает фото
 * помещения, а сервис отдаёт модели редактирования изображений фото
 * и референсы выбранных фасадов, ручек и столешницы вместе с жёстким
 * промтом. Генерация пока не подключена: вместо результата показывается
 * фото выбранной коллекции, а промт и референсы — ровно те, что ушли бы
 * в модель. Фото клиента никуда не отправляется и живёт только в браузере.
 */

type Product = 'kitchen' | 'wardrobe'
type Option = { id: string; name: string; image?: string; swatch?: string; meta?: string; en?: string }

type Selection = {
  product: Product | null
  collection: string | null
  color: string | null
  extra: string | null // столешница для кухни, витрина для шкафа
  handle: string | null
  layout: string | null
  photoMode: 'empty' | 'replace'
}

const EMPTY: Selection = { product: null, collection: null, color: null, extra: null, handle: null, layout: null, photoMode: 'replace' }

/* ── Данные каталога в виде вариантов ответа ─────────────────────────── */

const kitchenOptions = kitchenCollections.map((c) => ({
  id: c.id,
  name: c.title,
  image: c.hero,
  meta: c.eyebrow,
  colors: (c.items ?? []).map((item, i) => ({ id: `${c.id}-${i}`, name: item.name, image: item.image })),
}))

const wardrobeOptions = wardrobeCollections.map((c) => ({
  id: c.id,
  name: c.title,
  image: c.hero,
  meta: `Серия ${c.series} · ${c.tagline}`,
  series: c.series,
  colors: c.colors.map((item, i) => ({ id: `${c.id}-${i}`, name: item.name, image: item.image })),
}))

const countertops: Option[] = (materials.find((m) => m.id === 'slotex')?.items ?? []).map((item, i) => ({
  id: `slotex-${i}`,
  name: item.name,
  meta: item.meta,
  image: item.image,
}))

const vitrines: Option[] = [
  { id: 'none', name: 'Без витрины', meta: 'Сплошные фасады', en: 'no glass display sections' },
  { id: 'clear', name: 'Стекло прозрачное', meta: 'Чёрная алюминиевая рамка', swatch: 'linear-gradient(135deg,#dfe6e8,#9fb0b5)', en: 'one glass display section with black aluminium frame and clear glass, warm LED inside' },
  { id: 'graphite', name: 'Стекло графит', meta: 'Чёрная алюминиевая рамка', swatch: 'linear-gradient(135deg,#59595c,#2a2a2d)', en: 'one glass display section with black aluminium frame and graphite tinted glass, warm LED inside' },
  { id: 'bronze', name: 'Стекло бронза', meta: 'Рамка латунь', swatch: 'linear-gradient(135deg,#a3815a,#5c4630)', en: 'one glass display section with brass aluminium frame and bronze tinted glass, warm LED inside' },
]

const lineProfiles: Option[] = [
  { id: 'line-black', name: 'Без ручек — профиль чёрный', image: '/catalog/facades/frame/black.webp', meta: 'Серия LINE', en: 'handle-less fronts with a matte black aluminium LINE profile' },
  { id: 'line-silver', name: 'Без ручек — профиль серебро', image: '/catalog/facades/frame/silver.webp', meta: 'Серия LINE', en: 'handle-less fronts with a brushed aluminium LINE profile' },
  { id: 'line-brass', name: 'Без ручек — профиль латунь', image: '/catalog/facades/frame/brass.webp', meta: 'Серия LINE', en: 'handle-less fronts with a matte brass LINE profile' },
  { id: 'line-white', name: 'Без ручек — профиль белый', image: '/catalog/facades/frame/white.webp', meta: 'Серия LINE', en: 'handle-less fronts with a white LINE profile' },
]

const kitchenHandles: Option[] = [
  ...lineProfiles,
  ...[handles[2], handles[1], ...bracketHandles, profileHandles[1], neoclassicalHandles[0], neoclassicalHandles[2]].map((h, i) => ({
    id: `kh-${i}`,
    name: h.name,
    meta: h.meta,
    image: h.image,
  })),
]

const wardrobeHandles: Option[] = [
  { id: 'rick-black', name: 'Рик — чёрный матовый', meta: 'Длинная ручка 864 мм', swatch: '#151515', en: 'long vertical bar handles "Rick", matte black, 864 mm' },
  { id: 'rick-gold', name: 'Рик — сатиновое золото', meta: 'Длинная ручка 864 мм', swatch: 'linear-gradient(135deg,#d8bf8a,#8d7445)', en: 'long vertical bar handles "Rick", brushed satin gold, 864 mm' },
  { id: 'dellon-brown', name: 'Деллон — коричневый', meta: 'Ручка 480 мм', swatch: '#5b4330', en: 'vertical bar handles "Dellon", brushed brown, 480 mm' },
  { id: 'kontur-gold', name: 'Контур — сатиновое золото', meta: 'Ручка 512 мм', swatch: 'linear-gradient(135deg,#d8bf8a,#8d7445)', en: 'slim contour handles, satin gold, 512 mm' },
  { id: 'pop-black', name: 'Поп — кнопка чёрная', meta: 'Ручка-кнопка ⌀ 20 мм', swatch: '#151515', en: 'small round knobs "Pop", matte black, 20 mm' },
  { id: 'pop-gold', name: 'Поп — кнопка золото', meta: 'Ручка-кнопка ⌀ 20 мм', swatch: 'linear-gradient(135deg,#d8bf8a,#8d7445)', en: 'small round knobs "Pop", satin gold, 20 mm' },
]

const layouts: Record<Product, Option[]> = {
  kitchen: [
    { id: 'straight', name: 'Прямая', meta: 'Вдоль одной стены', en: 'a straight kitchen along the main wall' },
    { id: 'corner', name: 'Угловая', meta: 'Г-образная', en: 'an L-shaped corner kitchen along the main and the adjacent wall' },
    { id: 'u', name: 'П-образная', meta: 'По трём стенам', en: 'a U-shaped kitchen along three walls' },
    { id: 'island', name: 'С островом', meta: 'Ряд и остров', en: 'a straight kitchen run with a separate island in front of it' },
  ],
  wardrobe: [
    { id: 'wall', name: 'Вдоль стены', meta: 'Распашной шкаф', en: 'a hinged-door wardrobe along the main wall' },
    { id: 'ceiling', name: 'До потолка', meta: 'С антресолями', en: 'a floor-to-ceiling wardrobe with mezzanine cabinets on top' },
    { id: 'niche', name: 'Встроенный в нишу', meta: 'От стены до стены', en: 'a built-in wardrobe filling the niche wall to wall' },
    { id: 'corner', name: 'Угловой', meta: 'По двум стенам', en: 'an L-shaped corner wardrobe along two walls' },
  ],
}

/* ── Шаги ───────────────────────────────────────────────────────────── */

const STEP_NAMES = ['Что рисуем', 'Коллекция', 'Цвет фасадов', 'Детали', 'Ручки', 'Планировка', 'Фото помещения'] as const
const GENERATION_STAGES = ['Анализируем помещение', 'Находим стены, окна и пол', 'Примеряем фасады и ручки', 'Рисуем свет и тени']

function Choice({ option, selected, onClick, wide = false }: { option: Option; selected: boolean; onClick: () => void; wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 bg-background text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        selected ? 'border-primary' : 'border-border hover:border-primary/60',
      )}
    >
      {(option.image || option.swatch) && (
        <span className={cn('relative block w-full overflow-hidden bg-muted', wide ? 'aspect-[16/10]' : 'aspect-square')}>
          {option.image ? (
            // Картинки каталога разного происхождения (свои и из хранилища) —
            // обычный img проще, чем подгонять под next/image
            // eslint-disable-next-line @next/next/no-img-element
            <img src={option.image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <span className="block size-full" style={{ background: option.swatch }} />
          )}
          {selected && (
            <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
              <Check className="size-4" aria-hidden="true" />
            </span>
          )}
        </span>
      )}
      <span className="flex flex-1 flex-col gap-0.5 p-3">
        <span className="text-sm font-semibold leading-snug">{option.name}</span>
        {option.meta && <span className="text-xs leading-snug text-muted-foreground">{option.meta}</span>}
      </span>
    </button>
  )
}

function Grid({ children, cols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' }: { children: ReactNode; cols?: string }) {
  return <div className={cn('grid gap-3', cols)}>{children}</div>
}

/** До/после: ползунок поверх двух снимков */
function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50)
  return (
    <div className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-2xl bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt="Визуализация" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="Ваше помещение" className="absolute inset-0 size-full object-cover" />
      </div>
      <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-background shadow-[0_0_12px_rgba(0,0,0,0.4)]" style={{ left: `${pos}%` }} />
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-foreground/70 px-3 py-1 text-xs font-semibold text-background">Было</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Станет</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Сравнить было и станет"
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  )
}

export function VizKit() {
  const [sel, setSel] = useState<Selection>(EMPTY)
  const [step, setStep] = useState(0)
  const [photo, setPhoto] = useState<string | null>(null)
  const [phase, setPhase] = useState<'config' | 'generating' | 'result'>('config')
  const [stage, setStage] = useState(0)
  const [variant, setVariant] = useState(0)
  const [showPrompt, setShowPrompt] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => () => { if (photo?.startsWith('blob:')) URL.revokeObjectURL(photo) }, [photo])

  const isKitchen = sel.product === 'kitchen'
  const collectionList = isKitchen ? kitchenOptions : wardrobeOptions
  const collection = collectionList.find((c) => c.id === sel.collection)
  const color = collection?.colors.find((c) => c.id === sel.color)
  const lineSeries = !isKitchen && (collection as (typeof wardrobeOptions)[number] | undefined)?.series === 'LINE'
  const extraOptions = isKitchen ? countertops : vitrines
  const handleOptions = isKitchen ? kitchenHandles : lineSeries ? lineProfiles : wardrobeHandles
  const extra = extraOptions.find((o) => o.id === sel.extra)
  const handle = handleOptions.find((o) => o.id === sel.handle)
  const layout = sel.product ? layouts[sel.product].find((o) => o.id === sel.layout) : undefined

  const set = (patch: Partial<Selection>, advance = true) => {
    setSel((current) => ({ ...current, ...patch }))
    if (advance) {
      const t = setTimeout(() => setStep((s) => Math.min(s + 1, STEP_NAMES.length - 1)), 260)
      timers.current.push(t)
    }
  }

  const ready = [Boolean(sel.product), Boolean(sel.collection), Boolean(sel.color), Boolean(sel.extra), Boolean(sel.handle), Boolean(sel.layout), Boolean(photo)]

  const addPhoto = (files: FileList | null) => {
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setPhoto(URL.createObjectURL(file))
  }

  const generate = () => {
    setPhase('generating')
    setStage(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    GENERATION_STAGES.forEach((_, i) => {
      timers.current.push(setTimeout(() => setStage(i), i * 1100))
    })
    timers.current.push(setTimeout(() => setPhase('result'), GENERATION_STAGES.length * 1100 + 400))
  }

  /** Референсы в том порядке, в каком их видит модель */
  const references = useMemo(() => {
    const list: Array<{ n: number; label: string; image?: string; swatch?: string }> = []
    if (photo) list.push({ n: 1, label: 'Фото помещения клиента', image: photo })
    if (color) list.push({ n: list.length + 1, label: `Фасад: ${color.name}`, image: color.image })
    if (handle && (handle.image || handle.swatch)) list.push({ n: list.length + 1, label: `Ручки: ${handle.name}`, image: handle.image, swatch: handle.swatch })
    if (isKitchen && extra) list.push({ n: list.length + 1, label: `Столешница: ${extra.name}`, image: extra.image })
    if (collection) list.push({ n: list.length + 1, label: `Стиль коллекции ${collection.name}`, image: collection.image })
    return list
  }, [photo, color, handle, extra, collection, isKitchen])

  const prompt = useMemo(() => {
    if (!sel.product || !collection || !color || !handle || !layout) return ''
    const ref = (label: string) => references.find((r) => r.label.startsWith(label))?.n
    const what = isKitchen ? 'kitchen' : 'wardrobe'
    const lines = [
      `TASK: Photorealistic interior photo edit. Image 1 is the customer's real room.`,
      sel.photoMode === 'replace'
        ? `Remove the existing ${what} furniture visible in image 1 and install a new modular ${what} in the same place.`
        : `Install a new modular ${what} into the empty room in image 1.`,
      '',
      'KEEP EXACTLY AS IN IMAGE 1: walls, windows, doors, floor, ceiling, radiators, pipes and sockets, camera position, lens, perspective, lighting direction and colour temperature. Do not change the size or shape of the room.',
      '',
      'NEW FURNITURE:',
      `- Layout: ${layout.en}.`,
      `- Collection "${collection.name}" by Modul Estet (${collection.meta}).`,
      `- Fronts: exactly the colour, texture and finish of image ${ref('Фасад')} ("${color.name}"). All fronts identical unless stated.`,
      `- Handles: ${handle.en ?? `${handle.name}, exactly as in image ${ref('Ручки')}`}.`,
      isKitchen && extra ? `- Countertop and backsplash: exactly the stone/wood pattern of image ${ref('Столешница')} ("${extra.name}"${extra.meta ? `, ${extra.meta}` : ''}), 40 mm thick.` : '',
      !isKitchen && extra ? `- Display: ${extra.en}.` : '',
      `- Overall style reference: image ${ref('Стиль')}.`,
      isKitchen
        ? '- Realistic sizes: base cabinets 850–900 mm high, wall cabinets up to the ceiling or 720–960 mm, standard 600 mm modules.'
        : '- Realistic sizes: depth 600 mm, doors 400–500 mm wide, height up to the ceiling.',
      '',
      'STRICT RULES: do not add appliances, decor, plants, people, text, logos or brand marks that are not listed. Do not change anything outside the furniture area. One photorealistic image, same aspect ratio and framing as image 1.',
    ]
    return lines.filter((l) => l !== '').join('\n')
  }, [sel, collection, color, handle, layout, extra, references, isKitchen])

  const restart = () => {
    setSel(EMPTY)
    setStep(0)
    setPhase('config')
    setShowPrompt(false)
  }

  /* ── Экран генерации ── */
  if (phase === 'generating') {
    return (
      <section data-own-motion className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
        <span className="relative flex size-24 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="relative flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Wand2 className="size-9" aria-hidden="true" />
          </span>
        </span>
        <h1 className="flyer-title mt-8 text-4xl md:text-5xl">Создаём визуализацию</h1>
        <ul className="mt-8 flex w-full max-w-sm flex-col gap-3 text-left" aria-live="polite">
          {GENERATION_STAGES.map((name, i) => (
            <li key={name} className={cn('flex items-center gap-3 text-sm transition-opacity', i <= stage ? 'opacity-100' : 'opacity-35')}>
              <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border', i < stage ? 'border-primary bg-primary text-primary-foreground' : 'border-primary/50 text-primary')}>
                {i < stage ? <Check className="size-3.5" aria-hidden="true" /> : <span className="size-1.5 rounded-full bg-primary" />}
              </span>
              {name}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs text-muted-foreground">Демо: настоящая генерация займёт 20–60 секунд</p>
      </section>
    )
  }

  /* ── Результат ── */
  if (phase === 'result' && photo && collection && color) {
    const summary = [
      ['Что', isKitchen ? 'Кухня' : 'Шкаф'],
      ['Коллекция', collection.name],
      ['Фасады', color.name],
      [isKitchen ? 'Столешница' : 'Витрина', extra?.name ?? '—'],
      ['Ручки', handle?.name ?? '—'],
      ['Планировка', layout?.name ?? '—'],
    ]
    const alternatives = collectionList.filter((c) => c.id !== collection.id)
    const after = variant === 0 ? collection.image : alternatives[(variant - 1) % alternatives.length]?.image ?? collection.image
    return (
      <section data-own-motion className="mx-auto max-w-6xl px-4 pb-20 pt-28 md:px-6 md:pt-32">
        <div className="mb-6 rounded-2xl border border-dashed border-primary/60 bg-primary/5 p-4 text-sm leading-relaxed">
          <strong>Демо-режим.</strong> Генерация ещё не подключена — справа фото коллекции из каталога. Когда подключим модель, здесь будет ваше
          помещение с выбранной мебелью. Ниже — ровно то, что уйдёт в нейросеть.
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <BeforeAfter before={photo} after={after ?? photo} />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setVariant((v) => v + 1)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-primary px-5 text-sm font-bold transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Другой вариант
              </button>
              <button
                type="button"
                onClick={() => { setPhase('config'); setStep(1) }}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-border px-5 text-sm font-bold transition-colors hover:border-primary"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Изменить выбор
              </button>
            </div>
          </div>
          <aside className="flex flex-col gap-5">
            <div>
              <PlanLabel className="mb-3">Ваш выбор</PlanLabel>
              <dl className="rounded-2xl border border-border bg-background p-4 text-sm">
                {summary.map(([term, value]) => (
                  <div key={term} className="flex justify-between gap-4 border-b border-dotted border-border py-2 last:border-0">
                    <dt className="text-muted-foreground">{term}</dt>
                    <dd className="text-right font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-2xl bg-foreground p-5 text-background">
              <p className="flyer-title text-2xl">Нравится? Посчитаем точно</p>
              <p className="mt-2 text-sm text-background/65">Дизайнер приедет на замер и сделает проект с точными размерами и стоимостью.</p>
              <BookingPlanButton onDark className="mt-4" />
            </div>
          </aside>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-background">
          <button
            type="button"
            onClick={() => setShowPrompt((v) => !v)}
            aria-expanded={showPrompt}
            className="flex w-full items-center justify-between gap-3 p-5 text-left"
          >
            <span>
              <span className="flex items-center gap-2 font-bold"><Sparkles className="size-4 text-primary" aria-hidden="true" />Что уходит в нейросеть</span>
              <span className="mt-1 block text-sm text-muted-foreground">Фото клиента, референсы из каталога и жёсткий промт</span>
            </span>
            <ChevronDown className={cn('size-5 shrink-0 transition-transform', showPrompt && 'rotate-180')} aria-hidden="true" />
          </button>
          {showPrompt && (
            <div className="border-t border-border p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Референсы · {references.length}</p>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {references.map((r) => (
                  <li key={r.n} className="overflow-hidden rounded-xl border border-border">
                    <span className="relative block aspect-square bg-muted">
                      {r.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="block size-full" style={{ background: r.swatch }} />
                      )}
                      <span className="absolute left-2 top-2 flex size-7 items-center justify-center rounded-full bg-foreground font-mono text-xs font-bold text-background">{r.n}</span>
                    </span>
                    <span className="block p-2 text-xs leading-snug">{r.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Промт</p>
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl bg-foreground p-4 font-mono text-xs leading-relaxed text-background/85">{prompt}</pre>
            </div>
          )}
        </div>

        <p className="mt-6 text-center">
          <button type="button" onClick={restart} className="text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-primary">
            Начать заново
          </button>
        </p>
      </section>
    )
  }

  /* ── Конфигуратор ── */
  const colorOptions: Option[] = collection?.colors ?? []

  return (
    <section data-own-motion className="mx-auto max-w-6xl px-4 pb-16 pt-24 md:px-6 md:pb-24 md:pt-32">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground">Демо</span>
        <span className="text-sm text-muted-foreground">Визуализатор мебели в вашем помещении · генерация пока не подключена</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-12">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <ol className="flex gap-1 lg:flex-col lg:gap-2.5">
            {STEP_NAMES.map((name, i) => {
              const available = i === 0 || ready.slice(0, i).every(Boolean)
              return (
                <li key={name} className="flex-1 lg:flex-none">
                  <button
                    type="button"
                    disabled={!available}
                    onClick={() => setStep(i)}
                    className={cn(
                      'flex w-full items-center gap-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40',
                      i === step ? 'font-bold text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className={cn('h-1.5 w-full rounded-full lg:size-6 lg:shrink-0 lg:rounded-full lg:border lg:font-mono lg:text-xs lg:flex lg:items-center lg:justify-center', ready[i] ? 'bg-primary lg:border-primary lg:text-primary-foreground' : i === step ? 'bg-primary/40 lg:border-primary lg:bg-transparent lg:text-primary' : 'bg-border lg:bg-transparent lg:border-border')}>
                      <span className="hidden lg:inline">{ready[i] ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}</span>
                    </span>
                    <span className="hidden lg:inline">{name}</span>
                  </button>
                </li>
              )
            })}
          </ol>
          <p className="mt-6 hidden text-xs leading-relaxed text-muted-foreground lg:block">
            Фото остаётся в вашем браузере: в демо оно никуда не отправляется.
          </p>
        </aside>

        <div className="min-w-0 rounded-3xl border-2 border-primary bg-background p-5 shadow-[8px_8px_0_0_var(--primary)] sm:p-8 md:p-10">
          <PlanLabel index={step + 1}>{STEP_NAMES[step]}</PlanLabel>

          {step === 0 && (
            <>
              <h1 className="flyer-title mt-3 text-3xl sm:text-4xl md:text-5xl">Что хотите увидеть у себя?</h1>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">Соберите мебель из нашего каталога и загрузите фото помещения — нейросеть покажет, как это будет выглядеть.</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {([
                  ['kitchen', 'Кухню', '/quiz-options/choose-kitchen.webp'],
                  ['wardrobe', 'Шкаф', '/quiz-options/choose-wardrobe.webp'],
                ] as const).map(([id, name, image]) => (
                  <Choice
                    key={id}
                    wide
                    option={{ id, name, image, meta: id === 'kitchen' ? '6 коллекций фасадов' : '7 коллекций фасадов' }}
                    selected={sel.product === id}
                    onClick={() => set({ ...EMPTY, product: id })}
                  />
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="flyer-title mt-3 text-3xl sm:text-4xl">Выберите коллекцию</h2>
              <div className="mt-8">
                <Grid cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {collectionList.map((c) => (
                    <Choice key={c.id} wide option={c} selected={sel.collection === c.id} onClick={() => set({ collection: c.id, color: null, handle: null })} />
                  ))}
                </Grid>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="flyer-title mt-3 text-3xl sm:text-4xl">Цвет фасадов</h2>
              <p className="mt-3 text-sm text-muted-foreground">Палитра коллекции {collection?.name}. Образец уйдёт в нейросеть как референс.</p>
              <div className="mt-8">
                <Grid cols="grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
                  {colorOptions.map((c) => (
                    <Choice key={c.id} option={c} selected={sel.color === c.id} onClick={() => set({ color: c.id })} />
                  ))}
                </Grid>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="flyer-title mt-3 text-3xl sm:text-4xl">{isKitchen ? 'Столешница' : 'Витрина'}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{isKitchen ? 'Декоры SLOTEX — столешница и стеновая панель.' : 'Стеклянная секция с подсветкой — или сплошные фасады.'}</p>
              <div className="mt-8">
                <Grid cols={isKitchen ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4'}>
                  {extraOptions.map((o) => (
                    <Choice key={o.id} option={o} selected={sel.extra === o.id} onClick={() => set({ extra: o.id })} />
                  ))}
                </Grid>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="flyer-title mt-3 text-3xl sm:text-4xl">{lineSeries ? 'Цвет профиля' : 'Ручки'}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{lineSeries ? 'Серия LINE — без ручек, фасады открываются за профиль.' : 'Ручки или профиль без ручек.'}</p>
              <div className="mt-8">
                <Grid>
                  {handleOptions.map((o) => (
                    <Choice key={o.id} option={o} selected={sel.handle === o.id} onClick={() => set({ handle: o.id })} />
                  ))}
                </Grid>
              </div>
            </>
          )}

          {step === 5 && sel.product && (
            <>
              <h2 className="flyer-title mt-3 text-3xl sm:text-4xl">Планировка</h2>
              <div className="mt-8">
                <Grid cols="grid-cols-2 lg:grid-cols-4">
                  {layouts[sel.product].map((o) => (
                    <Choice key={o.id} option={o} selected={sel.layout === o.id} onClick={() => set({ layout: o.id })} />
                  ))}
                </Grid>
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <h2 className="flyer-title mt-3 text-3xl sm:text-4xl">Фото помещения</h2>
              <p className="mt-3 text-sm text-muted-foreground">Снимите горизонтально, всю стену целиком, днём и без людей. Подойдёт и фото старой мебели — нейросеть её заменит.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {([
                  ['replace', 'На фото старая мебель — заменить'],
                  ['empty', 'Помещение пустое'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => set({ photoMode: id }, false)}
                    aria-pressed={sel.photoMode === id}
                    className={cn('rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors', sel.photoMode === id ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary')}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); addPhoto(e.dataTransfer.files) }}
                className="mt-6 flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border p-6 text-center"
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="Ваше помещение" className="max-h-72 rounded-xl object-contain" />
                ) : (
                  <ImagePlus className="size-10 text-primary" aria-hidden="true" />
                )}
                <div className="flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background">
                    <Upload className="size-4" aria-hidden="true" />
                    {photo ? 'Другое фото' : 'Загрузить фото'}
                  </button>
                  <button type="button" onClick={() => setPhoto('/vizkit/sample-old-kitchen.webp')} className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-border px-5 text-sm font-bold hover:border-primary">
                    Взять пример фото
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => addPhoto(e.target.files)} />
              </div>
            </>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(step - 1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-border px-6 font-bold hover:border-primary">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Назад
              </button>
            ) : (
              <span className="hidden sm:block" />
            )}
            {step < STEP_NAMES.length - 1 ? (
              <button
                type="button"
                disabled={!ready[step]}
                onClick={() => setStep(step + 1)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 font-bold text-primary-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                Далее
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!ready.every(Boolean)}
                onClick={generate}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 font-bold text-primary-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Wand2 className="size-5" aria-hidden="true" />
                Создать визуализацию
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
