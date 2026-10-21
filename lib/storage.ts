import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { siteUrl } from '@/lib/seo'

/**
 * Файловое хранилище сайта: файлы из квиза, файлы менеджеров к заявкам,
 * фото портфолио и каталога.
 *
 * Основное — Neon Object Storage: S3-совместимое хранилище того же проекта
 * Neon, что и база (бакет files, объявлен в neon.ts). Доступ — переменные
 * AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION.
 *
 * Запасное — Vercel Blob, где файлы лежали раньше. Пока переменных Neon на
 * сервере нет, всё пишется и читается по-старому. Когда они есть, новые
 * файлы идут в Neon, а читается сначала Neon, потом Blob: файл, ещё не
 * перенесённый скриптом scripts/neon-storage.mjs migrate, всё равно
 * откроется.
 *
 * Ключ объекта — тот же путь, что был в Blob (leads/…, portfolio/…,
 * catalog/…): база хранит пути, и после переноса ничего в ней менять не нужно.
 */

export const BUCKET = process.env.STORAGE_BUCKET || 'files'

/** Где лежат новые файлы: Neon, Blob или нигде (не настроено ничего) */
export type StorageKind = 'neon' | 'blob' | null

export function isNeonStorage(): boolean {
  return Boolean(process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
}

/** Blob: на своём сервере только по токену (OIDC бывает лишь на Vercel) */
export function isBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL)
}

export function storageKind(): StorageKind {
  if (isNeonStorage()) return 'neon'
  if (isBlobStorage()) return 'blob'
  return null
}

let client: S3Client | null = null

function s3(): S3Client {
  client ??= new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION || 'us-east-2',
    // Neon понимает только адреса вида endpoint/бакет/ключ
    forcePathStyle: true,
    // Контрольные суммы — только там, где их требует сам протокол. Новые
    // версии SDK добавляют их всюду, и тогда подписанная ссылка для браузера
    // ждёт сумму пустого тела, а S3-совместимые хранилища не все их понимают
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
  return client
}

/* ══════════════════════════════════════════════════════════════════════
   Ключи
   ══════════════════════════════════════════════════════════════════════ */

/** Имя файла без путей и управляющих символов: оно попадает в ключ хранилища */
export function safeName(value: string): string {
  const base = value.split(/[\\/]/).pop() ?? ''
  const clean = base.replace(/[^\p{L}\p{N}._ -]+/gu, '_').replace(/\.{2,}/g, '.').trim().slice(0, 120)
  return clean || 'file'
}

/**
 * Ключ нового файла в папке: имя со случайным хвостом перед расширением, как
 * делал Blob. Хвост нужен и для неповторимости, и для кэша: один адрес — всегда
 * один и тот же файл, поэтому /media отдаёт картинки с вечным кэшем
 */
export function newKey(folder: string, name: string): string {
  const clean = safeName(name)
  const dot = clean.lastIndexOf('.')
  const stem = dot > 0 ? clean.slice(0, dot) : clean
  const ext = dot > 0 ? clean.slice(dot) : ''
  const tail = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
  return `${folder.replace(/\/+$/, '')}/${Date.now()}-${stem}-${tail}${ext}`
}

/* ══════════════════════════════════════════════════════════════════════
   Запись
   ══════════════════════════════════════════════════════════════════════ */

/** Источники, с которых браузер грузит прямо в бакет: сайт и то, что задано в STORAGE_CORS_ORIGINS */
export function corsOrigins(): string[] {
  const extra = (process.env.STORAGE_CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const main = new URL(siteUrl)
  return [...new Set([main.origin, `${main.protocol}//www.${main.host}`, ...extra])]
}

let corsReady: Promise<void> | null = null

/**
 * Разрешить браузеру грузить в бакет напрямую (CORS) — один раз на запуск
 * сервера, при первой загрузке. Не вышло — не страшно: браузер тогда
 * отправит файл запасным путём через сервер
 */
function ensureCors(): Promise<void> {
  corsReady ??= s3()
    .send(
      new PutBucketCorsCommand({
        Bucket: BUCKET,
        CORSConfiguration: {
          CORSRules: [{ AllowedOrigins: corsOrigins(), AllowedMethods: ['PUT'], AllowedHeaders: ['content-type'], MaxAgeSeconds: 3600 }],
        },
      }),
    )
    .then(() => undefined)
    // Раз на запуск: если у ключа нет права на CORS, журнал не забьётся одинаковыми ошибками
    .catch((error) => {
      console.error('[Storage] Не удалось настроить CORS бакета (настройте его командой scripts/neon-storage.mjs setup):', error instanceof Error ? error.message : error)
    })
  return corsReady
}

/**
 * Ссылка, по которой браузер сам положит файл в бакет (подписанный PUT на
 * 10 минут). Тип и размер подписаны: с другим размером или типом хранилище
 * файл не примет — так одноразовую ссылку не используют для чего-то большего
 */
export async function signUpload(key: string, contentType: string, size: number): Promise<{ url: string; headers: Record<string, string> }> {
  await ensureCors()
  const url = await getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType, ContentLength: size }),
    { expiresIn: 600, signableHeaders: new Set(['content-type', 'content-length']) },
  )
  return { url, headers: { 'Content-Type': contentType } }
}

/** Положить файл с сервера: в Neon, а пока он не настроен — в Blob */
export async function putFile(key: string, body: Uint8Array, contentType: string): Promise<{ pathname: string }> {
  if (isNeonStorage()) {
    await s3().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType, ContentLength: body.byteLength }))
    return { pathname: key }
  }
  const { put } = await import('@vercel/blob')
  const blob = await put(key, Buffer.from(body), { access: 'private', contentType, addRandomSuffix: false })
  return { pathname: blob.pathname }
}

/* ══════════════════════════════════════════════════════════════════════
   Чтение и удаление
   ══════════════════════════════════════════════════════════════════════ */

export type StoredFile = { stream: ReadableStream; contentType: string; size: number }

const isMissing = (error: unknown) => {
  const e = error as { name?: string; $metadata?: { httpStatusCode?: number } }
  return e?.name === 'NoSuchKey' || e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404
}

/** Файл по ключу: сначала Neon, потом Blob — там лежат ещё не перенесённые. Нет нигде — null */
export async function readFile(key: string): Promise<StoredFile | null> {
  if (isNeonStorage()) {
    try {
      const result = await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
      if (result.Body) {
        return {
          stream: result.Body.transformToWebStream(),
          contentType: result.ContentType || 'application/octet-stream',
          size: Number(result.ContentLength ?? 0),
        }
      }
    } catch (error) {
      if (!isMissing(error)) throw error
    }
  }
  if (!isBlobStorage()) return null
  const { get } = await import('@vercel/blob')
  const result = await get(key, { access: 'private' })
  if (!result || result.statusCode !== 200 || !result.stream) return null
  return { stream: result.stream as unknown as ReadableStream, contentType: result.blob.contentType || 'application/octet-stream', size: result.blob.size }
}

/** Есть ли файл в Neon — для проверки после загрузки и для переноса */
export async function existsInNeon(key: string): Promise<boolean> {
  try {
    await s3().send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch (error) {
    if (isMissing(error)) return false
    throw error
  }
}

/**
 * Удалить файлы везде, где они могут быть: и в Neon, и в Blob. Ошибки — в
 * журнал: запись в базе уже удалена, и осиротевший файл лучше, чем
 * несохранённое удаление
 */
export async function deleteFiles(keys: string[]): Promise<void> {
  const list = keys.filter(Boolean)
  if (list.length === 0) return
  if (isNeonStorage()) {
    for (let i = 0; i < list.length; i += 1000) {
      try {
        await s3().send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: list.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } }))
      } catch (error) {
        console.error('[Storage] Не удалось удалить файлы из Neon:', error instanceof Error ? error.message : error)
      }
    }
  }
  if (isBlobStorage()) {
    try {
      const { del } = await import('@vercel/blob')
      await del(list)
    } catch (error) {
      console.error('[Storage] Не удалось удалить файлы из Blob:', error instanceof Error ? error.message : error)
    }
  }
}

/** Для диагностики: доступен ли бакет Neon. Ошибку — текстом, без секретов */
export async function checkNeonBucket(): Promise<{ ok: boolean; error?: string }> {
  if (!isNeonStorage()) return { ok: false, error: 'переменные AWS_* не заданы' }
  try {
    await s3().send(new HeadBucketCommand({ Bucket: BUCKET }))
    return { ok: true }
  } catch (error) {
    const e = error as { name?: string; $metadata?: { httpStatusCode?: number } }
    return { ok: false, error: `${e.name ?? 'ошибка'}${e.$metadata?.httpStatusCode ? ` (${e.$metadata.httpStatusCode})` : ''}` }
  }
}
