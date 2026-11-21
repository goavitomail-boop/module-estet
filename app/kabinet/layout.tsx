import type { Metadata, Viewport } from 'next'
import { MotionProvider } from '@/app/admin/_components/motion'
import { Toaster } from '@/app/admin/_components/toast'
import '@/app/admin/admin.css'

/**
 * Личный кабинет клиента. Облик и движение — общие с панелью
 * (app/admin/admin.css, корень .admin-root): тот же тёплый фон, латунь
 * и короткие анимации; плюс свои классы .kb-* там же.
 */
export const metadata: Metadata = {
  title: { default: 'Личный кабинет', template: '%s | Кабинет «Модуль Эстет»' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
  themeColor: '#f7f5f0',
}

export const dynamic = 'force-dynamic'

export default function KabinetRoot({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root kabinet-root min-h-dvh text-foreground">
      <MotionProvider>
        {children}
        <Toaster />
        {/* Окна и галерея выносятся сюда — см. панель (app/admin/(panel)/layout.tsx) */}
        <div id="admin-portal" />
      </MotionProvider>
    </div>
  )
}
