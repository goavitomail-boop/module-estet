import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/admin-auth'
import { isDbConfigured, listLeads } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LIMIT = 8

/**
 * Быстрый поиск для палитры ⌘K: по цифрам — телефон, иначе имя или номер
 * заявки. Та же логика, что у фильтра «Поиск» в списке заявок.
 */
export async function GET(request: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const headers = { 'Cache-Control': 'no-store' }
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 64)
  if (q.length < 2 || !isDbConfigured()) {
    return NextResponse.json({ leads: [], total: 0 }, { headers })
  }

  try {
    const { rows, total } = await listLeads({ search: q, limit: LIMIT })
    return NextResponse.json(
      {
        total,
        leads: rows.map((lead) => ({
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          status: lead.status,
          type: lead.type,
          created_at: lead.created_at,
        })),
      },
      { headers }
    )
  } catch (error) {
    console.warn('[Admin] Поиск недоступен:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers })
  }
}
