// Данные каталога производства «Модуль Эстет» (извлечены из PDF-каталога, 43 стр.)
// Полное извлечение — см. catalog-extract.md в корне проекта.

export type CollectionColor = {
  name: string
  hex: string
}

export type FacadeCollection = {
  id: string
  name: string
  tag: string
  description: string
  spec: string
  image: string
  imageAlt: string
  colors: CollectionColor[]
}

// Общая палитра PVC-фасадов (стр.12/15/18/20 каталога)
const pvcColors: CollectionColor[] = [
  { name: 'Белый Снег', hex: '#fbfbf8' },
  { name: 'Беж', hex: '#d5c8b3' },
  { name: 'Ивори', hex: '#f5eedb' },
  { name: 'Амарок', hex: '#b2aa96' },
  { name: 'Грей', hex: '#46413d' },
  { name: 'Маренго', hex: '#5b6773' },
  { name: 'Серо-бежевый', hex: '#a89d90' },
  { name: 'Лайт Хаки', hex: '#7c8046' },
  { name: 'Темно-серый', hex: '#343330' },
  { name: 'Лайт грей', hex: '#8b8d8a' },
  { name: 'Какао', hex: '#a98d72' },
  { name: 'Бордо', hex: '#7d3040' },
]

export const facadeCollections: FacadeCollection[] = [
  {
    id: 'soft-wood',
    name: 'SOFT & WOOD',
    tag: 'МДФ · однотон и дерево',
    description:
      'Однотонные фасады и композиции с текстурой дерева. Тёплые нейтральные оттенки в сочетании с дубом — базовая линейка производства.',
    spec: 'Толщина 16 мм · кромка ПВХ 0,8 мм на PUR со всех сторон',
    image: '/images/collections/soft-wood.webp',
    imageAlt: 'Кухня SOFT & WOOD: кремовые фасады с дубовыми верхними шкафами и чёрной столешницей',
    colors: [
      { name: 'Белый', hex: '#f4f3ee' },
      { name: 'Кашемир', hex: '#cfc5b8' },
      { name: 'Серый Камень', hex: '#b9bec1' },
      { name: 'Антрацит', hex: '#3b3e41' },
      { name: 'Сатин', hex: '#d9cfc6' },
      { name: 'Дуб Каселла Натуральный', hex: '#c89e68' },
      { name: 'Дуб Каселла Коричневый', hex: '#795536' },
      { name: 'Дуб Крафт Золотой', hex: '#c09a60' },
      { name: 'Дуб Крафт Табачный', hex: '#8a6947' },
      { name: 'Дуб Сторсунд', hex: '#d3b78a' },
    ],
  },
  {
    id: 'touch',
    name: 'TOUCH',
    tag: 'МДФ · Soft Touch',
    description:
      'Однотонные фасады Soft Touch с бархатисто-матовой поверхностью и скруглёнными по контуру торцами. Приятны на ощупь и практичны ежедневно.',
    spec: 'Толщина 18 мм · торцы закруглены, кромка ПВХ 0,8 мм на PUR · тыльная сторона белая',
    image: '/images/collections/touch.webp',
    imageAlt: 'Кухня TOUCH: белые матовые фасады Soft Touch со светлой столешницей',
    colors: [
      { name: 'Белый', hex: '#f2f2f0' },
      { name: 'Белый глянец', hex: '#ffffff' },
      { name: 'Темно-серый', hex: '#4a4d50' },
      { name: 'Серый шторм', hex: '#75726d' },
      { name: 'Новый серый', hex: '#b3aa9e' },
      { name: 'Светло-серый', hex: '#d6d4cd' },
      { name: 'Крем', hex: '#f4ecd8' },
      { name: 'Вижен', hex: '#cbb59a' },
      { name: 'Мята', hex: '#7fa08a' },
      { name: 'Волна', hex: '#7d94a5' },
    ],
  },
  {
    id: 'flat',
    name: 'FLAT',
    tag: 'PVC · гладкий',
    description:
      'Однотонные фасады PVC с ровной гладкой поверхностью. Лаконичная основа для современных кухонь без ручек и с профилем.',
    spec: 'Фасады PVC · тыльная сторона белая',
    image: '/images/collections/flat.webp',
    imageAlt: 'Кухня FLAT: кремовые гладкие фасады со встроенной техникой',
    colors: pvcColors,
  },
  {
    id: 'velvet',
    name: 'VELVET',
    tag: 'PVC · рифлёный',
    description:
      'Фасады PVC с вертикальной рифлёной фрезеровкой в палитре FLAT. Ритм фактуры делает кухню выразительной даже в одном цвете.',
    spec: 'Фасады PVC, рифлёная поверхность · тыльная сторона белая',
    image: '/images/collections/velvet.webp',
    imageAlt: 'Кухня VELVET: тёмные рифлёные верхние фасады и кремовые гладкие нижние',
    colors: pvcColors,
  },
  {
    id: 'como',
    name: 'COMO',
    tag: 'PVC · рамочный',
    description:
      'Рамочные фасады PVC с классической филёнкой в современной палитре. Спокойная геометрия для неоклассики и мягкого минимализма.',
    spec: 'Рамочные фасады PVC · тыльная сторона белая',
    image: '/images/collections/como.webp',
    imageAlt: 'Кухня COMO: белые рамочные фасады с графитовыми верхними шкафами',
    colors: pvcColors,
  },
  {
    id: 'garda',
    name: 'GARDA',
    tag: 'PVC · рамочный',
    description:
      'Рамочные фасады с гладким полотном по периметру рамки. Сочетаются с верхними шкафами под дерево — как в фирменных проектах каталога.',
    spec: 'Рамочные фасады PVC · тыльная сторона белая',
    image: '/images/collections/garda.webp',
    imageAlt: 'Кухня GARDA: кремовые рамочные фасады с дубовыми верхними шкафами',
    colors: pvcColors,
  },
]

// Декоры корпуса МДФ (стр.4 каталога) — кромка ПВХ 0,4 мм на PUR
export const mdfFrameDecors: CollectionColor[] = [
  { name: 'Белый', hex: '#f6f5f1' },
  { name: 'Кашемир', hex: '#cfc5b8' },
  { name: 'Серый Камень', hex: '#b9bec1' },
  { name: 'Антрацит', hex: '#3b3e41' },
  { name: 'Сатин', hex: '#d9cfc6' },
  { name: 'Дуб Каселла Натуральный', hex: '#c89e68' },
  { name: 'Дуб Каселла Коричневый', hex: '#795536' },
  { name: 'Дуб Крафт Золотой', hex: '#c09a60' },
  { name: 'Дуб Крафт Табачный', hex: '#8a6947' },
  { name: 'Дуб Сторсунд', hex: '#d3b78a' },
]

// ── Фурнитура (стр.27–43 каталога) ─────────────────────────────────────────

export type HardwareItem = {
  name: string
  detail: string
}

export type HardwareGroup = {
  title: string
  summary: string
  items: HardwareItem[]
}

export const hardwareGroups: HardwareGroup[] = [
  {
    title: 'Петли и ящики',
    summary: 'Базовая механика с доводчиками — тихое закрывание на каждом фасаде и ящике.',
    items: [
      { name: 'Петли Talisman', detail: 'базовое решение, с доводчиком' },
      { name: 'Петли Blum', detail: 'премиальный вариант по запросу' },
      { name: 'Ящики 500 мм', detail: 'для нижних шкафов глубиной 530 мм' },
      { name: 'Ящики 300 мм', detail: 'для узких шкафов глубиной 330 мм' },
    ],
  },
  {
    title: 'Подъёмники',
    summary: 'Откидные механизмы для верхних фасадов — дверцы уходят вверх и остаются открытыми.',
    items: [{ name: 'TOP-STAYS SE', detail: 'подъёмный механизм для антресолей и верхних шкафов' }],
  },
  {
    title: 'Ручки MONTE',
    summary: 'Минималистичные торцевые ручки-скобы над фасадами и длинные рейлинги.',
    items: [
      { name: 'MONCE торцевая 16 мм', detail: 'чёрный матовый · золото сатиновое · сатиновый хром · белый' },
      { name: 'MONTE рейлинг 128/900 мм', detail: 'те же четыре отделки' },
      { name: 'Рейлинг круглый', detail: 'чёрный матовый и матовый хром 160/192/224/256 мм · золото брашированное 160/192/224 мм' },
    ],
  },
  {
    title: 'Ручки-скобы QUADRA',
    summary: 'Квадратный профиль скобы — строгая геометрия под современные фасады.',
    items: [
      { name: 'QUADRA', detail: 'золото матовое брашированное или чёрный матовый · длины 160/190/256 мм' },
    ],
  },
  {
    title: 'Неоклассика',
    summary: 'Литые ручки в чёрном матовом цвете для рамочных коллекций COMO и GARDA.',
    items: [
      { name: 'UNICA', detail: 'круглая кнопка' },
      { name: 'ANCHOR', detail: 'Т-образная ручка' },
      { name: 'OLSEN', detail: 'грибок и скоба 128 мм' },
    ],
  },
  {
    title: 'Профиль LINE',
    summary: 'Алюминиевый профиль-ручка вместо верхнего ряда фасадов и профиль-ручка 320 мм на фасады.',
    items: [
      { name: 'Профиль LINE', detail: 'серебро · чёрный · латунь · белый' },
      { name: 'Профиль-ручка 320 мм', detail: 'чёрный матовый · золото матовое · графит' },
    ],
  },
  {
    title: 'Подсветка',
    summary: 'Накладная LED-подсветка рабочей зоны под навесными шкафами.',
    items: [{ name: 'LED накладная', detail: 'цвета: золото · чёрный · белый · серебро' }],
  },
  {
    title: 'Наполнение',
    summary: 'Проверенные системы хранения и сушки под размеры модулей каталога.',
    items: [
      { name: 'Сушки Boyard Su03', detail: 'ширины 400–900 мм' },
      { name: 'Лотки AQ Tray', detail: 'ширины 400/450/500/600/700/800/900 мм' },
      { name: 'Волшебный уголок', detail: 'поворотная полка с доводчиком, антрацит' },
      { name: 'Бутылочница', detail: 'антрацит, ширина 150 мм' },
    ],
  },
]

// ── Конструкция модулей (стр.26–35 каталога) ───────────────────────────────

export type ConstructionSpec = {
  title: string
  rows: { label: string; value: string }[]
}

export const constructionSpecs: ConstructionSpec[] = [
  {
    title: 'Нижние шкафы',
    rows: [
      { label: 'Высота каркаса — с ручками', value: '720 мм' },
      { label: 'Высота каркаса — с профилем LINE', value: '780 мм' },
      { label: 'Глубина каркаса', value: '530 / 330 мм' },
      { label: 'Длина ящиков', value: '500 / 300 мм' },
      { label: 'Открытие верхних шкафов', value: 'ручки, толкатели или зазор LINE' },
    ],
  },
  {
    title: 'Верхние шкафы',
    rows: [
      { label: 'Глубина каркаса', value: '320 мм (ХДФ в паз)' },
      { label: 'Высота каркаса', value: '720 / 960 мм' },
      { label: 'Отступ задней стенки', value: '16 мм' },
      { label: 'Исполнение LINE', value: 'дно меньше на 20 мм — зазор для захвата рукой' },
    ],
  },
  {
    title: 'Антресоли',
    rows: [
      { label: 'Глубина каркаса', value: '570 мм (ХДФ в паз)' },
      { label: 'Высота каркаса', value: '360 / 480 мм' },
      { label: 'Отступ задней стенки', value: '16 мм' },
      { label: 'Дно', value: 'вкладное — видны торцы боковин' },
    ],
  },
  {
    title: 'Пеналы',
    rows: [
      { label: 'Глубина каркаса', value: '570 / 370 мм (ХДФ в паз)' },
      { label: 'Отступ задней стенки', value: '46 мм' },
      { label: 'Ящики', value: '500 мм — каркас 530 · 300 мм — каркас 330' },
      { label: 'Ниша под встраиваемую технику', value: 'от 717 мм по высоте' },
    ],
  },
]

export const countertopSpecs = {
  title: 'Столешницы SLOTEX',
  rows: [
    { label: 'Прямая столешница', value: '3000 × 600 × 40 мм' },
    { label: 'Составная со скруглением', value: '4150 × 600 × 40 мм' },
    { label: 'Стеновая панель', value: 'толщина 10 мм' },
    { label: 'Свес спереди за каркасами', value: '30 мм — единый стандарт для ручек и профиля' },
    { label: 'Декоры', value: '19 расцветок: однотонные, камень и мрамор, дерево' },
  ],
}

// ── Сравнение двух линий нижних шкафов ─────────────────────────────────────

export type LineComparisonRow = {
  parameter: string
  handles: string
  line: string
}

export const lineComparison: LineComparisonRow[] = [
  { parameter: 'Высота каркаса', handles: '720 мм', line: '780 мм' },
  { parameter: 'Глубина каркаса', handles: '530 / 330 мм', line: '530 / 330 мм' },
  { parameter: 'Ящики', handles: '500 / 300 мм', line: '500 / 300 мм' },
  { parameter: 'Верхний ряд фасадов', handles: 'фасад с ручкой или толкателем', line: 'профиль LINE по всей длине' },
  { parameter: 'Навесной шкаф', handles: 'стандартное дно', line: 'дно −20 мм, зазор за фасадом' },
]
