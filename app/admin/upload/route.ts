import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { getSession } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Договор в PDF, проект, фото с замера, счёт из бухгалтерии */
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

/** В портфолио и каталог кладут только фотографии — договор туда попасть не должен */
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/avif']
const PHOTO_FOLDERS = ['portfolio/', 'catalog/']

const MAX_SIZE = 25 * 1024 * 1024

/**
 * Выдаёт браузеру одноразовый токен для загрузки файла менеджера.
 *
 * Файл идёт из браузера прямо в хранилище, минуя серверную функцию: тело
 * запроса к функции на Vercel ограничено 4,5 МБ, а дизайн-проект в PDF
 * легко весит больше.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
  }

  // Событие о завершении присылает сам Vercel, а не браузер: куки сессии
  // в нём нет и быть не может. Подлинность такого запроса проверяет
  // handleUpload по подписи, поэтому сессию требуем только у выдачи токена.
  const isCompletionCallback = (body as { type?: string })?.type === 'blob.upload-completed'
  if (!isCompletionCallback && !(await getSession())) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: PHOTO_FOLDERS.some((folder) => pathname.startsWith(folder))
          ? PHOTO_TYPES
          : ALLOWED_TYPES,
        maximumSizeInBytes: MAX_SIZE,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async ({ blob }) => {
        // Запись в базу делает серверное действие после ответа upload():
        // этот колбэк Vercel не может вызвать на localhost, и полагаться
        // на него для сохранения нельзя.
        console.log(`[Admin Upload] Загружен файл: ${blob.pathname}`)
      },
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Admin Upload] Ошибка загрузки:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
