'use client'

import { Trash2 } from 'lucide-react'
import { ConfirmSubmit } from '@/app/admin/_components/confirm-submit'

/** Подтверждение отдельно: вернуть позицию и её фото после нажатия уже нечем */
export function DeleteItemButton({ name }: { name: string }) {
  return (
    <ConfirmSubmit
      title={`Удалить «${name}»?`}
      description="Позиция пропадёт с сайта вместе с фотографией. Отменить это нельзя."
      className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-destructive/40 px-4 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-60 md:h-10"
    >
      <Trash2 className="size-4" aria-hidden />
      Удалить навсегда
    </ConfirmSubmit>
  )
}
