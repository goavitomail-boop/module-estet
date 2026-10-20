'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { m } from 'framer-motion'
import { EASE_OUT, itemVariants, staggerVariants } from '@/components/form-motion'
import { SchemeSvg, type Built, type Marks } from '@/components/scheme-kit'
import { storageScheme } from '@/components/storage-scene'
import { lightScene } from '@/components/catalog-schemes'
import {
  bare, dishwasherScene, fridgeScene, islandScene, layoutScene, layoutUnknownScene, microwaveScene, ovenScene, pantryScene, runScene,
} from '@/components/quiz-kitchen-scenes'
import {
  antresolScene, drawersScene, hingedScene, ledScene, nicheScene, rodsScene, shelvesScene, shelvingScene, walkinScene, wardrobeUnknownScene, widthScene,
} from '@/components/quiz-wardrobe-scenes'
import { FRAME, vetrineScene } from '@/components/wardrobe-schemes'
import { cn } from '@/lib/utils'

/**
 * Варианты квиза карточками со схемой в каркасе (scheme-kit.tsx). Два
 * режима:
 *
 * appear — вопрос с одним ответом (планировка, размер, тип шкафа): схемы
 * отыгрывают, как только шаг открылся, по очереди слева направо, и
 * показывают, чем варианты отличаются.
 *
 * toggle — вопрос с несколькими ответами (пожелания, наполнение): пока
 * карточка не выбрана, механизм стоит закрытым (сцена ждёт: .hs-wait из
 * scene-kit); выбрали — он срабатывает: дверца открывается, ящик выезжает,
 * подсветка загорается. Сняли отметку — схема снова закрыта. Так видно
 * и что отмечено, и что это за вещь.
 *
 * При «уменьшить движение» схемы сразу в конечном положении, выбор видно по
 * рамке и галочке. Линии в маленьких карточках — в пикселях экрана (.ss-card).
 */

export type SchemeOption = { label: string; scene: () => Built }
type Frame = { w: number; h: number }

/** Кадры: обычная карточка, план комнаты, ряд модулей в длину, шкаф в ширину */
export const FRAMES = {
  card: { w: 200, h: 170 },
  plan: { w: 200, h: 150 },
  run: { w: 170, h: 120 },
  wide: { w: 170, h: 150 },
} satisfies Record<string, Frame>

const PAD = { x: 8, top: 10, bottom: 8 }

/**
 * Схемы появляются не вместе с шагом. Шаг выезжает за 0,42 с (stepVariants
 * в form-motion.tsx), и если в те же кадры собрать десяток схем, браузер
 * замирает на 50–80 мс — экран дёргается. Поэтому шаг выезжает с пустыми
 * рамками, а схемы встают потом, по одной за раз
 */
const MOUNT_AFTER = 420
const MOUNT_STEP = 40

/** Содержимое появляется через after мс и проявляется (.ss-later) */
function Later({ after, children }: { after: number; children: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), after)
    return () => clearTimeout(timer)
  }, [after])
  return ready ? <span className="ss-later absolute inset-0 block">{children}</span> : null
}

/** Схема карточки: чертёж строится, только когда карточка его показывает */
function CardScheme({ option, id, frame, marks }: { option: SchemeOption; id: string; frame: Frame; marks?: Marks }) {
  const built = useMemo(() => option.scene(), [option])
  return <SchemeSvg built={built} id={id} view={frame} pad={PAD} marks={marks} />
}
/** Засечки и число размера — в единицах кадра: чертёж в карточке ужат в разы */
export const RUN_MARKS: Marks = { tick: 3, label: 12 }

export const SIZE_UNKNOWN = 'Не знаю — нужен замер'

/* ── Кухня ── */

export const LAYOUT_OPTIONS: SchemeOption[] = [
  { label: 'Прямая', scene: () => layoutScene('straight') },
  { label: 'Угловая', scene: () => layoutScene('corner') },
  { label: 'П-образная', scene: () => layoutScene('u') },
  { label: 'С островом', scene: () => layoutScene('island') },
  { label: 'Параллельная', scene: () => layoutScene('parallel') },
  { label: 'Пока не знаю', scene: layoutUnknownScene },
]

/** Длина ряда — середина диапазона в модулях по 600: 2,4 м, 3,6 м и 4,8 м */
export const KITCHEN_SIZE_OPTIONS: SchemeOption[] = [
  { label: 'Небольшая — до 3 м', scene: () => runScene(4, 'до 3 м') },
  { label: 'Средняя — 3–4 м', scene: () => runScene(6, '3–4 м') },
  { label: 'Большая — больше 4 м', scene: () => runScene(8, 'больше 4 м') },
  { label: SIZE_UNKNOWN, scene: () => runScene(6, '? м', true) },
]

/** Пожелания: техника и удобства — в заявке раскладываются по прежним полям appliances и features */
export const KITCHEN_APPLIANCES: SchemeOption[] = [
  { label: 'Посудомоечная машина', scene: dishwasherScene },
  { label: 'Встроенный холодильник', scene: fridgeScene },
  { label: 'Духовой шкаф на уровне глаз', scene: ovenScene },
  { label: 'Встроенная СВЧ', scene: microwaveScene },
]

export const KITCHEN_FEATURES: SchemeOption[] = [
  { label: 'Остров или барная стойка', scene: islandScene },
  { label: 'Подсветка рабочей зоны', scene: () => bare(lightScene('#c3c6ca')) },
  { label: 'Высокие пеналы для хранения', scene: pantryScene },
]

/* ── Шкаф ── */

export const WARDROBE_TYPE_OPTIONS: SchemeOption[] = [
  { label: 'Распашной шкаф', scene: hingedScene },
  { label: 'Шкаф до потолка с антресолями', scene: antresolScene },
  { label: 'Встроенный в нишу', scene: nicheScene },
  { label: 'Гардеробная система', scene: walkinScene },
  { label: 'Стеллаж или витрина', scene: shelvingScene },
  { label: 'Нужна рекомендация', scene: wardrobeUnknownScene },
]

/** Ширина — двери по 450 мм: 1,35 м, 2,25 м, 3,15 м и 4,05 м */
export const WARDROBE_WIDTH_OPTIONS: SchemeOption[] = [
  { label: 'До 1,5 м', scene: () => widthScene(3, 'до 1,5 м') },
  { label: '1,5–2,5 м', scene: () => widthScene(5, '1,5–2,5 м') },
  { label: '2,5–3,5 м', scene: () => widthScene(7, '2,5–3,5 м') },
  { label: 'Больше 3,5 м', scene: () => widthScene(9, 'больше 3,5 м') },
  { label: SIZE_UNKNOWN, scene: () => widthScene(5, '? м', true) },
]

export const WARDROBE_FEATURES: SchemeOption[] = [
  { label: 'Штанги для одежды', scene: rodsScene },
  { label: 'Выдвижные ящики', scene: drawersScene },
  { label: 'Полки', scene: shelvesScene },
  { label: 'Стеклянная витрина', scene: () => bare(vetrineScene(FRAME.Чёрный, 'Прозрачное')) },
  { label: 'LED-подсветка', scene: ledScene },
  { label: 'Антресоли до потолка', scene: antresolScene },
]

/** Системы хранения из каталога (kitchenStorage в lib/pdf-catalog-data.ts) — понятными словами; схемы — storage-scene.tsx */
const storage = (label: string, key: string): SchemeOption => ({ label, scene: () => bare(storageScheme(key)) })

export const KITCHEN_STORAGE: SchemeOption[] = [
  storage('Бутылочница', 'bottle-6033'),
  storage('Сушка для посуды', 'dryer-4646'),
  storage('Волшебный уголок', 'corner-6022'),
  storage('Выдвижная колонна', 'column-4862'),
  storage('Корзина в верхний шкаф', 'upper-6095'),
  storage('Сортировка мусора', 'waste-6156'),
]

/** То же для шкафов (wardrobeStorage в lib/wardrobes-data.ts) */
export const WARDROBE_STORAGE: SchemeOption[] = [
  storage('Лифт для одежды', 'lift-10002'),
  storage('Выдвижная брючница', 'trousers-10756'),
  storage('Выдвижная корзина', 'basket-10056'),
  storage('Полка для обуви', 'shoes-10556'),
  storage('Выдвижное зеркало', 'mirror-10001'),
  storage('Гладильная доска', 'ironing-10b01w'),
]

/**
 * Пункты, которые раньше были в общем списке, а теперь — в системах
 * хранения: черновик, начатый до этого, не теряет отметку
 */
export const MOVED_TO_STORAGE: Record<string, string> = {
  'Сортировка мусора': 'Сортировка мусора',
  Брючница: 'Выдвижная брючница',
  'Сетка для обуви': 'Полка для обуви',
}

export function SchemeChoices({ id, options, value, onChange, mode, frame = FRAMES.card, marks, wide = false }: {
  /** Префикс id схем — у clipPath и градиентов на странице он должен быть свой */
  id: string
  options: SchemeOption[]
  value: string | string[]
  onChange: (label: string) => void
  mode: 'appear' | 'toggle'
  frame?: Frame
  marks?: Marks
  /** Четыре карточки в ряд на широком экране — для ряда модулей в длину */
  wide?: boolean
}) {
  return (
    <m.div variants={staggerVariants} className={cn('grid grid-cols-2 gap-3 max-[350px]:grid-cols-1', wide ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
      {options.map((option, i) => {
        const selected = Array.isArray(value) ? value.includes(option.label) : value === option.label
        const scheme = <CardScheme option={option} id={`quiz-${id}-${i}`} frame={frame} marks={marks} />
        return (
          <m.button
            key={option.label}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.label)}
            variants={itemVariants}
            whileTap={{ scale: 0.97 }}
            className={cn(
              'relative flex min-w-0 flex-col items-stretch overflow-hidden rounded-2xl border-2 p-2.5 text-left text-sm font-semibold transition-[border-color,background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-3 sm:text-base',
              // Четыре в ряд — карточки узкие: подпись мельче, чтобы слова не рвались
              wide && 'lg:text-sm',
              selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:border-primary',
            )}
          >
            <span className="paper relative block w-full overflow-hidden rounded-xl" style={{ aspectRatio: `${frame.w} / ${frame.h}` }} aria-hidden="true">
              <Later after={MOUNT_AFTER + i * MOUNT_STEP}>
                {mode === 'toggle' ? (
                  // Новый ключ — сцена с нуля: выбор проигрывает механизм, снятие — закрывает его
                  <span key={selected ? 'on' : 'off'} className="hs hs-wait ss ss-card absolute inset-0 block" data-wait={selected ? undefined : ''}>
                    {scheme}
                  </span>
                ) : (
                  // Схемы шага отыгрывают по очереди; .hs-wait — чтобы дождаться ухода заставки
                  <span className="hs hs-wait ss ss-card absolute inset-0 block" style={{ '--lag': `${(0.05 + i * 0.06).toFixed(2)}s` } as CSSProperties}>
                    {scheme}
                  </span>
                )}
              </Later>
              {/* Отметка — в углу схемы: подписи остаётся вся ширина карточки, длинные слова не рвутся */}
              <span className={cn('absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full border', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 bg-card')}>
                {selected && (
                  <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
                    <Check className="size-4" aria-hidden="true" />
                  </m.span>
                )}
              </span>
            </span>
            <span className="flex min-h-10 w-full min-w-0 items-center px-1 pt-2">
              <span className="min-w-0 flex-1 hyphens-auto break-words text-pretty leading-snug">{option.label}</span>
            </span>
          </m.button>
        )
      })}
    </m.div>
  )
}
