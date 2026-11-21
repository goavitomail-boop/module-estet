# Инструменты моушна

Запись видео 60 fps на виртуальных часах и замер плавности вживую.
Подробно — в [docs/MOTION.md](../../docs/MOTION.md), раздел 7.

```bash
npm i -g playwright && npx playwright install chromium
export NODE_PATH="$(npm root -g)"
pnpm build && pnpm start

node tools/motion/render-timeline.cjs / out/hero.mp4 --secs 27
node tools/motion/render-scroll.cjs / out/process.mp4 --mobile
node tools/motion/render-thanks.cjs quiz out/thanks.mp4
node tools/motion/fps.cjs / --secs 26
```

Нужен ffmpeg. Адрес сайта — `BASE_URL` (по умолчанию http://localhost:3000).
`render-thanks.cjs` перехватывает отправку форм: настоящих заявок не создаёт.
