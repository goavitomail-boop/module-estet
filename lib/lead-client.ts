import { COMPANY } from '@/lib/company'

/**
 * Отправка заявки из браузера — общая для квиза и записи на замер.
 *
 * Бросает LeadSubmitError с текстом, который можно сразу показать человеку:
 * без английских технических фраз и с телефоном, если сайт не принял заявку.
 */

export const LEAD_FAILED_MESSAGE = `Не получилось отправить заявку. Попробуйте ещё раз или позвоните нам: ${COMPANY.phone}.`
const OFFLINE_MESSAGE = 'Нет связи с сайтом. Проверьте интернет и нажмите ещё раз.'

export class LeadSubmitError extends Error {
  /** Тело ответа сервера, если он прислал JSON: например, slotTaken у записи на замер */
  readonly data: Record<string, unknown> | null

  constructor(message: string, data: Record<string, unknown> | null = null) {
    super(message)
    this.name = 'LeadSubmitError'
    this.data = data
  }
}

export async function submitLead(body: Record<string, unknown>): Promise<{ id?: string }> {
  let response: Response
  try {
    response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new LeadSubmitError(OFFLINE_MESSAGE)
  }

  const json = (await response.json().catch(() => null)) as Record<string, unknown> | null

  if (!response.ok) {
    // Сервер пишет причину по-русски (лимит, длинный комментарий, занятый слот).
    // Если ответил не он, а прокси или упавший процесс, — общий текст с телефоном
    const message = typeof json?.error === 'string' && json.error ? json.error : LEAD_FAILED_MESSAGE
    throw new LeadSubmitError(message, json)
  }

  return { id: typeof json?.id === 'string' ? json.id : undefined }
}
