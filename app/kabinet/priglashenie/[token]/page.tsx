import type { Metadata } from 'next'
import { ModuleEstetMark } from '@/components/module-estet-mark'
import { COMPANY } from '@/lib/company'
import { findToken, getClient } from '@/lib/cabinet-db'
import { isCabinetConfigured } from '@/lib/cabinet-auth'
import { InviteForm } from './invite-form'

export const metadata: Metadata = { title: 'Приглашение в кабинет' }

/**
 * Ссылка-приглашение от менеджера: клиент задаёт себе пароль и сразу входит.
 * Ссылка одноразовая и действует 7 дней (app/admin/cabinet-actions.ts).
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const row = isCabinetConfigured() ? await findToken(token, 'invite').catch(() => null) : null
  const client = row ? await getClient(row.client_id) : null
  const firstName = client?.name.split(' ')[0]

  return (
    <main className="admin-login relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      <div className="relative w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <ModuleEstetMark draw className="size-16" />
          <p className="admin-login-word mt-4 text-[1.2rem] font-semibold uppercase leading-none tracking-[0.14em]">
            Модуль Эстет
          </p>
          <p className="admin-login-caption mt-2.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Личный кабинет
          </p>
        </div>

        <div className="admin-login-card rounded-xl border border-border bg-card/90 p-5 shadow-[0_24px_60px_-28px_oklch(0.3_0.04_80/0.45)] backdrop-blur sm:p-6">
          {client && !client.blocked ? (
            <>
              <h1 className="admin-display text-2xl leading-tight">
                {firstName ? `${firstName}, здравствуйте!` : 'Здравствуйте!'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Здесь будет всё по вашему заказу: этап работ, визиты мастеров, проект, документы и фото
                с производства. Придумайте пароль — с ним вы будете входить по номеру{' '}
                <span className="whitespace-nowrap font-medium text-foreground">{client.phone}</span>.
              </p>
              <InviteForm token={token} />
            </>
          ) : (
            <>
              <h1 className="admin-display text-2xl leading-tight">Ссылка не действует</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Она устарела или ей уже воспользовались. Если пароль уже задан —{' '}
                <a href="/kabinet/vhod" className="font-medium text-foreground underline underline-offset-2">
                  войдите
                </a>
                . Если нет — попросите менеджера прислать новую ссылку:{' '}
                <a href={COMPANY.phoneHref} className="whitespace-nowrap font-medium text-foreground">
                  {COMPANY.phone}
                </a>
                .
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
