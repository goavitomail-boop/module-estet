'use client'

import { useState, useTransition } from 'react'
import { sendTestNotificationAction } from '@/app/admin/actions'

export function TestNotificationButton() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(null)
            setResult(await sendTestNotificationAction())
          })
        }
        className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-secondary disabled:opacity-60"
      >
        {pending ? 'Отправляем…' : 'Отправить тестовое уведомление'}
      </button>

      {result && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            result.ok ? 'bg-emerald-500/10 text-emerald-800' : 'bg-destructive/10 text-destructive'
          }`}
        >
          {result.ok ? '✅ ' : '❌ '}
          {result.message}
        </p>
      )}
    </div>
  )
}
