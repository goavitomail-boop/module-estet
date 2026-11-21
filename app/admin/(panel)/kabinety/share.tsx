'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { toast } from '../../_components/toast'
import { cn } from '@/lib/utils'

/** Скопировать или отправить через «Поделиться» телефона (MAX, WhatsApp, SMS) */
export function CopyShare({ value, label = 'Скопировать', share = true, className }: { value: string; label?: string; share?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false)
  const canShare = share && typeof navigator !== 'undefined' && 'share' in navigator

  return (
    <div className={cn('flex gap-2', className)}>
      <button
        type="button"
        onClick={() =>
          navigator.clipboard
            ?.writeText(value)
            .then(() => {
              setCopied(true)
              toast.success('Скопировано')
              setTimeout(() => setCopied(false), 1600)
            })
            .catch(() => toast.error('Не удалось скопировать — выделите текст вручную'))
        }
        className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-secondary"
      >
        {copied ? <Check className="size-4 text-emerald-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {label}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={() => navigator.share({ text: value }).catch(() => {})}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
        >
          <Share2 className="size-4" aria-hidden />
          Отправить
        </button>
      )}
    </div>
  )
}

/** Готовый текст для клиента: ссылка в кабинет (или пароль) и привязка MAX */
export function inviteMessage(input: {
  name: string
  inviteUrl?: string
  password?: string
  phone?: string
  maxUrl?: string | null
  maxCode?: string
}): string {
  const first = input.name.split(' ')[0]
  const lines = [`${first}, здравствуйте! Это «Модуль Эстет».`, '']
  if (input.inviteUrl) {
    lines.push('Для вас открыт личный кабинет: этап заказа, визиты мастеров, проект, документы и фото с производства.')
    lines.push(`Задайте пароль по ссылке (действует 7 дней): ${input.inviteUrl}`)
  } else if (input.password) {
    lines.push('Для вас открыт личный кабинет: этап заказа, визиты мастеров, проект, документы и фото с производства.')
    const site = typeof window === 'undefined' ? 'https://module-estet.ru' : window.location.origin
    lines.push(`Вход: ${site}/kabinet/vhod — телефон${input.phone ? ` ${input.phone}` : ''} и пароль ${input.password}`)
  }
  if (input.maxUrl || input.maxCode) {
    lines.push('')
    lines.push(
      input.maxUrl
        ? `Чтобы получать новости по заказу в MAX: ${input.maxUrl}`
        : `Чтобы получать новости по заказу в MAX, отправьте нашему боту код ${input.maxCode}`
    )
  }
  return lines.join('\n')
}
