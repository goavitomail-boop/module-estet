import { currentImage, nextFrame } from '@/components/portfolio-flight'

/**
 * Смена проекта в просмотре — как смена главы на первом экране: первое фото
 * следующего проекта въезжает шторкой с латунной кромкой поверх текущего,
 * и только когда шторка дошла, просмотр переключается на него. Снимок под
 * шторкой и в просмотре один и тот же и стоит в той же рамке, поэтому
 * подмены не видно (docs/MOTION.md, принцип 2).
 *
 * Шторка — отдельный слой, как призрак в portfolio-flight.ts: прыжок через
 * несколько фото карусель просмотра делает без анимации. Слой вставлен сразу
 * за каруселью, поэтому стрелки, подписи и бирка остаются над ним.
 */

const IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'
/** Шторка между сценами — 1 с, как на первом экране */
const WIPE_MS = 1000
/** Кромка гаснет к концу хода шторки */
const EDGE_OUT_AT = 750
/** Фото следующего проекта обычно уже в кеше; не успело — переключаем без шторки */
const LOAD_TIMEOUT = 1200

export type Box = { left: number; top: number; width: number; height: number }

export type ChapterRun = {
  /** Шторка дошла и убрана, просмотр стоит на новом проекте */
  done: Promise<void>
  /**
   * Листают дальше, пока эта шторка ещё едет: она останавливается, ничего
   * не переключая, и отдаёт свои слои следующей — та въедет поверх и уберёт их
   */
  handOver: () => HTMLElement[]
  /** Убрать шторки, ничего не переключая, — просмотр закрывают */
  cancel: () => void
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function load(src: string) {
  const img = new Image()
  img.src = src
  const decoded = img.decode().then(
    () => true,
    () => false,
  )
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), LOAD_TIMEOUT))
  return Promise.race([decoded, timeout]).then((ok) => (ok ? img : null))
}

/**
 * Рамка снимка внутри слайда — так же, как её считает просмотр: фото вписано
 * в слайд за вычетом полей и не растягивается больше своего размера
 */
function photoBox(slide: HTMLElement, img: HTMLImageElement): Box {
  const rect = slide.getBoundingClientRect()
  const style = getComputedStyle(slide)
  const pad = { l: parseFloat(style.paddingLeft), r: parseFloat(style.paddingRight), t: parseFloat(style.paddingTop), b: parseFloat(style.paddingBottom) }
  const room = { width: rect.width - pad.l - pad.r, height: rect.height - pad.t - pad.b }
  const scale = Math.min(1, room.width / img.naturalWidth, room.height / img.naturalHeight)
  const width = img.naturalWidth * scale
  const height = img.naturalHeight * scale
  return {
    left: pad.l + (room.width - width) / 2,
    top: pad.t + (room.height - height) / 2,
    width,
    height,
  }
}

/** Слой поверх карусели: панель цвета фона просмотра, в ней фото, на краю — латунная кромка */
function curtain(slide: HTMLElement, container: HTMLElement, img: HTMLImageElement, dir: 1 | -1) {
  const at = slide.getBoundingClientRect()
  const base = container.getBoundingClientRect()
  const box = photoBox(slide, img)

  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.dataset.chapterCurtain = ''
  Object.assign(layer.style, {
    position: 'absolute',
    left: `${at.left - base.left}px`,
    top: `${at.top - base.top}px`,
    width: `${at.width}px`,
    height: `${at.height}px`,
    overflow: 'hidden',
    pointerEvents: 'none',
  })

  const panel = document.createElement('div')
  Object.assign(panel.style, { position: 'absolute', inset: '0', overflow: 'hidden', background: 'var(--foreground)' })

  // Содержимое едет навстречу панели и потому стоит на месте
  const content = document.createElement('div')
  Object.assign(content.style, { position: 'absolute', inset: '0' })
  const photo = img.cloneNode() as HTMLImageElement
  photo.alt = ''
  Object.assign(photo.style, {
    position: 'absolute',
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    maxWidth: 'none',
  })
  content.append(photo)

  const edge = document.createElement('span')
  Object.assign(edge.style, {
    position: 'absolute',
    top: '0',
    bottom: '0',
    [dir > 0 ? 'left' : 'right']: '0',
    width: '2px',
    background: 'var(--primary)',
    boxShadow: '0 0 18px 4px rgba(216, 191, 138, 0.55)',
  })

  panel.append(content, edge)
  layer.append(panel)

  const timing = { duration: WIPE_MS, easing: IN_OUT, fill: 'both' as const }
  const animations = [
    panel.animate([{ transform: `translateX(${dir * 100}%)` }, { transform: 'none' }], timing),
    content.animate([{ transform: `translateX(${-dir * 100}%)` }, { transform: 'none' }], timing),
    edge.animate([{ opacity: 1 }, { opacity: 0 }], { duration: WIPE_MS - EDGE_OUT_AT, delay: EDGE_OUT_AT, fill: 'forwards' }),
  ]
  return { layer, landed: animations[0].finished.then(() => undefined, () => undefined) }
}

/**
 * Листает просмотр на другой проект. src — его первое фото, dir — куда
 * листаем (1 — вперёд, шторка справа), swap — переключить просмотр,
 * previous — шторка прошлого листания, если она ещё не доехала
 */
export function playChapter(src: string, dir: 1 | -1, swap: () => void, previous?: ChapterRun | null): ChapterRun {
  // Слои под этой шторкой (от прошлых листаний) и она сама — последней
  const layers = previous?.handOver() ?? []
  let stopped = false

  const removeLayers = () => {
    layers.splice(0).forEach((layer) => layer.remove())
  }
  const settle = () => {
    swap()
    removeLayers()
  }

  const run = async () => {
    if (reduced()) return settle()
    const img = await load(src)
    if (stopped) return

    // Слайд ищем только сейчас: пока фото грузилось, просмотр мог
    // перерисоваться, и прежний узел уже не на странице
    const slide = document.querySelector<HTMLElement>('.portfolio-viewer .yarl__slide_current')
    const carousel = slide?.closest<HTMLElement>('.yarl__carousel')
    const container = carousel?.parentElement
    if (!img || !slide || !carousel || !container) return settle()

    const wipe = curtain(slide, container, img, dir)
    // Поверх шторок, которые ещё едут: новая закрывает и их
    const below = layers.filter((layer) => layer.isConnected).at(-1) ?? carousel
    below.after(wipe.layer)
    layers.push(wipe.layer)
    await wipe.landed
    if (stopped) return
    swap()

    // Просмотр кладёт то же фото под шторку и проявляет его за 0,25 с. Как
    // только оно проявилось целиком, шторка больше не нужна; уберём раньше —
    // кадр мигнёт темнотой. Не дождались — всё равно убираем
    const target = new URL(src, location.href).href
    for (let start = performance.now(); performance.now() - start < 1500; ) {
      await nextFrame()
      if (stopped) return
      const shown = currentImage()
      if (shown?.src === target && shown.getAnimations().length === 0 && getComputedStyle(shown).opacity === '1') break
    }
    removeLayers()
  }

  const done = run()
  return {
    done,
    handOver: () => {
      stopped = true
      return layers.splice(0)
    },
    cancel: () => {
      stopped = true
      removeLayers()
    },
  }
}

/** Рамка текущего фото просмотра относительно его контейнера — для бирки поверх снимка */
export function currentPhotoBox(): (Box & { right: number; bottom: number }) | null {
  const img = currentImage()
  const container = img?.closest<HTMLElement>('.yarl__container')
  if (!img || !container) return null
  const rect = img.getBoundingClientRect()
  const base = container.getBoundingClientRect()
  return {
    left: rect.left - base.left,
    top: rect.top - base.top,
    width: rect.width,
    height: rect.height,
    right: base.right - rect.right,
    bottom: base.bottom - rect.bottom,
  }
}
