import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { allowRequest, clientIp } from '@/lib/request-guard'
import { isBlobStorage, isNeonStorage, newKey, putFile, signUpload } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024

/** Единственная папка, куда может писать посетитель. Остальные — только из панели */
const LEADS_FOLDER = 'leads'

/**
 * Квиз принимает до 8 файлов, у каждого бывает повторная попытка — с запасом.
 * Больше за десять минут с одного адреса человеку не нужно
 */
const UPLOAD_LIMIT = 30
const UPLOAD_WINDOW_MS = 10 * 60_000

/**
 * Загрузка файла посетителем (квиз). Хранилище — lib/storage.ts.
 *
 * Neon: браузер присылает имя, тип и размер, сервер отвечает подписанной
 * ссылкой, и файл идёт прямо в бакет, минуя сервер. Пока Neon на сервере не
 * настроен, отвечаем { mode: 'blob' }, и браузер грузит по-старому в Vercel
 * Blob — этот же маршрут выдаёт ему токен (старый протокол handleUpload).
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

  if (!allowRequest('upload', clientIp(request), UPLOAD_LIMIT, UPLOAD_WINDOW_MS)) {
    return NextResponse.json({ error: 'Слишком много загрузок подряд. Попробуйте чуть позже.' }, { status: 429 })
  }

  const { name, type, size } = (body ?? {}) as { name?: unknown; type?: unknown; size?: unknown }
  if (typeof type !== 'string' || !ALLOWED_TYPES.includes(type)) return NextResponse.json({ error: 'Недопустимый тип файла' }, { status: 400 })
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0 || size > MAX_SIZE) return NextResponse.json({ error: 'Недопустимый размер файла' }, { status: 400 })

  if (isNeonStorage()) {
    try {
      const pathname = newKey(LEADS_FOLDER, typeof name === 'string' ? name : 'file')
      const { url, headers } = await signUpload(pathname, type, Math.trunc(size))
      return NextResponse.json({ mode: 'put', url, headers, pathname })
    } catch (error) {
      console.error('[Upload] Не удалось подписать загрузку:', error instanceof Error ? error.message : error)
      return NextResponse.json({ error: 'Не удалось подготовить загрузку файла' }, { status: 500 })
    }
  }
  if (isBlobStorage()) return NextResponse.json({ mode: 'blob' })
  return NextResponse.json({ error: 'Хранилище файлов не настроено' }, { status: 503 })
}

/** Старый протокол Vercel Blob: токен для прямой загрузки и событие о её завершении */
async function legacyBlob(request: Request, body: HandleUploadBody): Promise<NextResponse> {
  // Событие о завершении присылает само хранилище, а не посетитель: его
  // подлинность проверяет handleUpload по подписи, и в лимит оно не входит
  if (body.type !== 'blob.upload-completed' && !allowRequest('upload', clientIp(request), UPLOAD_LIMIT, UPLOAD_WINDOW_MS)) {
    return NextResponse.json({ error: 'Слишком много загрузок подряд. Попробуйте чуть позже.' }, { status: 429 })
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Путь выбирает браузер. Без этой проверки посетитель мог бы положить
        // файл в portfolio/ или catalog/ — а их сайт раздаёт всем по /media
        if (!pathname.startsWith(`${LEADS_FOLDER}/`) || pathname.includes('..')) {
          throw new Error('Недопустимый путь загрузки')
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE,
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log(`[Upload] Файл загружен: ${blob.pathname}`)
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    // Подробности — в журнал сервера. Посетителю внутренние причины ни к чему:
    // квиз при ошибке сам пробует запасной путь
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Upload] Ошибка загрузки:', message)
    return NextResponse.json({ error: 'Не удалось подготовить загрузку файла' }, { status: 400 })
  }
}

/**
 * Запасной путь: файл приходит на сервер, и уже сервер кладёт его в
 * хранилище — если прямая загрузка из браузера не прошла (сеть режет адрес
 * хранилища, нет CORS). Если перед сайтом nginx, его client_max_body_size
 * должен пропускать 10 МБ, иначе крупные файлы он отсечёт сам
 */
export const FALLBACK_MAX_SIZE = MAX_SIZE

export async function PUT(request: Request): Promise<NextResponse> {
  if (!allowRequest('upload', clientIp(request), UPLOAD_LIMIT, UPLOAD_WINDOW_MS)) {
    return NextResponse.json({ error: 'Слишком много загрузок подряд. Попробуйте чуть позже.' }, { status: 429 })
  }

  const name = new URL(request.url).searchParams.get('name') ?? ''
  const contentType = request.headers.get('content-type') || 'application/octet-stream'

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Недопустимый тип файла' }, { status: 400 })
  }

  // Размер известен из заголовка ещё до чтения тела — не читаем лишнее в память
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > FALLBACK_MAX_SIZE) {
    return NextResponse.json({ error: 'Файл слишком большой для этого способа загрузки' }, { status: 413 })
  }

  try {
    const data = new Uint8Array(await request.arrayBuffer())
    if (data.byteLength === 0 || data.byteLength > FALLBACK_MAX_SIZE) {
      return NextResponse.json({ error: 'Недопустимый размер файла' }, { status: 413 })
    }

    // Файлы клиента приватные: фото квартиры и планировки — личные данные.
    // Менеджеры смотрят их через /admin/file, который проверяет сессию
    const { pathname } = await putFile(newKey(LEADS_FOLDER, name), data, contentType)
    console.log(`[Upload] Файл загружен через сервер: ${pathname}`)
    return NextResponse.json({ pathname })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Upload] Серверная загрузка не удалась:', message)
    return NextResponse.json({ error: 'Не удалось сохранить файл' }, { status: 500 })
  }
}

// Открытой проверки хранилища (GET /api/upload) здесь больше нет: она сообщала
// любому, чем авторизовано хранилище и есть ли в нём файлы. Диагностика
// осталась в /api/max-diag — там она закрыта ключом.
