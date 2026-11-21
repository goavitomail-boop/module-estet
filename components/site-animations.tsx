'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { DURATION, EASE, ScrollTrigger, gsap, prefersReducedMotion } from '@/lib/gsap'

/**
 * Анимации прокрутки для всего сайта.
 *
 * Компонент один и монтируется рядом с прелоадером, а что именно анимировать —
 * размечено прямо в вёрстке атрибутом data-anim. Так секции остаются
 * серверными компонентами: чтобы добавить анимацию новому блоку, достаточно
 * дописать атрибут, а не заворачивать его в клиентскую обёртку.
 *
 * Стартовое состояние (скрыт и смещён) ставится инлайном отсюда, а не в CSS:
 * до этого момента элементы прячет класс js-anim, который вешает крошечный
 * скрипт в <head> — иначе между первой отрисовкой и запуском React был бы
 * кадр, где всё видно, и содержимое дёргалось бы.
 */

/** Насколько элемент должен войти в экран, чтобы он начал появляться */
const START = 'top 85%'

type Cleanup = () => void

export function SiteAnimations() {
  const pathname = usePathname()

  useEffect(() => {
    const root = document.documentElement

    // Человек попросил систему двигать поменьше — показываем всё сразу
    if (prefersReducedMotion()) {
      root.classList.remove('js-anim')
      return
    }

    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-anim]'))
    if (targets.length === 0) {
      root.classList.remove('js-anim')
      return
    }

    /* ── 1. Прячем то, что будем показывать ──────────────────────────────
       Инлайном, до снятия класса js-anim: между этими двумя шагами не
       должно быть кадра, в котором элемент уже видно.                    */
    const prepared = prepare(targets)

    root.dataset.animReady = 'true'
    root.classList.remove('js-anim')

    /* ── 2. Собираем сами анимации ──────────────────────────────────────
       Пока висит заставка, страница не прокручивается, и триггеры мерили бы
       не то. Поэтому ждём, когда она уйдёт.                              */
    let context: gsap.Context | null = null
    const build = () => {
      context = gsap.context(() => prepared.forEach((item) => item.play()))
    }

    const stopWaiting = whenPreloaderGone(build)

    return () => {
      stopWaiting()
      context?.revert()
      // revert() возвращает инлайновые стили, которые мы поставили сами,
      // поэтому убираем их отдельно — иначе после ухода со страницы
      // элементы остались бы спрятанными
      prepared.forEach((item) => item.reset())
      delete root.dataset.animReady
    }
  }, [pathname])

  return null
}

/* ══════════════════════════════════════════════════════════════════════
   Виды анимаций
   ══════════════════════════════════════════════════════════════════════ */

type Prepared = { play: () => void; reset: () => void }

function prepare(targets: HTMLElement[]): Prepared[] {
  return targets.map((element) => {
    switch (element.dataset.anim) {
      case 'stagger':
        return stagger(element)
      case 'parallax':
        return parallax(element)
      case 'count':
        return count(element)
      case 'image':
        return imageReveal(element)
      // Голый data-anim в разметке — это «появись как обычно»
      case 'fade-up':
      default:
        return fadeUp(element)
    }
  })
}

/** Появление снизу вверх — основной приём на сайте */
function fadeUp(element: HTMLElement): Prepared {
  const shift = Number(element.dataset.animShift ?? 32)
  gsap.set(element, { opacity: 0, y: shift })

  return {
    play: () =>
      void gsap.to(element, {
        opacity: 1,
        y: 0,
        duration: DURATION,
        ease: EASE,
        delay: Number(element.dataset.animDelay ?? 0),
        // clearProps убирает инлайновые стили после показа: дальше элемент
        // живёт обычной жизнью и не мешает ни ховерам, ни перерисовке React
        clearProps: 'opacity,transform',
        scrollTrigger: { trigger: element, start: START, once: true },
      }),
    reset: () => gsap.set(element, { clearProps: 'opacity,transform' }),
  }
}

/** Дети контейнера выходят по очереди — карточки услуг, шаги, плитки материалов */
function stagger(element: HTMLElement): Prepared {
  const children = Array.from(element.children) as HTMLElement[]
  const shift = Number(element.dataset.animShift ?? 28)
  gsap.set(children, { opacity: 0, y: shift })

  return {
    play: () =>
      void gsap.to(children, {
        opacity: 1,
        y: 0,
        duration: DURATION,
        ease: EASE,
        // Шаг тем меньше, чем больше карточек: восемь плиток по 0.12 с
        // складывались бы почти в секунду ожидания последней
        stagger: Math.min(0.1, 0.5 / Math.max(children.length, 1)),
        clearProps: 'opacity,transform',
        scrollTrigger: { trigger: element, start: START, once: true },
      }),
    reset: () => gsap.set(children, { clearProps: 'opacity,transform' }),
  }
}

/**
 * Лёгкий параллакс: картинка едет медленнее страницы.
 *
 * Двигаем в процентах от собственной высоты, а контейнеру заранее задан
 * запас по краям — иначе на границах кадра проглядывал бы фон.
 */
function parallax(element: HTMLElement): Prepared {
  const shift = Number(element.dataset.animShift ?? 6)
  // Кадр увеличен ровно на размах хода — по 'shift' процентов сверху и снизу.
  // Без этого запаса на краях контейнера проглядывал бы фон
  const scale = 1 + (shift * 2) / 100

  return {
    play: () =>
      void gsap.fromTo(
        element,
        { yPercent: -shift, scale },
        {
          yPercent: shift,
          scale,
          ease: 'none',
          scrollTrigger: {
            trigger: element.parentElement ?? element,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      ),
    reset: () => gsap.set(element, { clearProps: 'transform' }),
  }
}

/** Число добегает до своего значения — для «100% контроль качества» */
function count(element: HTMLElement): Prepared {
  const to = Number(element.dataset.animTo ?? 0)
  const suffix = element.dataset.animSuffix ?? ''
  const original = element.textContent ?? ''
  const box = { value: 0 }

  element.textContent = `0${suffix}`

  return {
    play: () =>
      void gsap.to(box, {
        value: to,
        duration: 1.4,
        ease: 'power2.out',
        onUpdate: () => {
          element.textContent = `${Math.round(box.value)}${suffix}`
        },
        scrollTrigger: { trigger: element, start: START, once: true },
      }),
    reset: () => {
      element.textContent = original
    },
  }
}

/** Крупный кадр открывается шторкой снизу вверх и досводится по масштабу */
function imageReveal(element: HTMLElement): Prepared {
  gsap.set(element, { clipPath: 'inset(0% 0% 100% 0%)', scale: 1.06 })

  return {
    play: () =>
      void gsap.to(element, {
        clipPath: 'inset(0% 0% 0% 0%)',
        scale: 1,
        duration: 1.1,
        ease: EASE,
        clearProps: 'clipPath,transform',
        scrollTrigger: { trigger: element, start: START, once: true },
      }),
    reset: () => gsap.set(element, { clearProps: 'clipPath,transform' }),
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Ожидание заставки
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Вызывает callback, когда с <html> пропадает data-preloader.
 *
 * Заставка показывается не всегда: на повторном заходе её пропускают, и
 * атрибута может не быть вовсе — тогда запускаемся сразу. Плюс страховка
 * по времени на случай, если заставка почему-то не снимет атрибут.
 */
function whenPreloaderGone(callback: () => void): Cleanup {
  const root = document.documentElement
  let done = false

  const run = () => {
    if (done) return
    done = true
    observer.disconnect()
    clearTimeout(failsafe)
    callback()
    // Пока висела заставка, страница не прокручивалась: пересчитываем
    // положение триггеров по реальной высоте документа
    ScrollTrigger.refresh()
  }

  const observer = new MutationObserver(() => {
    if (!root.dataset.preloader) run()
  })

  const failsafe = setTimeout(run, 15_000)

  if (!root.dataset.preloader) {
    // Заставка может ещё не успеть смонтироваться — даём ей кадр
    requestAnimationFrame(() => {
      if (!root.dataset.preloader) run()
    })
  }

  observer.observe(root, { attributes: true, attributeFilter: ['data-preloader'] })

  return () => {
    done = true
    observer.disconnect()
    clearTimeout(failsafe)
  }
}
