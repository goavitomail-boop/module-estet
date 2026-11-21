'use client'

import { Trash2 } from 'lucide-react'
import { ConfirmSubmit } from '@/app/admin/_components/confirm-submit'

/**
 * Удаление подтверждается отдельно: восстановить проект и его фотографии
 * после нажатия уже нечем, а кнопка стоит рядом с обычными действиями.
 */
export function DeleteProjectButton({ title }: { title: string }) {
  return (
    <ConfirmSubmit
      title={`Удалить проект «${title}»?`}
      description="Проект пропадёт из портфолио вместе со всеми фотографиями. Отменить это нельзя."
      className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-destructive/40 px-4 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-60 md:h-10"
    >
      <Trash2 className="size-4" aria-hidden />
      Удалить навсегда
    </ConfirmSubmit>
  )
}
