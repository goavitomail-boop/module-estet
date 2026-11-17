'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { AnimatePresence, m } from 'framer-motion'
import { Check, Eye, EyeOff, FileText, GripVertical, Loader2, Plus, Send, Trash2, Upload, X } from 'lucide-react'
import {
  addVisitAction,
  attachOrderFilesAction,
  deleteOrderFileAction,
  deleteVisitAction,
  postMessageAction,
  saveSpecAction,
  setProjectStatusAction,
  setStageAction,
  updateOrderAction,
  updateOrderFileAction,
} from '@/app/admin/cabinet-actions'
import {
  ORDER_FILE_KINDS,
  ORDER_STAGES,
  PRODUCTS,
  VISIT_KINDS,
  fileKind,
  formatDay,
  formatTime,
  stageIndex,
  visitKindLabel,
  type Order,
  type OrderFile,
  type OrderVisit,
  type ProjectStatus,
  type SpecRow,
} from '@/lib/cabinet-shared'
import { formatFileSize } from '@/lib/admin-format'
import { formatRussianPhone } from '@/lib/phone'
import { uploadFile } from '@/lib/upload-client'
import { toast } from '../../../_components/toast'
import { SPRING } from '../../../_components/motion'
import { cn } from '@/lib/utils'

/* ── Общее ─────────────────────────────────────────────────────────── */

function sent(base: string, notified?: boolean) {
  toast.success(notified ? `${base} · клиенту ушло сообщение в MAX` : base)
}

/** «Сообщить клиенту в MAX». Без привязки — выключено, с объяснением */
function NotifyToggle({ checked, onChange, maxLinked }: { checked: boolean; onChange: (v: boolean) => void; maxLinked: boolean }) {
  return (
    <label className={cn('inline-flex items-center gap-2 text-xs', maxLinked ? 'cursor-pointer text-foreground' : 'text-muted-foreground')}>
      <input
        type="checkbox"
        checked={maxLinked && checked}
        disabled={!maxLinked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--primary)]"
      />
      {maxLinked ? 'Сообщить клиенту в MAX' : 'MAX не привязан — увидит в кабинете'}
    </label>
  )
}

function useRun() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const run = (task: () => Promise<void>) =>
    start(async () => {
      try {
        await task()
        router.refresh()
      } catch (error) {
        console.error(error)
        toast.error('Не сохранилось — проверьте связь и повторите')
      }
    })
  return { pending, run }
}

/* ── Этап ──────────────────────────────────────────────────────────── */

/**
 * Этап одним нажатием: подложка переезжает сразу, сервер догоняет.
 * На «Производство» сервер сам ставит дату начала и готовность через 14 дней.
 */
export function StageControl({ orderId, stage, maxLinked }: { orderId: string; stage: string; maxLinked: boolean }) {
  const [shown, setShown] = useState(stage)
  const [notify, setNotify] = useState(true)
  const { pending, run } = useRun()
  useEffect(() => setShown(stage), [stage])
  const current = stageIndex(shown)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
        {ORDER_STAGES.map((item, index) => {
          const active = item.value === shown
          return (
            <button
              key={item.value}
              type="button"
              disabled={pending}
              onClick={() => {
                if (active) return
                const previous = shown
                setShown(item.value)
                run(async () => {
                  try {
                    const result = await setStageAction(orderId, item.value, notify)
                    sent(`Этап: ${item.label}`, result.notified)
                  } catch (error) {
                    setShown(previous)
                    throw error
                  }
                })
              }}
              className={cn(
                'relative flex min-h-14 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium',
                active ? 'border-transparent text-background' : index < current ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-secondary'
              )}
            >
              {active && <m.span layoutId={`stage-${orderId}`} className="absolute inset-0 rounded-lg bg-foreground" transition={SPRING} aria-hidden />}
              <span
                className={cn(
                  'relative flex size-6 shrink-0 items-center justify-center rounded-full text-[11px]',
                  active ? 'bg-background/15' : index < current ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                )}
              >
                {index < current ? <Check className="size-3.5" aria-hidden /> : index + 1}
              </span>
              <span className="relative leading-tight">{item.label}</span>
              {active && pending && <Loader2 className="relative ml-auto size-4 animate-spin" aria-hidden />}
            </button>
          )
        })}
      </div>
      <NotifyToggle checked={notify} onChange={setNotify} maxLinked={maxLinked} />
    </div>
  )
}

/* ── Проект ────────────────────────────────────────────────────────── */

export function ProjectControl({
  orderId,
  status,
  maxLinked,
  lastChanges,
}: {
  orderId: string
  status: ProjectStatus
  maxLinked: boolean
  lastChanges: { text: string; at: string } | null
}) {
  const [notify, setNotify] = useState(true)
  const { pending, run } = useRun()
  const set = (next: ProjectStatus, label: string) =>
    run(async () => {
      const result = await setProjectStatusAction(orderId, next, notify)
      sent(label, result.notified)
    })

  return (
    <div className="space-y-3">
      {status === 'changes' && lastChanges && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-400/10 p-3 text-sm">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Клиент просит правки · {formatDay(lastChanges.at)}</p>
          <p className="mt-1 whitespace-pre-line">{lastChanges.text}</p>
        </div>
      )}
      {status === 'approved' && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
          <Check className="size-4" aria-hidden />
          Клиент согласовал проект
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {status !== 'sent' ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => set('sent', 'Проект отправлен на согласование')}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
            {status === 'changes' ? 'Отправить новый вариант' : 'Отправить на согласование'}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => set('none', 'Проект снят с согласования')}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-secondary"
          >
            Снять с согласования
          </button>
        )}
        {status !== 'approved' && (
          <button
            type="button"
            disabled={pending}
            onClick={() => set('approved', 'Проект отмечен согласованным')}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Согласовали по телефону
          </button>
        )}
      </div>
      {status !== 'sent' && <NotifyToggle checked={notify} onChange={setNotify} maxLinked={maxLinked} />}
    </div>
  )
}

const SPEC_PRESETS = ['Фасады', 'Корпус', 'Столешница', 'Фартук', 'Фурнитура', 'Ручки', 'Подсветка', 'Мойка', 'Техника']

/** Спецификация строками «что — из чего»: клиент видит её под визуализациями */
export function SpecEditor({ orderId, spec }: { orderId: string; spec: SpecRow[] }) {
  const [rows, setRows] = useState<SpecRow[]>(spec.length ? spec : [{ label: 'Фасады', value: '' }])
  const { pending, run } = useRun()
  const dirty = JSON.stringify(rows.filter((r) => r.label || r.value)) !== JSON.stringify(spec)
  const update = (index: number, patch: Partial<SpecRow>) => setRows((list) => list.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const used = new Set(rows.map((r) => r.label))

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {rows.map((row, index) => (
          <m.div
            key={index}
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING}
            className="flex items-center gap-2"
          >
            <GripVertical className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />
            <input
              value={row.label}
              onChange={(e) => update(index, { label: e.target.value })}
              placeholder="Что"
              className="input-admin w-32 shrink-0 sm:w-40"
              aria-label="Позиция"
            />
            <input
              value={row.value}
              onChange={(e) => update(index, { value: e.target.value })}
              placeholder="МДФ эмаль, белый матовый"
              className="input-admin min-w-0 flex-1"
              aria-label="Материал"
            />
            <button
              type="button"
              onClick={() => setRows((list) => list.filter((_, i) => i !== index))}
              aria-label="Убрать строку"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="size-4" aria-hidden />
            </button>
          </m.div>
        ))}
      </AnimatePresence>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {SPEC_PRESETS.filter((label) => !used.has(label)).map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setRows((list) => [...list, { label, value: '' }])}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-border px-2.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
          >
            <Plus className="size-3" aria-hidden />
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setRows((list) => [...list, { label: '', value: '' }])}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-border px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3" aria-hidden />
          Своя строка
        </button>
      </div>
      <AnimatePresence initial={false}>
        {dirty && (
          <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await saveSpecAction(orderId, rows)
                  toast.success('Спецификация сохранена')
                })
              }
              className="mt-1 inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Сохранить спецификацию
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Файлы ─────────────────────────────────────────────────────────── */

const MAX_SIZE = 25 * 1024 * 1024
const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.heic'
const DOC_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx'

/**
 * Файлы заказа одного вида: визуализации (project), документы (docs) или
 * фотоотчёт (photo). Грузятся из браузера прямо в хранилище, потом одним
 * действием записываются в заказ — одна запись в ленте и одно сообщение
 * клиенту на всю пачку.
 */
export function OrderFilesEditor({
  orderId,
  files,
  mode,
  maxLinked,
}: {
  orderId: string
  files: OrderFile[]
  mode: 'project' | 'docs' | 'photo'
  maxLinked: boolean
}) {
  const kinds = ORDER_FILE_KINDS.filter((k) => k.group === mode)
  const [kind, setKind] = useState<string>(kinds[0].value)
  const [caption, setCaption] = useState('')
  const [visible, setVisible] = useState(true)
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { run } = useRun()
  const images = mode !== 'docs'

  async function handle(list: FileList | null) {
    if (!list || list.length === 0) return
    const picked = Array.from(list).filter((file) => {
      if (file.size <= MAX_SIZE) return true
      toast.error(`«${file.name}» больше 25 МБ`)
      return false
    })
    if (picked.length === 0) return
    setBusy({ done: 0, total: picked.length })
    const uploaded: Array<{ pathname: string; name: string; size: number; contentType: string; caption: string }> = []
    for (const file of picked) {
      try {
        const result = await uploadFile(
          file,
          { endpoint: '/admin/upload', folder: `orders/${orderId}`, blobPath: `orders/${orderId}/${Date.now()}-${file.name}` },
          120_000
        )
        uploaded.push({ pathname: result.pathname, name: file.name, size: file.size, contentType: file.type, caption: picked.length === 1 ? caption : '' })
      } catch (error) {
        console.error(error)
        toast.error(`Не загрузился «${file.name}»`)
      }
      setBusy((b) => (b ? { ...b, done: b.done + 1 } : b))
    }
    if (inputRef.current) inputRef.current.value = ''
    if (uploaded.length > 0) {
      run(async () => {
        const result = await attachOrderFilesAction({ orderId, kind, visible, notify: notify && visible, files: uploaded })
        if (result.error) toast.error(result.error)
        else {
          sent(uploaded.length === 1 ? 'Файл добавлен' : `Добавлено файлов: ${uploaded.length}`, result.notified)
          setCaption('')
        }
      })
    }
    setBusy(null)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {kinds.length > 1 && (
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="input-admin w-auto min-w-40 flex-1 sm:flex-none" aria-label="Что за файл">
              {kinds.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          )}
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={mode === 'photo' ? 'Подпись: «Фасады после покраски»' : mode === 'project' ? 'Подпись: «Вид от окна»' : 'Название для клиента: «Договор №12»'}
            className="input-admin min-w-0 flex-[2]"
            aria-label="Подпись"
          />
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60 md:h-10"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
            {busy ? `${busy.done} из ${busy.total}` : images ? 'Добавить фото' : 'Добавить файл'}
          </button>
          <input ref={inputRef} type="file" multiple className="hidden" accept={images ? IMAGE_ACCEPT : DOC_ACCEPT} onChange={(e) => handle(e.target.files)} />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-4 accent-[var(--primary)]" />
            Показать клиенту сразу
          </label>
          {visible && <NotifyToggle checked={notify} onChange={setNotify} maxLinked={maxLinked} />}
        </div>
        {busy && (
          <div className="h-1 overflow-hidden rounded-full bg-secondary">
            <m.div className="h-full bg-primary" animate={{ width: `${(busy.done / busy.total) * 100}%` }} transition={{ ease: 'easeOut' }} />
          </div>
        )}
      </div>

      {files.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {mode === 'photo'
            ? 'Фото с производства и монтажа — клиент видит их галереей.'
            : mode === 'project'
              ? 'Рендеры проекта — клиент видит их перед кнопкой «Согласовать».'
              : 'Договор, счета, дизайн-проект в PDF, гарантийный талон.'}
        </p>
      ) : images ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((file) => (
            <FileTile key={file.id} file={file} />
          ))}
        </ul>
      ) : (
        <ul className="-my-1 divide-y divide-border">
          {files.map((file) => (
            <FileRow key={file.id} file={file} />
          ))}
        </ul>
      )}
    </div>
  )
}

function useFileActions(file: OrderFile) {
  const { pending, run } = useRun()
  return {
    pending,
    toggle: () =>
      run(async () => {
        await updateOrderFileAction(file.id, { visible: !file.visible })
        toast.success(file.visible ? 'Скрыто от клиента' : 'Клиент видит файл')
      }),
    remove: () =>
      run(async () => {
        await deleteOrderFileAction(file.id)
        toast.success('Файл удалён')
      }),
    caption: (value: string) =>
      value !== file.caption &&
      run(async () => {
        await updateOrderFileAction(file.id, { caption: value })
        toast.success('Подпись сохранена')
      }),
  }
}

function FileTile({ file }: { file: OrderFile }) {
  const { pending, toggle, remove, caption } = useFileActions(file)
  const href = `/admin/file?path=${encodeURIComponent(file.pathname)}`
  return (
    <li className={cn('overflow-hidden rounded-lg border border-border bg-background', !file.visible && 'opacity-60', pending && 'animate-pulse')}>
      <a href={href} target="_blank" rel="noopener noreferrer" className="relative block aspect-[4/3] bg-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt="" loading="lazy" className="size-full object-cover" />
        {!file.visible && (
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">скрыто</span>
        )}
      </a>
      <div className="flex items-center gap-1 p-1.5">
        <input
          defaultValue={file.caption}
          onBlur={(e) => caption(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="Подпись"
          className="h-8 min-w-0 flex-1 rounded-md bg-transparent px-1.5 text-xs outline-none focus:bg-secondary"
          aria-label="Подпись к фото"
        />
        <IconButton label={file.visible ? 'Скрыть от клиента' : 'Показать клиенту'} onClick={toggle}>
          {file.visible ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
        </IconButton>
        <IconButton label="Удалить" onClick={remove} danger>
          <Trash2 className="size-3.5" aria-hidden />
        </IconButton>
      </div>
    </li>
  )
}

function FileRow({ file }: { file: OrderFile }) {
  const { pending, toggle, remove, caption } = useFileActions(file)
  const href = `/admin/file?path=${encodeURIComponent(file.pathname)}`
  return (
    <li className={cn('flex items-center gap-3 py-2.5', !file.visible && 'opacity-60', pending && 'animate-pulse')}>
      <a href={href} target="_blank" rel="noopener noreferrer" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground">
        <FileText className="size-4" aria-hidden />
      </a>
      <div className="min-w-0 flex-1">
        <input
          defaultValue={file.caption}
          onBlur={(e) => caption(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder={file.name}
          className="h-7 w-full rounded-md bg-transparent px-1 text-sm font-medium outline-none focus:bg-secondary"
          aria-label="Название для клиента"
        />
        <p className="truncate px-1 text-xs text-muted-foreground">
          {fileKind(file.kind).label} · {formatFileSize(Number(file.size))} · {formatDay(file.created_at)}
          {!file.visible && ' · скрыт от клиента'}
        </p>
      </div>
      <IconButton label={file.visible ? 'Скрыть от клиента' : 'Показать клиенту'} onClick={toggle}>
        {file.visible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
      </IconButton>
      <IconButton label="Удалить" onClick={remove} danger>
        <Trash2 className="size-4" aria-hidden />
      </IconButton>
    </li>
  )
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground',
        danger ? 'hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-secondary hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

/* ── Визиты ────────────────────────────────────────────────────────── */

export function VisitsEditor({ orderId, visits, maxLinked }: { orderId: string; visits: OrderVisit[]; maxLinked: boolean }) {
  const [kind, setKind] = useState<string>('measurement')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [note, setNote] = useState('')
  const [notify, setNotify] = useState(true)
  const { pending, run } = useRun()
  const now = Date.now()

  return (
    <div className="space-y-4">
      {visits.length > 0 && (
        <ul className="space-y-2">
          {visits.map((visit) => {
            const past = new Date(visit.starts_at).getTime() < now - 3 * 3600_000
            return (
              <li key={visit.id} className={cn('flex items-start gap-2 rounded-lg border border-border p-2.5', past && 'opacity-55')}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{visitKindLabel(visit.kind)}</p>
                  <p className="text-xs text-muted-foreground first-letter:uppercase">
                    {formatDay(visit.starts_at, true)}, {formatTime(visit.starts_at)}
                  </p>
                  {visit.note && <p className="mt-0.5 text-xs">{visit.note}</p>}
                </div>
                <IconButton
                  label="Отменить визит"
                  danger
                  onClick={() =>
                    run(async () => {
                      await deleteVisitAction(visit.id)
                      toast.success('Визит отменён')
                    })
                  }
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </IconButton>
              </li>
            )
          })}
        </ul>
      )}

      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          run(async () => {
            const result = await addVisitAction({ orderId, kind, date, time, note, notify })
            if (result.error) toast.error(result.error)
            else {
              sent(`${visitKindLabel(kind)} запланирован`, result.notified)
              setNote('')
              setDate('')
            }
          })
        }}
      >
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="input-admin" aria-label="Что за визит">
          {VISIT_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-[1fr_8.5rem] gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="input-admin" aria-label="Дата" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required step={900} className="input-admin" aria-label="Время, Москва" />
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Кто приедет, что подготовить" className="input-admin" />
        <NotifyToggle checked={notify} onChange={setNotify} maxLinked={maxLinked} />
        <button
          type="submit"
          disabled={pending || !date}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          Запланировать
        </button>
        <p className="text-[11px] text-muted-foreground">Время — московское. У клиента будет кнопка «В календарь» и «Перенести».</p>
      </form>
    </div>
  )
}

/* ── Данные заказа ─────────────────────────────────────────────────── */

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary disabled:opacity-60"
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      Сохранить
    </button>
  )
}

export function OrderDetailsForm({ order }: { order: Order }) {
  const [state, action] = useActionState(updateOrderAction, null)
  const [phone, setPhone] = useState(order.manager_phone ? formatRussianPhone(order.manager_phone) : '')
  useEffect(() => {
    if (state?.ok) toast.success('Данные заказа сохранены')
  }, [state])

  const field = (label: string, input: React.ReactNode) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {input}
    </label>
  )

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={order.id} />
      {field('Название', <input name="title" defaultValue={order.title} required className="input-admin" />)}
      {field(
        'Что делаем',
        <select name="product" defaultValue={order.product} className="input-admin">
          {PRODUCTS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      )}
      {field('Адрес', <input name="address" defaultValue={order.address} className="input-admin" />)}
      <div className="grid grid-cols-2 gap-2">
        {field('Начало производства', <input type="date" name="productionStarted" defaultValue={order.production_started ?? ''} className="input-admin" />)}
        {field('Готовность', <input type="date" name="readyDate" defaultValue={order.ready_date ?? ''} className="input-admin" />)}
      </div>
      {field('Менеджер', <input name="managerName" defaultValue={order.manager_name} placeholder="Имя — его видит клиент" className="input-admin" />)}
      {field(
        'Телефон менеджера',
        <input
          name="managerPhone"
          value={phone}
          onChange={(e) => setPhone(formatRussianPhone(e.target.value))}
          inputMode="tel"
          placeholder="Пусто — общий номер компании"
          className="input-admin tabular-nums"
        />
      )}
      {state?.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{state.error}</p>}
      <SaveButton />
    </form>
  )
}

/* ── Сообщение клиенту ─────────────────────────────────────────────── */

export function MessageForm({ orderId, maxLinked }: { orderId: string; maxLinked: boolean }) {
  const [text, setText] = useState('')
  const [notify, setNotify] = useState(true)
  const { pending, run } = useRun()
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        run(async () => {
          const result = await postMessageAction(orderId, text, notify)
          if (result.error) toast.error(result.error)
          else {
            sent('Сообщение в ленте заказа', result.notified)
            setText('')
          }
        })
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Сообщение клиенту: «Фасады покрасили, на следующей неделе — сборка»"
        className="input-admin resize-y"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <NotifyToggle checked={notify} onChange={setNotify} maxLinked={maxLinked} />
        <button
          type="submit"
          disabled={pending || text.trim().length < 2}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-3.5" aria-hidden />}
          Отправить
        </button>
      </div>
    </form>
  )
}
