// Запись страницы на виртуальных часах: видео 60 fps или отдельные кадры.
// Подходит для всего, что идёт само: ролик /vizkit, первый экран главной
// (главы сменяются по animationend), створки квиза.
//
//   node tools/motion/render-timeline.cjs / out/hero.mp4 --secs 27
//   node tools/motion/render-timeline.cjs /vizkit out/vizkit.mp4 --secs 15.6 --mobile
//   node tools/motion/render-timeline.cjs /quiz out/frames --stills 1,2.6,3.4
//
// --w / --h — размер окна (по умолчанию 1280×800, с --mobile — 390×844)
const fs = require('fs')
const { BASE, args, open, waitImages, startClock, step, frame, encoder } = require('./lib.cjs')

;(async () => {
  const a = args()
  const [path = '/', out = 'motion.mp4'] = a._
  const mobile = Boolean(a.mobile)
  const width = +(a.w || (mobile ? 390 : 1280))
  const height = +(a.h || (mobile ? 844 : 800))
  const fps = 60
  const dt = 1000 / fps

  const { browser, page } = await open({ width, height, mobile })
  await page.goto(BASE + path, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await waitImages(page)
  await startClock(page)
  await frame(page)

  if (a.stills) {
    fs.mkdirSync(out, { recursive: true })
    const times = String(a.stills).split(',').map(Number).sort((x, y) => x - y)
    let now = 0
    for (const t of times) {
      while (now + dt <= t * 1000 + 0.5) { await step(page, dt); now += dt }
      await page.screenshot({ path: `${out}/t${t.toFixed(2).padStart(5, '0')}.png` })
    }
    console.log(`${times.length} кадров → ${out}`)
  } else {
    const secs = +(a.secs || 15)
    const video = encoder(out, fps)
    const n = Math.round(secs * fps)
    for (let f = 0; f < n; f++) {
      if (f > 0) await step(page, dt)
      await video.write(await page.screenshot({ type: 'jpeg', quality: 94 }))
    }
    await video.close()
    console.log(`${n} кадров (${secs} с) → ${out}`)
  }
  await browser.close()
})()
