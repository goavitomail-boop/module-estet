'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { LEAD_STATUSES, REJECT_REASONS, type Lead, type LeadStatus } from '@/lib/db'
import {
  addNoteAction,
  assignAction,
  changeStatusAction,
  confirmMeasurementAction,
  rescheduleAction,
  setAmountAction,
  setReminderAction,
} from '@/app/admin/actions'
import { MEASUREMENT_SLOTS, slotLabel } from '@/lib/measurement-slots'
import { STATUS_TEXT, formatDate } from '@/lib/admin-format'
import { STATUS_UI } from '@/app/admin/_components/ui'
import { cn } from '@/lib/utils'

/**
 * Правая колонка карточки: всё, что менеджер делает с заявкой.
 * Каждое действие — отдельная форма с серверным экшеном, поэтому работает
 * и без JavaScript, и не требует клиентского состояния для отправки.
 */
export function LeadActions({
  lead,
  managers,
  occupancy,
  capacity,
}: {
  lead: Lead
  managers: string[]
  /** Занятость слотов: { '2026-09-23': { morning: 1 } } */
  occupancy: Record<string, Record<string, number>>
  capacity: number
}) {
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null)
  const [statusState, statusAction] = useActionState(changeStatusAction, null)
  const needsReason = pendingStatus === 'rejected'

  return (
    <div className="space-y-4">
      {lead.type === 'measurement' && <ConfirmBlock lead={lead} />}
      {lead.type === 'measurement' && (
        <RescheduleBlock lead={lead} occupancy={occupancy} capacity={capacity} />
      )}
      <Block title="Статус">
        <form action={statusAction} className="space-y-3">
          <input type="hidden" name="id" value={lead.id} />
          <div className="grid grid-cols-2 gap-2">
            {LEAD_STATUSES.map((status) => {
              const current = lead.status === status
              const selected = pendingStatus === status
              const Icon = STATUS_UI[status].icon
              return (
                <label
                  key={status}
                  className={cn(
                    'flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2.5 py-2.5 text-center text-xs font-medium transition',
                    current && 'cursor-default border-primary bg-primary/10 text-foreground',
                    !current && selected && 'border-foreground bg-foreground text-background',
                    !current && !selected && 'border-border bg-card hover:bg-secondary'
                  )}
                >
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    disabled={current}
                    checked={selected}
                    onChange={() => setPendingStatus(status)}
                    className="sr-only"
                  />
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="leading-tight">{STATUS_TEXT[status]}</span>
                  {current && <span className="text-[10px] opacity-60">текущий</span>}
                </label>
              )
            })}
          </div>

          {/* Причина отказа важнее всего для аналитики — спрашиваем сразу */}
          {needsReason && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Причина отказа</label>
              <select name="rejectReason" className="input-admin" defaultValue={lead.reject_reason ?? ''}>
                <option value="">Не указана</option>
                {REJECT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>
          )}

          {statusState?.error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{statusState.error}</p>
          )}

          <Submit disabled={!pendingStatus}>Сохранить статус</Submit>
        </form>
      </Block>

      <Block title="Ответственный">
        <form action={assignAction} className="space-y-2">
          <input type="hidden" name="id" value={lead.id} />
          <input
            name="assignee"
            list="managers-list"
            defaultValue={lead.assigned_to ?? ''}
            placeholder="Имя менеджера"
            className="input-admin"
          />
          <datalist id="managers-list">
            {managers.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <Submit variant="secondary">Назначить</Submit>
        </form>
      </Block>

      <Block title="Сумма сделки">
        <form action={setAmountAction} className="space-y-2">
          <input type="hidden" name="id" value={lead.id} />
          <input
            name="amount"
            inputMode="numeric"
            defaultValue={lead.deal_amount ?? ''}
            placeholder="Например, 450000"
            className="input-admin"
          />
          <p className="text-xs text-muted-foreground">Заполните при закрытии — попадёт в отчёт по выручке.</p>
          <Submit variant="secondary">Сохранить сумму</Submit>
        </form>
      </Block>

      <Block title="Напомнить связаться">
        <form action={setReminderAction} className="space-y-2">
          <input type="hidden" name="id" value={lead.id} />
          <input
            type="datetime-local"
            name="when"
            defaultValue={toLocalInput(lead.next_contact_at)}
            className="input-admin"
          />
          <p className="text-xs text-muted-foreground">Заявка появится на дашборде за сутки до срока.</p>
          <Submit variant="secondary">Поставить напоминание</Submit>
        </form>
      </Block>

      <Block title="Заметка">
        <form action={addNoteAction} className="space-y-2">
          <input type="hidden" name="id" value={lead.id} />
          <textarea
            name="note"
            rows={3}
            required
            placeholder="Что обсудили, о чём договорились…"
            className="input-admin resize-y"
          />
          <Submit variant="secondary">Добавить в историю</Submit>
        </form>
      </Block>
    </div>
  )
}

/**
 * Подтверждение замера — главное действие по заявке на замер.
 *
 * Пока замер не подтверждён, время в календаре свободно и предлагается
 * на сайте другим клиентам. Подтверждение занимает слот; если его уже занял
 * другой подтверждённый замер, сервер откажет и попросит перенести.
 */
function ConfirmBlock({ lead }: { lead: Lead }) {
  const [state, formAction] = useActionState(confirmMeasurementAction, null)
  const details = (lead.details ?? {}) as Record<string, unknown>
  const date = typeof details.date === 'string' ? details.date : ''
  const slot = typeof details.time === 'string' ? details.time : ''
  const when = date ? `${formatDate(date)}${slot ? `, ${slotLabel(slot)}` : ''}` : 'дата не указана'

  const confirmed = lead.status === 'scheduled'
  // Закрытая и отклонённая заявки времени не занимают и подтверждения не ждут
  const closed = lead.status === 'done' || lead.status === 'rejected'

  if (closed) return null

  return (
    <section
      className={cn(
        'rounded-xl border p-4 shadow-sm',
        confirmed ? 'border-emerald-600/30 bg-emerald-500/10' : 'border-amber-500/40 bg-amber-400/10'
      )}
    >
      <h2 className="mb-1 text-sm font-semibold">{confirmed ? 'Замер подтверждён' : 'Замер не подтверждён'}</h2>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        {confirmed
          ? `${when} — время занято в календаре и на сайте больше не предлагается.`
          : `Клиент просит: ${when}. Пока вы не подтвердите, это время в календаре свободно и его может выбрать другой клиент.`}
      </p>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={lead.id} />
        <input type="hidden" name="confirm" value={confirmed ? '0' : '1'} />

        {state?.error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{state.error}</p>
        )}

        <Submit variant={confirmed ? 'secondary' : 'primary'}>
          {confirmed ? 'Снять подтверждение' : 'Подтвердить замер'}
        </Submit>
      </form>
    </section>
  )
}

/**
 * Перенос замера. Занятые слоты гасим сразу, но последнее слово всё равно
 * за сервером: пока менеджер выбирает, слот мог занять кто-то другой.
 */
function RescheduleBlock({
  lead,
  occupancy,
  capacity,
}: {
  lead: Lead
  occupancy: Record<string, Record<string, number>>
  capacity: number
}) {
  const details = (lead.details ?? {}) as Record<string, unknown>
  const currentDate = typeof details.date === 'string' ? details.date : ''
  const currentSlot = typeof details.time === 'string' ? details.time : ''

  const [date, setDate] = useState(currentDate)
  const [slot, setSlot] = useState(currentSlot)
  const [state, formAction] = useActionState(rescheduleAction, null)

  const isBusy = (value: string) => {
    if (!date) return false
    const taken = occupancy[date]?.[value] ?? 0
    // Свой собственный слот занятым не считаем. В занятости учтены только
    // подтверждённые замеры, поэтому вычитаем себя, лишь если сами подтверждены
    const own = lead.status === 'scheduled' && date === currentDate && value === currentSlot ? 1 : 0
    return taken - own >= capacity
  }

  const changed = date !== currentDate || slot !== currentSlot

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold">Дата замера</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        {currentDate ? `Сейчас: ${formatDate(currentDate)}, ${slotLabel(currentSlot)}` : 'Дата не указана'}
      </p>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={lead.id} />
        <input type="hidden" name="slot" value={slot} />

        <input
          type="date"
          name="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-admin"
        />

        <div className="grid grid-cols-3 gap-2">
          {MEASUREMENT_SLOTS.map((s) => {
            const busy = isBusy(s.value)
            const selected = slot === s.value
            return (
              <button
                key={s.value}
                type="button"
                disabled={busy}
                onClick={() => setSlot(s.value)}
                className={cn(
                  'rounded-lg border px-2 py-2 text-center text-xs font-medium transition',
                  busy && 'cursor-not-allowed border-border bg-muted/60 text-muted-foreground line-through',
                  !busy && selected && 'border-foreground bg-foreground text-background',
                  !busy && !selected && 'border-border bg-card hover:bg-secondary'
                )}
              >
                {s.label}
                <span className="mt-0.5 block text-[10px] font-normal opacity-70">{busy ? 'занято' : s.time}</span>
              </button>
            )
          })}
        </div>

        {state?.error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{state.error}</p>
        )}
        {state?.ok && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800">Замер перенесён.</p>
        )}

        <Submit disabled={!changed || !date || !slot} variant="secondary">
          Перенести замер
        </Submit>
      </form>
    </section>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Submit({
  children,
  disabled = false,
  variant = 'primary',
}: {
  children: React.ReactNode
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={cn(
        // h-11 — та же зона касания, что у полей рядом
        'h-11 w-full rounded-lg px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 md:h-10',
        variant === 'primary'
          ? 'bg-foreground text-background hover:opacity-90'
          : 'border border-border bg-card hover:bg-secondary'
      )}
    >
      {pending ? 'Сохраняем…' : children}
    </button>
  )
}

/** Postgres отдаёт ISO с зоной, а input[type=datetime-local] ждёт «YYYY-MM-DDTHH:mm» */
function toLocalInput(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
