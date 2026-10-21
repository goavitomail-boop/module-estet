import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { getSession } from '@/lib/admin-auth'
import { isBlobStorage, isNeonStorage, newKey, putFile, signUpload } from '@/lib/storage'

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

/** Папки панели: файлы к заявке, каталог, портфолио — не глубже одной подпапки */
const FOLDER = /^(leads|catalog|portfolio)\/[^/]{1,120}$/

function checkFolder(folder: unknown): string | null {
  return typeof folder === 'string' && FOLDER.test(folder) && !folder.includes('..') ? folder : null
}

function typesFor(folder: string): string[] {
  return PHOTO_FOLDERS.some((prefix) => folder.startsWith(prefix)) ? PHOTO_TYPES : ALLOWED_TYPES
}

/**
 * Загрузка файла менеджера. Хранилище — lib/storage.ts.
 *
 * Neon: панель присылает имя, тип, размер и папку, сервер отвечает
 * подписанной ссылкой, и файл идёт прямо в бакет, минуя сервер, — дизайн-
 * проект в PDF легко весит десятки мегабайт. Пока Neon не настроен —
 * { mode: 'blob' }, и панель грузит по-старому, через токен Vercel Blob.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
  }

  const legacyType = (body as { type?: unknown })?.type
  if (legacyType === 'blob.generate-client-token' || legacyType === 'blob.upload-completed') return legacyBlob(request, body as HandleUploadBody)

  if (!(await getSession())) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  const { name, type, size, folder: rawFolder } = (body ?? {}) as { name?: unknown; type?: unknown; size?: unknown; folder?: unknown }
  const folder = checkFolder(rawFolder)
  if (!folder) return NextResponse.json({ error: 'Недопустимая папка' }, { status: 400 })
  if (typeof type !== 'string' || !typesFor(folder).includes(type)) return NextResponse.json({ error: 'Недопустимый тип файла' }, { status: 400 })
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0 || size > MAX_SIZE) return NextResponse.json({ error: 'Недопустимый размер файла' }, { status: 400 })

  if (isNeonStorage()) {
    try {
      const pathname = newKey(folder, typeof name === 'string' ? name : 'file')
      const { url, headers } = await signUpload(pathname, type, Math.trunc(size))
      return NextResponse.json({ mode: 'put', url, headers, pathname })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[Admin Upload] Не удалось подписать загрузку:', message)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
  if (isBlobStorage()) return NextResponse.json({ mode: 'blob' })
  return NextResponse.json({ error: 'Хранилище файлов не настроено' }, { status: 503 })
}

/** Старый протокол Vercel Blob: токен для прямой загрузки и событие о её завершении */
async function legacyBlob(request: Request, body: HandleUploadBody): Promise<NextResponse> {
  // Событие о завершении присылает сам Vercel, а не браузер: куки сессии
  // в нём нет и быть не может. Подлинность такого запроса проверяет
  // handleUpload по подписи, поэтому сессию требуем только у выдачи токена.
  if (body.type !== 'blob.upload-completed' && !(await getSession())) {
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

/**
 * Запасной путь: файл идёт через сервер, если прямая загрузка из браузера не
 * прошла. Если перед сайтом nginx, его client_max_body_size должен
 * пропускать 25 МБ
 */
export async function PUT(request: Request): Promise<NextResponse> {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  const params = new URL(request.url).searchParams
  const folder = checkFolder(params.get('folder'))
  const contentType = request.headers.get('content-type') || 'application/octet-stream'
  if (!folder) return NextResponse.json({ error: 'Недопустимая папка' }, { status: 400 })
  if (!typesFor(folder).includes(contentType)) return NextResponse.json({ error: 'Недопустимый тип файла' }, { status: 400 })
  if (Number(request.headers.get('content-length') ?? 0) > MAX_SIZE) return NextResponse.json({ error: 'Файл слишком большой' }, { status: 413 })

  try {
    const data = new Uint8Array(await request.arrayBuffer())
    if (data.byteLength === 0 || data.byteLength > MAX_SIZE) return NextResponse.json({ error: 'Недопустимый размер файла' }, { status: 413 })
    const { pathname } = await putFile(newKey(folder, params.get('name') ?? 'file'), data, contentType)
    console.log(`[Admin Upload] Загружен файл через сервер: ${pathname}`)
    return NextResponse.json({ pathname })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Admin Upload] Серверная загрузка не удалась:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
