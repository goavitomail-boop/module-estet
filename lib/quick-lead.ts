import type { Lead, LeadStatus, LeadType } from '@/lib/db'

/**
 * Всё, что нужно панели быстрого редактирования (app/admin/_components/quick-edit.tsx),
 * — без похода на сервер за карточкой. Только простые значения: объект
 * передаётся из серверной страницы в клиентский компонент.
 */
export interface QuickLead {
  id: string
  name: string
  phone: string
  type: LeadType
  status: LeadStatus
  assigned_to: string | null
  deal_amount: string | null
  next_contact_at: string | null
  reject_reason: string | null
  city?: string
  address?: string
}

export function toQuickLead(lead: Lead): QuickLead {
  const details = (lead.details ?? {}) as Record<string, unknown>
  const text = (key: string) => (typeof details[key] === 'string' ? (details[key] as string) : '')
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    type: lead.type,
    status: lead.status,
    assigned_to: lead.assigned_to,
    deal_amount: lead.deal_amount != null ? String(lead.deal_amount) : null,
    next_contact_at: lead.next_contact_at ? String(lead.next_contact_at) : null,
    reject_reason: lead.reject_reason,
    ...(lead.type === 'measurement' ? { city: text('city'), address: text('address') } : {}),
  }
}
