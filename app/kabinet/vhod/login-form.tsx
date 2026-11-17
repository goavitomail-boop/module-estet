'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { m } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, MessageCircle } from 'lucide-react'
import { formatRussianPhone } from '@/lib/phone'
import { SPRING } from '@/app/admin/_components/motion'
import { cn } from '@/lib/utils'
import { passwordLoginAction, requestCodeAction, verifyCodeAction, type FormState } from '../actions'

type Mode = 'password' | 'max'

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background shadow-[0_10px_24px_-12px_oklch(0_0_0/0.6)] hover:opacity-90 disabled:opacity-70"
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
      {!pending && <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />}
    </button>
  )
}

/** «Мотнуть головой» карточкой при ошибке — как на входе в панель */
function useShake(state: FormState, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!state?.error || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    ref.current?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-9px)' },
        { transform: 'translateX(7px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 380, easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)' }
    )
  }, [state, ref])
}

function PhoneInput({ defaultValue = '', autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  const [value, setValue] = useState(formatRussianPhone(defaultValue))
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">Телефон</span>
      <input
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => setValue(formatRussianPhone(event.target.value))}
        placeholder="+7 (999) 999-99-99"
        className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base tabular-nums outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-[3px] focus:ring-ring/25"
      />
    </label>
  )
}

/**
 * Вход в кабинет: по паролю или кодом из MAX. Переключатель — с общей
 * подложкой, которая переезжает между вариантами.
 */
export function LoginForm({ maxEnabled }: { maxEnabled: boolean }) {
  const [mode, setMode] = useState<Mode>('password')
  const card = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={card}
      className="rounded-xl border border-border bg-card/90 p-5 shadow-[0_24px_60px_-28px_oklch(0.3_0.04_80/0.45)] backdrop-blur sm:p-6"
    >
      {maxEnabled && (
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1" role="tablist" aria-label="Способ входа">
          {(
            [
              ['password', 'Пароль', KeyRound],
              ['max', 'Код в MAX', MessageCircle],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                'relative flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors',
                mode === value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {mode === value && (
                <m.span layoutId="kb-login-tab" className="absolute inset-0 rounded-full bg-card shadow-sm" transition={SPRING} aria-hidden />
              )}
              <span className="relative flex items-center gap-1.5">
                <Icon className="size-4" aria-hidden />
                {label}
              </span>
            </button>
          ))}
        </div>
      )}

      {mode === 'password' ? <PasswordLogin card={card} /> : <MaxLogin card={card} />}
    </div>
  )
}

function PasswordLogin({ card }: { card: React.RefObject<HTMLDivElement | null> }) {
  const [state, action] = useActionState(passwordLoginAction, null)
  const [visible, setVisible] = useState(false)
  useShake(state, card)

  return (
    <form action={action} className="space-y-4">
      <PhoneInput autoFocus />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Пароль</span>
        <span className="relative block">
          <input
            name="password"
            type={visible ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className="h-12 w-full rounded-lg border border-input bg-background px-3 pr-11 text-base outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-[3px] focus:ring-ring/25"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
            className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </span>
      </label>
      {state?.error && (
        <p className="admin-pop rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Submit>Войти</Submit>
    </form>
  )
}

/** Вход кодом: телефон → код из MAX (или кнопка «Войти» прямо в сообщении) */
function MaxLogin({ card }: { card: React.RefObject<HTMLDivElement | null> }) {
  const [sent, sendAction] = useActionState(requestCodeAction, null)
  const [checked, verifyAction] = useActionState(verifyCodeAction, null)
  const [cooldown, setCooldown] = useState(0)
  const phone = checked?.message ?? (sent?.ok ? sent.message : undefined)
  useShake(sent?.error ? sent : checked, card)

  useEffect(() => {
    if (!sent?.ok) return
    setCooldown(60)
    const timer = setInterval(() => setCooldown((s) => (s <= 1 ? (clearInterval(timer), 0) : s - 1)), 1000)
    return () => clearInterval(timer)
  }, [sent])

  if (!phone) {
    return (
      <form action={sendAction} className="space-y-4">
        <PhoneInput autoFocus />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Пришлём код в чат с ботом «Модуль Эстет» в MAX. Работает, если MAX привязан к кабинету — это делается
          в разделе «Профиль».
        </p>
        {sent?.error && (
          <p className="admin-pop rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {sent.error}
          </p>
        )}
        <Submit>Получить код</Submit>
      </form>
    )
  }

  return (
    <m.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={SPRING}>
      <form action={verifyAction} className="space-y-4">
        <input type="hidden" name="phone" value={phone} />
        <p className="text-sm text-muted-foreground">
          Если номер <span className="whitespace-nowrap font-medium text-foreground">{formatRussianPhone(phone)}</span>{' '}
          привязан к MAX, код уже там. Можно нажать «Войти в кабинет» прямо в сообщении.
        </p>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Код из MAX</span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            placeholder="••••••"
            className="h-14 w-full rounded-lg border border-input bg-background px-3 text-center font-mono text-2xl tracking-[0.5em] outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-[3px] focus:ring-ring/25"
          />
        </label>
        {checked?.error && (
          <p className="admin-pop rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {checked.error}
          </p>
        )}
        <Submit>Войти</Submit>
      </form>
      <form action={sendAction} className="mt-3 text-center">
        <input type="hidden" name="phone" value={phone} />
        <button
          type="submit"
          disabled={cooldown > 0}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:no-underline disabled:opacity-60"
        >
          {cooldown > 0 ? `Отправить снова через ${cooldown} с` : 'Отправить код ещё раз'}
        </button>
      </form>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        Код не приходит? Значит, MAX ещё не привязан — войдите по паролю.
      </p>
    </m.div>
  )
}
