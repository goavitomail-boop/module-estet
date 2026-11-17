import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import type { Metadata, Viewport } from 'next'
import { LogOut } from 'lucide-react'
import { getSession } from '@/lib/admin-auth'
import { isDbConfigured } from '@/lib/db'
import { logoutAction } from '@/app/admin/actions'
import { cn } from '@/lib/utils'
import { AdminMark } from '../_components/ui'
import { MotionProvider } from '../_components/motion'
import { PulseProvider } from '../_components/pulse'
import { Toaster } from '../_components/toast'
import { CommandPalette } from '../_components/command-palette'
import { ThemeToggle } from '../_components/theme-toggle'
import { THEME_COOKIE } from '@/lib/admin-theme'
import { BottomNav, MobileSearchButton, SidebarNav, SidebarSearch } from './sidebar-nav'
import '../admin.css'

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
  colorScheme: 'light dark',
  themeColor: '#1a1a1a',
}

export const dynamic = 'force-dynamic'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSession())) redirect('/admin/login')

  // Тема — из куки, чтобы сервер сразу отдал нужные цвета и не было вспышки
  const dark = (await cookies()).get(THEME_COOKIE)?.value === 'dark'

  return (
    <div className={cn('admin-root min-h-screen text-foreground', dark && 'dark')}>
      <MotionProvider>
        <PulseProvider>
          {/* ── Шапка: только на мобильном, на десктопе её роль играет сайдбар ── */}
          <header className="admin-sidebar sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] text-sidebar-foreground lg:hidden">
            <Link href="/admin" className="group relative flex min-w-0 items-center gap-2.5">
              <AdminMark className="size-8 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-[0.18em]">
                  Модуль Эстет
                </span>
                <span className="block text-[11px] text-sidebar-foreground/55">Панель заявок</span>
              </span>
            </Link>
            <div className="relative flex items-center gap-1">
              <MobileSearchButton />
              <form action={logoutAction}>
                <button
                  type="submit"
                  aria-label="Выйти"
                  className="flex size-10 items-center justify-center rounded-lg text-sidebar-foreground/70 active:bg-sidebar-accent"
                >
                  <LogOut className="size-5" aria-hidden />
                </button>
              </form>
            </div>
          </header>

          <div className="mx-auto flex max-w-[1600px]">
            {/* ── Боковое меню: только с lg. Липкое — не уезжает с длинной страницей ── */}
            <aside className="admin-sidebar relative hidden shrink-0 flex-col text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64">
              <Link href="/admin" className="group relative flex items-center gap-3 px-5 pb-4 pt-5">
                <AdminMark className="size-9 shrink-0" />
                <span>
                  <span className="block font-[family-name:var(--font-oswald)] text-sm font-medium uppercase tracking-[0.18em]">
                    Модуль Эстет
                  </span>
                  <span className="mt-0.5 block text-xs text-sidebar-foreground/55">Панель заявок</span>
                </span>
              </Link>

              <div className="relative px-3 pb-2">
                <SidebarSearch />
              </div>

              <div className="relative flex-1 overflow-y-auto">
                <SidebarNav />
              </div>

              <div className="relative flex items-center justify-between border-t border-sidebar-border px-5 py-4">
                <ThemeToggle initialDark={dark} />
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex items-center gap-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  >
                    <LogOut className="size-3.5" aria-hidden />
                    Выйти
                  </button>
                </form>
              </div>
            </aside>

            {/* pb-24 на мобильном — чтобы контент не уезжал под нижнюю панель вкладок */}
            <main className="min-w-0 flex-1 px-4 py-5 pb-28 sm:px-6 lg:px-10 lg:py-8 lg:pb-10">
              {!isDbConfigured() && <DbWarning />}
              {children}
            </main>
          </div>

          <BottomNav initialDark={dark} />
          <Toaster />
          <CommandPalette />
          {/* Сюда окна и палитра выносятся из страницы: у блоков страницы бывает
              transform на время анимации, и position: fixed внутри них сбился бы */}
          <div id="admin-portal" />
        </PulseProvider>
      </MotionProvider>
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
