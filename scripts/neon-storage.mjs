#!/usr/bin/env node
/**
 * Хранилище файлов в Neon (lib/storage.ts) — служебные команды для сервера.
 * Ключи берутся из .env.local, в вывод не попадают:
 *
 *   node --env-file=.env.local scripts/neon-storage.mjs setup
 *       бакет files (если его ещё нет) и CORS — браузер грузит в него напрямую
 *   node --env-file=.env.local scripts/neon-storage.mjs check
 *       бакет доступен, сколько файлов в каждой папке, правила CORS
 *   node --env-file=.env.local scripts/neon-storage.mjs migrate [--dry-run]
 *       перенести все файлы из Vercel Blob (нужен ещё BLOB_READ_WRITE_TOKEN)
 *       с теми же путями — уже перенесённые пропускаются, запускать можно
 *       сколько угодно раз
 *
 * Для проверки в CI (.github/workflows/neon.yml): head <ключ>, put <ключ>
 * <файл> <тип>, delete <ключ>.
 */
import { readFile } from 'node:fs/promises'
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetBucketCorsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const BUCKET = process.env.STORAGE_BUCKET || 'files'
const SITE = 'https://module-estet.ru'

const need = ['AWS_ENDPOINT_URL_S3', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'].filter((name) => !process.env[name])
if (need.length) {
  console.error(`Не заданы переменные: ${need.join(', ')}. Их выдаёт Neon: neon credentials create --scope storage:read --scope storage:write`)
  process.exit(1)
}

const s3 = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION || 'us-east-2',
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

const missing = (error) => error?.name === 'NotFound' || error?.name === 'NoSuchKey' || error?.name === 'NoSuchBucket' || error?.$metadata?.httpStatusCode === 404

/** Причина отказа словами — как describeStorageError в lib/storage.ts */
function why(error) {
  const status = error?.$metadata?.httpStatusCode
  switch (error?.name ?? error?.code) {
    case 'InvalidAccessKeyId': return 'Neon не знает такой ключ — он удалён или AWS_ACCESS_KEY_ID вписан с ошибкой'
    case 'SignatureDoesNotMatch': return 'секрет не подходит к ключу — AWS_SECRET_ACCESS_KEY с ошибкой или от другого ключа, либо AWS_REGION не совпадает с регионом в адресе'
    case 'AuthorizationHeaderMalformed': return 'неверный регион — AWS_REGION должен совпадать с регионом в AWS_ENDPOINT_URL_S3'
    case 'AccessDenied': return 'у ключа нет прав на хранилище (нужны storage:read и storage:write) или он от другой ветки Neon'
    case 'NoSuchBucket': return `бакета «${BUCKET}» нет`
    case 'ENOTFOUND': case 'ECONNREFUSED': case 'ETIMEDOUT': return 'адрес хранилища не отвечает — проверьте AWS_ENDPOINT_URL_S3'
  }
  if (status === 403) return 'доступ запрещён (403) — ключ удалён, секрет с ошибкой или у ключа нет прав storage:read и storage:write'
  if (!error?.$metadata && error?.message) return error.message
  return `${error?.name ?? 'ошибка'}${status ? ` (${status})` : ''}`
}

/**
 * Есть ли бакет. Список из одного файла, а не HEAD: на HEAD хранилище
 * отвечает без тела, и по одному коду 403 не понять, в чём дело
 */
async function bucketExists() {
  try {
    await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 1 }))
    return true
  } catch (error) {
    if (error?.name === 'NoSuchBucket') return false
    throw error
  }
}

function origins() {
  const main = new URL(SITE)
  const extra = (process.env.STORAGE_CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return [...new Set([main.origin, `${main.protocol}//www.${main.host}`, ...extra])]
}

async function exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch (error) {
    if (missing(error)) return false
    throw error
  }
}

async function setup() {
  if (await bucketExists()) {
    console.log(`Бакет «${BUCKET}» есть`)
  } else {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }))
    console.log(`Бакет «${BUCKET}» создан`)
  }
  const allowed = origins()
  await s3.send(new PutBucketCorsCommand({
    Bucket: BUCKET,
    CORSConfiguration: { CORSRules: [{ AllowedOrigins: allowed, AllowedMethods: ['PUT'], AllowedHeaders: ['content-type'], MaxAgeSeconds: 3600 }] },
  }))
  console.log(`CORS: загрузка из браузера разрешена с ${allowed.join(', ')}`)
}

async function check() {
  if (!(await bucketExists())) {
    console.error(`Бакета «${BUCKET}» нет — выполните setup или создайте его в консоли Neon: ветка production → Object storage → New bucket`)
    process.exit(1)
  }
  console.log(`Бакет «${BUCKET}» доступен`)
  for (const prefix of ['leads/', 'portfolio/', 'catalog/']) {
    let count = 0
    let token
    do {
      const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token }))
      count += page.KeyCount ?? 0
      token = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (token)
    console.log(`  ${prefix}: ${count}`)
  }
  try {
    const cors = await s3.send(new GetBucketCorsCommand({ Bucket: BUCKET }))
    for (const rule of cors.CORSRules ?? []) console.log(`CORS: ${rule.AllowedMethods?.join(', ')} с ${rule.AllowedOrigins?.join(', ')}`)
  } catch (error) {
    console.log(`CORS не настроен (${why(error)}): выполните setup`)
  }
}

async function migrate(dryRun) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Для переноса нужен ещё BLOB_READ_WRITE_TOKEN — ключ старого хранилища Vercel Blob')
    process.exit(1)
  }
  const { list, get } = await import('@vercel/blob')
  const stats = { total: 0, copied: 0, skipped: 0, failed: 0 }
  let cursor
  do {
    const page = await list({ cursor, limit: 1000 })
    for (const blob of page.blobs) {
      stats.total++
      const key = blob.pathname
      try {
        if (await exists(key)) {
          stats.skipped++
          continue
        }
        if (dryRun) {
          stats.copied++
          continue
        }
        const file = await get(key, { access: 'private' })
        if (!file || file.statusCode !== 200 || !file.stream) throw new Error('Vercel Blob не отдал файл')
        const body = Buffer.from(await new Response(file.stream).arrayBuffer())
        await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: file.blob.contentType || 'application/octet-stream', ContentLength: body.byteLength }))
        stats.copied++
        if (stats.copied % 25 === 0) console.log(`  перенесено ${stats.copied}…`)
      } catch (error) {
        stats.failed++
        console.error(`  не перенесён ${key}: ${error instanceof Error ? error.message : why(error)}`)
      }
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  console.log(`${dryRun ? 'Проверка без записи' : 'Перенос'}: всего ${stats.total}, ${dryRun ? 'к переносу' : 'перенесено'} ${stats.copied}, уже были ${stats.skipped}, ошибок ${stats.failed}`)
  if (stats.failed) process.exit(1)
}

const [command, ...args] = process.argv.slice(2)
try {
  switch (command) {
    case 'setup': await setup(); break
    case 'check': await check(); break
    case 'migrate': await migrate(args.includes('--dry-run')); break
    case 'head': process.exit((await exists(args[0])) ? 0 : 1); break
    case 'put': {
      const body = await readFile(args[1])
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: args[0], Body: body, ContentType: args[2], ContentLength: body.byteLength }))
      console.log(`Положен ${args[0]}`)
      break
    }
    case 'delete': await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: args[0] })); console.log(`Удалён ${args[0]}`); break
    default:
      console.error('Команды: setup, check, migrate [--dry-run]')
      process.exit(1)
  }
} catch (error) {
  console.error(`Ошибка: ${why(error)}`)
  process.exit(1)
}
