'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { AnimatePresence, m } from 'framer-motion'
import { ArrowRight, CheckCircle2, KeyRound, Link2, Loader2 } from 'lucide-react'
import { createClientAction } from '@/app/admin/cabinet-actions'
import { formatRussianPhone } from '@/lib/phone'
import { SPRING } from '../../../_components/motion'
import { cn } from '@/lib/utils'
import { CopyShare, inviteMessage } from '../share'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background hover:opacity-90 disabled:opacity-60 sm:w-auto sm:px-6"
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      Открыть кабинет
    </button>
  )
}

export function CreateClientForm({
  leadId,
  defaultName,
  defaultPhone,
  existing,
}: {
  leadId?: string
  defaultName: string
  defaultPhone: string
  /** У номера из заявки уже есть кабинет */
  existing: { id: string; name: string } | null
}) {
  const [state, action] = useActionState(createClientAction, null)
  const [phone, setPhone] = useState(defaultPhone)
  const [mode, setMode] = useState<'invite' | 'password'>('invite')

  if (state?.ok && state.clientId) {
    const message = inviteMessage({
      name: state.name ?? '',
      inviteUrl: state.inviteUrl,
      password: state.password,
      phone,
      maxUrl: state.maxUrl,
      maxCode: state.maxCode,
    })
    return (
      <m.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="rounded-xl border border-emerald-500/40 bg-card p-5 shadow-sm"
      >
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="size-5 text-emerald-600" aria-hidden />
          Кабинет открыт
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {state.password
            ? 'Пароль показывается один раз — отправьте его клиенту сейчас. Потом можно только задать новый.'
            : 'Отправьте клиенту ссылку: по ней он задаст пароль и сразу войдёт.'}
        </p>

        {state.password && (
          <div className="mt-4 rounded-lg bg-secondary px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">Пароль</p>
            <p className="admin-num mt-1 text-2xl tracking-wider">{state.password}</p>
          </div>
        )}

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Готовое сообщение клиенту</span>
          <textarea readOnly value={message} rows={9} className="input-admin resize-none font-sans text-sm" onFocus={(e) => e.currentTarget.select()} />
        </label>
        <CopyShare value={message} label="Скопировать сообщение" className="mt-2" />

        <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
          <Link
            href={`/admin/kabinety/${state.clientId}`}
            className="admin-press inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary"
          >
            Кабинет клиента
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          {state.orderId && (
            <Link
              href={`/admin/zakazy/${state.orderId}`}
              className="admin-press inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-foreground text-sm font-medium text-background hover:opacity-90"
            >
              Заказ по заявке
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      </m.section>
    )
  }

  if (existing) {
    return (
      <p className="rounded-xl border border-border bg-card p-5 text-sm shadow-sm">
        У этого номера уже есть кабинет —{' '}
        <Link href={`/admin/kabinety/${existing.id}`} className="font-medium underline underline-offset-2">
          {existing.name}
        </Link>
        . Заказ по заявке можно добавить там.
      </p>
    )
  }

  return (
    <form action={action} className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm">
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Имя клиента</span>
          <input name="name" defaultValue={defaultName} required className="input-admin" autoComplete="off" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Телефон — им клиент входит</span>
          <input
            name="phone"
            value={phone}
            onChange={(e) => setPhone(formatRussianPhone(e.target.value))}
            inputMode="tel"
            required
            placeholder="+7 (999) 999-99-99"
            className="input-admin tabular-nums"
            autoComplete="off"
          />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-medium text-muted-foreground">Как клиент получит доступ</legend>
        <input type="hidden" name="mode" value={mode} />
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['invite', Link2, 'Ссылка-приглашение', 'Клиент сам задаст пароль. Ссылка действует 7 дней.'],
              ['password', KeyRound, 'Пароль от вас', 'Задайте или сгенерируйте и сообщите клиенту.'],
            ] as const
          ).map(([value, Icon, title, hint]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={cn(
                'relative rounded-lg border p-3 text-left',
                mode === value ? 'border-foreground' : 'border-border hover:bg-secondary/60'
              )}
            >
              {mode === value && (
                <m.span layoutId="new-cabinet-mode" className="absolute inset-0 rounded-lg ring-2 ring-inset ring-foreground" transition={SPRING} aria-hidden />
              )}
              <span className="relative flex items-center gap-2 text-sm font-semibold">
                <Icon className="size-4" aria-hidden />
                {title}
              </span>
              <span className="relative mt-1 block text-xs leading-relaxed text-muted-foreground">{hint}</span>
            </button>
          ))}
        </div>
        <AnimatePresence initial={false}>
          {mode === 'password' && (
            <m.label
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="block overflow-hidden"
            >
              <span className="mb-1.5 mt-3 block text-xs font-medium text-muted-foreground">
                Пароль — или оставьте пустым, сгенерируем вида «Fasad-4821»
              </span>
              <input name="password" minLength={6} className="input-admin" autoComplete="off" />
            </m.label>
          )}
        </AnimatePresence>
      </fieldset>

      {state?.error && (
        <p className="admin-pop rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}{' '}
          {state.existingId && (
            <Link href={`/admin/kabinety/${state.existingId}`} className="font-medium underline">
              Открыть его
            </Link>
          )}
        </p>
      )}
      <Submit />
    </form>
  )
}
