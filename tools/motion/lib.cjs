// Общие части инструментов записи и замера моушена. Описание — docs/MOTION.md.
//
// Главная идея — виртуальные часы. Все CSS-анимации страницы стоят на паузе,
// и каждый кадр мы сами сдвигаем их на 1/60 секунды. Поэтому видео выходит
// ровно 60 fps даже на машине без видеокарты, где запись «вживую» дёргается.
// Анимации, дошедшие до конца, завершаются по-настоящему (finish), и
// срабатывает animationend — на нём держатся смены глав в hero.
const { chromium } = require('playwright')
const { spawn } = require('child_process')

const BASE = process.env.BASE_URL || 'http://localhost:3000'

/** Разбор аргументов вида: позиционные и --ключ значение / --флаг */
function args(argv = process.argv.slice(2)) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) { out._.push(a); continue }
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) out[key] = true
    else { out[key] = next; i++ }
  }
  return out
}

/** Браузер и страница: согласие на cookie принято, заставка уже «показана» */
async function open({ width = 1280, height = 800, mobile = false, hold = true, init } = {}) {
  const browser = await chromium.launch({
    args: ['--run-all-compositor-stages-before-draw', '--hide-scrollbars', '--font-render-hinting=none'],
  })
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    ...(mobile ? { isMobile: true, hasTouch: true } : {}),
  })
  await context.addInitScript((hold) => {
    try {
      localStorage.setItem('me-consent-v1', 'necessary')
      localStorage.setItem('modul-estet-preloader-seen-at', String(Date.now()))
    } catch {}
    // Пока страница грузится, держим анимации на паузе: иначе реальные часы
    // успеют пройти первые секунды до старта виртуальных
    if (!hold) return
    const pause = () => {
      if (window.__vcOn) return
      document.getAnimations().forEach((a) => a.pause())
      requestAnimationFrame(pause)
    }
    requestAnimationFrame(pause)
  }, hold)
  if (init) await context.addInitScript(init)
  const page = await context.newPage()
  return { browser, context, page }
}

/** Дождаться картинок первого экрана. Отложенные ниже не ждём — они не загрузятся сами */
async function waitImages(page, selector = 'img', ms = 4000) {
  await page.evaluate(
    ({ selector, ms }) =>
      Promise.race([
        Promise.all(
          [...document.querySelectorAll(selector)]
            .filter((i) => !i.complete && i.getBoundingClientRect().top < innerHeight * 1.5)
            .map((i) => i.decode().catch(() => {})),
        ),
        new Promise((r) => setTimeout(r, ms)),
      ]),
    { selector, ms },
  )
}

/** Включить виртуальные часы: все анимации — с нуля, дальше только step() */
async function startClock(page) {
  await page.evaluate(() => {
    window.__vcOn = true
    const time = new Map()
    const done = new WeakSet()
    document.getAnimations().forEach((a) => {
      a.pause()
      a.currentTime = 0
      time.set(a, 0)
    })
    window.__vcStep = (dt) => {
      for (const a of document.getAnimations()) {
        if (done.has(a)) continue
        if (!time.has(a)) {
          // Новая анимация (React смонтировал следующую главу) — начинает с нуля
          a.pause()
          a.currentTime = 0
          time.set(a, 0)
          continue
        }
        const t = time.get(a) + dt
        const end = a.effect.getComputedTiming().endTime
        if (Number.isFinite(end) && t >= end) {
          a.finish()
          done.add(a)
          time.delete(a)
        } else {
          a.currentTime = t
          time.set(a, t)
        }
      }
    }
  })
}

const frame = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

async function step(page, dt) {
  await page.evaluate((dt) => window.__vcStep(dt), dt)
  await frame(page)
}

/** Кадры JPEG по трубе в ffmpeg → H.264 */
function encoder(out, fps = 60) {
  const ff = spawn(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  )
  return {
    async write(buf) {
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
    },
    close: () => new Promise((r) => { ff.on('close', r); ff.stdin.end() }),
  }
}

module.exports = { BASE, args, open, waitImages, startClock, step, frame, encoder }
