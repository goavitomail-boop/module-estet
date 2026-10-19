// Запись истории при прокрутке («Как мы работаем»): страница сама доводит
// каждый шаг до полосы смены (55 % экрана), держит паузу, пока сцена
// отыгрывает, и листает дальше. Часы виртуальные, как в render-timeline.
//
//   node tools/motion/render-scroll.cjs / out/process.mp4
//   node tools/motion/render-scroll.cjs / out/process-frames --stills --mobile
//
// --section #process, --steps "[data-step]" — где искать шаги;
// --move 0.9, --hold 3.9 — секунды на перелистывание и на паузу у шага
const fs = require('fs')
const { BASE, args, open, waitImages, startClock, step, encoder } = require('./lib.cjs')

;(async () => {
  const a = args()
  const [path = '/', out = 'scroll.mp4'] = a._
  const mobile = Boolean(a.mobile)
  const width = +(a.w || (mobile ? 390 : 1280))
  const height = +(a.h || (mobile ? 844 : 800))
  const section = a.section || '#process'
  const steps = a.steps || '[data-step]'
  const MOVE = +(a.move || 0.9)
  const HOLD = +(a.hold || 3.9)
  const LEAD = 1.2
  const fps = 60
  const dt = 1000 / fps

  const { browser, page } = await open({ width, height, mobile })
  await page.goto(BASE + path, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  const targets = await page.evaluate(({ section, steps }) => {
    document.documentElement.style.scrollBehavior = 'auto'
    const y = (el) => el.getBoundingClientRect().top + scrollY
    const sec = document.querySelector(section)
    return {
      start: y(sec) - innerHeight * 0.35,
      steps: [...sec.querySelectorAll(steps)].map((el) => y(el) + el.offsetHeight / 2 - innerHeight * 0.555),
    }
  }, { section, steps })

  // План прокрутки: [секунда, y]
  const plan = [[0, targets.start]]
  let t = LEAD
  for (const y of targets.steps) {
    plan.push([t, plan[plan.length - 1][1]])
    t += MOVE
    plan.push([t, y])
    t += HOLD
  }
  const total = t
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
  const scrollAt = (s) => {
    for (let i = 1; i < plan.length; i++) {
      const [t0, y0] = plan[i - 1]
      const [t1, y1] = plan[i]
      if (s <= t1) return y0 + (y1 - y0) * (t1 > t0 ? ease((s - t0) / (t1 - t0)) : 1)
    }
    return plan[plan.length - 1][1]
  }

  await page.evaluate((y) => scrollTo(0, y), targets.start)
  await page.waitForTimeout(500)
  await startClock(page)
  const at = async (s) => {
    await page.evaluate((y) => scrollTo(0, y), scrollAt(s))
    await step(page, dt)
    await waitImages(page, `${section} img`, 3000)
  }

  const n = Math.round(total * fps)
  if (a.stills) {
    fs.mkdirSync(out, { recursive: true })
    // Середина перелистывания и два момента паузы на каждом шаге
    const shots = []
    let tt = LEAD
    targets.steps.forEach(() => { shots.push(tt + MOVE * 0.5); tt += MOVE; shots.push(tt + 1.6, tt + HOLD - 0.1); tt += HOLD })
    let si = 0
    for (let f = 0; f < n && si < shots.length; f++) {
      const s = f / fps
      await at(s)
      if (s >= shots[si]) { await page.screenshot({ path: `${out}/s${String(si).padStart(2, '0')}-${s.toFixed(2)}.png` }); si++ }
    }
    console.log(`${shots.length} кадров → ${out}`)
  } else {
    const video = encoder(out, fps)
    for (let f = 0; f < n; f++) {
      await at(f / fps)
      await video.write(await page.screenshot({ type: 'jpeg', quality: 94 }))
    }
    await video.close()
    console.log(`${n} кадров (${total.toFixed(1)} с) → ${out}`)
  }
  await browser.close()
})()
