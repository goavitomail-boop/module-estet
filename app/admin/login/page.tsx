import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'
import { getSession, isAuthConfigured } from '@/lib/admin-auth'
import { BrandLogo } from '@/components/brand-logo'
import { cn } from '@/lib/utils'
import { THEME_COOKIE } from '@/lib/admin-theme'
import { LoginForm } from './login-form'
import '../admin.css'

export const metadata: Metadata = { title: 'Вход в панель', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (await getSession()) redirect('/admin')
  const dark = (await cookies()).get(THEME_COOKIE)?.value === 'dark'

  return (
    <main
      className={cn(
        'admin-root admin-login relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12 text-foreground',
        dark && 'dark'
      )}
    >
      {/* Чертёжная сетка, как на сайте, — гаснет к краям */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--plan-grid)_1px,transparent_1px),linear-gradient(90deg,var(--plan-grid)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_50%_35%,black,transparent_70%)]"
      />

      <div className="relative w-full max-w-sm">
        {/* Логотип прорисовывается линией: рама, кухня, потом слова */}
        <div className="mb-6 flex justify-center text-[15px] text-foreground">
          <BrandLogo animated />
        </div>
        <p className="admin-login-caption mb-6 text-center text-sm text-muted-foreground">Панель управления заявками</p>

        <div className="admin-login-card">
          {isAuthConfigured() ? (
            <LoginForm />
          ) : (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
              <p className="font-semibold text-foreground">Панель не настроена</p>
              <p className="mt-2 text-muted-foreground">
                Задайте переменную окружения{' '}
                <code className="rounded bg-secondary px-1 py-0.5">ADMIN_PASSWORD_HASH</code> в{' '}
                <code className="rounded bg-secondary px-1 py-0.5">.env.local</code> и на хостинге, затем
                перезапустите сервер.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
