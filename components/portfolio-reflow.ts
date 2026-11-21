/**
 * Перестановка карточек «Наших работ» при смене фильтра и размера сетки.
 * Карточки не перепрыгивают, а переезжают на новые места (приём FLIP:
 * запомнить, где была карточка, дать вёрстке поменяться и довезти её
 * transform-ом со старого места на новое). Ушедшие гаснут на своём месте,
 * новые входят, когда остальные уже едут. Двигается только transform
 * и opacity (docs/MOTION.md, раздел 6).
 *
 * Порядок: snapshot() — до смены состояния, пока вёрстка старая;
 * play() — в useLayoutEffect, когда React уже поменял DOM, но кадр ещё
 * не нарисован.
 */

const OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'
const LEAVE = 'cubic-bezier(0.55, 0, 0.75, 0)'

/** Переезд на новое место; уход вдвое короче входа */
const MOVE_MS = 600
const LEAVE_MS = 260
const ENTER_MS = 600
/** Новые входят, когда ушедшие почти погасли, и по очереди */
const ENTER_AT = 160
const ENTER_STEP = 60
/** При смене размера бирки и подписи возвращаются, когда снимок почти сел */
const SETTLE_AT = 380

export type ReflowMode = 'filter' | 'density'

export type Snapshot = {
  mode: ReflowMode
  /** Где стояла каждая карточка: вся ячейка и сам снимок */
  boxes: Map<string, { item: DOMRect; card: DOMRect }>
  /** Копии карточек, которые уйдут, — гаснут на старом месте */
  leaving: HTMLElement[]
}

/** Метка своих анимаций: CSS-анимации показа в карточке трогать нельзя */
const ID = 'portfolio-reflow'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const items = (list: HTMLElement) => [...list.querySelectorAll<HTMLElement>(':scope > [data-project]')]
const cardOf = (item: HTMLElement) => item.querySelector<HTMLElement>('[data-portfolio-card]')

/**
 * Копия ушедшей карточки поверх страницы. Живёт в body, а не в списке:
 * список ведёт React, и чужой узел в нём ему ни к чему
 */
function ghostOf(item: HTMLElement, box: DOMRect) {
  const ghost = item.cloneNode(true) as HTMLElement
  ghost.querySelectorAll('[data-portfolio-card]').forEach((el) => el.removeAttribute('data-portfolio-card'))
  ghost.removeAttribute('data-project')
  ghost.setAttribute('aria-hidden', 'true')
  ghost.inert = true
  Object.assign(ghost.style, {
    position: 'absolute',
    left: `${box.left + window.scrollX}px`,
    top: `${box.top + window.scrollY}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    margin: '0',
    listStyle: 'none',
    pointerEvents: 'none',
  })
  return ghost
}

/** Запоминает, где стоят карточки. leavingIds — проекты, которых после смены не будет */
export function snapshot(list: HTMLElement | null, mode: ReflowMode, leavingIds: Set<string> = new Set()): Snapshot | null {
  if (!list || reduced()) return null
  const boxes: Snapshot['boxes'] = new Map()
  const leaving: HTMLElement[] = []
  for (const item of items(list)) {
    const id = item.dataset.project ?? ''
    const card = cardOf(item)
    // Положение берём видимое: если карточка ещё едет с прошлого раза,
    // новый переезд начнётся оттуда, где она сейчас
    const box = item.getBoundingClientRect()
    boxes.set(id, { item: box, card: (card ?? item).getBoundingClientRect() })
    if (leavingIds.has(id)) leaving.push(ghostOf(item, box))
  }
  return { mode, boxes, leaving }
}

const translate = (from: DOMRect, to: DOMRect) => `translate(${from.left - to.left}px, ${from.top - to.top}px)`

/** Довозит карточки со старых мест на новые. Вызывать, когда DOM уже новый */
export function play(list: HTMLElement | null, before: Snapshot | null) {
  if (!list || !before) return

  for (const ghost of before.leaving) {
    document.body.append(ghost)
    ghost
      .animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.94)' }], { duration: LEAVE_MS, easing: LEAVE, fill: 'forwards' })
      .finished.finally(() => ghost.remove())
  }

  const current = items(list)
  // Прошлый переезд мог ещё идти: снимаем его, иначе новое место измерится со сдвигом
  for (const item of current) {
    item.getAnimations({ subtree: true }).forEach((animation) => animation.id === ID && animation.cancel())
  }

  let entering = 0
  for (const item of current) {
    const was = before.boxes.get(item.dataset.project ?? '')

    if (!was) {
      item.animate([{ opacity: 0, transform: 'translateY(16px) scale(0.96)' }, { opacity: 1, transform: 'none' }], {
        id: ID,
        duration: ENTER_MS,
        delay: ENTER_AT + entering++ * ENTER_STEP,
        easing: OUT,
        fill: 'backwards',
      })
      continue
    }

    const card = cardOf(item)
    if (before.mode === 'filter' || !card) {
      // Размер карточки тот же — едет вся ячейка целиком
      const now = item.getBoundingClientRect()
      if (Math.abs(was.item.left - now.left) < 1 && Math.abs(was.item.top - now.top) < 1) continue
      item.animate([{ transform: translate(was.item, now) }, { transform: 'none' }], { id: ID, duration: MOVE_MS, easing: OUT })
      continue
    }

    // Новый размер сетки: снимок перелетает в новую рамку. Пропорция рамки та же
    // (4:3), поэтому масштаб общий и фото не сплющивается. Бирки поверх снимка
    // и подпись под ним в новой вёрстке другого размера — им масштаб не к лицу,
    // они проявляются уже на месте
    const now = card.getBoundingClientRect()
    const scale = was.card.width / now.width
    card.animate(
      [
        { transformOrigin: '0 0', transform: `${translate(was.card, now)} scale(${scale})` },
        { transformOrigin: '0 0', transform: 'none' },
      ],
      { id: ID, duration: MOVE_MS, easing: OUT },
    )
    const chrome = [...card.querySelectorAll<HTMLElement>(':scope > span'), ...item.querySelectorAll<HTMLElement>('[data-card-caption]')]
    for (const element of chrome) {
      element.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], {
        id: ID,
        duration: 320,
        delay: SETTLE_AT,
        easing: OUT,
        fill: 'backwards',
      })
    }
  }
}
