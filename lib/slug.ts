/** Кириллица → латиница по той же схеме, что используют Яндекс и Википедия */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/**
 * Делает из названия проекта адрес вида «kuhnya-v-neoklassike».
 *
 * Латиница, а не кириллица: такой идентификатор без искажений проходит
 * через адресную строку, логи и имена файлов в хранилище.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .split('')
    .map((char) => (char in TRANSLIT ? TRANSLIT[char] : char))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Добавляет к адресу цифру, пока он занят другим проектом */
export function uniqueSlug(base: string, taken: string[]): string {
  const start = base || 'proekt'
  if (!taken.includes(start)) return start
  let index = 2
  while (taken.includes(`${start}-${index}`)) index += 1
  return `${start}-${index}`
}
