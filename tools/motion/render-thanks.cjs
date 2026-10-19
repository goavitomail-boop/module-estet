// Запись экранов «спасибо». Форма проходится по-настоящему, но отправка
// перехвачена: на /api/* уходит фиктивный ответ, в базу и в Max ничего
// не попадает. Запись начинается с момента появления экрана.
//
//   node tools/motion/render-thanks.cjs quiz out/thanks-quiz.mp4
//   node tools/motion/render-thanks.cjs booking out/thanks-booking.mp4 --mobile
const { BASE, args, open, waitImages, startClock, step, encoder } = require('./lib.cjs')

/** Черновик кухонного квиза: открывается сразу на шаге контактов */
const QUIZ_DRAFT = {
  step: 5,
  answers: {
    layout: 'Угловая',
    kitchenSize: 'Средняя — 3–4 м',
    style: 'Минимализм',
    appliances: ['Посудомоечная машина'],
    features: ['Подсветка рабочей зоны', 'Остров или барная стойка'],
    timeline: '1–3 месяца',
  },
}

;(async () => {
  const a = args()
  const [mode = 'quiz', out = `thanks-${mode}.mp4`] = a._
  const mobile = Boolean(a.mobile)
  const width = +(a.w || (mobile ? 390 : 1280))
  const height = +(a.h || (mobile ? 844 : 800))
  const secs = +(a.secs || 4.5)
  const fps = 60

  const { browser, context, page } = await open({ width, height, mobile, hold: false })
  await context.addInitScript((draft) => { try { localStorage.setItem('modul-estet-quiz-draft-v2', JSON.stringify(draft)) } catch {} }, QUIZ_DRAFT)
  await context.route('**/api/**', (route) => {
    const req = route.request()
    if (req.method() === 'GET') return route.continue()
    if (req.url().includes('/api/leads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: mode === 'quiz' ? 'ПР-ТЕСТ' : 'ЗМ-ТЕСТ' }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  if (mode === 'quiz') {
    await page.goto(`${BASE}/quiz?type=kitchen`, { waitUntil: 'load' })
    await page.waitForTimeout(1200)
    await page.locator('input[type="tel"]').fill('9001234567')
    await page.locator('input[autocomplete="given-name"]').fill('Анна')
    await page.locator('input[type="checkbox"]').check()
    await page.getByRole('button', { name: /Получить расчёт бесплатно/ }).click()
    await page.getByText('Передано дизайнеру').waitFor({ timeout: 15000 })
  } else {
    const date = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10)
    await page.goto(`${BASE}/`, { waitUntil: 'load' })
    await page.waitForTimeout(1500)
    await page.evaluate(() => window.dispatchEvent(new Event('measurement-booking:open')))
    await page.locator('#booking-date').fill(date)
    await page.getByRole('button', { name: /^День/ }).click()
    await page.getByRole('button', { name: /Далее/ }).click()
    await page.locator('#booking-name').fill('Анна')
    await page.locator('#booking-phone').fill('9001234567')
    await page.getByRole('dialog').getByRole('checkbox').click()
    await page.getByRole('button', { name: /Далее/ }).click()
    await page.locator('#booking-city').fill('Москва')
    await page.locator('#booking-address').fill('ул. Ленина, д. 12, кв. 45')
    await page.getByRole('button', { name: /Отправить заявку на замер/ }).click()
    await page.getByText('Ждёт подтверждения').waitFor({ timeout: 15000 })
  }

  await startClock(page)
  await waitImages(page, 'img', 1500)
  const video = encoder(out, fps)
  const n = Math.round(secs * fps)
  for (let f = 0; f < n; f++) {
    if (f > 0) await step(page, 1000 / fps)
    await video.write(await page.screenshot({ type: 'jpeg', quality: 94 }))
  }
  await video.close()
  console.log(`${mode}: ${n} кадров → ${out}`)
  await browser.close()
})()
