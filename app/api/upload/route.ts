import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { allowRequest, clientIp } from '@/lib/request-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024

/** Единственная папка, куда может писать посетитель. Остальные — только из панели */
const LEADS_FOLDER = 'leads/'

/**
 * Квиз принимает до 8 файлов, у каждого бывает повторная попытка — с запасом.
 * Больше за десять минут с одного адреса человеку не нужно
 */
const UPLOAD_LIMIT = 30
const UPLOAD_WINDOW_MS = 10 * 60_000

/** Имя файла без путей и управляющих символов: оно попадает в ключ хранилища */
function safeName(value: string): string {
  const base = value.split(/[\\/]/).pop() ?? ''
  const clean = base.replace(/[^\p{L}\p{N}._ -]+/gu, '_').replace(/\.{2,}/g, '.').trim().slice(0, 120)
  return clean || 'file'
}

/**
 * Выдаёт браузеру одноразовый токен для прямой загрузки файла в Vercel Blob.
 *
 * Файлы идут в хранилище напрямую, минуя серверную функцию: на Vercel тело
 * запроса к функции ограничено 4,5 МБ, а квиз принимает до 8 файлов по 10 МБ.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Наличие BLOB_READ_WRITE_TOKEN намеренно НЕ проверяем.
  // При подключении хранилища через OIDC этой переменной не существует,
  // а доступ выдаётся по идентификатору стора — ранняя проверка в таком
  // случае отсекала бы полностью рабочую конфигурацию.
  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
  }

  // Событие о завершении присылает само хранилище, а не посетитель: его
  // подлинность проверяет handleUpload по подписи, и в лимит оно не входит
  const isCompletionCallback = (body as { type?: string })?.type === 'blob.upload-completed'
  if (!isCompletionCallback && !allowRequest('upload', clientIp(request), UPLOAD_LIMIT, UPLOAD_WINDOW_MS)) {
    return NextResponse.json({ error: 'Слишком много загрузок подряд. Попробуйте чуть позже.' }, { status: 429 })
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Путь выбирает браузер. Без этой проверки посетитель мог бы положить
        // файл в portfolio/ или catalog/ — а их сайт раздаёт всем по /media
        if (!pathname.startsWith(LEADS_FOLDER) || pathname.includes('..')) {
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
 * Запасной путь: файл приходит на сервер, и уже сервер кладёт его в хранилище.
 *
 * Нужен потому, что прямая загрузка из браузера идёт на vercel.com/api/blob,
 * и этот адрес в некоторых сетях и конфигурациях отвечает без CORS-заголовков —
 * браузер режет запрос, а SDK молча уходит в повторные попытки.
 *
 * Ограничение: тело запроса к серверной функции на Vercel — около 4,5 МБ,
 * поэтому сюда пускаем файлы до 4 МБ. Более крупные идут только прямым путём.
 */
export const FALLBACK_MAX_SIZE = 4 * 1024 * 1024

export async function PUT(request: Request): Promise<NextResponse> {
  if (!allowRequest('upload', clientIp(request), UPLOAD_LIMIT, UPLOAD_WINDOW_MS)) {
    return NextResponse.json({ error: 'Слишком много загрузок подряд. Попробуйте чуть позже.' }, { status: 429 })
  }

  const name = safeName(new URL(request.url).searchParams.get('name') ?? '')
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
    const data = await request.arrayBuffer()
    if (data.byteLength > FALLBACK_MAX_SIZE) {
      return NextResponse.json({ error: 'Файл слишком большой для этого способа загрузки' }, { status: 413 })
    }

    const { put } = await import('@vercel/blob')
    // access: 'private' — фотографии кухонь и планировки это личные данные
    // клиента. Их нельзя отдавать всем, у кого есть ссылка. Менеджеры смотрят
    // файлы через /admin/file, который проверяет сессию.
    const blob = await put(`${LEADS_FOLDER}${Date.now()}-${name}`, data, {
      access: 'private',
      contentType,
      addRandomSuffix: true,
    })

    console.log(`[Upload] Файл загружен через сервер: ${blob.pathname}`)
    return NextResponse.json({ url: blob.url, pathname: blob.pathname })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Upload] Серверная загрузка не удалась:', message)
    return NextResponse.json({ error: 'Не удалось сохранить файл' }, { status: 500 })
  }
}

// Открытой проверки хранилища (GET /api/upload) здесь больше нет: она сообщала
// любому, чем авторизовано хранилище и есть ли в нём файлы. Диагностика
// осталась в /api/max-diag — там она закрыта ключом.
