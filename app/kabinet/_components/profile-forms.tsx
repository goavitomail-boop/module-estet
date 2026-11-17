'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { m } from 'framer-motion'
import { Check, Copy, ExternalLink, Loader2, MessageCircle } from 'lucide-react'
import { toast } from '@/app/admin/_components/toast'
import { SPRING } from '@/app/admin/_components/motion'
import { changePasswordAction, maxLinkAction } from '../actions'

const input =
  'h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-[3px] focus:ring-ring/25 md:text-sm'

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useActionState(changePasswordAction, null)
  const form = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? 'Пароль изменён')
      form.current?.reset()
    }
  }, [state])

  return (
    <form ref={form} action={action} className="space-y-3">
      {hasPassword && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Текущий пароль</span>
          <input name="current" type="password" autoComplete="current-password" required className={input} />
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Новый пароль</span>
          <input name="password" type="password" autoComplete="new-password" minLength={6} required className={input} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Ещё раз</span>
          <input name="confirm" type="password" autoComplete="new-password" required className={input} />
        </label>
      </div>
      {state?.error && <p className="admin-pop rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      <Submit>{hasPassword ? 'Сменить пароль' : 'Задать пароль'}</Submit>
    </form>
  )
}

/**
 * Привязка MAX: кнопка открывает бота по ссылке с меткой, бот запоминает
 * MAX клиента. Если ссылка не открылась (например, на компьютере без MAX) —
 * код, который нужно отправить боту сообщением.
 */
export function MaxLinkCard() {
  const [link, setLink] = useState<{ url: string | null; code: string } | null>(null)
  const [pending, start] = useTransition()
  const [copied, setCopied] = useState(false)

  const create = () =>
    start(async () => {
      try {
        setLink(await maxLinkAction())
      } catch {
        toast.error('Не получилось — попробуйте ещё раз.')
      }
    })

  if (!link) {
    return (
      <div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Привяжите MAX — и новости по заказу придут сообщением: этап, визит мастера, новые фото и документы. А входить
          в кабинет можно будет кодом из чата, без пароля.
        </p>
        <button
          type="button"
          onClick={create}
          disabled={pending}
          className="mt-4 flex h-11 items-center gap-2 rounded-lg bg-foreground px-5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MessageCircle className="size-4" aria-hidden />}
          Привязать MAX
        </button>
      </div>
    )
  }

  return (
    <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="space-y-4">
      {link.url && (
        <div>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-press flex h-12 items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background hover:opacity-90"
          >
            Открыть бота в MAX
            <ExternalLink className="size-4" aria-hidden />
          </a>
          <p className="mt-2 text-xs text-muted-foreground">
            Откроется чат с ботом «Модуль Эстет» — нажмите «Начать». Бот ответит, что MAX привязан; после этого
            обновите страницу.
          </p>
        </div>
      )}
      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="text-xs text-muted-foreground">
          {link.url ? 'Не открылось? ' : ''}Найдите в MAX бота «Модуль Эстет» и отправьте ему код:
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="admin-num flex-1 rounded-lg bg-secondary px-3 py-2 text-center text-xl tracking-[0.12em]">{link.code}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(link.code).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1600)
              })
            }}
            aria-label="Скопировать код"
            className="flex size-11 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary"
          >
            {copied ? <Check className="size-4 text-emerald-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Код и ссылка действуют 7 дней.</p>
      </div>
    </m.div>
  )
}
