'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { acceptInviteAction } from '../../actions'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-foreground text-sm font-medium text-background hover:opacity-90 disabled:opacity-70"
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      Сохранить и войти
    </button>
  )
}

export function InviteForm({ token }: { token: string }) {
  const [state, action] = useActionState(acceptInviteAction, null)
  const [visible, setVisible] = useState(false)
  const input =
    'h-12 w-full rounded-lg border border-input bg-background px-3 pr-11 text-base outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-[3px] focus:ring-ring/25'

  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Пароль</span>
        <span className="relative block">
          <input name="password" type={visible ? 'text' : 'password'} autoComplete="new-password" minLength={6} required autoFocus className={input} />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
            className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">Не короче 6 символов</span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Ещё раз</span>
        <input name="confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" required className={input} />
      </label>
      {state?.error && (
        <p className="admin-pop rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Submit />
    </form>
  )
}
