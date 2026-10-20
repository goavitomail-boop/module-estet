import {
  getCatalogGroupNotes,
  isDbConfigured,
  listCatalogItems,
  type CatalogRow,
  type CatalogSection,
} from '@/lib/db'
import { catalogDraftRows } from '@/lib/catalog-seed'
import type { CatalogGroup } from '@/lib/pdf-catalog-data'

/**
 * Позиции раздела каталога для публичной страницы.
 *
 * Сбой базы не должен ронять страницу: каталог — витрина, а не форма заявки.
 * Пустой список означает «раздел ещё не ведётся из панели», и страница
 * показывает то, что заложено в коде.
 */
export async function getCatalogSection(section: CatalogSection): Promise<CatalogRow[]> {
  if (!isDbConfigured()) return []

  try {
    return await listCatalogItems(section)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[Каталог] Не удалось прочитать раздел «${section}»: ${message}`)
    return []
  }
}

/**
 * Позиции «Фасадов» и «Столешниц» для страницы: из панели, а пока там пусто
 * или база не ответила — черновик из каталога производства (catalog-seed.ts).
 * Страница есть всегда: на неё ведут меню и подвал
 */
export async function getCatalogSectionOrDraft(section: 'facades' | 'countertops'): Promise<CatalogRow[]> {
  const items = await getCatalogSection(section)
  return items.length > 0 ? items : catalogDraftRows(section)
}

/**
 * Тот же раздел, но собранный в группы — в том виде, в каком его рисует
 * страница каталога. Группы идут в порядке первого появления позиции,
 * то есть порядком в панели владелец управляет и составом, и очерёдностью.
 *
 * Возвращает null, когда раздел в базе не ведётся: страница отличает это
 * от «раздел пуст» и показывает содержимое из кода.
 */
export async function getCatalogGroups(section: CatalogSection): Promise<CatalogGroup[] | null> {
  const items = await getCatalogSection(section)
  if (items.length === 0) return null

  const notes = await getCatalogGroupNotes(section).catch(() => ({}) as Record<string, string>)

  const groups: CatalogGroup[] = []
  const index = new Map<string, CatalogGroup>()

  for (const item of items) {
    const title = item.group_title.trim() || 'Остальное'
    const key = title.toLowerCase()

    let group = index.get(key)
    if (!group) {
      group = {
        id: slugId(title, groups.length),
        eyebrow: '',
        title,
        description: notes[key] ?? '',
        items: [],
      }
      index.set(key, group)
      groups.push(group)
    }

    group.items!.push({
      name: item.name,
      image: item.image,
      meta: [item.meta, item.description].filter(Boolean).join(' · ') || undefined,
    })
  }

  return groups
}

/** Якорь для ссылки в шапке страницы. Кириллица в id работает, но в адресе выглядит мусором */
function slugId(title: string, index: number): string {
  const ascii = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return ascii || `group-${index + 1}`
}
