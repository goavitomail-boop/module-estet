'use client'

import { useCallback, useEffect, useId, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, m, useDragControls, type PanInfo } from 'framer-motion'
import { ArrowUpRight, BellRing, Check, Loader2, Pencil, Phone, StickyNote, UserRound, Wallet, X } from 'lucide-react'
import {
  addNoteAction,
  assignAction,
  changeStatusAction,
  setAmountAction,
  setReminderAction,
  updateContactAction,
  type StatusFormState,
} from '@/app/admin/actions'
import { LEAD_STATUSES, REJECT_REASONS, type LeadStatus } from '@/lib/db'
import type { QuickLead } from '@/lib/quick-lead'
import { STATUS_TEXT, formatDateTime, prettyPhone, telHref } from '@/lib/admin-format'
import { formatRussianPhone } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { STATUS_UI, TypeBadge } from './ui'
import { SPRING, SPRING_SOFT } from './motion'
import { toast } from './toast'
import { refreshPulse } from './pulse'

export type { QuickLead }

const OPEN_EVENT = 'admin:quick-edit'

export function openQuickEdit(lead: QuickLead) {
  window.dispatchEvent(new CustomEvent<QuickLead>(OPEN_EVENT, { detail: lead }))
}

/** Кнопка «Быстро изменить» для строки списка */
export function QuickEditButton({ lead, variant = 'icon' }: { lead: QuickLead; variant?: 'icon' | 'bar' }) {
  if (variant === 'bar') {
    return (
      <button
        type="button"
        onClick={() => openQuickEdit(lead)}
        className="flex h-12 items-center justify-center gap-2 border-l border-border bg-secondary/40 px-5 text-sm font-medium text-foreground active:bg-secondary"
      >
        <Pencil className="size-4 opacity-60" aria-hidden />
        Изменить
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={() => openQuickEdit(lead)}
      aria-label={`Быстро изменить заявку ${lead.id}`}
      title="Быстро изменить"
      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-sm focus-visible:text-foreground"
    >
      <Pencil className="size-4" aria-hidden />
    </button>
  )
}

/* ── Помощники ─────────────────────────────────────────────────────── */

function useWide() {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const update = () => setWide(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return wide
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Формат поля datetime-local — тот же, что отправляет форма в карточке заявки */
function toLocalInput(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Быстрые сроки напоминания: то, что менеджер ставит чаще всего */
function reminderPresets(): Array<{ label: string; value: string }> {
  const now = new Date()
  const inTwoHours = new Date(now.getTime() + 2 * 3600_000)
  inTwoHours.setMinutes(Math.ceil(inTwoHours.getMinutes() / 15) * 15, 0, 0)
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)
  const inThreeDays = new Date(now)
  inThreeDays.setDate(now.getDate() + 3)
  inThreeDays.setHours(10, 0, 0, 0)
  return [
    { label: 'Через 2 часа', value: toLocalInput(inTwoHours) },
    { label: 'Завтра в 10', value: toLocalInput(tomorrow) },
    { label: 'Через 3 дня', value: toLocalInput(inThreeDays) },
  ]
}

function formData(entries: Record<string, string | undefined>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) if (value !== undefined) data.set(key, value)
  return data
}

/* ── Панель ────────────────────────────────────────────────────────── */

/**
 * Быстрое редактирование заявки прямо из списка: статус, контакты,
 * ответственный, напоминание, сумма и заметка — без перехода в карточку.
 *
 * На широком экране — панель справа, список остаётся виден; на телефоне —
 * лист снизу, закрывается свайпом вниз. Каждый блок сохраняется отдельно
 * теми же серверными экшенами, что и карточка, поэтому история заявки
 * пишется так же. Статус меняется сразу по нажатию — подложка переезжает
 * мгновенно, а при отказе сервера возвращается назад.
 */
export function QuickEditDrawer({ managers }: { managers: string[] }) {
  const router = useRouter()
  const wide = useWide()
  const [lead, setLead] = useState<QuickLead | null>(null)
  const [portal, setPortal] = useState<HTMLElement | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const dragControls = useDragControls()

  useEffect(() => setPortal(document.getElementById('admin-portal')), [])

  useEffect(() => {
    const onOpen = (event: Event) => {
      returnFocus.current = document.activeElement as HTMLElement | null
      setLead((event as CustomEvent<QuickLead>).detail)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  const close = useCallback(() => {
    setLead(null)
    // Без прокрутки: кнопка в широкой таблице, и фокус иначе сдвигал её вбок
    returnFocus.current?.focus?.({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (!lead) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    const html = document.documentElement
    const previous = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      html.style.overflow = previous
    }
  }, [lead, close])

  // Сменили заявку — фокус на «Закрыть», чтобы Esc и Tab работали сразу
  const leadId = lead?.id
  useEffect(() => {
    if (leadId) setTimeout(() => closeRef.current?.focus(), 60)
  }, [leadId])

  /**
   * Сохранение одного блока. Возвращает true при успехе. Экшен формы без
   * результата (назначение, сумма…) считается успешным, если не упал.
   */
  const save = useCallback(
    (key: string, action: () => Promise<StatusFormState | void>, success: string, patch?: Partial<QuickLead>) =>
      new Promise<boolean>((resolve) => {
        setBusy(key)
        startTransition(async () => {
          try {
            const result = await action()
            if (result && result.error) {
              toast.error(result.error)
              resolve(false)
              return
            }
            if (patch) setLead((current) => (current ? { ...current, ...patch } : current))
            toast.success(success)
            refreshPulse()
            router.refresh()
            resolve(true)
          } catch {
            toast.error('Не сохранилось — проверьте связь и повторите')
            resolve(false)
          } finally {
            setBusy(null)
          }
        })
      }),
    [router]
  )

  if (!portal) return null

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 500) close()
  }

  return createPortal(
    <AnimatePresence>
      {lead && (
        <div className="fixed inset-0 z-[55]" key="quick-edit">
          <m.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={close}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
          />
          <m.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              'absolute flex flex-col overflow-hidden bg-[var(--admin-bg)] text-foreground shadow-[0_0_60px_-10px_rgb(0_0_0/0.4)]',
              wide
                ? 'inset-y-0 right-0 w-[440px] border-l border-border'
                : 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t border-border'
            )}
            initial={wide ? { x: '100%' } : { y: '100%' }}
            animate={wide ? { x: 0 } : { y: 0 }}
            exit={
              wide
                ? { x: '100%', transition: { type: 'tween', duration: 0.24, ease: [0.55, 0, 0.75, 0] } }
                : { y: '100%', transition: { type: 'tween', duration: 0.24, ease: [0.55, 0, 0.75, 0] } }
            }
            transition={SPRING_SOFT}
            drag={wide ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.6 }}
            dragListener={false}
            dragControls={dragControls}
            onDragEnd={onDragEnd}
          >
            {!wide && (
              // Тянуть лист можно только за «ручку» — иначе свайп мешал бы прокрутке полей
              <div
                className="flex cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing"
                onPointerDown={(event) => dragControls.start(event)}
                aria-hidden
              >
                <span className="h-1 w-10 rounded-full bg-foreground/20" />
              </div>
            )}

            <Header lead={lead} titleId={titleId} closeRef={closeRef} onClose={close} />

            <m.div
              key={lead.id}
              className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5"
              initial="hidden"
              animate="shown"
              variants={{ shown: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } } }}
            >
              <StatusSection lead={lead} busy={busy} save={save} />
              <ContactSection lead={lead} busy={busy} save={save} />
              <AssignSection lead={lead} managers={managers} busy={busy} save={save} />
              <ReminderSection lead={lead} busy={busy} save={save} />
              <AmountSection lead={lead} busy={busy} save={save} />
              <NoteSection lead={lead} busy={busy} save={save} />
            </m.div>
          </m.aside>
        </div>
      )}
    </AnimatePresence>,
    portal
  )
}

type SaveFn = (
  key: string,
  action: () => Promise<StatusFormState | void>,
  success: string,
  patch?: Partial<QuickLead>
) => Promise<boolean>

interface SectionProps {
  lead: QuickLead
  busy: string | null
  save: SaveFn
}

function Header({
  lead,
  titleId,
  closeRef,
  onClose,
}: {
  lead: QuickLead
  titleId: string
  closeRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}) {
  return (
    <header className="flex items-start gap-3 border-b border-border px-4 pb-3 pt-2 sm:px-5 lg:pt-5">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-accent-foreground">
          <span className="h-px w-5 bg-primary" aria-hidden />
          Быстрая правка
        </p>
        <h2 id={titleId} className="admin-display mt-1 truncate text-2xl leading-tight">
          {lead.name || 'Без имени'}
        </h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{lead.id}</span>
          <TypeBadge type={lead.type} />
          <a href={telHref(lead.phone)} className="inline-flex items-center gap-1 tabular-nums hover:text-foreground">
            <Phone className="size-3.5" aria-hidden />
            {prettyPhone(lead.phone)}
          </a>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/admin/leads/${encodeURIComponent(lead.id)}`}
          className="admin-press flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          Карточка
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </header>
  )
}

/** Блок панели: появляется по очереди за соседями */
function Block({ title, icon: Icon, children }: { title: string; icon?: typeof Phone; children: React.ReactNode }) {
  return (
    <m.section
      variants={{ hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0 } }}
      transition={SPRING}
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />}
        {title}
      </h3>
      {children}
    </m.section>
  )
}

function SaveButton({
  busy,
  disabled,
  children,
  onClick,
  variant = 'secondary',
}: {
  busy: boolean
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={busy || disabled}
      className={cn(
        'flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45',
        variant === 'primary'
          ? 'bg-foreground text-background hover:opacity-90'
          : 'border border-border bg-card hover:bg-secondary'
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
}

/* ── Статус ── */

function StatusSection({ lead, busy, save }: SectionProps) {
  const [shown, setShown] = useState<LeadStatus>(lead.status)
  const [askReason, setAskReason] = useState(false)
  const [reason, setReason] = useState(lead.reject_reason ?? '')

  useEffect(() => {
    setShown(lead.status)
    setAskReason(false)
  }, [lead.id, lead.status])

  const apply = async (status: LeadStatus, rejectReason?: string) => {
    const previous = shown
    setShown(status) // подложка переезжает сразу, не дожидаясь сервера
    const ok = await save(
      'status',
      () => changeStatusAction(null, formData({ id: lead.id, status, rejectReason })),
      `Статус: ${STATUS_TEXT[status]}`,
      { status, reject_reason: rejectReason ?? lead.reject_reason }
    )
    if (!ok) setShown(previous)
    else setAskReason(false)
  }

  return (
    <Block title="Статус">
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-3">
        {LEAD_STATUSES.map((status) => {
          const Icon = STATUS_UI[status].icon
          const active = shown === status
          return (
            <button
              key={status}
              type="button"
              disabled={busy === 'status'}
              onClick={() => {
                if (status === shown) return
                if (status === 'rejected') setAskReason(true)
                else apply(status)
              }}
              aria-pressed={active}
              className={cn(
                'relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-center text-[11px] font-medium leading-tight',
                active ? 'text-background' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                askReason && status === 'rejected' && !active && 'bg-secondary text-foreground ring-1 ring-inset ring-border'
              )}
            >
              {active && (
                <m.span
                  layoutId={`qe-status-${lead.id}`}
                  className="absolute inset-0 rounded-lg bg-foreground"
                  transition={SPRING}
                  aria-hidden
                />
              )}
              <span className="relative flex flex-col items-center gap-1">
                {active && busy === 'status' ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Icon className="size-4" aria-hidden />
                )}
                {STATUS_TEXT[status]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Причина отказа — сразу, она важнее всего для аналитики */}
      <AnimatePresence initial={false}>
        {askReason && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex gap-2">
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="input-admin min-w-0 flex-1"
                aria-label="Причина отказа"
              >
                <option value="">Причина не указана</option>
                {REJECT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <SaveButton busy={busy === 'status'} variant="primary" onClick={() => apply('rejected', reason)}>
                Отказ
              </SaveButton>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </Block>
  )
}

/* ── Контакты ── */

function ContactSection({ lead, busy, save }: SectionProps) {
  const [name, setName] = useState(lead.name)
  const [phone, setPhone] = useState(formatRussianPhone(lead.phone))
  const [city, setCity] = useState(lead.city ?? '')
  const [address, setAddress] = useState(lead.address ?? '')
  const measurement = lead.type === 'measurement'

  useEffect(() => {
    setName(lead.name)
    setPhone(formatRussianPhone(lead.phone))
    setCity(lead.city ?? '')
    setAddress(lead.address ?? '')
  }, [lead.id, lead.name, lead.phone, lead.city, lead.address])

  const dirty =
    name.trim() !== lead.name ||
    phone.replace(/\D/g, '') !== lead.phone.replace(/\D/g, '') ||
    (measurement && (city.trim() !== (lead.city ?? '') || address.trim() !== (lead.address ?? '')))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!dirty) return
    save(
      'contact',
      () =>
        updateContactAction(
          null,
          formData({
            id: lead.id,
            name,
            phone,
            city: measurement ? city : undefined,
            address: measurement ? address : undefined,
          })
        ),
      'Данные клиента сохранены',
      {
        name: name.trim(),
        phone: `+7${phone.replace(/\D/g, '').slice(-10)}`,
        city: city.trim(),
        address: address.trim(),
      }
    )
  }

  return (
    <Block title="Клиент" icon={UserRound}>
      <form onSubmit={submit} className="space-y-2.5">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
          <Field label="Имя">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-admin" autoComplete="off" />
          </Field>
          <Field label="Телефон">
            <input
              value={phone}
              onChange={(e) => setPhone(formatRussianPhone(e.target.value))}
              inputMode="tel"
              className="input-admin tabular-nums"
              autoComplete="off"
            />
          </Field>
          {measurement && (
            <>
              <Field label="Город">
                <input value={city} onChange={(e) => setCity(e.target.value)} className="input-admin" />
              </Field>
              <Field label="Адрес замера">
                <input value={address} onChange={(e) => setAddress(e.target.value)} className="input-admin" />
              </Field>
            </>
          )}
        </div>
        <AnimatePresence initial={false}>
          {dirty && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setName(lead.name)
                    setPhone(formatRussianPhone(lead.phone))
                    setCity(lead.city ?? '')
                    setAddress(lead.address ?? '')
                  }}
                  className="h-10 rounded-lg px-3 text-sm text-muted-foreground hover:text-foreground"
                >
                  Вернуть
                </button>
                <SaveButton busy={busy === 'contact'} variant="primary">
                  Сохранить
                </SaveButton>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </form>
    </Block>
  )
}

/* ── Ответственный ── */

function AssignSection({ lead, managers, busy, save }: SectionProps & { managers: string[] }) {
  const [value, setValue] = useState(lead.assigned_to ?? '')
  const listId = useId()
  useEffect(() => setValue(lead.assigned_to ?? ''), [lead.id, lead.assigned_to])

  const assign = (assignee: string) =>
    save(
      'assign',
      () => assignAction(formData({ id: lead.id, assignee })),
      assignee ? `Ответственный: ${assignee}` : 'Назначение снято',
      { assigned_to: assignee || null }
    )

  return (
    <Block title="Ответственный" icon={UserRound}>
      {managers.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {managers.map((manager) => {
            const current = (lead.assigned_to ?? '') === manager
            return (
              <button
                key={manager}
                type="button"
                disabled={busy === 'assign' || current}
                onClick={() => {
                  setValue(manager)
                  assign(manager)
                }}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium',
                  current
                    ? 'border-primary/50 bg-primary/10 text-accent-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                {current && <Check className="size-3.5" aria-hidden />}
                {manager}
              </button>
            )
          })}
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          assign(value.trim())
        }}
        className="flex gap-2"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          list={listId}
          placeholder="Имя менеджера"
          className="input-admin min-w-0 flex-1"
          aria-label="Ответственный"
        />
        <datalist id={listId}>
          {managers.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <SaveButton busy={busy === 'assign'} disabled={value.trim() === (lead.assigned_to ?? '')}>
          Назначить
        </SaveButton>
      </form>
    </Block>
  )
}

/* ── Напоминание ── */

function ReminderSection({ lead, busy, save }: SectionProps) {
  const [value, setValue] = useState(toLocalInput(lead.next_contact_at))
  const [presets, setPresets] = useState<Array<{ label: string; value: string }>>([])
  useEffect(() => {
    setValue(toLocalInput(lead.next_contact_at))
    setPresets(reminderPresets())
  }, [lead.id, lead.next_contact_at])

  const remind = (when: string) =>
    save(
      'reminder',
      () => setReminderAction(formData({ id: lead.id, when })),
      when ? `Напомним ${formatDateTime(new Date(when).toISOString())}` : 'Напоминание снято',
      { next_contact_at: when ? new Date(when).toISOString() : null }
    )

  return (
    <Block title="Напомнить связаться" icon={BellRing}>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            disabled={busy === 'reminder'}
            onClick={() => {
              setValue(preset.value)
              remind(preset.value)
            }}
            className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {preset.label}
          </button>
        ))}
        {lead.next_contact_at && (
          <button
            type="button"
            disabled={busy === 'reminder'}
            onClick={() => {
              setValue('')
              remind('')
            }}
            className="inline-flex h-8 items-center rounded-full px-3 text-xs font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
          >
            Снять
          </button>
        )}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          remind(value)
        }}
        className="flex gap-2"
      >
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input-admin min-w-0 flex-1"
          aria-label="Когда напомнить"
        />
        <SaveButton busy={busy === 'reminder'} disabled={value === toLocalInput(lead.next_contact_at)}>
          Поставить
        </SaveButton>
      </form>
    </Block>
  )
}

/* ── Сумма ── */

function AmountSection({ lead, busy, save }: SectionProps) {
  const initial = lead.deal_amount ? String(Math.round(Number(lead.deal_amount))) : ''
  const [value, setValue] = useState(initial)
  useEffect(() => setValue(initial), [lead.id, initial])

  return (
    <Block title="Сумма сделки" icon={Wallet}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const amount = value.replace(/\D/g, '')
          save('amount', () => setAmountAction(formData({ id: lead.id, amount })), amount ? 'Сумма сохранена' : 'Сумма очищена', {
            deal_amount: amount || null,
          })
        }}
        className="flex gap-2"
      >
        <div className="relative min-w-0 flex-1">
          <input
            value={value ? Number(value.replace(/\D/g, '') || 0).toLocaleString('ru-RU') : ''}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="numeric"
            placeholder="Например, 450 000"
            className="input-admin pr-8 tabular-nums"
            aria-label="Сумма сделки"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₽</span>
        </div>
        <SaveButton busy={busy === 'amount'} disabled={value === initial}>
          Сохранить
        </SaveButton>
      </form>
    </Block>
  )
}

/* ── Заметка ── */

function NoteSection({ lead, busy, save }: SectionProps) {
  const [note, setNote] = useState('')
  useEffect(() => setNote(''), [lead.id])

  return (
    <Block title="Заметка в историю" icon={StickyNote}>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          const text = note.trim()
          if (!text) return
          const ok = await save('note', () => addNoteAction(formData({ id: lead.id, note: text })), 'Заметка добавлена в историю')
          if (ok) setNote('')
        }}
        className="space-y-2"
      >
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Что обсудили, о чём договорились…"
          className="input-admin resize-y"
          onKeyDown={(event) => {
            // Ctrl/⌘ + Enter — отправить, не дотягиваясь до кнопки
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit()
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="hidden text-[11px] text-muted-foreground sm:block">Ctrl + Enter — добавить</span>
          <SaveButton busy={busy === 'note'} disabled={!note.trim()} variant="primary">
            Добавить
          </SaveButton>
        </div>
      </form>
    </Block>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
