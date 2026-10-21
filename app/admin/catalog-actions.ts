'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/admin-auth'
import {
  CATALOG_SECTIONS,
  deleteCatalogItem,
  getCatalogItem,
  isCatalogSection,
  listCatalogIds,
  moveCatalogItem,
  seedCatalogIfEmpty,
  setCatalogGroupNote,
  setCatalogPublished,
  upsertCatalogItem,
  type CatalogSection,
} from '@/lib/db'
import { catalogGroupNotesSeed, catalogSeed } from '@/lib/catalog-seed'
import { slugify, uniqueSlug } from '@/lib/slug'
import { deleteFiles } from '@/lib/storage'

const BLOB_PREFIX = 'catalog/'
const MEDIA_PREFIX = '/media/'

function sectionPath(section: CatalogSection): string {
  return CATALOG_SECTIONS.find((item) => item.value === section)?.path ?? '/'
}

/** Обновляет и панель, и страницу раздела на сайте */
function refresh(section: CatalogSection) {
  revalidatePath('/admin/catalog')
  revalidatePath(sectionPath(section))
}

/** `/media/catalog/foo.webp` → `catalog/foo.webp`. Для заглушки из public/ вернёт null */
function blobPathname(src: string): string | null {
  if (!src.startsWith(MEDIA_PREFIX)) return null
  const pathname = src.slice(MEDIA_PREFIX.length)
  return pathname.startsWith(BLOB_PREFIX) && !pathname.includes('..') ? pathname : null
}

/**
 * Хост, на котором лежат фотографии из каталога производства.
 *
 * Позиции, перенесённые в панель, ссылаются на него, а не на наше хранилище.
 * Без этой оговорки обычное сохранение такой позиции стирало бы ей фото:
 * адрес не начинается со слэша и не прошёл бы проверку.
 */
const LEGACY_IMAGE_HOST = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/'

/** Пропускаем только свои пути и уже известный внешний хост каталога */
function safeImage(src: string): string {
  if (src.startsWith('/') && !src.includes('..')) return src
  if (src.startsWith(LEGACY_IMAGE_HOST)) return src
  return ''
}

async function removeBlob(src: string | null | undefined): Promise<void> {
  const pathname = src ? blobPathname(src) : null
  if (!pathname) return
  // И в Neon, и в Vercel Blob: фото может быть ещё не перенесено (lib/storage.ts)
  await deleteFiles([pathname])
}

export type CatalogFormState = { error?: string } | null

/**
 * Сохраняет позицию каталога — и новую, и отредактированную.
 *
 * Раздел задаётся при создании и дальше не меняется: позиция уже стоит
 * в своём порядке среди соседей, и переезд между разделами оставил бы
 * дырку в нумерации.
 */
export async function saveCatalogAction(
  _prev: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  await requireSession()

  const id = String(formData.get('id') ?? '').trim()
  const section = String(formData.get('section') ?? '')
  if (!isCatalogSection(section)) return { error: 'Неизвестный раздел каталога.' }

  const name = String(formData.get('name') ?? '').trim().slice(0, 160)
  if (!name) return { error: 'Без названия позицию не сохранить.' }

  const image = safeImage(String(formData.get('image') ?? '').trim())

  let itemId = id
  if (!itemId) {
    const taken = await listCatalogIds(section)
    itemId = uniqueSlug(`${section}-${slugify(name)}`, taken)
  }

  const previous = id ? await getCatalogItem(id) : null
  const groupTitle = String(formData.get('groupTitle') ?? '').trim().slice(0, 80)

  try {
    await upsertCatalogItem({
      id: itemId,
      section,
      groupTitle,
      name,
      meta: String(formData.get('meta') ?? '').trim().slice(0, 200),
      description: String(formData.get('description') ?? '').trim().slice(0, 600),
      image,
      published: formData.get('published') === 'on',
    })
  } catch (error) {
    console.error('[Каталог] Не удалось сохранить позицию:', error)
    return { error: 'Не удалось сохранить позицию. Попробуйте ещё раз.' }
  }

  // Описание группы принадлежит всей группе, а не этой позиции: правится
  // из любой её карточки и сохраняется отдельно
  if (groupTitle) {
    await setCatalogGroupNote(
      section,
      groupTitle,
      String(formData.get('groupNote') ?? '').trim().slice(0, 600)
    )
  }

  // Заменили фото — старое из хранилища убираем, иначе за каталогом
  // копятся файлы, на которые уже ничто не ссылается
  if (previous && previous.image !== image) await removeBlob(previous.image)

  refresh(section)
  redirect(`/admin/catalog?section=${section}`)
}

export async function deleteCatalogAction(formData: FormData) {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const removed = await deleteCatalogItem(id)
  if (removed) {
    await removeBlob(removed.image)
    refresh(removed.section)
    redirect(`/admin/catalog?section=${removed.section}`)
  }

  redirect('/admin/catalog')
}

export async function toggleCatalogAction(formData: FormData) {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  const section = String(formData.get('section') ?? '')
  if (!id || !isCatalogSection(section)) return

  await setCatalogPublished(id, formData.get('published') === '1')
  refresh(section)
}

export async function moveCatalogAction(formData: FormData) {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  const section = String(formData.get('section') ?? '')
  if (!id || !isCatalogSection(section)) return

  await moveCatalogItem(id, String(formData.get('direction') ?? '') === 'up' ? -1 : 1)
  refresh(section)
}

/** Переносит в базу стартовый набор раздела вместе с описаниями групп */
export async function seedCatalogAction(formData: FormData) {
  await requireSession()
  const section = String(formData.get('section') ?? '')
  if (!isCatalogSection(section)) return

  const added = await seedCatalogIfEmpty(section, catalogSeed(section))
  if (added) {
    for (const note of catalogGroupNotesSeed(section)) {
      await setCatalogGroupNote(section, note.title, note.description)
    }
  }

  refresh(section)
}
