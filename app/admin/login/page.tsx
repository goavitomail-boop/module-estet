import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSession, isAuthConfigured } from '@/lib/admin-auth'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Вход в панель', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (await getSession()) redirect('/admin')

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-[family-name:var(--font-oswald)] text-lg font-medium uppercase tracking-[0.2em] text-foreground">
            Модуль Эстет
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Панель управления заявками</p>
        </div>

        {isAuthConfigured() ? (
          <LoginForm />
        ) : (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
            <p className="font-semibold text-foreground">Панель не настроена</p>
            <p className="mt-2 text-muted-foreground">
              Задайте переменную окружения{' '}
              <code className="rounded bg-secondary px-1 py-0.5">ADMIN_PASSWORD_HASH</code> в{' '}
              <code className="rounded bg-secondary px-1 py-0.5">.env.local</code> и на хостинге, затем перезапустите
              сервер.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
