'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Lock } from 'lucide-react'
import { loginAction } from '@/app/admin/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-lg bg-foreground text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? 'Проверяем…' : 'Войти'}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, null)

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
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
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            // 16px предотвращает автозум в Safari на iPhone при фокусе поля
            className="h-12 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
