'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  MessageCircle,
  Paperclip,
  PencilRuler,
  Phone,
  RotateCcw,
  Ruler,
  Trash2,
} from 'lucide-react'
import { AnimatePresence, m } from 'framer-motion'
import { formatRussianPhone, isValidRussianPhone, PHONE_PLACEHOLDER } from '@/lib/phone'
import { getAttribution } from '@/lib/attribution'
import { trackQuizCompleted, trackQuizStep } from '@/lib/quiz-tracking'
import { reachGoal } from '@/lib/metrika'
import { cn } from '@/lib/utils'
import { PlanLabel } from '@/components/plan'
import { AutoHeight, EASE_OUT, FormMotion, itemVariants, maskVariants, staggerVariants, stepVariants } from '@/components/form-motion'
import { enter } from '@/components/scene-kit'
import { CheckBadge, NextSteps, SummaryCard } from '@/components/thanks-scene'
import {
  FRAMES, KITCHEN_APPLIANCES, KITCHEN_FEATURES, KITCHEN_SIZE_OPTIONS, KITCHEN_STORAGE, LAYOUT_OPTIONS, MOVED_TO_STORAGE,
  RUN_MARKS, SIZE_UNKNOWN, SchemeChoices, WARDROBE_FEATURES, WARDROBE_STORAGE, WARDROBE_TYPE_OPTIONS, WARDROBE_WIDTH_OPTIONS,
} from '@/components/quiz-schemes'
import { COMPANY } from '@/lib/company'

/**
 * Квиз «Рассчитать кухню» — лёгкая версия. Тот же квиз считает и шкафы:
 * product='wardrobe' подставляет свои вопросы, а контакты, файлы, черновик
 * и отправка остаются общими.
 *
 * Пять простых вопросов и контакты. Ни один вопрос не обязателен: у каждого
 * есть «Не знаю» или «Пропустить», а материалы, фурнитуру и стадию ремонта
 * дизайнер уточняет на звонке. Обязательны только телефон и согласие.
 *
 * Ключи ответов совпадают с прежним подробным брифом: карточка заявки
 * в панели (lib/admin-format.ts) и сообщение в Max (lib/max-ui.ts) читают
 * их без изменений. Значения сроков, бюджета, стиля и планировки тоже
 * прежние — по ним строятся графики в аналитике. Новый ключ storage —
 * системы хранения из каталога; панель и Max показывают его отдельной
 * строкой.
 *
 * Планировка, размер, пожелания, тип, ширина и наполнение шкафа —
 * карточками со схемой в каркасе (quiz-schemes.tsx).
 *
 * Заявка на шкаф уходит тем же типом 'project' с details.product='wardrobe'
 * и answers.projectType='Шкаф': так её видно в Max и в карточке, а графики
 * аналитики, построенные на ответах о кухне, её не учитывают.
 */

export type QuizProduct = 'kitchen' | 'wardrobe'

type Answers = {
  room: string
  wardrobeType: string
  wardrobeWidth: string
  wardrobeWidthCm: string
  facades: string
  layout: string
  kitchenSize: string
  wallA: string
  wallB: string
  wallC: string
  roomArea: string
  ceilingHeight: string
  noMeasurements: boolean
  style: string
  appliances: string[]
  features: string[]
  /** Системы хранения из каталога — отдельным списком, карточками со схемой */
  storage: string[]
  timeline: string
  budget: string
  name: string
  phone: string
  contactMethod: string
  contactTime: string
  location: string
  comment: string
  consent: boolean
}

type UploadedFile = { id: string; file: File; url?: string }

const initialAnswers: Answers = {
  room: '', wardrobeType: '', wardrobeWidth: '', wardrobeWidthCm: '', facades: '',
  layout: '', kitchenSize: '', wallA: '', wallB: '', wallC: '', roomArea: '', ceilingHeight: '', noMeasurements: false,
  style: '', appliances: [], features: [], storage: [], timeline: '', budget: '',
  name: '', phone: '', contactMethod: '', contactTime: '', location: '', comment: '', consent: false,
}

/** Названия шагов синхронизированы с QUIZ_STEP_NAMES в lib/admin-format.ts */
const kitchenSteps = [
  { eyebrow: 'Планировка', title: 'Какую кухню планируете?', hint: 'Не уверены — выберите «Пока не знаю», это нормально: с планировкой поможет дизайнер.' },
  { eyebrow: 'Размер', title: 'Какого она примерно размера?', hint: 'Достаточно на глаз — по длине кухни вдоль стен. Точные размеры снимем на бесплатном замере.' },
  { eyebrow: 'Стиль', title: 'Какой стиль вам ближе?', hint: 'Выберите то, что нравится. Если сомневаетесь — подскажем.' },
  { eyebrow: 'Пожелания', title: 'Что обязательно должно быть?', hint: 'Отметьте всё, что важно, или пропустите — обсудим на звонке.' },
  { eyebrow: 'Сроки', title: 'Когда хотите новую кухню?', hint: '' },
  { eyebrow: 'Контакты', title: 'Куда прислать идеи и расчёт?', hint: 'Дизайнер свяжется один раз, чтобы уточнить детали. Без спама и навязчивых звонков.' },
]

const wardrobeSteps = [
  { eyebrow: 'Помещение', title: 'Где будет шкаф?', hint: 'От комнаты зависят глубина, наполнение и фасады. Не уверены — выберите «Пока не знаю».' },
  { eyebrow: 'Тип', title: 'Какой шкаф нужен?', hint: 'Если сомневаетесь — дизайнер предложит варианты под ваше помещение.' },
  { eyebrow: 'Размер', title: 'Какой он примерно ширины?', hint: 'Достаточно на глаз — по стене, где встанет шкаф. Точные размеры снимем на бесплатном замере.' },
  { eyebrow: 'Фасады', title: 'Какие фасады нравятся?', hint: 'Коллекции из нашего каталога шкафов. Их можно сочетать в одном шкафу — обсудим с дизайнером.' },
  { eyebrow: 'Наполнение', title: 'Что должно быть внутри?', hint: 'Отметьте всё, что важно, или пропустите — подберём под ваши вещи.' },
  { eyebrow: 'Сроки', title: 'Когда нужен шкаф?', hint: '' },
  kitchenSteps[kitchenSteps.length - 1],
]

const STEPS: Record<QuizProduct, typeof kitchenSteps> = { kitchen: kitchenSteps, wardrobe: wardrobeSteps }

type ChoiceOption = string | {
  label: string
  image: string
  imageIndex: number
  imageCount: number
  alt: string
}

const CONTACT_MAX = 'Написать в Max'
/**
 * Пожелания — карточками со схемой (quiz-schemes.tsx), а в заявку
 * раскладываются по прежним полям: техника, дополнительно и системы хранения
 */
const applianceWishes = KITCHEN_APPLIANCES.map((option) => option.label)

const optionSets = {
  style: [
    { label: 'Современный', image: '/quiz-options/style-modern.webp', imageIndex: 0, imageCount: 1, alt: 'Современная кухня с лаконичными фасадами и островом' },
    { label: 'Минимализм', image: '/quiz-options/style-minimal.webp', imageIndex: 0, imageCount: 1, alt: 'Минималистичная кухня со скрытыми ручками' },
    { label: 'Неоклассика', image: '/quiz-options/style-neoclassic.webp', imageIndex: 0, imageCount: 1, alt: 'Неоклассическая кухня с рамочными фасадами' },
    { label: 'Лофт', image: '/quiz-options/style-loft.webp', imageIndex: 0, imageCount: 1, alt: 'Кухня в стиле лофт с кирпичом и металлом' },
    { label: 'Скандинавский', image: '/quiz-options/style-scandinavian.webp', imageIndex: 0, imageCount: 1, alt: 'Светлая скандинавская кухня с натуральным деревом' },
    { label: 'Нужна рекомендация', image: '/quiz-options/style-recommendation.webp', imageIndex: 0, imageCount: 1, alt: 'Консультация с дизайнером по выбору стиля кухни' },
  ] satisfies ChoiceOption[],
  timeline: ['Как можно скорее', '1–3 месяца', '3–6 месяцев', 'Более 6 месяцев', 'Пока изучаю варианты'],
  budget: ['До 500 000 ₽', '500 000–800 000 ₽', '800 000–1 200 000 ₽', 'От 1 200 000 ₽', 'Нужна консультация'],
  contactMethod: ['Позвонить', CONTACT_MAX],
  contactTime: ['9:00–12:00', '12:00–15:00', '15:00–18:00', '18:00–21:00'],
}

const photo = (label: string, image: string, alt: string): ChoiceOption => ({ label, image, imageIndex: 0, imageCount: 1, alt })

const wardrobeOptions = {
  room: [
    photo('Прихожая', '/quiz-options/wardrobe-room-hall.webp', 'Шкаф в прихожей с рамочными фасадами'),
    photo('Спальня', '/quiz-options/wardrobe-room-bedroom.webp', 'Шкаф до потолка в спальне'),
    photo('Гостиная', '/quiz-options/wardrobe-room-living.webp', 'Шкаф-стеллаж в гостиной'),
    photo('Гардеробная', '/quiz-options/wardrobe-room-dressing.webp', 'Открытая гардеробная с ящиками и штангами'),
    photo('Детская или кабинет', '/quiz-options/wardrobe-room-kids.webp', 'Шкаф с полками и ящиками'),
    photo('Пока не знаю', '/quiz-options/style-recommendation.webp', 'Консультация с дизайнером'),
  ],
  facades: [
    photo('Soft & Wood — дерево', '/quiz-options/wardrobe-facade-soft-wood.webp', 'Шкаф с фасадами под дуб'),
    photo('Touch — Soft Touch', '/quiz-options/wardrobe-facade-touch.webp', 'Шкаф с однотонными фасадами Soft Touch'),
    photo('Touch Ultra — «камень»', '/quiz-options/wardrobe-facade-touch-ultra.webp', 'Шкаф с фасадами Touch Ultra и витриной'),
    photo('Рамочные — Arco, Garda, Como', '/quiz-options/wardrobe-facade-frame.webp', 'Шкаф с рамочными фасадами'),
    photo('Flat & Velvet — гладкие или рифлёные', '/quiz-options/wardrobe-facade-flat-velvet.webp', 'Шкаф с гладкими фасадами и витриной'),
    photo('Нужна рекомендация', '/quiz-options/style-recommendation.webp', 'Консультация с дизайнером по выбору фасадов'),
  ],
  budget: ['До 150 000 ₽', '150 000–300 000 ₽', '300 000–500 000 ₽', 'От 500 000 ₽', 'Нужна консультация'],
}

/** Ответы, которые относятся только к одному квизу: в заявку другого они не попадают */
const KITCHEN_ONLY: Array<keyof Answers> = ['layout', 'kitchenSize', 'wallA', 'wallB', 'wallC', 'roomArea', 'style', 'appliances']
const WARDROBE_ONLY: Array<keyof Answers> = ['room', 'wardrobeType', 'wardrobeWidth', 'wardrobeWidthCm', 'facades']

const DRAFT_KEYS: Record<QuizProduct, string> = {
  kitchen: 'modul-estet-quiz-draft-v2',
  wardrobe: 'modul-estet-wardrobe-draft-v1',
}
const MAX_CHAT_URL = process.env.NEXT_PUBLIC_MAX_CHAT_URL ?? 'https://web.max.ru/93711404'

/** Несколько пунктов одной строкой: два первых и «ещё N» */
const listShort = (items: string[]) => (items.length > 2 ? `${items.slice(0, 2).join(', ')} и ещё ${items.length - 2}` : items.join(', '))
const sizeShort = (value: string) => (value === SIZE_UNKNOWN ? 'Нужен замер' : value)

/**
 * Строки сводки на экране «спасибо» — то, что ушло дизайнеру. Пропущенные
 * вопросы не показываем: на них ответит звонок
 */
function summaryRows(answers: Answers, isKitchen: boolean, files: number): Array<[string, string]> {
  const walls = [answers.wallA, answers.wallB, answers.wallC].map((w) => w.trim()).filter(Boolean)
  const rows: Array<[string, string]> = isKitchen
    ? [
        ['Планировка', answers.layout],
        ['Размер', walls.length ? `${walls.join(' × ')} см` : answers.roomArea.trim() ? `${answers.roomArea.trim()} м²` : sizeShort(answers.kitchenSize)],
        ['Стиль', answers.style],
        ['Пожелания', listShort([...answers.appliances, ...answers.features, ...answers.storage])],
        ['Сроки', answers.timeline],
        ['Бюджет', answers.budget],
      ]
    : [
        ['Помещение', answers.room],
        ['Тип', answers.wardrobeType],
        ['Ширина', answers.wardrobeWidthCm.trim() ? `${answers.wardrobeWidthCm.trim()} см` : sizeShort(answers.wardrobeWidth)],
        ['Фасады', answers.facades],
        ['Наполнение', listShort([...answers.features, ...answers.storage])],
        ['Сроки', answers.timeline],
        ['Бюджет', answers.budget],
      ]
  if (files > 0) rows.push(['Файлы', `${files} шт.`])
  const filled = rows.filter(([, value]) => value)
  return filled.length ? filled : [['Ответы', 'Обсудим на звонке']]
}
/** Пауза перед переходом после выбора: человек успевает увидеть, что ответ отмечен */
const AUTO_ADVANCE_MS = 280

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

/** «Осталось 3 вопроса · ~30 сек» — видно, что это ненадолго */
function progressLabel(step: number, questions: number): string {
  if (step >= questions) return 'Остался последний шаг'
  const left = questions - step
  if (step === 0) return `${questions} коротких вопросов · около минуты`
  if (left === 1) return 'Последний вопрос'
  return `Осталось ${left} ${plural(left, 'вопрос', 'вопроса', 'вопросов')} · ~${left * 10} сек`
}

/** Подборка вариантов внутри шага: заголовок и, если нужно, подсказка */
function WishGroup({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-bold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  )
}

function ChoiceGrid({ options, value, onChange, multiple = false }: { options: ChoiceOption[]; value: string | string[]; onChange: (value: string) => void; multiple?: boolean }) {
  const hasImages = options.some((option) => typeof option !== 'string')

  return (
    <m.div variants={staggerVariants} className={cn('grid gap-3 sm:grid-cols-2', hasImages && 'grid-cols-2 max-[350px]:grid-cols-1 lg:grid-cols-3')}>
      {options.map((option) => {
        const label = typeof option === 'string' ? option : option.label
        const selected = multiple ? (value as string[]).includes(label) : value === label

        return (
          <m.button
            key={label}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(label)}
            variants={itemVariants}
            whileTap={{ scale: 0.97 }}
            className={cn(
              'relative flex min-h-14 min-w-0 items-center justify-between gap-3 overflow-hidden rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-semibold transition-[border-color,background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-5 sm:text-base',
              hasImages && 'min-h-0 flex-col items-stretch p-2.5 sm:p-3',
              selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:border-primary',
            )}
          >
            {typeof option !== 'string' && (
              <span
                role="img"
                aria-label={option.alt}
                className={cn('block w-full rounded-xl bg-cover bg-center bg-no-repeat', option.imageCount === 1 ? 'aspect-[4/3]' : 'aspect-[16/5]')}
                style={{
                  backgroundImage: `url(${option.image})`,
                  backgroundSize: `100% ${option.imageCount * 100}%`,
                  backgroundPosition: `center ${option.imageCount === 1 ? 0 : (option.imageIndex / (option.imageCount - 1)) * 100}%`,
                }}
              />
            )}
            <span className={cn('flex w-full min-w-0 items-center justify-between gap-2', hasImages && 'min-h-10 px-1')}>
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere] text-pretty leading-snug">{label}</span>
              <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border', selected ? 'border-primary-foreground bg-primary-foreground text-primary' : 'border-muted-foreground/40')}>
                {selected && (
                  <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
                    <Check className="size-4" aria-hidden="true" />
                  </m.span>
                )}
              </span>
            </span>
          </m.button>
        )
      })}
    </m.div>
  )
}

/** Дольше этого ждать загрузку одного файла бессмысленно — клиент уже нервничает */
const UPLOAD_TIMEOUT_MS = 20000
/** Предел серверного запасного пути: тело функции на Vercel ограничено ~4,5 МБ */
const FALLBACK_MAX_SIZE = 4 * 1024 * 1024

/**
 * Кладёт файл в хранилище и возвращает ссылку, либо null.
 *
 * Сначала пробуем прямую загрузку из браузера — она быстрее и не нагружает
 * функцию. Если она не отвечает (адрес vercel.com/api/blob местами режется
 * политикой CORS, и SDK при этом уходит в бесконечные повторы), файл идёт
 * через наш сервер. Обе попытки ограничены таймаутом: форма не имеет права
 * зависнуть на «Загружаем файлы 0/1» — клиент просто закроет вкладку.
 */
async function uploadFile(file: File): Promise<{ url: string; pathname: string } | null> {
  const withTimeout = <T,>(task: Promise<T>, ms: number) =>
    Promise.race([task, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])

  try {
    const { upload } = await withTimeout(import('@vercel/blob/client'), 10000)
    // access: 'private' — файлы клиента не должны открываться по прямой ссылке,
    // менеджеры смотрят их из панели через /admin/file с проверкой сессии
    const blob = await withTimeout(
      upload(`leads/${Date.now()}-${file.name}`, file, { access: 'private', handleUploadUrl: '/api/upload' }),
      UPLOAD_TIMEOUT_MS
    )
    return { url: blob.url, pathname: blob.pathname }
  } catch (error) {
    console.warn('Прямая загрузка не удалась, пробуем через сервер:', file.name, error)
  }

  if (file.size > FALLBACK_MAX_SIZE) {
    console.error('Файл слишком большой для запасного пути:', file.name, file.size)
    return null
  }

  try {
    const response = await withTimeout(
      fetch(`/api/upload?name=${encodeURIComponent(file.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      }),
      UPLOAD_TIMEOUT_MS
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = (await response.json()) as { url?: string; pathname?: string }
    return data.url && data.pathname ? { url: data.url, pathname: data.pathname } : null
  } catch (error) {
    console.error('Серверная загрузка тоже не удалась:', file.name, error)
    return null
  }
}

function Field({ label, value, onChange, placeholder, type = 'text', inputMode, autoComplete, maxLength }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; inputMode?: 'text' | 'tel' | 'decimal'; autoComplete?: string; maxLength?: number }) {
  return <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-foreground"><span>{label}</span><input type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} maxLength={maxLength} className="min-h-12 w-full min-w-0 max-w-full rounded-xl border-2 border-border bg-background px-4 text-base font-normal outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary" /></label>
}

/** Раскрывающийся блок «по желанию» — необязательное не должно давить с первого взгляда */
function Optional({ open, onToggle, label, children }: { open: boolean; onToggle: () => void; label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
        {label}
        <ChevronDown className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.4, ease: EASE_OUT } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.25 } }}
            className="overflow-hidden"
          >
            <div className="border-t border-dashed border-border p-4">{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ProjectQuiz({ product = 'kitchen', onChangeProduct }: { product?: QuizProduct; onChangeProduct?: () => void }) {
  const isKitchen = product === 'kitchen'
  const steps = STEPS[product]
  const QUESTIONS = steps.length - 1
  const CONTACTS_STEP = steps.length - 1
  const TIMELINE_STEP = steps.length - 2
  const DRAFT_KEY = DRAFT_KEYS[product]
  const [answers, setAnswers] = useState<Answers>(initialAnswers)
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [error, setError] = useState('')
  const [restored, setRestored] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [applicationId, setApplicationId] = useState('')
  const [website, setWebsite] = useState('')
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [filesFailed, setFilesFailed] = useState(0)
  const [exactOpen, setExactOpen] = useState(false)
  const [extrasOpen, setExtrasOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Направление листания для анимации: вперёд — новый вопрос приходит
  // справа, по «Назад» — слева
  const lastStep = useRef(step)
  const direction = step >= lastStep.current ? 1 : -1
  useEffect(() => { lastStep.current = step }, [step])

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      try {
        const draft = JSON.parse(raw) as { answers: Answers; step: number }
        const restoredAnswers = { ...initialAnswers, ...draft.answers }
        // Пункты, переехавшие в системы хранения, — туда же и в черновике
        const moved = restoredAnswers.features.filter((item) => item in MOVED_TO_STORAGE)
        if (moved.length) {
          restoredAnswers.features = restoredAnswers.features.filter((item) => !(item in MOVED_TO_STORAGE))
          restoredAnswers.storage = [...new Set([...restoredAnswers.storage, ...moved.map((item) => MOVED_TO_STORAGE[item])])]
        }
        setAnswers(restoredAnswers)
        setStep(Math.min(draft.step, steps.length - 1))
        // Черновик пишется сразу при открытии, даже пустой. Сообщение
        // показываем, только если восстанавливать действительно есть что
        const hasProgress = draft.step > 0 || Object.values(draft.answers ?? {}).some((value) =>
          Array.isArray(value) ? value.length > 0 : Boolean(value),
        )
        setRestored(hasProgress)
        if (draft.answers?.wallA || draft.answers?.roomArea || draft.answers?.wardrobeWidthCm) setExactOpen(true)
      } catch { localStorage.removeItem(DRAFT_KEY) }
    }
    setDraftLoaded(true)
  }, [DRAFT_KEY, steps.length])

  // Пока черновик не прочитан, не пишем: иначе первый же проход эффекта
  // затирает его пустыми ответами (в dev StrictMode прогоняет эффекты
  // дважды, и восстановление читает уже затёртое)
  useEffect(() => {
    if (!draftLoaded || completed) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, step }))
  }, [answers, step, completed, draftLoaded, DRAFT_KEY])

  // Учёт дальнего достигнутого шага — показывает в панели, где бросают квиз.
  // Зависит только от step: при возврате назад максимум на сервере не понижается.
  // Воронка в панели построена по шагам кухонного квиза — шкафы её не трогают
  useEffect(() => {
    if (completed || !isKitchen) return
    trackQuizStep(step + 1)
  }, [step, completed, isKitchen])

  useEffect(() => () => files.forEach((item) => item.url && URL.revokeObjectURL(item.url)), [files])
  useEffect(() => () => clearTimeout(advanceTimer.current), [])

  const update = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((current) => ({ ...current, [key]: value }))

  const goTo = (target: number) => {
    clearTimeout(advanceTimer.current)
    setError('')
    setStep(Math.min(Math.max(target, 0), steps.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Вопрос с одним ответом: выбрал — и сразу дальше, без лишней кнопки */
  const answerAndGo = <K extends keyof Answers>(key: K, value: Answers[K]) => {
    update(key, value)
    const from = step
    clearTimeout(advanceTimer.current)
    advanceTimer.current = setTimeout(() => {
      setStep((current) => (current === from ? Math.min(from + 1, steps.length - 1) : current))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, AUTO_ADVANCE_MS)
  }

  const chooseSize = (value: string) => {
    const unknown = value === SIZE_UNKNOWN
    setAnswers((current) => ({ ...current, kitchenSize: value, noMeasurements: unknown }))
    // Если человек раскрыл точные размеры, он их ещё вводит — не уводим со страницы
    if (!exactOpen) answerAndGo('kitchenSize', value)
  }

  const chooseWidth = (value: string) => {
    const unknown = value === SIZE_UNKNOWN
    setAnswers((current) => ({ ...current, wardrobeWidth: value, noMeasurements: unknown }))
    if (!exactOpen) answerAndGo('wardrobeWidth', value)
  }

  const toggleIn = (key: 'appliances' | 'features' | 'storage', option: string) =>
    update(key, answers[key].includes(option) ? answers[key].filter((item) => item !== option) : [...answers[key], option])

  const toggleWish = (option: string) => toggleIn(isKitchen && applianceWishes.includes(option) ? 'appliances' : 'features', option)
  const toggleStorage = (option: string) => toggleIn('storage', option)

  const answered = isKitchen
    ? [
        Boolean(answers.layout),
        Boolean(answers.kitchenSize || answers.wallA || answers.roomArea),
        Boolean(answers.style),
        answers.appliances.length + answers.features.length + answers.storage.length > 0,
        Boolean(answers.timeline || answers.budget),
      ]
    : [
        Boolean(answers.room),
        Boolean(answers.wardrobeType),
        Boolean(answers.wardrobeWidth || answers.wardrobeWidthCm),
        Boolean(answers.facades),
        answers.features.length + answers.storage.length > 0,
        Boolean(answers.timeline || answers.budget),
      ]

  /** Ответы для заявки: без согласия и без полей другого квиза */
  const answersForLead = () => {
    const omit = new Set<keyof Answers>(['consent', ...(isKitchen ? WARDROBE_ONLY : KITCHEN_ONLY)])
    const picked = Object.fromEntries(Object.entries(answers).filter(([key]) => !omit.has(key as keyof Answers)))
    return isKitchen ? picked : { projectType: 'Шкаф', ...picked }
  }

  const contactProblem = () => {
    if (!isValidRussianPhone(answers.phone)) return `Проверьте номер телефона — например, ${PHONE_PLACEHOLDER}.`
    if (!answers.consent) return 'Отметьте согласие на обработку данных — без него мы не сможем с вами связаться.'
    return ''
  }

  const addFiles = (incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter((file) => ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) && file.size <= 10 * 1024 * 1024)
    const remaining = Math.max(0, 8 - files.length)
    setFiles((current) => [...current, ...valid.slice(0, remaining).map((file) => ({ id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`, file, url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined }))])
    if (valid.length < Array.from(incoming).length) setError('Некоторые файлы пропущены: подойдут JPG, PNG, WEBP и PDF до 10 МБ.')
    else setError('')
  }

  const removeFile = (id: string) => setFiles((current) => {
    const target = current.find((item) => item.id === id)
    if (target?.url) URL.revokeObjectURL(target.url)
    return current.filter((item) => item.id !== id)
  })

  const finish = async () => {
    if (isSubmitting) return
    const problem = contactProblem()
    if (problem) { setError(problem); return }
    setIsSubmitting(true)
    setError('')
    try {
      // Файлы уходят в хранилище напрямую из браузера, в заявку кладём ссылки на них.
      // Если загрузка не удалась, заявку всё равно отправляем — терять её из-за
      // картинки нельзя, менеджер просто запросит файлы при звонке.
      let uploaded: Array<{ name: string; size: number; type: string; url?: string; pathname?: string }> = []
      if (files.length > 0) {
        setUploadProgress({ done: 0, total: files.length })
        setFilesFailed(0)
        uploaded = await Promise.all(
          files.map(async (item) => {
            const base = { name: item.file.name.slice(0, 120), size: item.file.size, type: item.file.type }
            const stored = await uploadFile(item.file)
            setUploadProgress((current) => ({ ...current, done: current.done + 1 }))
            if (!stored) setFilesFailed((current) => current + 1)
            return stored ? { ...base, ...stored } : base
          })
        )
      }

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'project',
          name: answers.name.trim(),
          phone: answers.phone,
          website,
          startedAt,
          attribution: getAttribution(),
          details: {
            ...(isKitchen ? {} : { product }),
            answers: answersForLead(),
            files: uploaded,
          },
        }),
      })
      if (!response.ok) {
        const errJson = await response.json().catch(() => null)
        throw new Error(errJson?.error || 'Lead request failed')
      }
      const result = (await response.json()) as { id?: string }
      setApplicationId(result.id || `ПР-${new Date().getFullYear()}`)
      if (result.id && isKitchen) trackQuizCompleted(result.id)
      reachGoal(isKitchen ? 'lead_project' : 'lead_wardrobe')
      setCompleted(true)
      localStorage.removeItem(DRAFT_KEY)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setError('Не получилось отправить — проверьте интернет и нажмите ещё раз. Ответы сохранены.')
    } finally {
      setIsSubmitting(false)
      setUploadProgress({ done: 0, total: 0 })
    }
  }

  const startAgain = () => { setAnswers(initialAnswers); setFiles([]); setStep(0); setCompleted(false); setApplicationId(''); setRestored(false); setWebsite(''); setStartedAt(Date.now()); setIsSubmitting(false); setUploadProgress({ done: 0, total: 0 }); setFilesFailed(0); setExactOpen(false); setExtrasOpen(false) }

  const name = answers.name.trim()
  const viaMax = answers.contactMethod === CONTACT_MAX

  if (completed) {
    const rise = (d: number) => enter(d, { t: 0.7, from: 'translateY(12px)', ease: 'var(--out)' })
    return (
      <FormMotion>
        {/* Финал квиза — тёмная сцена, как экран выбора: слева спасибо и что дальше,
            справа сводка, в которую влетают ответы, со штампом «Передано дизайнеру» */}
        <section className="hs bg-[#161412] text-background">
          <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl content-center gap-10 px-4 pb-16 pt-24 md:min-h-[calc(100svh-5rem)] md:px-6 md:pt-32 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-10">
            <div className="flex flex-col items-start lg:col-start-1 lg:row-start-1">
              <CheckBadge className="size-16 md:size-20" d={0.1} />
              <p className="hs-in mt-7 text-xs font-bold uppercase tracking-[0.28em] text-primary" style={rise(0.35)}>
                Заявка {applicationId}
              </p>
              <h1 className="flyer-title mt-3 text-balance text-4xl md:text-6xl">
                <span className="hs-mask">
                  <span style={{ '--d': '0.45s' } as CSSProperties}>{name ? `Спасибо, ${name}!` : 'Спасибо!'}</span>
                </span>
              </h1>
              <p className="hs-in mt-5 max-w-xl text-pretty leading-relaxed text-background/70" style={rise(0.65)}>
                Ответы уже у дизайнера. Он {viaMax ? 'напишет вам в Max' : 'позвонит'}, уточнит детали и предложит идеи и расчёт для {isKitchen ? 'вашей кухни' : 'вашего шкафа'}.
              </p>
              {filesFailed > 0 && (
                <p className="hs-in mt-5 max-w-xl rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4 text-sm leading-relaxed text-background/75" style={rise(0.8)}>
                  {filesFailed === 1 ? 'Один файл не удалось приложить' : `Файлов не удалось приложить: ${filesFailed}`} — сама заявка принята. Дизайнер попросит план и фото при разговоре.
                </p>
              )}
            </div>

            <SummaryCard
              className="w-full max-w-lg justify-self-center lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center"
              eyebrow="Что получил дизайнер"
              title={isKitchen ? 'Коротко о вашей кухне' : 'Коротко о вашем шкафе'}
              rows={summaryRows(answers, isKitchen, files.length - filesFailed)}
              stamp="Передано дизайнеру"
              d={0.5}
            />

            <div className="flex flex-col items-start gap-8 lg:col-start-1 lg:row-start-2">
              <NextSteps
                d={1.1}
                steps={[
                  viaMax
                    ? { icon: MessageCircle, title: 'Дизайнер напишет в Max', text: `Уточнит детали и предложит идеи. ${COMPANY.schedule}.` }
                    : { icon: Phone, title: 'Дизайнер позвонит', text: `Уточнит детали и предложит идеи. ${COMPANY.schedule}.` },
                  { icon: Ruler, title: 'Бесплатный замер', text: 'Приедем в удобное время, привезём образцы материалов.' },
                  { icon: PencilRuler, title: 'Проект и расчёт', text: '3D-проект и смета, стоимость фиксируем в договоре.' },
                ]}
              />
              <div className="hs-in flex flex-wrap gap-3" style={rise(2)}>
                {MAX_CHAT_URL && (
                  <a href={MAX_CHAT_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 font-bold text-primary-foreground transition-colors hover:bg-background hover:text-foreground">
                    Написать нам в Max
                  </a>
                )}
                <a href="/" className="inline-flex min-h-12 items-center justify-center rounded-full border border-background/30 px-7 font-bold text-background transition-colors hover:border-primary hover:text-primary">
                  Вернуться на сайт
                </a>
                <button type="button" onClick={startAgain} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 font-semibold text-background/70 transition-colors hover:text-primary">
                  <RotateCcw className="size-4" />
                  Пройти ещё раз
                </button>
              </div>
            </div>
          </div>
        </section>
      </FormMotion>
    )
  }

  const isContacts = step === CONTACTS_STEP
  const progress = progressLabel(step, QUESTIONS)

  return (
    <FormMotion>
    <section className="mx-auto min-h-[calc(100svh-5rem)] max-w-6xl px-4 pb-16 pt-24 md:px-6 md:pb-24 md:pt-32">
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="project-website">Ваш сайт</label>
        <input id="project-website" name="website" type="text" value={website} onChange={(event) => setWebsite(event.target.value)} autoComplete="off" tabIndex={-1} />
      </div>
      <div className="grid gap-8 lg:grid-cols-[17rem_1fr] lg:gap-12">
        <m.aside
          className="lg:sticky lg:top-28 lg:self-start"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        >
          <a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-primary"><ArrowLeft className="size-4" />На главную</a>
          <div className="mt-8 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{isKitchen ? 'Расчёт кухни' : 'Расчёт шкафа'}</p>
            {onChangeProduct && (
              <button type="button" onClick={onChangeProduct} className="text-xs font-semibold text-muted-foreground underline underline-offset-4 transition-colors hover:text-primary">
                {isKitchen ? 'Нужен шкаф?' : 'Нужна кухня?'}
              </button>
            )}
          </div>
          <div className="mt-3 h-5 overflow-hidden" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <m.p
                key={progress}
                className="text-sm font-semibold text-foreground"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              >
                {progress}
              </m.p>
            </AnimatePresence>
          </div>
          {/* Прогресс — линейкой с делениями; деление заполняется латунью слева направо */}
          <div className="mt-3 flex gap-1" aria-hidden="true">
            {steps.map((item, index) => (
              <span key={item.eyebrow} className="h-1.5 flex-1 overflow-hidden rounded-[1px] bg-border">
                <span className={cn('block h-full origin-left bg-primary transition-transform duration-500 ease-out', index <= step ? 'scale-x-100' : 'scale-x-0')} />
              </span>
            ))}
          </div>
          <ol className="mt-8 hidden flex-col gap-4 text-sm leading-relaxed text-muted-foreground lg:flex">
            {[`Ответьте на ${isKitchen ? 'пять' : 'шесть'} простых вопросов — можно «не знаю»`, 'Дизайнер подберёт идеи и посчитает стоимость', 'Созвонимся, когда вам удобно, и всё обсудим'].map((text, index) => (
              <li key={text} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/50 font-mono text-xs text-primary">{index + 1}</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 hidden text-xs leading-relaxed text-muted-foreground lg:block">Ответы сохраняются на этом устройстве — можно закрыть страницу и вернуться позже.</p>
        </m.aside>

        <m.div
          className="min-w-0 max-w-full overflow-hidden rounded-3xl border-2 border-primary bg-background p-5 shadow-[8px_8px_0_0_var(--primary)] sm:p-8 md:p-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE_OUT, delay: 0.08 }}
        >
          {restored && <div className="mb-6 flex items-start gap-3 rounded-2xl bg-muted p-4 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" /><span>С возвращением! Мы сохранили ваши ответы — продолжайте с того же места.</span></div>}
          {/* Вопрос целиком перелистывается: уходит в одну сторону, следующий
              приходит с другой, а внутри — лесенка: подпись, заголовок из-под
              маски, подсказка, варианты по очереди. Элементы только
              проявляются, без подъёма, а высота карточки меняется плавно */}
          <AutoHeight>
          <AnimatePresence mode="wait" custom={direction}>
          {/* Свой слой: шаг выезжает и проявляется на видеокарте, схемы внутри при этом не перерисовываются */}
          <m.div key={step} custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" style={{ willChange: 'transform, opacity' }}>
          <m.div variants={itemVariants}><PlanLabel index={step + 1}>{steps[step].eyebrow}</PlanLabel></m.div>
          <div className="-mb-1 mt-3 overflow-hidden pb-1">
            <m.h1 variants={maskVariants} className="flyer-title text-balance text-3xl text-foreground sm:text-4xl md:text-5xl">{steps[step].title}</m.h1>
          </div>
          {steps[step].hint && <m.p variants={itemVariants} className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">{steps[step].hint}</m.p>}
          <m.div variants={itemVariants} className="mt-8">
            {isKitchen && step === 0 && <SchemeChoices id="layout" mode="appear" frame={FRAMES.plan} options={LAYOUT_OPTIONS} value={answers.layout} onChange={(value) => answerAndGo('layout', value)} />}

            {isKitchen && step === 1 && (
              <div className="flex flex-col gap-5">
                <SchemeChoices id="size" mode="appear" wide frame={FRAMES.run} marks={RUN_MARKS} options={KITCHEN_SIZE_OPTIONS} value={answers.kitchenSize} onChange={chooseSize} />
                <Optional open={exactOpen} onToggle={() => setExactOpen((open) => !open)} label="Знаете точные размеры? Укажите — по желанию">
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Стена A, см" value={answers.wallA} onChange={(v) => update('wallA', v)} placeholder="Например, 320" inputMode="decimal" />
                      <Field label="Стена B, см" value={answers.wallB} onChange={(v) => update('wallB', v)} placeholder="Если есть" inputMode="decimal" />
                      <Field label="Стена C, см" value={answers.wallC} onChange={(v) => update('wallC', v)} placeholder="Если есть" inputMode="decimal" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Площадь помещения, м²" value={answers.roomArea} onChange={(v) => update('roomArea', v)} placeholder="Например, 14" inputMode="decimal" />
                      <Field label="Высота потолка, см" value={answers.ceilingHeight} onChange={(v) => update('ceilingHeight', v)} placeholder="Например, 270" inputMode="decimal" />
                    </div>
                  </div>
                </Optional>
              </div>
            )}

            {isKitchen && step === 2 && <ChoiceGrid options={optionSets.style} value={answers.style} onChange={(value) => answerAndGo('style', value)} />}

            {isKitchen && step === 3 && (
              <div className="flex flex-col gap-8">
                <WishGroup title="Техника">
                  <SchemeChoices id="appliances" mode="toggle" wide options={KITCHEN_APPLIANCES} value={answers.appliances} onChange={toggleWish} />
                </WishGroup>
                <WishGroup title="Удобства">
                  <SchemeChoices id="features" mode="toggle" options={KITCHEN_FEATURES} value={answers.features} onChange={toggleWish} />
                </WishGroup>
                <WishGroup title="Системы хранения" hint="Из нашего каталога. Отметьте — и схема покажет, как это работает.">
                  <SchemeChoices id="storage" mode="toggle" options={KITCHEN_STORAGE} value={answers.storage} onChange={toggleStorage} />
                </WishGroup>
              </div>
            )}

            {!isKitchen && step === 0 && <ChoiceGrid options={wardrobeOptions.room} value={answers.room} onChange={(value) => answerAndGo('room', value)} />}

            {!isKitchen && step === 1 && <SchemeChoices id="type" mode="appear" options={WARDROBE_TYPE_OPTIONS} value={answers.wardrobeType} onChange={(value) => answerAndGo('wardrobeType', value)} />}

            {!isKitchen && step === 2 && (
              <div className="flex flex-col gap-5">
                <SchemeChoices id="width" mode="appear" frame={FRAMES.wide} marks={RUN_MARKS} options={WARDROBE_WIDTH_OPTIONS} value={answers.wardrobeWidth} onChange={chooseWidth} />
                <Optional open={exactOpen} onToggle={() => setExactOpen((open) => !open)} label="Знаете точные размеры? Укажите — по желанию">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Ширина стены под шкаф, см" value={answers.wardrobeWidthCm} onChange={(v) => update('wardrobeWidthCm', v)} placeholder="Например, 240" inputMode="decimal" />
                    <Field label="Высота потолка, см" value={answers.ceilingHeight} onChange={(v) => update('ceilingHeight', v)} placeholder="Например, 270" inputMode="decimal" />
                  </div>
                </Optional>
              </div>
            )}

            {!isKitchen && step === 3 && <ChoiceGrid options={wardrobeOptions.facades} value={answers.facades} onChange={(value) => answerAndGo('facades', value)} />}

            {!isKitchen && step === 4 && (
              <div className="flex flex-col gap-8">
                <WishGroup title="Основное">
                  <SchemeChoices id="filling" mode="toggle" options={WARDROBE_FEATURES} value={answers.features} onChange={toggleWish} />
                </WishGroup>
                <WishGroup title="Системы хранения" hint="Из нашего каталога. Отметьте — и схема покажет, как это работает.">
                  <SchemeChoices id="storage" mode="toggle" options={WARDROBE_STORAGE} value={answers.storage} onChange={toggleStorage} />
                </WishGroup>
              </div>
            )}

            {step === TIMELINE_STEP && (
              <div className="flex flex-col gap-8">
                <ChoiceGrid options={optionSets.timeline} value={answers.timeline} onChange={(v) => update('timeline', v)} />
                <div>
                  <h2 className="font-bold">Есть ориентир по бюджету?</h2>
                  <p className="mb-4 mt-1 text-sm text-muted-foreground">Необязательно — это помогает сразу предложить подходящие материалы.</p>
                  <ChoiceGrid options={isKitchen ? optionSets.budget : wardrobeOptions.budget} value={answers.budget} onChange={(v) => update('budget', answers.budget === v ? '' : v)} />
                </div>
              </div>
            )}

            {isContacts && (
              <div className="flex flex-col gap-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Телефон" value={answers.phone} onChange={(v) => update('phone', formatRussianPhone(v))} placeholder={PHONE_PLACEHOLDER} type="tel" inputMode="tel" autoComplete="tel" maxLength={18} />
                  <Field label="Как к вам обращаться" value={answers.name} onChange={(v) => update('name', v)} placeholder="Необязательно" autoComplete="given-name" />
                </div>
                <div>
                  <h2 className="mb-3 text-sm font-bold">Как удобнее связаться?</h2>
                  <ChoiceGrid options={optionSets.contactMethod} value={answers.contactMethod} onChange={(v) => update('contactMethod', answers.contactMethod === v ? '' : v)} />
                </div>
                {!viaMax && (
                  <div>
                    <h2 className="mb-3 text-sm font-bold">Когда удобно поговорить? <span className="font-normal text-muted-foreground">— по желанию</span></h2>
                    <ChoiceGrid options={optionSets.contactTime} value={answers.contactTime} onChange={(v) => update('contactTime', answers.contactTime === v ? '' : v)} />
                  </div>
                )}
                <Optional open={extrasOpen} onToggle={() => setExtrasOpen((open) => !open)} label="Добавить город, комментарий или план квартиры — по желанию">
                  <div className="flex flex-col gap-5">
                    <Field label="Город или район" value={answers.location} onChange={(v) => update('location', v)} placeholder="Например, Химки" />
                    <label className="flex flex-col gap-2 text-sm font-semibold">
                      <span>Комментарий</span>
                      <textarea value={answers.comment} onChange={(e) => update('comment', e.target.value)} rows={3} placeholder="Что ещё важно знать дизайнеру" className="rounded-xl border-2 border-border bg-background p-4 text-base font-normal outline-none focus:border-primary" />
                    </label>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
                      className="flex flex-col items-start gap-3 rounded-2xl bg-muted p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <p className="text-sm text-muted-foreground">{isKitchen ? 'План квартиры или фото кухни' : 'План квартиры или фото стены под шкаф'} помогут точнее посчитать. JPG, PNG или PDF.</p>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background"><Paperclip className="size-4" />Прикрепить</button>
                      <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => e.target.files && addFiles(e.target.files)} className="sr-only" />
                    </div>
                    {files.length > 0 && <ul className="grid gap-3 sm:grid-cols-2">{files.map((item) => <li key={item.id} className="flex items-center gap-3 rounded-xl border border-border p-3">{item.url ? <img src={item.url} alt="Предпросмотр загруженного файла" className="size-12 rounded-lg object-cover" /> : <span className="flex size-12 items-center justify-center rounded-lg bg-muted"><FileText className="size-5" /></span>}<span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.file.name}</span><button type="button" onClick={() => removeFile(item.id)} aria-label={`Удалить ${item.file.name}`} className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><Trash2 className="size-4" /></button></li>)}</ul>}
                  </div>
                </Optional>
                <label className="flex items-start gap-3 rounded-2xl bg-muted p-4 text-sm leading-relaxed">
                  <input type="checkbox" checked={answers.consent} onChange={(e) => update('consent', e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-primary" />
                  <span>Согласен на обработку персональных данных, чтобы со мной связались по проекту, и принимаю <a href="/privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="underline underline-offset-2 hover:text-primary">политику конфиденциальности</a>.</span>
                </label>
              </div>
            )}
          </m.div>
          </m.div>
          </AnimatePresence>
          </AutoHeight>

          {/* Не красная ошибка, а подсказка: человек ничего не сломал */}
          <AnimatePresence>
            {error && (
              <m.p
                key={error}
                role="alert"
                className="mt-6 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm font-semibold text-foreground"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                {error}
              </m.p>
            )}
          </AnimatePresence>
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            {step > 0
              ? <button type="button" onClick={() => goTo(step - 1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-border px-6 font-bold text-foreground transition-colors hover:border-primary"><ArrowLeft className="size-4" />Назад</button>
              : <span className="hidden sm:block" />}
            {isContacts
              ? <button type="button" onClick={finish} disabled={isSubmitting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 font-bold text-primary-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? (uploadProgress.total > 0 && uploadProgress.done < uploadProgress.total ? `Загружаем файлы ${uploadProgress.done}/${uploadProgress.total}…` : 'Отправляем…') : 'Получить расчёт бесплатно'}<CheckCircle2 className="size-5" /></button>
              : answered[step]
                ? <button type="button" onClick={() => goTo(step + 1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 font-bold text-primary-foreground transition-colors hover:bg-foreground hover:text-background">Далее<ArrowRight className="size-4" /></button>
                : <button type="button" onClick={() => goTo(step + 1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-primary px-7 font-bold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground">Пропустить<ArrowRight className="size-4" /></button>}
          </div>
          <p className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:justify-end">
            {['Бесплатно', 'Ни к чему не обязывает', 'Без спама'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" aria-hidden="true" />{item}</span>
            ))}
          </p>
        </m.div>
      </div>
    </section>
    </FormMotion>
  )
}
