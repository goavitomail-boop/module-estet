'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { AnimatePresence, m } from 'framer-motion'
import { Ban, CheckCircle2, KeyRound, Link2, Loader2, LogOut, MessageCircle, Plus, Trash2, Unlink } from 'lucide-react'
import {
  createOrderAction,
  deleteClientAction,
  issueInviteAction,
  logoutEverywhereAdminAction,
  maxLinkAdminAction,
  setBlockedAction,
  setPasswordAction,
  unlinkMaxAdminAction,
  updateClientAction,
} from '@/app/admin/cabinet-actions'
import { PRODUCTS, type PublicClient } from '@/lib/cabinet-shared'
import { formatRussianPhone } from '@/lib/phone'
import { ConfirmSubmit } from '../../../_components/confirm-submit'
import { toast } from '../../../_components/toast'
import { SPRING } from '../../../_components/motion'
import { cn } from '@/lib/utils'
import { CopyShare, inviteMessage } from '../share'

function Pending({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
}

type Reveal =
  | { kind: 'invite'; url: string }
  | { kind: 'password'; password: string }
  | { kind: 'max'; url: string | null; code: string }

/**
 * Доступ клиента: приглашение, пароль, привязка MAX, блокировка.
 * Ссылку и пароль показываем один раз, сразу с готовым сообщением клиенту:
 * в базе хранятся только хеши, восстановить их потом нельзя — только выдать новые.
 */
export function AccessPanel({ client, invitePending }: { client: PublicClient; invitePending: boolean }) {
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [askPassword, setAskPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [pending, start] = useTransition()

  const run = (task: () => Promise<Reveal | null>) =>
    start(async () => {
      try {
        const result = await task()
        if (result) setReveal(result)
      } catch {
        toast.error('Не получилось — повторите')
      }
    })

  const message =
    reveal &&
    inviteMessage({
      name: client.name,
      phone: formatRussianPhone(client.phone),
      inviteUrl: reveal.kind === 'invite' ? reveal.url : undefined,
      password: reveal.kind === 'password' ? reveal.password : undefined,
      maxUrl: reveal.kind === 'max' ? reveal.url : undefined,
      maxCode: reveal.kind === 'max' ? reveal.code : undefined,
    })

  const row = (ok: boolean, okText: string, noText: string) => (
    <li className="flex items-center gap-2 text-sm">
      <span className={cn('size-2 rounded-full', ok ? 'bg-emerald-500' : 'bg-border')} aria-hidden />
      {ok ? okText : <span className="text-muted-foreground">{noText}</span>}
    </li>
  )

  const button =
    'admin-press flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-secondary disabled:opacity-60'

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold">Доступ</h2>
        {client.blocked && <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">Заблокирован</span>}
      </header>
      <div className="space-y-4 p-5">
        <ul className="space-y-1.5">
          {row(client.has_password, 'Пароль задан', 'Пароля пока нет')}
          {!client.has_password && row(invitePending, 'Приглашение отправлено и ждёт', 'Приглашения нет')}
          {row(Boolean(client.max_user_id), 'MAX привязан — сообщения и вход кодом', 'MAX не привязан')}
        </ul>

        <div className="space-y-2">
          <button type="button" disabled={pending} className={button} onClick={() => run(async () => ({ kind: 'invite', ...(await issueInviteAction(client.id)) }))}>
            <Link2 className="size-4 text-muted-foreground" aria-hidden />
            {client.has_password ? 'Ссылка для смены пароля' : 'Ссылка-приглашение'}
          </button>
          <button type="button" className={button} onClick={() => setAskPassword((v) => !v)} aria-expanded={askPassword}>
            <KeyRound className="size-4 text-muted-foreground" aria-hidden />
            Задать пароль вручную
          </button>
          <AnimatePresence initial={false}>
            {askPassword && (
              <m.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={SPRING}
                className="overflow-hidden"
                onSubmit={(event) => {
                  event.preventDefault()
                  run(async () => {
                    const result = await setPasswordAction(client.id, password)
                    if (result.error) {
                      toast.error(result.error)
                      return null
                    }
                    setPassword('')
                    setAskPassword(false)
                    return { kind: 'password', password: result.password! }
                  })
                }}
              >
                <div className="flex gap-2 pb-1 pt-1">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Пусто — сгенерируем"
                    className="input-admin min-w-0 flex-1"
                    autoComplete="off"
                  />
                  <button type="submit" disabled={pending} className="h-10 shrink-0 rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-60">
                    Задать
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Клиента выкинет со всех устройств — войдёт с новым паролем.</p>
              </m.form>
            )}
          </AnimatePresence>
          {!client.max_user_id && (
            <button type="button" disabled={pending} className={button} onClick={() => run(async () => ({ kind: 'max', ...(await maxLinkAdminAction(client.id)) }))}>
              <MessageCircle className="size-4 text-muted-foreground" aria-hidden />
              Ссылка для привязки MAX
            </button>
          )}
        </div>

        <AnimatePresence>
          {reveal && message && (
            <m.div
              key={JSON.stringify(reveal)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING}
              className="rounded-lg border border-primary/40 bg-primary/5 p-3"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
                {reveal.kind === 'password' ? `Пароль: ${reveal.password}` : reveal.kind === 'max' ? `Код для бота: ${reveal.code}` : 'Ссылка готова — действует 7 дней'}
              </p>
              <textarea readOnly value={message} rows={6} className="input-admin mt-2 resize-none text-xs" onFocus={(e) => e.currentTarget.select()} />
              <CopyShare value={message} label="Скопировать" className="mt-2" />
              <p className="mt-2 text-[11px] text-muted-foreground">Показывается один раз — потом можно только выдать новую.</p>
            </m.div>
          )}
        </AnimatePresence>

        <div className="space-y-1 border-t border-border pt-3">
          {client.max_user_id && (
            <form action={unlinkMaxAdminAction}>
              <input type="hidden" name="id" value={client.id} />
              <Pending className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Unlink className="size-4" aria-hidden />
                Отвязать MAX
              </Pending>
            </form>
          )}
          <form action={logoutEverywhereAdminAction} onSubmit={() => toast.success('Клиент вышел на всех устройствах')}>
            <input type="hidden" name="id" value={client.id} />
            <Pending className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
              <LogOut className="size-4" aria-hidden />
              Выйти на всех устройствах клиента
            </Pending>
          </form>
          <form action={setBlockedAction}>
            <input type="hidden" name="id" value={client.id} />
            <input type="hidden" name="blocked" value={client.blocked ? '0' : '1'} />
            <Pending
              className={cn(
                'flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm hover:bg-secondary',
                client.blocked ? 'text-foreground' : 'text-muted-foreground hover:text-destructive'
              )}
            >
              <Ban className="size-4" aria-hidden />
              {client.blocked ? 'Разблокировать доступ' : 'Заблокировать доступ'}
            </Pending>
          </form>
          <form action={deleteClientAction}>
            <input type="hidden" name="id" value={client.id} />
            <ConfirmSubmit
              title={`Удалить кабинет «${client.name}»?`}
              description="Удалятся все заказы кабинета с файлами, фото и лентой. Заявки в панели останутся."
              confirmLabel="Удалить кабинет"
              className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
              Удалить кабинет
            </ConfirmSubmit>
          </form>
        </div>
      </div>
    </section>
  )
}

export function ClientInfoForm({ id, name, phone }: { id: string; name: string; phone: string }) {
  const [state, action] = useActionState(updateClientAction, null)
  const [value, setValue] = useState(formatRussianPhone(phone))
  useEffect(() => {
    if (state?.ok) toast.success('Контакты сохранены')
  }, [state])

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Имя</span>
        <input name="name" defaultValue={name} className="input-admin" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Телефон для входа</span>
        <input name="phone" value={value} onChange={(e) => setValue(formatRussianPhone(e.target.value))} inputMode="tel" className="input-admin tabular-nums" />
      </label>
      {state?.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{state.error}</p>}
      <Pending className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary">
        Сохранить
      </Pending>
    </form>
  )
}

/** Новый заказ: вручную или из заявки (compact — кнопка в строке заявки) */
export function NewOrderForm({ clientId, leadId, compact = false }: { clientId: string; leadId?: string; compact?: boolean }) {
  const [state, action] = useActionState(createOrderAction, null)
  const [open, setOpen] = useState(false)

  if (leadId) {
    return (
      <form action={action} className={cn(compact && 'ml-auto')}>
        <input type="hidden" name="clientId" value={clientId} />
        <input type="hidden" name="leadId" value={leadId} />
        <Pending className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium hover:bg-secondary">
          <Plus className="size-3.5" aria-hidden />
          Сделать заказом
        </Pending>
      </form>
    )
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="admin-press inline-flex h-10 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden />
          Новый заказ
        </button>
      ) : (
        <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
        <form action={action} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="clientId" value={clientId} />
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Название — так его увидит клиент</span>
            <input name="title" required autoFocus placeholder="Кухня на Ленина, 12" className="input-admin" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Что делаем</span>
            <select name="product" className="input-admin" defaultValue="kitchen">
              {PRODUCTS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Адрес</span>
            <input name="address" className="input-admin" placeholder="Москва, ул. Ленина, 12, кв. 5" />
          </label>
          {state?.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive sm:col-span-2">{state.error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Pending className="flex h-10 items-center gap-2 rounded-lg bg-foreground px-5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60">
              Создать заказ
            </Pending>
            <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg px-4 text-sm text-muted-foreground hover:text-foreground">
              Отмена
            </button>
          </div>
        </form>
        </m.div>
      )}
    </div>
  )
}
