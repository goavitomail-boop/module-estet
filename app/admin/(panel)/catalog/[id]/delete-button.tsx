'use client'

import { useFormStatus } from 'react-dom'
import { Trash2 } from 'lucide-react'

/** Подтверждение отдельно: вернуть позицию и её фото после нажатия уже нечем */
export function DeleteItemButton({ name }: { name: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!confirm(`Удалить позицию «${name}» вместе с фотографией?`)) event.preventDefault()
      }}
      className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-destructive/40 px-4 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-60 md:h-10"
    >
      <Trash2 className="size-4" aria-hidden />
      {pending ? 'Удаляем…' : 'Удалить навсегда'}
    </button>
  )
}
