import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getLead, isDbConfigured } from '@/lib/db'
import { getClientByPhone } from '@/lib/cabinet-db'
import { formatRussianPhone } from '@/lib/phone'
import { PageHeader } from '../../../_components/ui'
import { CreateClientForm } from './create-client-form'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Новый кабинет' }

export default async function NewCabinetPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const { lead: leadId } = await searchParams
  const lead = leadId && isDbConfigured() ? await getLead(leadId).catch(() => null) : null
  const existing = lead ? await getClientByPhone(lead.phone_digits).catch(() => null) : null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={lead ? `/admin/leads/${lead.id}` : '/admin/kabinety'}
        className="-my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {lead ? `К заявке ${lead.id}` : 'К кабинетам'}
      </Link>
      <PageHeader
        eyebrow="Личный кабинет"
        title="Новый кабинет"
        description={
          lead
            ? 'Имя и телефон взяты из заявки. Заказ по заявке появится в кабинете сразу.'
            : 'Клиент входит по номеру телефона. Пароль задаёт сам по ссылке — или его задаёте вы.'
        }
      />
      {/* Форма рисуется всегда: после создания сервер перерисует страницу и уже
          найдёт кабинет по номеру — а карточка с приглашением должна остаться */}
      <CreateClientForm
        leadId={lead?.id}
        defaultName={lead?.name ?? ''}
        defaultPhone={lead ? formatRussianPhone(lead.phone) : ''}
        existing={existing ? { id: existing.id, name: existing.name } : null}
      />
    </div>
  )
}
