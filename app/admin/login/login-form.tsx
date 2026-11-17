'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { ArrowRight, Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { loginAction } from '@/app/admin/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background shadow-[0_10px_24px_-12px_oklch(0_0_0/0.6)] hover:opacity-90 disabled:opacity-70"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Проверяем…
        </>
      ) : (
        <>
          Войти
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
        </>
      )}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, null)
  const [visible, setVisible] = useState(false)
  const cardRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Неверный пароль — карточка коротко «мотает головой», поле выделено для новой попытки
  useEffect(() => {
    if (!state?.error) return
    inputRef.current?.select()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    cardRef.current?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(8px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(3px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 420, easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)' }
    )
    navigator.vibrate?.([12, 40, 12])
  }, [state])

  return (
    <form
      ref={cardRef}
      action={formAction}
      className="space-y-4 rounded-xl border border-border bg-card/90 p-6 shadow-[0_24px_60px_-28px_oklch(0.3_0.04_80/0.45)] backdrop-blur"
    >
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
          Пароль
        </label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={inputRef}
            id="password"
            name="password"
            type={visible ? 'text' : 'password'}
            required
            autoFocus
            autoComplete="current-password"
            aria-invalid={Boolean(state?.error)}
            // 16px предотвращает автозум в Safari на iPhone при фокусе поля
            className="h-12 w-full rounded-lg border border-input bg-background pl-10 pr-11 text-base outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-[3px] focus:ring-ring/25 aria-invalid:border-destructive/60"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
            className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
      </div>

      {state?.error && (
        <p className="admin-pop rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
