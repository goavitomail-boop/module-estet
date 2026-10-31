export const PHONE_PLACEHOLDER = '+7 (999) 999-99-99'

function nationalDigits(value: string) {
  const digits = value.replace(/\D/g, '')

  if (digits.startsWith('7') || digits.startsWith('8')) {
    return digits.slice(1, 11)
  }

  return digits.slice(0, 10)
}

/**
 * Номер с кодом другой страны: «+380 …», «+1 …». Маску +7 к нему не применяем,
 * иначе «+380 67 …» молча превращается в «+7 (380) 67…» и уходит чужой номер.
 */
export function isForeignPhone(value: string) {
  return /^\s*\+\s*[0-689]/.test(value)
}

export const FOREIGN_PHONE_MESSAGE =
  'Пока принимаем только российские номера: +7 или 8. С другим номером напишите нам в Max.'

export function formatRussianPhone(value: string) {
  if (isForeignPhone(value)) return value.replace(/[^\d\s()+-]/g, '').slice(0, 18)
  const digits = nationalDigits(value)
  if (!digits) {
    // Номер набирают по знаку: «+» и «+7» держим в поле, иначе маска стирает
    // плюс до того, как человек успеет набрать код страны
    const typed = value.replace(/\s/g, '')
    if (typed === '+') return '+'
    if (typed.startsWith('+7')) return '+7'
    return ''
  }

  let formatted = '+7'
  if (digits.length > 0) formatted += ` (${digits.slice(0, 3)}`
  if (digits.length >= 3) formatted += ')'
  if (digits.length > 3) formatted += ` ${digits.slice(3, 6)}`
  if (digits.length > 6) formatted += `-${digits.slice(6, 8)}`
  if (digits.length > 8) formatted += `-${digits.slice(8, 10)}`

  return formatted
}

export function normalizeRussianPhone(value: string) {
  if (isForeignPhone(value)) return ''
  const digits = nationalDigits(value)
  return digits.length === 10 ? `+7${digits}` : ''
}

export function isValidRussianPhone(value: string) {
  return /^\+7\d{10}$/.test(normalizeRussianPhone(value))
}
