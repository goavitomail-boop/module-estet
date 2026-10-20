/**
 * Перелёт снимка между карточкой портфолио и просмотром: обложка вырастает
 * из карточки ровно в рамку первого фото, а при закрытии фото улетает обратно
 * на своё место. Сцены перетекают, а не обрываются (docs/MOTION.md, принцип 2).
 *
 * «Призрак» — отдельный слой поверх просмотра. Двигается только transform:
 * коробка масштабируется от рамки к рамке, а снимок в ней получает обратную
 * поправку, чтобы не сплющиваться, когда пропорции рамок разные.
 */

type Box = { left: number; top: number; width: number; height: number }

const OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'
const IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'
/** Выше портала просмотра (yet-another-react-lightbox: 9999) */
const Z = '10000'

const toBox = (rect: DOMRect): Box => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })

/** Размер снимка с пропорцией ratio, которым он закрывает рамку целиком */
function coverSize(box: Box, ratio: number) {
  return box.width / box.height > ratio
    ? { width: box.width, height: box.width / ratio }
    : { width: box.height * ratio, height: box.height }
}

/**
 * Летит снимок src из рамки from в рамку to и остаётся там, пока его не
 * уберут (remove — с коротким растворением). Возвращает, когда долетел
 */
function fly(src: string, ratio: number, from: Box, to: Box, { duration, easing }: { duration: number; easing: string }) {
  const ghost = document.createElement('div')
  ghost.setAttribute('aria-hidden', 'true')
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${to.left}px`,
    top: `${to.top}px`,
    width: `${to.width}px`,
    height: `${to.height}px`,
    overflow: 'hidden',
    zIndex: Z,
    pointerEvents: 'none',
    transformOrigin: '0 0',
  })
  const end = coverSize(to, ratio)
  const img = document.createElement('img')
  img.src = src
  img.alt = ''
  Object.assign(img.style, {
    position: 'absolute',
    left: `${(to.width - end.width) / 2}px`,
    top: `${(to.height - end.height) / 2}px`,
    width: `${end.width}px`,
    height: `${end.height}px`,
    maxWidth: 'none',
  })
  ghost.append(img)
  document.body.append(ghost)

  const sx = from.width / to.width
  const sy = from.height / to.height
  // Во сколько раз снимок в начальной рамке меньше, чем в конечной
  const k = coverSize(from, ratio).width / end.width
  const timing = { duration, easing, fill: 'both' as const }
  const flight = ghost.animate(
    [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})` }, { transform: 'none' }],
    timing,
  )
  img.animate([{ transform: `scale(${k / sx}, ${k / sy})` }, { transform: 'none' }], timing)

  return {
    landed: flight.finished.then(() => undefined, () => undefined),
    remove(fade = 220) {
      const out = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fade, easing: 'ease-out', fill: 'forwards' })
      out.finished.finally(() => ghost.remove())
    },
  }
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Текущее фото просмотра, если оно уже загружено и разложено */
export function currentImage(root: ParentNode = document) {
  const img = root.querySelector<HTMLImageElement>('.yarl__slide_current .yarl__slide_image')
  if (!img || !img.complete || !img.naturalWidth || img.classList.contains('yarl__slide_image_loading')) return null
  const rect = img.getBoundingClientRect()
  return rect.width > 0 ? img : null
}

/**
 * Слой, который сейчас виден в карточке: шторка показа, открытая больше чем
 * наполовину, или сама карточка с обложкой
 */
function visibleLayer(card: HTMLElement) {
  const box = card.getBoundingClientRect()
  const shown = [...card.querySelectorAll<HTMLElement>('.hs-wipe')].filter((wipe) => wipe.getBoundingClientRect().left < box.left + box.width / 2)
  return shown.at(-1) ?? card
}

/** Номер фото проекта, которое сейчас видно в карточке (0 — обложка): с него и открываем просмотр */
export function visibleCardPhoto(card: HTMLElement | null) {
  return card ? Number(visibleLayer(card).dataset.photo ?? 0) : 0
}

function visibleCardImage(card: HTMLElement) {
  const img = visibleLayer(card).querySelector<HTMLImageElement>('img')
  return img?.naturalWidth ? img : null
}

export const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Открытие: обложка из карточки card летит в рамку первого фото. Настоящее
 * фото просмотр с самого начала держит скрытым; hide(false) показывает его,
 * и призрак растворяется поверх
 */
export async function flyOpen(card: HTMLElement, hide: (hidden: boolean) => void, isAlive: () => boolean) {
  const cover = visibleCardImage(card)
  if (reduced() || !cover) return hide(false)
  const from = toBox(card.getBoundingClientRect())
  const ratio = cover.naturalWidth / cover.naturalHeight
  card.dataset.flying = ''

  // Ждём, пока просмотр разложит первое фото; фото уже грузилось заранее,
  // поэтому обычно это пара кадров. Не дождались — летим в середину сцены
  let target: Box | null = null
  for (let start = performance.now(); performance.now() - start < 350; ) {
    await nextFrame()
    const img = currentImage()
    if (img) {
      target = toBox(img.getBoundingClientRect())
      break
    }
  }
  // Просмотр успели закрыть, или это повторный запуск эффекта в разработке
  if (!isAlive()) return
  if (!target) {
    const stage = document.querySelector('.yarl__slide_current')?.getBoundingClientRect()
    if (!stage) {
      hide(false)
      return
    }
    const fit = stage.width / stage.height > ratio ? { width: stage.height * ratio, height: stage.height } : { width: stage.width, height: stage.width / ratio }
    target = { left: stage.left + (stage.width - fit.width) / 2, top: stage.top + (stage.height - fit.height) / 2, ...fit }
  }

  const ghost = fly(cover.currentSrc || cover.src, ratio, from, target, { duration: 650, easing: OUT })
  await ghost.landed
  // Настоящее фото ещё грузится — призрак держит кадр, но недолго
  for (let start = performance.now(); !currentImage() && performance.now() - start < 1500; ) await nextFrame()
  if (isAlive()) hide(false)
  ghost.remove()
}

/**
 * Закрытие: текущее фото летит на карточку своего проекта. Если карточки
 * не видно на экране (перешли к проекту ниже по странице), просмотр просто
 * гаснет сам
 */
export function flyClose(projectId: string, hide: (hidden: boolean) => void) {
  const card = document.querySelector<HTMLElement>(`[data-portfolio-card="${CSS.escape(projectId)}"]`)
  const img = currentImage()
  const settle = () => document.querySelectorAll<HTMLElement>('[data-portfolio-card][data-flying]').forEach((el) => delete el.dataset.flying)
  if (reduced() || !card || !img) return settle()

  const to = toBox(card.getBoundingClientRect())
  const onScreen = to.top < window.innerHeight && to.top + to.height > 0
  if (!onScreen) return settle()

  hide(true)
  // Карточка сразу снова с обложкой: снимок садится на неё и растворяется
  settle()
  const ghost = fly(img.currentSrc || img.src, img.naturalWidth / img.naturalHeight, toBox(img.getBoundingClientRect()), to, {
    duration: 450,
    easing: IN_OUT,
  })
  void ghost.landed.then(() => ghost.remove(180))
}
