'use client'

import { useEffect, useState } from 'react'
import Link, { useLinkStatus } from 'next/link'
import { m } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { LeadStatus } from '@/lib/db'
import { cn } from '@/lib/utils'
import { STATUS_UI } from './ui'
import { SPRING } from './motion'

export interface StatusTab {
  key: LeadStatus | 'all'
  href: string
  label: string
  active: boolean
  count?: number
}

/** Пока сервер собирает отфильтрованный список — крутится на нажатой вкладке */
function Pending() {
  const { pending } = useLinkStatus()
  return pending ? <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden /> : null
}

/**
 * Вкладки статусов списка заявок. Подложка выбранной вкладки одна и переезжает
 * к нажатой сразу, не дожидаясь сервера, — фильтр ощущается мгновенным.
 * Ссылки остаются ссылками: работают без JS и открываются в новой вкладке.
 */
export function StatusTabs({ tabs }: { tabs: StatusTab[] }) {
  const [optimistic, setOptimistic] = useState<StatusTab['key'] | null>(null)
  const current = tabs.find((tab) => tab.active)?.key
  const active = optimistic ?? current

  // Сервер ответил — его выбор главнее
  useEffect(() => setOptimistic(null), [current])

  return (
    <div className="flex w-max gap-1 rounded-full border border-border bg-card p-1 shadow-sm lg:w-auto lg:flex-wrap">
      {tabs.map((tab) => {
        const selected = active === tab.key
        const Icon = tab.key === 'all' ? null : STATUS_UI[tab.key].icon
        return (
          <Link
            key={tab.key}
            href={tab.href}
            onClick={() => setOptimistic(tab.key)}
            aria-current={tab.active ? 'page' : undefined}
            className={cn(
              // На телефоне это основной способ фильтровать — зона касания 44px
              'admin-press relative inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors duration-200 md:h-8 md:px-3.5',
              selected ? 'text-background' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {selected && (
              <m.span
                layoutId="leads-status-tab"
                className="absolute inset-0 rounded-full bg-foreground shadow-sm"
                transition={SPRING}
                aria-hidden
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
              {tab.label}
              <Pending />
            </span>
          </Link>
        )
      })}
    </div>
  )
}
