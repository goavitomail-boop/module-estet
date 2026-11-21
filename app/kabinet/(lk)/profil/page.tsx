import { CheckCircle2, LogOut, MessageCircle, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { requireClient } from '@/lib/cabinet-auth'
import { COMPANY } from '@/lib/company'
import { PageHeader, Panel } from '@/app/admin/_components/ui'
import { logoutAction, logoutEverywhereAction, unlinkMaxAction } from '../../actions'
import { MaxLinkCard, PasswordForm } from '../../_components/profile-forms'

export const metadata = { title: 'Профиль' }

export default async function ProfilePage() {
  const client = await requireClient()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow="Личный кабинет" title="Профиль" description="Как вы входите и куда приходят новости по заказу" />

      <Panel
        title={
          <span className="flex items-center gap-2">
            <UserRound className="size-4 text-muted-foreground" aria-hidden />
            Контакты
          </span>
        }
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Имя</dt>
            <dd className="mt-1 text-sm">{client.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Телефон для входа</dt>
            <dd className="mt-1 flex items-center gap-1.5 text-sm tabular-nums">
              <Phone className="size-3.5 text-muted-foreground" aria-hidden />
              {client.phone}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Сменить имя или номер можно через менеджера:{' '}
          <a href={COMPANY.phoneHref} className="font-medium text-foreground">
            {COMPANY.phone}
          </a>
          .
        </p>
      </Panel>

      <Panel
        title={
          <span id="max" className="flex scroll-mt-24 items-center gap-2">
            <MessageCircle className="size-4 text-muted-foreground" aria-hidden />
            MAX
          </span>
        }
        action={
          client.max_user_id ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="size-3.5" aria-hidden />
              Привязан
            </span>
          ) : undefined
        }
      >
        {client.max_user_id ? (
          <>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Новости по заказу приходят в чат с ботом «Модуль Эстет», а войти в кабинет можно кодом оттуда —
              без пароля.
            </p>
            <form action={unlinkMaxAction} className="mt-4">
              <button type="submit" className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline">
                Отвязать MAX
              </button>
            </form>
          </>
        ) : (
          <MaxLinkCard />
        )}
      </Panel>

      <Panel
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
            Пароль
          </span>
        }
      >
        <PasswordForm hasPassword={Boolean(client.password_hash)} />
      </Panel>

      <div className="flex flex-col gap-2 sm:flex-row">
        <form action={logoutAction} className="flex-1">
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary"
          >
            <LogOut className="size-4" aria-hidden />
            Выйти
          </button>
        </form>
        <form action={logoutEverywhereAction} className="flex-1">
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Выйти на всех устройствах
          </button>
        </form>
      </div>
    </div>
  )
}
