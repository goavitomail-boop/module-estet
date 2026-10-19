// Замер плавности вживую: сколько кадров браузер рисует в каждую секунду.
// Цель сайта — 60, допустимо не ниже 45. Это реальное время, не запись.
//
//   node tools/motion/fps.cjs / --secs 26               — первый экран главной
//   node tools/motion/fps.cjs /vizkit --secs 15 --mobile
//   node tools/motion/fps.cjs / --scroll #process       — прокрутка «Как мы работаем»
//
// На машине без видеокарты числа ниже, чем у посетителя: сравнивайте
// версии между собой в одних условиях, а не с идеалом
const { BASE, args, open } = require('./lib.cjs')

;(async () => {
  const a = args()
  const [path = '/'] = a._
  const mobile = Boolean(a.mobile)
  const width = +(a.w || (mobile ? 390 : 1280))
  const height = +(a.h || (mobile ? 844 : 800))
  const runs = +(a.runs || 2)

  for (let run = 0; run < runs; run++) {
    const { browser, page } = await open({ width, height, mobile, hold: false })
    if (a.scroll) {
      await page.goto(BASE + path, { waitUntil: 'load' })
      await page.waitForTimeout(1500)
    } else {
      // Счёт кадров с самого начала загрузки
      await page.addInitScript((ms) => {
        window.__f = []
        const t0 = performance.now()
        const tick = (t) => { window.__f.push(t); if (t - t0 < ms) requestAnimationFrame(tick) }
        requestAnimationFrame(tick)
      }, +(a.secs || 15) * 1000 + 300)
      await page.goto(BASE + path)
      await page.waitForTimeout(+(a.secs || 15) * 1000 + 600)
    }
    const r = await page.evaluate(async (section) => {
      let f = window.__f
      if (section) {
        // Листаем к каждому шагу: 0,9 с прокрутки и 3 с паузы
        document.documentElement.style.scrollBehavior = 'auto'
        const y = (el) => el.getBoundingClientRect().top + scrollY
        const sec = document.querySelector(section)
        const steps = [...sec.querySelectorAll('[data-step]')].map((el) => y(el) + el.offsetHeight / 2 - innerHeight * 0.555)
        const plan = [[0, y(sec) - innerHeight * 0.35], [1000, y(sec) - innerHeight * 0.35]]
        let t = 1000
        for (const s of steps) { t += 900; plan.push([t, s]); t += 3000; plan.push([t, s]) }
        const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
        const at = (ms) => { for (let i = 1; i < plan.length; i++) { const [t0, y0] = plan[i - 1], [t1, y1] = plan[i]; if (ms <= t1) return y0 + (y1 - y0) * (t1 > t0 ? ease((ms - t0) / (t1 - t0)) : 1) } return plan[plan.length - 1][1] }
        f = await new Promise((done) => {
          const frames = []
          let t0
          const tick = (now) => { if (t0 === undefined) t0 = now; frames.push(now); scrollTo(0, at(now - t0)); if (now - t0 < t) requestAnimationFrame(tick); else done(frames) }
          requestAnimationFrame(tick)
        })
      }
      const per = []
      for (let s = 0; f[0] + (s + 1) * 1000 <= f[f.length - 1]; s++) {
        const from = f[0] + s * 1000
        per.push(f.filter((x) => x >= from && x < from + 1000).length)
      }
      const gaps = f.slice(1).map((x, i) => x - f[i])
      return { perSecond: per.join(' '), min: Math.min(...per.slice(1)), worstGapMs: Math.round(Math.max(...gaps)) }
    }, a.scroll || null)
    console.log(`прогон ${run + 1}: по секундам ${r.perSecond} · минимум после загрузки ${r.min} · худшая пауза ${r.worstGapMs} мс`)
    await browser.close()
  }
})()
