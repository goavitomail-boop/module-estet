'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { m } from 'framer-motion'
import { SPRING } from '@/app/admin/_components/motion'
import { cn } from '@/lib/utils'

const items = [
  { href: '/kabinet', label: 'Заказы', match: (p: string) => p === '/kabinet' || p.startsWith('/kabinet/zakaz') },
  { href: '/kabinet/profil', label: 'Профиль', match: (p: string) => p.startsWith('/kabinet/profil') },
]

/** Два раздела кабинета; подложка выбранного переезжает между ними */
export function KabinetNav({ initials }: { initials: string }) {
  const pathname = usePathname()
  return (
    <nav className="flex shrink-0 items-center gap-1" aria-label="Разделы кабинета">
      <div className="hidden items-center gap-1 rounded-full bg-secondary/70 p-1 sm:flex">
        {items.map((item) => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'admin-press relative flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {active && <m.span layoutId="kb-nav" className="absolute inset-0 rounded-full bg-card shadow-sm" transition={SPRING} aria-hidden />}
              <span className="relative">{item.label}</span>
            </Link>
          )
        })}
      </div>
      <Link
        href="/kabinet/profil"
        aria-label="Профиль"
        className={cn(
          'admin-press ml-1 flex size-10 items-center justify-center rounded-full bg-foreground text-xs font-semibold tracking-wide text-background ring-2 ring-offset-2 ring-offset-[var(--admin-bg)] transition',
          pathname.startsWith('/kabinet/profil') ? 'ring-primary' : 'ring-transparent hover:ring-primary/50'
        )}
      >
        {initials}
      </Link>
    </nav>
  )
}
