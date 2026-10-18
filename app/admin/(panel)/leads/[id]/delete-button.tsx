'use client'

import { useFormStatus } from 'react-dom'
import { Trash2 } from 'lucide-react'

/**
 * Удаление подтверждается отдельно: восстановить заявку, её историю
 * и файлы после нажатия уже нечем.
 */
export function DeleteLeadButton({ leadId, compact = false }: { leadId: string; compact?: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!confirm(`Удалить заявку ${leadId} вместе с историей и файлами? Отменить это нельзя.`)) {
          event.preventDefault()
        }
      }}
      className={
        compact
          ? 'mt-1.5 flex h-8 w-full items-center justify-center gap-1 rounded-md text-xs text-destructive/80 transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-60'
          : 'inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/40 px-4 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-60 md:h-10'
      }
    >
      <Trash2 className={compact ? 'size-3.5' : 'size-4'} aria-hidden />
      {pending ? 'Удаляем…' : compact ? 'Удалить' : 'Удалить заявку'}
    </button>
  )
}
