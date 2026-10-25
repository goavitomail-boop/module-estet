/**
 * Записывает ролики-примеры эффектов для редактора: public/effects/<группа>-<вариант>.mp4.
 * Их показывает всплывающее окно, когда клиент наводит на вариант эффекта.
 *
 * Нужны Playwright с Chromium и ffmpeg. Сначала соберите и запустите сайт со служебной страницей:
 *   npm run build && SBORKA_DEV_TOOLS=1 npx next start -p 3100
 *   node scripts/effect-previews.mjs [группа или группа-вариант ...]
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { join } from "node:path";

// Playwright не зависимость проекта: берём установленный в системе (require видит NODE_PATH, import — нет)
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = new URL("../public/effects/", import.meta.url).pathname;
const W = 1200;
const H = 750;

/** Кадр крупнее: эффект на фото или в углу. Координаты — в окне 1200×750, пропорции 16:10. h — композиция первого экрана. */
const RIGHT = { x: 400, y: 0, w: 800, h: 500 };
const PHOTO = { x: 400, y: 60, w: 800, h: 500 };

/** Эффекты первого экрана показываем на сайте сферы, для которой они придуманы; 3D и сияние — на тёмном универсальном. */
const FX_HOME = {
  steam: { niche: "coffee", crop: { x: 450, y: 60, w: 720, h: 450 } },
  swatches: { niche: "nails", crop: { x: 400, y: 100, w: 800, h: 500 } },
  blueprint: { niche: "repair", crop: RIGHT },
  beam: { niche: "auto" },
  aurora: { niche: "other", v: 2 },
  pulse: { niche: "fitness" },
  document: { niche: "legal", crop: { x: 480, y: 300, w: 720, h: 450 } },
  pole: { niche: "barber", crop: { x: 0, y: 250, w: 800, h: 500 } },
  bubbles: { niche: "cleaning" },
  liquid: { niche: "dental" },
  trail: { niche: "photo" },
  petals: { niche: "florist" },
  "scene-orb": { niche: "barber" },
  "scene-glass": { niche: "dental", h: "centered" },
  "scene-crystal": { niche: "coffee", v: 1 },
  "scene-knot": { niche: "fitness" },
  "scene-rings": { niche: "legal", v: 1, h: "overlay" },
  "scene-shapes": { niche: "cleaning", h: "overlay" },
  "scene-silk": { niche: "florist", v: 1 },
  "scene-helix": { niche: "dental", v: 1, h: "centered" },
  "scene-globe": { niche: "photo", v: 1, h: "overlay" },
  "scene-strings": { niche: "psychologist" },
  "scene-warp": { niche: "auto", crop: { x: 200, y: 125, w: 800, h: 500 } },
  "scene-cubes": { niche: "repair", v: 1, crop: { x: 200, y: 250, w: 800, h: 500 } },
  "scene-terrain": { niche: "other", v: 2, crop: { x: 160, y: 200, w: 880, h: 550 } },
  "scene-particles": { niche: "other", v: 3 },
  "scene-wave": { niche: "other", v: 3, crop: { x: 200, y: 250, w: 800, h: 500 } },
};

/** Декор — на сайтах, где он заметен. */
const DECOR_HOME = {
  marquee: { niche: "florist" },
  blobs: { niche: "cleaning" },
  lines: { niche: "other", v: 2 },
  badge: { niche: "florist", crop: RIGHT },
  chips: { niche: "dental", crop: PHOTO },
};

const GROUPS = {
  fx: Object.keys(FX_HOME),
  intro: ["circle", "letters", "split", "counter", "photos"],
  motion: ["soft", "elegant", "bold"],
  cursor: ["ring", "blend"],
  fab: ["circle", "pill", "square", "tab"],
  decor: ["marquee", "blobs", "lines", "badge", "chips"],
  gallery: ["bento", "polaroid", "hscroll", "filmstrip", "masonry", "arches"],
  steps: ["stack", "timeline", "row", "big"],
  reviews: ["grid", "notes", "marquee", "slider", "chat"],
  faq: ["accordion", "numbered", "cards"],
  services: ["photo", "arch", "icon", "list"],
  cinema: ["on", "off"],
  highlight: ["on", "off"],
};

/** Блок, на котором показывать вид, — по якорю или по разметке. */
const BLOCK = {
  gallery: "#gallery",
  steps: "#steps",
  reviews: "#reviews",
  faq: "#faq",
  services: "#services",
  cinema: 'section:has(p[data-ef="quote"])',
  highlight: "#about",
};

/** Сайт и кадр для ролика. Виды блоков, заставки и движение — на одном сайте, чтобы их было легко сравнить. */
function siteFor(group, id) {
  const home =
    group === "fx" ? FX_HOME[id] : group === "decor" ? DECOR_HOME[id] : group === "cursor" ? { niche: "barber" } : { niche: "florist" };
  return { v: 0, ...home };
}

function effectsFor(group, id) {
  // Плавающую кнопку и свой курсор выключаем, чтобы в ролике был виден только выбранный эффект
  const quiet = { fab: "none", cursor: "none" };
  if (group === "decor") return { ...quiet, fx: "none", decor: [id] };
  if (group === "cursor") return { fab: "none", fx: "none", cursor: id };
  if (group === "cinema" || group === "highlight") return { ...quiet, [group]: id === "on" };
  return { ...quiet, [group]: id };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Плавная прокрутка страницы от a до b за ms. */
const scroll = (page, a, b, ms) =>
  page.evaluate(
    ([a, b, ms]) =>
      new Promise((done) => {
        const t0 = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - t0) / ms);
          const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          window.scrollTo(0, a + (b - a) * e);
          if (t < 1) requestAnimationFrame(tick);
          else done();
        };
        requestAnimationFrame(tick);
      }),
    [a, b, ms],
  );

/** Курсор гуляет по экрану: для эффектов, которые реагируют на мышь. */
async function wander(page, ms, box = { x: 140, y: 140, w: W - 280, h: H - 280 }) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const t = (Date.now() - t0) / 1000;
    await page.mouse.move(box.x + box.w * (0.5 + 0.45 * Math.sin(t * 1.3)), box.y + box.h * (0.5 + 0.4 * Math.sin(t * 2.1 + 1)));
    await sleep(30);
  }
}

const topOf = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().top + window.scrollY : null;
  }, selector);

/** Сценарий ролика: что делать на странице. Возвращает начало и длину нужного куска (от открытия страницы) и область кадра. */
async function play(page, group, id, url, clock) {
  if (group === "fx" && id.startsWith("scene-")) {
    // 3D-сцена подгружается после страницы — ждём её
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-scene] canvas");
    await sleep(1200);
    const start = clock();
    await wander(page, 3600);
    return { start, dur: 3.4 };
  }
  if (group === "fx") {
    // С момента открытия: часть эффектов (чертёж, подпись) рисуется один раз при загрузке
    const start = clock();
    await page.goto(url, { waitUntil: "commit" });
    await wander(page, 4000);
    return { start: start + 0.4, dur: 3.4 };
  }
  if (group === "intro") {
    const start = clock();
    await page.goto(url + "&intro=1", { waitUntil: "commit" });
    await sleep(3600);
    return { start: start + 0.25, dur: 3.2 };
  }
  await page.goto(url, { waitUntil: "networkidle" });
  await page.mouse.move(W / 2, H / 2);
  await sleep(900);

  if (group === "cursor") {
    // Курсор гуляет, потом наводится на кнопку — кольцо растёт, кнопка тянется к нему
    const start = clock();
    await wander(page, 1600);
    const button = await page.locator("[data-magnetic]").first().boundingBox();
    if (button) await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2, { steps: 20 });
    await sleep(1200);
    await page.mouse.move(W / 2, H / 3, { steps: 20 });
    await sleep(400);
    return { start, dur: 3.4 };
  }
  if (group === "motion") {
    const start = clock();
    await sleep(200);
    await scroll(page, 0, 1500, 3200);
    return { start, dur: 3.4 };
  }
  if (group === "fab") {
    const start = clock();
    await scroll(page, 0, 900, 1100);
    await sleep(500);
    await page.mouse.move(W - 70, H - 70, { steps: 12 });
    await sleep(1600);
    return { start, dur: 3.2, crop: { x: 400, y: 250, w: 800, h: 500 } };
  }
  if (group === "decor") {
    if (id === "marquee") {
      const y = await topOf(page, "main > section:nth-of-type(2), main > div + section");
      const target = Math.max(0, (y ?? 700) - 500);
      const start = clock();
      await scroll(page, 0, target, 1200);
      await sleep(2000);
      return { start, dur: 3.2 };
    }
    const start = clock();
    await wander(page, 3400);
    return { start, dur: 3.2 };
  }

  // Вид блока: подъезжаем к нему, чтобы было видно появление, и листаем через него
  const top = await topOf(page, BLOCK[group]);
  if (top === null) throw new Error(`Нет блока ${BLOCK[group]}`);
  await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, top - 600));
  await sleep(400);
  const start = clock();
  await scroll(page, Math.max(0, top - 600), top - 40, 900);
  const pinned = (group === "gallery" && id === "hscroll") || (group === "steps" && id === "stack") || (group === "cinema" && id === "on");
  if (group === "faq") {
    await sleep(300);
    const q = page.locator(`${BLOCK.faq} button, ${BLOCK.faq} summary`).first();
    if (await q.count()) await q.click().catch(() => {});
    await sleep(1800);
  } else if (group === "gallery" && (id === "polaroid" || id === "masonry" || id === "bento" || id === "arches")) {
    await wander(page, 2200, { x: 200, y: 200, w: W - 400, h: H - 360 });
  } else {
    await scroll(page, top - 40, top - 40 + (pinned ? 1100 : 220), 2300);
  }
  return { start, dur: 3.4 };
}

async function record(browser, group, id) {
  const dir = mkdtempSync(join(tmpdir(), "fx-"));
  const context = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir, size: { width: W, height: H } } });
  const page = await context.newPage();
  const t0 = Date.now();
  const clock = () => (Date.now() - t0) / 1000;
  const site = siteFor(group, id);
  const { niche, v, h } = site;
  const url = `${BASE}/dev/effects?niche=${niche}&v=${v}${h ? `&h=${h}` : ""}&e=${encodeURIComponent(JSON.stringify(effectsFor(group, id)))}`;
  const clip = await play(page, group, id, url, clock);
  const video = page.video();
  await context.close();
  const src = await video.path();
  const area = clip.crop ?? site.crop;
  const crop = area ? `crop=${area.w}:${area.h}:${area.x}:${area.y},` : "";
  const out = join(OUT, `${group}-${id}.mp4`);
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-ss",
    clip.start.toFixed(2),
    "-t",
    String(clip.dur),
    "-i",
    src,
    "-vf",
    `${crop}scale=560:350:flags=lanczos,fps=24`,
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "31",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    out,
  ]);
  rmSync(dir, { recursive: true, force: true });
  return out;
}

const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
for (const [group, ids] of Object.entries(GROUPS)) {
  for (const id of ids) {
    if (only.length && !only.includes(group) && !only.includes(`${group}-${id}`)) continue;
    try {
      console.log("✓", await record(browser, group, id));
    } catch (err) {
      console.error("✗", group, id, err.message);
    }
  }
}
await browser.close();
