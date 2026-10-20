import type { CatalogItem } from '@/lib/pdf-catalog-data'

/**
 * Модульные шкафы — по каталогу производства «Модульные шкафы».
 * Фото лежат в public/catalog/wardrobes/photos, образцы цвета вырезаны
 * из разворотов «Цвета фасадов» — public/catalog/wardrobes/<палитра>/.
 */

const BASE = '/catalog/wardrobes'
const photo = (name: string) => `${BASE}/photos/${name}.webp`

function palette(folder: string, colors: readonly (readonly [string, string])[]): CatalogItem[] {
  return colors.map(([name, file]) => ({ name, image: `${BASE}/${folder}/${file}.webp` }))
}

const softWoodColors = palette('soft-wood', [
  ['Белый', 'white'], ['Кашемир', 'cashmere'], ['Серый камень', 'grey-stone'], ['Антрацит', 'anthracite'],
  ['Сатин', 'satin'], ['Дуб Каселла натуральный', 'oak-kasella-natural'], ['Дуб Каселла коричневый', 'oak-kasella-brown'],
  ['Дуб Каселла натуральный светлый', 'oak-kasella-light'], ['Дуб Каселла каштановый', 'oak-kasella-chestnut'],
  ['Дуб Чарльстон коричневый', 'oak-charleston-brown'], ['Дуб Сторсунд', 'oak-storsund'], ['Дуб Крафт золотой', 'oak-craft-gold'],
])

const touchColors = palette('touch', [
  ['Белый', 'white'], ['Светло-серый', 'light-grey'], ['Тёмно-серый', 'dark-grey'], ['Серый шторм', 'storm-grey'],
  ['Новый серый', 'new-grey'], ['Белый глянец', 'white-gloss'], ['Крем', 'cream'], ['Матовый грейдж', 'greige'],
  ['Мята', 'mint'], ['Морская волна', 'sea-wave'],
])

const touchUltraColors = palette('touch-ultra', [
  ['Фарфоровый оникс', 'porcelain-onyx'], ['Пепельный аметист', 'ash-amethyst'], ['Горный хрусталь', 'rock-crystal'],
  ['Лунный топаз', 'moon-topaz'], ['Сумрачный нефрит', 'dusk-jade'], ['Холодный жемчуг', 'cold-pearl'],
])

/** Общая палитра серии BASE: Arco, Garda, Como и Flat & Velvet */
const baseColors = palette('base', [
  ['Лотос', 'lotus'], ['Бежевый', 'beige'], ['Кварц грей', 'quartz-grey'], ['Амарок', 'amarok'], ['Сафари', 'safari'],
  ['Беж тёмный', 'dark-beige'], ['Лайт хаки', 'light-khaki'], ['Пула', 'pula'], ['Лайт грей', 'light-grey'],
  ['Кварц', 'quartz'], ['Мисти грин', 'misty-green'], ['Сабон', 'sabon'], ['Смоки', 'smoky'], ['Бордо', 'bordeaux'],
])

export type WardrobeSeries = 'LINE' | 'BASE'

export interface WardrobeCollection {
  id: string
  title: string
  series: WardrobeSeries
  tagline: string
  description: string
  specs: string[]
  /** Подпись под главным фото — как в каталоге */
  caption: string
  hero: string
  gallery: { image: string; alt: string; width: number; height: number }[]
  colors: CatalogItem[]
  paletteNote?: string
}

function gallery(id: string, title: string, sizes: [number, number][]) {
  return sizes.map(([width, height], index) => ({
    image: photo(`${id}-${index + 1}`),
    alt: `Шкаф ${title}: фото ${index + 1}`,
    width,
    height,
  }))
}

const baseNote = 'Однотонные фасады, тыльная сторона фасада — белая. Палитра общая для всей серии BASE.'

export const wardrobeCollections: WardrobeCollection[] = [
  {
    id: 'soft-wood',
    title: 'Soft & Wood',
    series: 'LINE',
    tagline: 'Однотонные цвета и тёплое дерево',
    description:
      'Пять спокойных однотонных цветов и семь декоров дуба. Фасады без ручек открываются за профиль серии LINE, а однотонные и древесные полотна собираются в одну композицию.',
    specs: ['ЛМДФ 16 мм', 'Матовая поверхность', 'Кромка ПВХ 0,8 мм на PUR', 'Двусторонняя ламинация', 'Устойчив к UV'],
    caption: 'Фасады: ЛМДФ Дуб Чарльстон коричневый и Антрацит · Профиль: чёрный матовый',
    hero: photo('soft-wood-hero'),
    gallery: gallery('soft-wood', 'Soft & Wood', [[813, 1400], [1400, 1027], [1400, 644]]),
    colors: softWoodColors,
    paletteNote: 'Кромка ПВХ 0,8 мм на клей PUR со всех сторон деталей.',
  },
  {
    id: 'touch',
    title: 'Touch',
    series: 'LINE',
    tagline: 'Бархатистая поверхность Soft Touch',
    description:
      'Матовые фасады с покрытием Soft Touch — приятные на ощупь и не собирающие отпечатков. Десять цветов: от белого глянца до мяты и морской волны.',
    specs: ['МДФ 18 мм, покрытие PET', 'Soft Touch', 'Не оставляет пятен', 'Устойчив к царапинам', 'Устойчив к UV'],
    caption: 'Фасады: МДФ PET Матовый грейдж · Профиль: чёрный матовый',
    hero: photo('touch-hero'),
    gallery: gallery('touch', 'Touch', [[1136, 1400], [1400, 1035], [814, 1400]]),
    colors: touchColors,
    paletteNote: 'Кромка ПВХ 0,8 мм на клей PUR со всех сторон деталей.',
  },
  {
    id: 'touch-ultra',
    title: 'Touch Ultra',
    series: 'LINE',
    tagline: 'Глубокие «каменные» оттенки',
    description:
      'Шесть сложных природных оттенков — фарфоровый оникс, пепельный аметист, сумрачный нефрит. То же покрытие Soft Touch, ламинация с двух сторон и повышенная стойкость к трещинам.',
    specs: ['МДФ 18 мм, покрытие PET', 'Soft Touch', 'Двусторонняя ламинация', 'Устойчив к трещинам', 'Устойчив к царапинам'],
    caption: 'Фасады: МДФ PET Фарфоровый оникс · Профиль: чёрный матовый · Витрина: стекло графит',
    hero: photo('touch-ultra-hero'),
    gallery: gallery('touch-ultra', 'Touch Ultra', [[1135, 1400], [1400, 1036], [812, 1400]]),
    colors: touchUltraColors,
    paletteNote: 'Кромка ПВХ 0,8 мм на клей PUR со всех сторон деталей.',
  },
  {
    id: 'arco',
    title: 'Arco',
    series: 'BASE',
    tagline: 'Рамочный фасад с фрезеровкой',
    description:
      'Строгая рамка по периметру фасада и фрезерованное полотно. Хорошо держит тёмные цвета — например, Смоки с чёрными ручками и рифлёным стеклом витрины.',
    specs: ['МДФ 19 мм, покрытие PVC', 'Рамочный фасад', 'Матовая поверхность', 'Soft Touch', 'Устойчив к UV'],
    caption: 'Фасады: МДФ PVC Смоки · Ручки: Рик, чёрные матовые · Витрина: стекло структурное',
    hero: photo('arco-hero'),
    gallery: gallery('arco', 'Arco', [[1135, 1400], [1400, 1048], [811, 1400]]),
    colors: baseColors,
    paletteNote: baseNote,
  },
  {
    id: 'garda',
    title: 'Garda',
    series: 'BASE',
    tagline: 'Мягкая классика в пастельных тонах',
    description:
      'Рамочный фасад с тонкой фрезеровкой — спокойная классика, которая не спорит с интерьером. Хороша в спальне и детской: мисти грин, лотос, бежевый.',
    specs: ['МДФ 19 мм, покрытие PVC', 'Рамочный фасад', 'Матовая поверхность', 'Soft Touch', 'Устойчив к UV'],
    caption: 'Фасады: МДФ PVC Мисти грин · Ручки: Поп, чёрные матовые',
    hero: photo('garda-hero'),
    gallery: gallery('garda', 'Garda', [[1135, 1400], [1400, 1033], [812, 1400]]),
    colors: baseColors,
    paletteNote: baseNote,
  },
  {
    id: 'como',
    title: 'Como',
    series: 'BASE',
    tagline: 'Рамка с филёнкой для прихожей и гостиной',
    description:
      'Классическая рамка с утопленной филёнкой в современных цветах. Длинные ручки подчёркивают высоту шкафа — особенно в прихожей.',
    specs: ['МДФ 19 мм, покрытие PVC', 'Рамочный фасад', 'Матовая поверхность', 'Soft Touch', 'Устойчив к UV'],
    caption: 'Фасады: МДФ PVC Лайт хаки · Ручки: Деллон, коричневые',
    hero: photo('como-hero'),
    gallery: gallery('como', 'Como', [[1136, 1400], [1400, 1035], [811, 1400]]),
    colors: baseColors,
    paletteNote: baseNote,
  },
  {
    id: 'flat-velvet',
    title: 'Flat & Velvet',
    series: 'BASE',
    tagline: 'Гладкий или рифлёный фасад',
    description:
      'Flat — чистая гладкая плоскость, Velvet — вертикальные рифлёные линии, в которых цвет выглядит глубже. Их можно сочетать в одном шкафу и дополнять витринами.',
    specs: ['МДФ 19 мм, покрытие PVC', 'Гладкий или рифлёный', 'Матовая поверхность', 'Soft Touch', 'Устойчив к UV'],
    caption: 'Фасады: МДФ PVC Бордо · Ручки: Рик, чёрные матовые · Витрина: стекло графит',
    hero: photo('flat-velvet-hero'),
    gallery: gallery('flat-velvet', 'Flat & Velvet', [[814, 1400], [1400, 1038], [1400, 1038]]),
    colors: baseColors,
    paletteNote: baseNote,
  },
]

/** Витрины Vetrine — стеклянные двери к любой коллекции */
export const vetrine = {
  id: 'vetrine',
  title: 'Vetrine',
  tagline: 'Стеклянные двери в алюминиевой рамке',
  description:
    'Витрины вставляются в шкаф любой коллекции: открытая подсвеченная секция для книг, посуды или одежды разбивает сплошную плоскость фасадов.',
  caption: 'Фасады: Flat & Velvet, МДФ PVC Кварц грей · Витрина: чёрный профиль, стекло прозрачное',
  hero: photo('vetrine-hero'),
  gallery: gallery('vetrine', 'Vetrine', [[814, 1400], [1400, 1002], [1400, 1035]]),
  options: [
    { title: 'Алюминиевая рамка', values: ['Чёрный', 'Латунь', 'Серебро', 'Белый'] },
    { title: 'Гладкое стекло', values: ['Прозрачное', 'Сатин', 'Графит', 'Бронза'] },
    { title: 'Структурное стекло', values: ['Прозрачное'] },
  ],
}

/** Две серии — главное, чем шкафы отличаются друг от друга */
export const wardrobeSeries = [
  {
    id: 'LINE' as const,
    title: 'Серия LINE',
    description: 'Без ручек: фасады открываются за алюминиевый профиль. Цельная плоскость, минимализм.',
    collections: ['Soft & Wood', 'Touch', 'Touch Ultra'],
    detail: 'Профиль длиной 3000 мм: чёрный матовый, графит матовый, алюминий брашированный, золото матовое, белый',
  },
  {
    id: 'BASE' as const,
    title: 'Серия BASE',
    description: 'С ручками: рамочные, гладкие и рифлёные фасады МДФ в общей палитре из 14 цветов.',
    collections: ['Arco', 'Garda', 'Como', 'Flat & Velvet'],
    detail: 'Пять коллекций ручек: Рик, Контур, Деллон, Рок, Поп — в чёрном, золоте, хроме, никеле',
  },
]

export const wardrobeRooms = [
  { title: 'Гостиная', image: photo('room-living'), note: 'Soft & Wood: Дуб Чарльстон коричневый и Антрацит' },
  { title: 'Спальня', image: photo('room-bedroom'), note: 'Garda: Мисти грин, Soft & Wood: Дуб Каселла' },
  { title: 'Прихожая', image: photo('room-hall'), note: 'Como: Лайт хаки' },
]

export const wardrobeHighlights = [
  { title: 'Размеры под помещение', text: 'Индивидуальные размеры без переплаты за нестандарт: шкаф встаёт в нишу, под скос и до потолка.' },
  { title: 'Свой дизайн', text: 'Фасады разных коллекций сочетаются в одном шкафу — дерево, однотонные цвета и стекло.' },
  { title: '50+ вариантов наполнения', text: 'Полки, ящики, штанги, брючницы и сетки для обуви — внутри всё под ваши вещи.' },
]

export interface WardrobeSpecGroup {
  id: string
  title: string
  image: string
  items: { name: string; detail: string }[]
}

export const wardrobeSpecs: WardrobeSpecGroup[] = [
  {
    id: 'corpus',
    title: 'Корпус',
    image: photo('corpus'),
    items: [
      { name: 'ЛМДФ', detail: 'Высокая прочность, однородная структура, устойчивость к влаге, гладкая поверхность' },
      { name: 'Кромка', detail: 'Торцы закромлены со всех сторон кромкой ПВХ 0,4 мм на PUR' },
      { name: 'Декоры корпуса', detail: '12 цветов — те же, что у фасадов Soft & Wood' },
    ],
  },
  {
    id: 'filling',
    title: 'Наполнение',
    image: photo('filling-1'),
    items: [
      { name: 'Выдвижные ящики', detail: 'Высота 100, 175 или 275 мм, ширина 300–1000 мм' },
      { name: 'Полки', detail: 'Ширина 200–1200 мм' },
      { name: 'Штанга с демпфером', detail: '3000 × 15 × 30 мм · чёрный, золото, хром, бронза' },
      { name: 'Выдвижные торцевые штанги', detail: 'Гридли 300–450 мм · чёрный, хром' },
      { name: 'Брючница', detail: '500–900 мм · чёрный, графит' },
      { name: 'Сетка для обуви', detail: 'Ширина до 3000 мм, глубина 400 мм' },
      { name: 'Карниз и добор', detail: 'Карниз высотой 60–200 мм и длиной до 2400 мм, добор шириной 60–200 мм' },
    ],
  },
  {
    id: 'hardware',
    title: 'Фурнитура',
    image: photo('hardware'),
    items: [
      { name: 'Петли с доводчиком', detail: 'Накладные: Talisman (антрацит) или Blum (серый)' },
      { name: 'Направляющие скрытого монтажа', detail: 'Talisman (антрацит) или Blum TANDEM plus BLUMOTION (сталь)' },
      { name: 'Регулируемые опоры', detail: 'Integrato Tech Z: высота 7 мм с регулировкой до 10 мм' },
    ],
  },
  {
    id: 'lighting',
    title: 'Подсветка',
    image: photo('lighting'),
    items: [
      { name: 'Врезная LED-подсветка', detail: 'Корпус чёрный, хром, золото или белый' },
      { name: 'Рассеиватель', detail: 'Матовый или прозрачный' },
      { name: 'Выключатель', detail: 'Сенсорный или врезной' },
    ],
  },
  {
    id: 'handles',
    title: 'Ручки',
    image: photo('handles'),
    items: [
      { name: 'Рик', detail: '320, 512, 864 мм · чёрный матовый, сатиновое золото, хром, серый' },
      { name: 'Контур', detail: '224, 512, 960 мм · чёрный матовый, сатиновое золото' },
      { name: 'Деллон', detail: '320, 480, 960 мм · чёрный матовый, золото, коричневый, серый' },
      { name: 'Рок', detail: 'от 128 до 1088 мм · чёрный, золото, хром, атласный никель' },
      { name: 'Поп', detail: 'Кнопка ⌀ 20 мм · чёрный, золото, хром, атласный никель' },
    ],
  },
]

/**
 * Выдвижное наполнение шкафа — отбор из каталога поставщика наполнения:
 * по одной позиции на задачу. Размеры из его каталога, фото из его
 * фотобанка, подогнаны к 4:3 (public/catalog/storage/wardrobe).
 */
export const wardrobeStorage: CatalogItem[] = [
  { name: 'Пантограф', meta: 'Лифт для одежды · секция 600–800 или 800–1000 мм', image: '/catalog/storage/wardrobe/lift-10002.webp' },
  { name: 'Выдвижная брючница', meta: 'Секция 600, 700, 800 мм · перекладины с силиконом', image: '/catalog/storage/wardrobe/trousers-10756.webp' },
  { name: 'Выдвижная корзина', meta: 'Секция 600, 700, 800, 900 мм', image: '/catalog/storage/wardrobe/basket-10056.webp' },
  { name: 'Полка для обуви', meta: 'Секция 600, 700, 800 мм · площадка из нержавеющей стали', image: '/catalog/storage/wardrobe/shoes-10556.webp' },
  { name: 'Выдвижное зеркало', meta: 'Высота 1200 мм · поворачивается для обзора', image: '/catalog/storage/wardrobe/mirror-10001.webp' },
  { name: 'Гладильная доска', meta: 'Секция от 600 мм · складывается пополам', image: '/catalog/storage/wardrobe/ironing-10b01w.webp' },
]

/** Высоты шкафа: корпус 2200 или 2400 мм плюс антресоль 350–600 мм */
export const wardrobeHeights = [
  { base: 2200, mezzanines: [350, 400, 450, 500, 550, 600] },
  { base: 2400, mezzanines: [350, 400, 450, 500, 550, 600] },
]

export const wardrobeSchemes = [
  { title: 'Высота 2200 мм', images: [photo('sections-2200-1'), photo('sections-2200-2')] },
  { title: 'Высота 2400 мм', images: [photo('sections-2400-1'), photo('sections-2400-2')] },
]

export const wardrobeCover = photo('cover')
