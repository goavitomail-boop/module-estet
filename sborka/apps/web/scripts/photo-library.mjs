/**
 * Собирает библиотеку фото для редактора: public/library/<категория>/<n>.webp (до 1400 px)
 * и <n>-s.webp (миниатюра 400 px), список — src/lib/library.json, авторы и ссылки — public/library/SOURCES.md.
 *
 * Только фото с лицензией CC0 (общественное достояние, можно в коммерческих сайтах без указания автора):
 * StockSnap, WordPress Photo Directory и Nappy через поиск Openverse. Без ключа Openverse даёт
 * 200 запросов в сутки и 20 в минуту — скрипт делает около 120 и ждёт между ними.
 *
 *   node scripts/photo-library.mjs [категория ...]   — без аргументов пересобирает всё
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "public/library");
const MANIFEST = join(ROOT, "src/lib/library.json");
const PER_CATEGORY = 24;
const API = "https://api.openverse.org/v1/images/";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

/**
 * Категории: сначала сферы из брифа (id совпадает с нишей), потом общие. Запросы — на английском, так ищет Openverse.
 * Слова-фильтр: хотя бы одно должно быть в названии или тегах фото, иначе по «beard» приходят статуи и трава;
 * пятый элемент — слова, с которыми фото в категорию не берём.
 */
const CATEGORIES = [
  [
    "coffee",
    "Кофейня",
    ["coffee shop", "latte", "coffee beans", "croissant"],
    "coffee cafe latte espresso cappuccino barista cup bakery pastry croissant cake dessert bread",
  ],
  // По-английски nails — и ногти, и гвозди: молотки и стройка в маникюр не попадают
  [
    "nails",
    "Маникюр",
    ["manicure", "nail polish", "nail art", "hands nails"],
    "manicure pedicure polish salon lacquer nail nails",
    "hammer wood construction tool tools wall screw metal",
  ],
  [
    "repair",
    "Ремонт",
    ["renovation", "construction worker", "paint roller", "tools"],
    "renovation construction repair tools tool paint painting builder drill hammer wall interior worker",
  ],
  [
    "auto",
    "Автосервис",
    ["car repair", "mechanic", "car", "car wheel"],
    "car cars auto mechanic garage wheel tire engine vehicle automobile repair",
  ],
  [
    "psychologist",
    "Психология",
    ["therapy", "meditation", "calm", "talking"],
    "therapy meditation calm relax relaxation talk talking conversation woman sofa couch peaceful mindfulness",
  ],
  [
    "fitness",
    "Фитнес",
    ["gym", "workout", "yoga", "running"],
    "gym fitness workout yoga running runner exercise training sport dumbbell weights athlete",
  ],
  [
    "legal",
    "Юристы и офис",
    ["office meeting", "contract signing", "business documents", "office"],
    "office business meeting contract documents document signing sign paper desk lawyer law suit",
  ],
  [
    "barber",
    "Барбершоп",
    ["barbershop", "barber", "haircut", "beard man"],
    "barber barbershop haircut hair beard razor shave comb scissors salon",
  ],
  [
    "cleaning",
    "Клининг",
    ["cleaning house", "cleaning woman", "laundry", "vacuum cleaner"],
    "cleaning clean housework laundry mop vacuum washing housekeeping",
    "fruit apple apples food camera lens",
  ],
  [
    "dental",
    "Медицина",
    ["dentist", "smile", "doctor", "medical"],
    "dentist dental teeth smile doctor medical clinic hospital health nurse",
  ],
  [
    "photo",
    "Фото и видео",
    ["camera", "photographer", "photo studio", "lens"],
    "camera photographer photography photo studio lens video film",
  ],
  [
    "florist",
    "Цветы",
    ["flower bouquet", "florist", "roses", "flowers"],
    "flower flowers bouquet florist rose roses tulip peony blossom floral",
  ],
  [
    "interior",
    "Интерьеры",
    ["interior", "living room", "bedroom", "home decor"],
    "interior room living bedroom home house decor furniture sofa design apartment",
  ],
  [
    "people",
    "Люди",
    ["portrait woman", "portrait man", "smiling woman", "people"],
    "portrait woman man girl guy people person smile smiling face",
  ],
  [
    "team",
    "Команда",
    ["team meeting", "coworking", "business people", "colleagues"],
    "team meeting coworking business people colleagues office work working group",
  ],
  [
    "workspace",
    "Рабочее место",
    ["laptop", "workspace", "desk", "notebook"],
    "laptop workspace desk notebook computer work office keyboard",
  ],
  [
    "food",
    "Еда",
    ["food", "restaurant", "salad", "pizza"],
    "food meal dish restaurant salad pizza dinner lunch breakfast plate cooking delicious",
  ],
  [
    "nature",
    "Природа",
    ["mountains", "forest", "beach", "lake"],
    "mountain mountains forest beach sea ocean lake landscape nature sunset trees",
  ],
  ["city", "Город", ["city", "street", "architecture", "skyline"], "city street architecture building buildings skyline urban town night"],
  [
    "texture",
    "Фоны и текстуры",
    ["texture", "marble", "wood texture", "abstract"],
    "texture marble wood wooden abstract background pattern paper concrete fabric",
  ],
  [
    "hands",
    "Руки и мастерство",
    ["craft", "workshop", "handmade", "artisan"],
    "craft crafting workshop handmade artisan hands tools pottery wood sewing",
  ],
  [
    "beauty",
    "Красота и уход",
    ["skincare", "spa", "cosmetics", "makeup"],
    "skincare skin spa cosmetics makeup beauty cream massage lipstick",
  ],
  ["family", "Семья и дети", ["family", "children", "kids", "baby"], "family children child kids kid baby mother father parents"],
  ["pets", "Животные", ["dog", "cat", "puppy", "kitten"], "dog dogs cat cats puppy kitten pet pets animal"],
  [
    "tech",
    "Техника",
    ["smartphone", "technology", "phone", "headphones"],
    "smartphone phone iphone technology tech computer laptop headphones gadget device",
  ],
  [
    "sport",
    "Спорт",
    ["sport", "football", "bicycle", "tennis"],
    "sport sports football soccer bicycle bike cycling tennis basketball ball athlete",
  ],
  [
    "events",
    "Праздники",
    ["party", "wedding", "celebration", "birthday"],
    "party wedding celebration birthday event decoration festive champagne balloons",
  ],
  [
    "study",
    "Учёба",
    ["books", "student", "classroom", "study"],
    "book books student students study studying classroom school education library learning",
  ],
  // Бесплатных фото доставки почти нет — категория про транспорт
  [
    "transport",
    "Транспорт",
    ["truck", "van", "car road", "bicycle city"],
    "truck van car cars road bicycle bike bus vehicle driving",
    "abandoned ruins excavator forest rusty wreck",
  ],
];

/** Чего не берём ни в какую категорию: статуи, рисунки, старые открытки. */
const STOP =
  /\b(statue|sculpture|monument|drawing|illustration|painting of|vintage postcard|map|graffiti|grave|cemetery|dead|insect|bug|spider)\b/i;
const SOURCE_RANK = { stocksnap: 0, nappy: 1, wordpress: 2 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;

async function search(q) {
  const wait = lastCall + 3300 - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  const url = `${API}?q=${encodeURIComponent(q)}&license=cc0&source=stocksnap,wordpress,nappy&page_size=20`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Openverse ${res.status} для «${q}»`);
  return (await res.json()).results ?? [];
}

/** Самая большая доступная версия: у WordPress — 2048 px, у StockSnap — 960 px (больше CDN не отдаёт). */
async function download(r) {
  const headers = { "User-Agent": UA, Referer: r.foreign_landing_url ?? "https://openverse.org/" };
  const res = await fetch(r.url, { headers });
  if (!res.ok) throw new Error(`${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const only = process.argv.slice(2);
const old = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { categories: [] };
const seen = new Set(old.categories.filter((c) => !only.length || !only.includes(c.id)).flatMap((c) => c.photos.map((p) => p.key)));
const categories = [];

for (const [id, label, queries, words, avoid] of CATEGORIES) {
  const want = new Set(words.split(" "));
  const skip = avoid ? new RegExp(`\\b(${avoid.split(" ").join("|")})\\b`, "i") : null;
  if (only.length && !only.includes(id)) {
    const kept = old.categories.find((c) => c.id === id);
    if (kept) categories.push(kept);
    continue;
  }
  const dir = join(OUT, id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  // Результаты запросов вперемешку: по одному из каждого, чтобы категория не состояла из одного запроса
  const lists = [];
  for (const q of queries) {
    try {
      lists.push(await search(q));
    } catch (err) {
      console.error("✗", err.message);
      lists.push([]);
    }
  }
  const pool = [];
  for (let i = 0; i < 20; i++) for (const list of lists) if (list[i]) pool.push(list[i]);
  // Подходят по смыслу: нужное слово в названии или тегах; StockSnap — первым, у него отбор строже
  const fits = (r) => {
    const text = `${r.title ?? ""} ${(r.tags ?? []).map((t) => t.name).join(" ")}`.toLowerCase();
    return !STOP.test(text) && !skip?.test(text) && text.split(/[^a-zа-яё]+/).some((w) => want.has(w));
  };
  pool.splice(0, pool.length, ...pool.filter(fits).sort((a, b) => (SOURCE_RANK[a.source] ?? 3) - (SOURCE_RANK[b.source] ?? 3)));

  const photos = [];
  for (const r of pool) {
    if (photos.length >= PER_CATEGORY) break;
    const key = `${r.source}:${r.foreign_identifier ?? r.id}`;
    if (seen.has(key)) continue;
    const ratio = (r.width ?? 1) / (r.height ?? 1);
    if ((r.width ?? 0) < 900 || ratio < 0.55 || ratio > 2.2) continue;
    try {
      const buf = await download(r);
      const n = String(photos.length + 1).padStart(2, "0");
      const img = sharp(buf).rotate();
      const meta = await img.metadata();
      if ((meta.width ?? 0) < 800) continue;
      await img
        .clone()
        .resize({ width: 1400, withoutEnlargement: true })
        .webp({ quality: 66 })
        .toFile(join(dir, `${n}.webp`));
      await img
        .clone()
        .resize({ width: 400 })
        .webp({ quality: 60 })
        .toFile(join(dir, `${n}-s.webp`));
      seen.add(key);
      photos.push({
        key,
        src: `/library/${id}/${n}.webp`,
        thumb: `/library/${id}/${n}-s.webp`,
        title: r.title ?? "",
        author: r.creator ?? "",
        source: r.source,
        link: r.foreign_landing_url ?? "",
      });
    } catch (err) {
      console.error("  пропуск", r.url, err.message);
    }
  }
  categories.push({ id, label, photos });
  console.log("✓", id, photos.length);
}

writeFileSync(MANIFEST, JSON.stringify({ categories }, null, 1) + "\n");
const rows = categories.flatMap((c) =>
  c.photos.map(
    (p) =>
      `| \`${p.src.replace("/library/", "")}\` | ${p.title.replace(/\|/g, "/")} | ${p.author.replace(/\|/g, "/")} | [${p.source}](${p.link}) | CC0 |`,
  ),
);
writeFileSync(
  join(OUT, "SOURCES.md"),
  `# Источники фото библиотеки\n\nВсе фото — с лицензией **CC0** (общественное достояние): можно использовать в сайтах клиентов, в том числе коммерческих, без указания автора. Найдены через [Openverse](https://openverse.org) в каталогах StockSnap, WordPress Photo Directory и Nappy. Собирает \`scripts/photo-library.mjs\`.\n\n| Файл | Фото | Автор | Источник | Лицензия |\n|---|---|---|---|---|\n${rows.join("\n")}\n`,
);
console.log(
  "Всего фото:",
  categories.reduce((n, c) => n + c.photos.length, 0),
);
