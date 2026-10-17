export const PHONE_PLACEHOLDER = '+7 (999) 999-99-99'

function nationalDigits(value: string) {
  const digits = value.replace(/\D/g, '')

  if (digits.startsWith('7') || digits.startsWith('8')) {
    return digits.slice(1, 11)
  }

  return digits.slice(0, 10)
}

export function formatRussianPhone(value: string) {
  const digits = nationalDigits(value)
  if (!digits) return ''

  let formatted = '+7'
  if (digits.length > 0) formatted += ` (${digits.slice(0, 3)}`
  if (digits.length >= 3) formatted += ')'
  if (digits.length > 3) formatted += ` ${digits.slice(3, 6)}`
  if (digits.length > 6) formatted += `-${digits.slice(6, 8)}`
  if (digits.length > 8) formatted += `-${digits.slice(8, 10)}`

  return formatted
}

export function normalizeRussianPhone(value: string) {
  const digits = nationalDigits(value)
  return digits.length === 10 ? `+7${digits}` : ''
}

export function isValidRussianPhone(value: string) {
  return /^\+7\d{10}$/.test(normalizeRussianPhone(value))
}
