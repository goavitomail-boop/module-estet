import Link from 'next/link'
import { ModuleEstetMark } from '@/components/module-estet-mark'
import { COMPANY } from '@/lib/company'
import { requireClient } from '@/lib/cabinet-auth'
import { KabinetNav } from '../_components/kabinet-nav'

/** Каркас кабинета для вошедшего клиента: шапка с логотипом сайта, разделы, подвал с телефоном */
export default async function LkLayout({ children }: { children: React.ReactNode }) {
  const client = await requireClient()
  const initials = client.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/70 bg-[color-mix(in_oklch,var(--admin-bg)_82%,transparent)] pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/kabinet" className="flex min-w-0 items-center gap-2.5" aria-label="Личный кабинет — заказы">
            <ModuleEstetMark className="h-9 w-auto shrink-0" />
            <span className="flex min-w-0 flex-col leading-none">
              <span className="truncate text-[0.95rem] font-semibold uppercase tracking-[0.14em] sm:text-[1.05rem]">
                Модуль Эстет
              </span>
              <span className="mt-1.5 text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Личный кабинет</span>
            </span>
          </Link>
          <KabinetNav initials={initials || '•'} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">{children}</main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <span>
            Вопросы по заказу —{' '}
            <a href={COMPANY.phoneHref} className="font-medium text-foreground">
              {COMPANY.phone}
            </a>
          </span>
          <Link href="/" className="hover:text-foreground">
            На сайт module-estet.ru →
          </Link>
        </div>
      </footer>
    </>
  )
}
