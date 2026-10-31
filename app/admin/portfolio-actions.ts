'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/admin-auth'
import {
  addPortfolioProjects,
  deletePortfolioProject,
  getPortfolioProject,
  listPortfolioIds,
  movePortfolioProject,
  seedPortfolioIfEmpty,
  setPortfolioPublished,
  upsertPortfolioProject,
  type PortfolioPhotoRow,
} from '@/lib/db'
import { staticProjectsAsInput } from '@/lib/portfolio-source'
import { slugify, uniqueSlug } from '@/lib/slug'
import { deleteFiles } from '@/lib/storage'

/** Префикс, под которым фотографии портфолио лежат в хранилище */
const BLOB_PREFIX = 'portfolio/'
/** Адрес, по которому их отдаёт сайт */
const MEDIA_PREFIX = '/media/'

/** `/media/portfolio/foo.webp` → `portfolio/foo.webp`. Для файлов из public/ вернёт null */
function blobPathname(src: string): string | null {
  if (!src.startsWith(MEDIA_PREFIX)) return null
  const pathname = src.slice(MEDIA_PREFIX.length)
  return pathname.startsWith(BLOB_PREFIX) && !pathname.includes('..') ? pathname : null
}

/** Удаляет объекты из хранилища, не роняя действие, если что-то не стёрлось */
async function removeBlobs(sources: string[]): Promise<void> {
  const pathnames = sources.map(blobPathname).filter((value): value is string => value !== null)
  if (pathnames.length === 0) return
  // И в Neon, и в Vercel Blob: фото может быть ещё не перенесено (lib/storage.ts)
  await deleteFiles(pathnames)
}

/** Текст из многострочного поля → массив строк без пустых */
function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parsePhotos(value: FormDataEntryValue | null): PortfolioPhotoRow[] {
  try {
    const parsed = JSON.parse(String(value ?? '[]'))
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item.src === 'string')
      .map((item) => ({ src: String(item.src), alt: String(item.alt ?? '').slice(0, 300) }))
  } catch {
    return []
  }
}

export type PortfolioFormState = { error?: string } | null

/**
 * Сохраняет проект — и новый, и отредактированный.
 *
 * Адрес проекта (id) задаётся один раз при создании и дальше не меняется:
 * по нему собираются пути фотографий в хранилище, и переименование
 * оставило бы их висеть в стороне от проекта.
 */
export async function savePortfolioAction(
  _prev: PortfolioFormState,
  formData: FormData
): Promise<PortfolioFormState> {
  await requireSession()

  const id = String(formData.get('id') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim().slice(0, 160)
  if (!title) return { error: 'Без названия проект не сохранить.' }

  const photos = parsePhotos(formData.get('photos'))
  const requestedCover = String(formData.get('coverSrc') ?? '').trim()
  // Обложкой может быть и картинка вне списка фотографий: у проектов,
  // перенесённых из кода, для карточки снята отдельная обложка. Проверяем
  // только, что это путь внутри сайта
  const coverSrc =
    requestedCover.startsWith('/') && !requestedCover.includes('..')
      ? requestedCover
      : (photos[0]?.src ?? '')

  let projectId = id
  if (!projectId) {
    // 'new' занят страницей создания проекта — проект с таким адресом
    // открыть на редактирование было бы нечем
    projectId = uniqueSlug(slugify(title), [...(await listPortfolioIds()), 'new'])
  }

  const previous = id ? await getPortfolioProject(id) : null

  try {
    await upsertPortfolioProject({
      id: projectId,
      title,
      tag: String(formData.get('tag') ?? '').trim().slice(0, 120),
      alt: String(formData.get('alt') ?? '').trim().slice(0, 300) || title,
      coverSrc,
      size: String(formData.get('size') ?? 'short') === 'tall' ? 'tall' : 'short',
      style: String(formData.get('style') ?? '').trim().slice(0, 80),
      area: String(formData.get('area') ?? '').trim().slice(0, 40),
      duration: String(formData.get('duration') ?? '').trim().slice(0, 40),
      description: String(formData.get('description') ?? '').trim().slice(0, 4000),
      materials: lines(formData.get('materials')).slice(0, 30),
      features: lines(formData.get('features')).slice(0, 30),
      photos: photos.slice(0, 40),
      published: formData.get('published') === 'on',
    })
  } catch (error) {
    console.error('[Портфолио] Не удалось сохранить проект:', error)
    return { error: 'Не удалось сохранить проект. Попробуйте ещё раз.' }
  }

  // Фотографии, убранные из проекта, чистим из хранилища — иначе за ним
  // копятся файлы, на которые уже ничто не ссылается
  if (previous) {
    const kept = new Set(photos.map((photo) => photo.src))
    await removeBlobs(previous.photos.filter((photo) => !kept.has(photo.src)).map((photo) => photo.src))
  }

  revalidatePath('/admin/portfolio')
  revalidatePath('/')
  revalidatePath('/portfolio', 'layout')
  revalidatePath('/kuhni', 'layout')
  revalidatePath('/sitemap.xml')
  redirect('/admin/portfolio')
}

export async function deletePortfolioAction(formData: FormData) {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const removed = await deletePortfolioProject(id)
  if (removed) {
    await removeBlobs([...removed.photos.map((photo) => photo.src), removed.cover_src])
  }

  revalidatePath('/admin/portfolio')
  revalidatePath('/')
  revalidatePath('/portfolio', 'layout')
  revalidatePath('/kuhni', 'layout')
  revalidatePath('/sitemap.xml')
  redirect('/admin/portfolio')
}

export async function togglePortfolioAction(formData: FormData) {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  await setPortfolioPublished(id, formData.get('published') === '1')

  revalidatePath('/admin/portfolio')
  revalidatePath('/')
  revalidatePath('/portfolio', 'layout')
  revalidatePath('/kuhni', 'layout')
  revalidatePath('/sitemap.xml')
}

/**
 * Переносит проекты из lib/portfolio-data.ts в базу.
 *
 * Отдельным действием по кнопке, а не при открытии страницы: запись при
 * обычном показе раздела — неожиданное поведение, и владелец должен сам
 * решить, начинать ли портфолио с этих восьми работ или завести своё.
 */
export async function importPortfolioAction() {
  await requireSession()
  await seedPortfolioIfEmpty(staticProjectsAsInput())
  revalidatePath('/admin/portfolio')
  revalidatePath('/')
  revalidatePath('/portfolio', 'layout')
  revalidatePath('/kuhni', 'layout')
  revalidatePath('/sitemap.xml')
}

/**
 * Добавляет в базу один проект из lib/portfolio-data.ts, которого там нет.
 *
 * Проекты, заложенные в код после переноса портфолио в панель, на сайт сами
 * не попадают: галерея берёт только базу. Владелец добавляет их по кнопке.
 */
export async function addCodeProjectAction(formData: FormData) {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  const project = staticProjectsAsInput().find((item) => item.id === id)
  if (!project) return

  await addPortfolioProjects([project])

  revalidatePath('/admin/portfolio')
  revalidatePath('/')
  revalidatePath('/portfolio', 'layout')
  revalidatePath('/kuhni', 'layout')
  revalidatePath('/sitemap.xml')
}

export async function movePortfolioAction(formData: FormData) {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  const direction = String(formData.get('direction') ?? '') === 'up' ? -1 : 1
  if (!id) return

  await movePortfolioProject(id, direction)

  revalidatePath('/admin/portfolio')
  revalidatePath('/')
  revalidatePath('/portfolio', 'layout')
  revalidatePath('/kuhni', 'layout')
  revalidatePath('/sitemap.xml')
}
