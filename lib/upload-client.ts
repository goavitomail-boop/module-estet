/**
 * Загрузка файла из браузера — общая для квиза и панели. Сервер решает,
 * куда (lib/storage.ts):
 *
 * 1. Neon — сервер отдаёт подписанную ссылку, файл идёт прямо в бакет.
 * 2. Vercel Blob — пока Neon на сервере не настроен: по-старому, токеном
 *    от того же маршрута.
 * 3. Не вышло ни то ни другое (сеть режет адрес хранилища, нет CORS) —
 *    файл идёт через наш сервер, и уже он кладёт его в хранилище.
 *
 * Каждая попытка ограничена таймаутом: форма не имеет права зависнуть на
 * «Загружаем файлы» — человек просто закроет вкладку.
 */

export type UploadTarget = {
  /** Маршрут, который подписывает загрузку и принимает запасной путь: /api/upload или /admin/upload */
  endpoint: string
  /** Папка в хранилище (для панели — leads/<id>, catalog/<раздел>, portfolio/<проект>) */
  folder?: string
  /** Путь для старой загрузки в Blob */
  blobPath: string
}

export type Uploaded = { pathname: string; url?: string }

const withTimeout = <T,>(task: Promise<T>, ms: number) =>
  Promise.race([task, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])

export async function uploadFile(file: File, target: UploadTarget, timeoutMs = 20000): Promise<Uploaded> {
  const { endpoint, folder, blobPath } = target

  try {
    const response = await withTimeout(
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, type: file.type, size: file.size, folder }),
      }),
      10000,
    )
    const plan = (await response.json().catch(() => null)) as { mode?: string; url?: string; headers?: Record<string, string>; pathname?: string } | null

    if (response.ok && plan?.mode === 'put' && plan.url && plan.pathname) {
      const put = await withTimeout(fetch(plan.url, { method: 'PUT', headers: plan.headers, body: file }), timeoutMs)
      if (put.ok) return { pathname: plan.pathname }
      throw new Error(`Хранилище не приняло файл: HTTP ${put.status}`)
    }

    if (response.ok && plan?.mode === 'blob') {
      const { upload } = await withTimeout(import('@vercel/blob/client'), 10000)
      const blob = await withTimeout(upload(blobPath, file, { access: 'private', handleUploadUrl: endpoint }), timeoutMs)
      return { pathname: blob.pathname, url: blob.url }
    }

    throw new Error(`Загрузка не подготовлена: HTTP ${response.status}`)
  } catch (error) {
    console.warn('Прямая загрузка не удалась, пробуем через сервер:', file.name, error)
  }

  const params = new URLSearchParams({ name: file.name, ...(folder ? { folder } : {}) })
  const response = await withTimeout(
    fetch(`${endpoint}?${params}`, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file }),
    timeoutMs,
  )
  if (!response.ok) throw new Error(`Серверная загрузка не удалась: HTTP ${response.status}`)
  const data = (await response.json()) as { pathname?: string; url?: string }
  if (!data.pathname) throw new Error('Сервер не вернул путь файла')
  return { pathname: data.pathname, url: data.url }
}
