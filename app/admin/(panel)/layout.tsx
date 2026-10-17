import { redirect } from 'next/navigation'
import type { Metadata, Viewport } from 'next'
import { LogOut } from 'lucide-react'
import { getSession } from '@/lib/admin-auth'
import { isDbConfigured } from '@/lib/db'
import { logoutAction } from '@/app/admin/actions'
import { BottomNav, SidebarNav } from './sidebar-nav'

export const metadata: Metadata = {
  title: { default: 'Панель управления', template: '%s | Панель Модуль Эстет' },
  robots: { index: false, follow: false },
  // Свой манифест — панель ставится на телефон отдельным приложением от сайта
  manifest: '/admin/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Заявки' },
}

// Панель открывают с телефона в поле — вёрстка должна знать реальную ширину
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
  themeColor: '#1a1a1a',
}

export const dynamic = 'force-dynamic'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSession())) redirect('/admin/login')

  return (
    <div className="admin-root min-h-screen bg-secondary text-foreground">
      {/* ── Шапка: только на мобильном, на десктопе её роль играет сайдбар ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
        <div className="min-w-0">
          <p className="truncate font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-[0.18em]">
            Модуль Эстет
          </p>
          <p className="text-xs text-sidebar-foreground/60">Панель заявок</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Выйти"
            className="flex size-10 items-center justify-center rounded-lg text-sidebar-foreground/70 transition active:bg-sidebar-accent"
          >
            <LogOut className="size-5" aria-hidden />
          </button>
        </form>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        {/* ── Боковое меню: только с lg ── */}
        <aside className="hidden shrink-0 bg-sidebar text-sidebar-foreground lg:block lg:min-h-screen lg:w-60">
          <div className="px-5 py-4">
            <p className="font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-[0.18em]">
              Модуль Эстет
            </p>
            <p className="mt-0.5 text-xs text-sidebar-foreground/60">Панель заявок</p>
          </div>

          <SidebarNav />

          <div className="border-t border-sidebar-border px-5 py-4">
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-2 text-xs text-sidebar-foreground/70 transition hover:text-sidebar-foreground"
              >
                <LogOut className="size-3.5" aria-hidden />
                Выйти
              </button>
            </form>
          </div>
        </aside>

        {/* pb-24 на мобильном — чтобы контент не уезжал под нижнюю панель вкладок */}
        <main className="min-w-0 flex-1 px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-6 lg:pb-8">
          {!isDbConfigured() && <DbWarning />}
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  )
}

/** Без строки подключения заявки не сохраняются вовсе — об этом нельзя молчать */
function DbWarning() {
  return (
    <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <p className="text-sm font-semibold text-destructive">База данных не подключена</p>
      <p className="mt-1 text-sm text-foreground/80">
        Не задана ни одна из переменных <code className="rounded bg-secondary px-1 py-0.5 text-xs">DATABASE_URL</code> /{' '}
        <code className="rounded bg-secondary px-1 py-0.5 text-xs">POSTGRES_URL</code>. Заявки с сайта сейчас{' '}
        <strong>не сохраняются</strong> — они только отправляются в MAX.
      </p>
    </div>
  )
}
