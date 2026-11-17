#!/usr/bin/env node
/**
 * Иконки сайта и панели из знака «Модуль Эстет» — того, что в шапке сайта
 * (components/module-estet-mark.tsx). Линии знака повторены здесь: если знак
 * поменяется, поправьте MARK ниже и запустите заново:
 *
 *   node scripts/gen-icons.mjs
 *
 * Пишет в public/: icon.svg (фавикон), favicon.ico (16/32/48 — для старых
 * браузеров и Яндекса), apple-icon.png (экран «Домой» на iPhone), icon-192.png
 * и icon-512.png (Android, установка сайта и панели как приложения),
 * icon-maskable-512.png (Android обрезает иконку по своей форме — знак
 * держится в безопасной зоне), brand/logo-mark.svg (логотип в разметке
 * для поисковиков, lib/seo.ts).
 *
 * На маленьких размерах линии знака утолщены: в 16–32 px штрих толщиной
 * 16/440 превращается в волосок и пропадает.
 */
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')

const GOLD = '#B2935A'
const INK = '#1A1A1A'

/** Линии знака: viewBox 440 × 440, сдвиг 10 — как в ModuleEstetMark */
function mark(stroke, tick) {
  return `<g transform="translate(10 10)" stroke="${GOLD}" fill="none">
    <path d="M18 18H402V118 M18 18V416H116 M402 416H304 M402 416V316" stroke-width="${stroke}" stroke-linecap="square" stroke-linejoin="miter"/>
    <path d="M104 348V104L210 216L316 104V348" stroke-width="${stroke}" stroke-linecap="square" stroke-linejoin="miter"/>
    <line x1="132" y1="262" x2="132" y2="314" stroke-width="${tick}" stroke-linecap="round"/>
  </g>`
}

/**
 * Знак на тёмной плашке.
 * rounded — скруглённая плашка (фавикон, иконки «any»), иначе квадрат
 * во весь размер (iPhone и Android сами скругляют по своей форме).
 * scale — доля плашки, которую занимает знак.
 */
function icon({ rounded, scale, stroke, tick = stroke * 0.45, label = '' }) {
  const plate = rounded ? `<rect width="440" height="440" rx="96" fill="${INK}"/>` : `<rect width="440" height="440" fill="${INK}"/>`
  const aria = label ? ` role="img" aria-label="${label}"` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 440"${aria}>
  ${plate}
  <g transform="translate(220 220) scale(${scale}) translate(-220 -220)">
    ${mark(stroke, tick)}
  </g>
</svg>
`
}

const png = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer()

/** ICO из готовых PNG: заголовок, каталог, затем сами картинки как есть */
function ico(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  const dir = Buffer.alloc(16 * images.length)
  let offset = 6 + dir.length
  images.forEach(({ size, data }, i) => {
    const at = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, at)
    dir.writeUInt8(size >= 256 ? 0 : size, at + 1)
    dir.writeUInt8(0, at + 2)
    dir.writeUInt8(0, at + 3)
    dir.writeUInt16LE(1, at + 4)
    dir.writeUInt16LE(32, at + 6)
    dir.writeUInt32LE(data.length, at + 8)
    dir.writeUInt32LE(offset, at + 12)
    offset += data.length
  })
  return Buffer.concat([header, dir, ...images.map((image) => image.data)])
}

const favicon = icon({ rounded: true, scale: 0.78, stroke: 26 })
const small = icon({ rounded: true, scale: 0.8, stroke: 32 })
const any = icon({ rounded: true, scale: 0.72, stroke: 20 })
const fullBleed = icon({ rounded: false, scale: 0.66, stroke: 20 })
// Безопасная зона маскируемой иконки — круг 80 % ширины: углы рамки внутри него
const maskable = icon({ rounded: false, scale: 0.56, stroke: 22 })
const logo = icon({ rounded: true, scale: 0.72, stroke: 18, label: '«Модуль Эстет» — кухни на заказ' })

const out = [
  ['icon.svg', favicon],
  ['brand/logo-mark.svg', logo],
  ['apple-icon.png', await png(fullBleed, 180)],
  ['icon-192.png', await png(any, 192)],
  ['icon-512.png', await png(any, 512)],
  ['icon-maskable-512.png', await png(maskable, 512)],
  [
    'favicon.ico',
    ico([
      { size: 16, data: await png(small, 16) },
      { size: 32, data: await png(small, 32) },
      { size: 48, data: await png(favicon, 48) },
    ]),
  ],
]

for (const [name, data] of out) {
  await writeFile(join(PUBLIC, name), data)
  console.log(`public/${name}`)
}
