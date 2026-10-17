import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Одна точка подключения GSAP на весь сайт.
 *
 * Плагин регистрируется здесь, а не в компонентах: registerPlugin можно
 * звать сколько угодно раз, но так видно, что именно подключено, и при
 * добавлении нового плагина не надо искать все места вызова.
 *
 * Проверка на window нужна из-за серверного рендера: ScrollTrigger при
 * регистрации трогает document, которого на сервере нет.
 */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export { gsap, ScrollTrigger }

/** Единая длительность и характер движения — чтобы сайт двигался «одним почерком» */
export const EASE = 'power3.out'
export const DURATION = 0.85

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
