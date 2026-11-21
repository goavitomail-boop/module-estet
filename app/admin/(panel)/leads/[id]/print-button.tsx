'use client'

import { Printer } from 'lucide-react'

/**
 * Печать карточки заявки — чтобы поехать на замер с адресом и пожеланиями
 * клиента на бумаге, а не переписывать их вручную.
 *
 * Отдельный клиентский компонент только ради window.print(): вся подготовка
 * страницы к печати сделана правилами @media print в globals.css.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium transition hover:bg-secondary active:bg-secondary sm:h-11 sm:w-auto print:hidden"
    >
      <Printer className="size-4" aria-hidden />
      Распечатать
    </button>
  )
}
