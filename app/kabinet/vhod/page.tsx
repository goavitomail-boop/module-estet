import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ModuleEstetMark } from '@/components/module-estet-mark'
import { COMPANY } from '@/lib/company'
import { getClientSession, isCabinetConfigured } from '@/lib/cabinet-auth'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Вход' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (await getClientSession()) redirect('/kabinet')
  const { e } = await searchParams

  return (
    <main className="admin-login relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--plan-grid)_1px,transparent_1px),linear-gradient(90deg,var(--plan-grid)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_50%_35%,black,transparent_70%)]"
      />

      <div className="relative w-full max-w-sm">
        <a href="/" className="mb-7 flex flex-col items-center text-center" aria-label="На сайт «Модуль Эстет»">
          <ModuleEstetMark draw className="size-16" />
          <span className="admin-login-word mt-4 text-[1.2rem] font-semibold uppercase leading-none tracking-[0.14em] text-foreground">
            Модуль Эстет
          </span>
          <span className="admin-login-caption mt-2.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Личный кабинет
          </span>
        </a>

        <div className="admin-login-card">
          {e === 'link' && (
            <p className="admin-pop mb-3 rounded-xl bg-amber-400/15 px-4 py-3 text-sm text-amber-900" role="alert">
              Ссылка для входа устарела или уже использована. Запросите новый код.
            </p>
          )}
          {isCabinetConfigured() ? (
            <LoginForm maxEnabled={Boolean(process.env.MAX_BOT_TOKEN)} />
          ) : (
            <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Кабинет пока не работает. Узнать о заказе можно у менеджера по телефону{' '}
              <a href={COMPANY.phoneHref} className="font-medium text-foreground">
                {COMPANY.phone}
              </a>
              .
            </div>
          )}
          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
            Кабинет открывает менеджер, когда начинается работа над заказом. Нет доступа или забыли пароль —
            позвоните{' '}
            <a href={COMPANY.phoneHref} className="whitespace-nowrap font-medium text-foreground underline-offset-2 hover:underline">
              {COMPANY.phone}
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
