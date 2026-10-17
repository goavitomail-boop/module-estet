/**
 * Общая защита публичных маршрутов: откуда пришёл запрос и не слишком ли часто.
 *
 * Сайт работает одним процессом Node за nginx, поэтому счётчики держим прямо
 * в памяти: они общие для всех запросов и не требуют базы. После перезапуска
 * обнуляются — для ограничения частоты это не страшно.
 */

/**
 * IP посетителя.
 *
 * Первый адрес в X-Forwarded-For присылает сам клиент и может его подделать,
 * чтобы обойти ограничения. Доверять можно только тому, что дописал наш nginx:
 * это X-Real-IP либо ПОСЛЕДНИЙ адрес в X-Forwarded-For.
 */
export function clientIp(request: { headers: Pick<Headers, 'get'> }): string {
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean)
    const last = parts[parts.length - 1]
    if (last) return last
  }

  return 'unknown'
}

type Bucket = { hits: number[] }

const buckets = new Map<string, Bucket>()
let lastSweep = 0

/** Раз в несколько минут выбрасываем давно молчащие ключи, чтобы карта не росла без конца */
function sweep(now: number, maxWindowMs: number) {
  if (now - lastSweep < 5 * 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    const newest = bucket.hits[bucket.hits.length - 1] ?? 0
    if (now - newest > maxWindowMs) buckets.delete(key)
  }
}

/**
 * Скользящее окно: не больше `limit` обращений за `windowMs` на ключ.
 * Возвращает true, если обращение разрешено (и сразу его засчитывает).
 *
 * Неизвестный IP не ограничиваем: иначе все посетители без адреса делили бы
 * один счётчик, и настоящая заявка могла бы не пройти.
 */
export function allowRequest(scope: string, ip: string, limit: number, windowMs: number): boolean {
  if (!ip || ip === 'unknown') return true

  const now = Date.now()
  sweep(now, Math.max(windowMs, 60 * 60_000))

  const key = `${scope}:${ip}`
  const bucket = buckets.get(key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter((time) => now - time < windowMs)

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket)
    return false
  }

  bucket.hits.push(now)
  buckets.set(key, bucket)
  return true
}

/** Сколько обращений уже засчитано в окне — без изменения счётчика */
export function requestCount(scope: string, ip: string, windowMs: number): number {
  const bucket = buckets.get(`${scope}:${ip}`)
  if (!bucket) return 0
  const now = Date.now()
  return bucket.hits.filter((time) => now - time < windowMs).length
}
