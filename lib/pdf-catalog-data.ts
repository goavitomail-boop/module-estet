export type CatalogItem = { name: string; image: string; meta?: string }
export type CatalogGroup = { id: string; eyebrow: string; title: string; description: string; hero?: string; gallery?: { image: string; alt: string }[]; items?: CatalogItem[]; specs?: string[]; layout?: 'swatches'; shape?: string; paletteNote?: string }

const slotexNames = [
  ['Black Slate','2333/Q','black-slate'],['Arcola','8144/Pt','arcola'],['Verona','2927/Q','verona'],['Calacatta Oro','8115/Pt','calacatta-oro'],['Calacatta Bianco','8251/Pt','calacatta-bianco'],
  ['Black','1021/Q','black'],['Ankara Marble','2343/A','ankara-marble'],['Venice','0081/A','venice'],['Quartzite','8099/Bst','quartzite'],['White','1111/S','white'],
  ['Corinfos','8299/Bst','corinfos'],['Silver Marble','6035/SL','silver-marble'],['Naples','2926/A','naples'],['Pattaya','2324/Bst','pattaya'],['Dominicana','5023/Pt','dominicana'],
  ['Moon Stone','8453/Pt','moon-stone'],['Phantom marble','8125/Pt','phantom-marble'],['Breccia light','2238/Pt','breccia-light'],['Vasto','8285/Pt','vasto'],
  ['Indian Rosewood','3247/P','indian-rosewood'],['Bunratty Oak','3829/Nw','bunratty-oak'],['Marino','2631/7','marino'],['Carpenter Oak dark','7122/Nw','carpenter-oak-dark'],
] as const

/**
 * Коллекции фасадов — по каталогу производства (PDF Kitch&Go, слайды 5–20).
 * Картинки лежат в public/catalog: обложки и фото — collections/, образцы
 * цвета — facades/<коллекция>/. Образцы вырезаны из самого каталога.
 */
const pvcColors = [
  ['Белый Снег', 'white-snow'], ['Беж', 'beige'], ['Ивори', 'ivory'], ['Амарок', 'amarok'],
  ['Серо-бежевый', 'grey-beige'], ['Лайт Хаки', 'light-khaki'], ['Темно-серый', 'dark-grey'], ['Лайт грей', 'light-grey'],
  ['Маренго', 'marengo'], ['Бордо', 'bordeaux'], ['Какао', 'cacao'], ['Грей', 'grey'],
] as const

const softWoodColors = [
  ['Белый', 'white'], ['Кашемир', 'cashmere'], ['Серый Камень', 'grey-stone'], ['Антрацит', 'anthracite'], ['Сатин', 'satin'],
  ['Дуб Каселла Натуральный', 'oak-kasella-natural'], ['Дуб Каселла Коричневый', 'oak-kasella-brown'], ['Дуб Крафт Золотой', 'oak-craft-gold'],
  ['Дуб Крафт Табачный', 'oak-craft-tobacco'], ['Дуб Сторсунд', 'oak-storsund'],
] as const

const touchColors = [
  ['Белый', 'white'], ['Белый глянец', 'white-gloss'], ['Темно-серый', 'dark-grey'], ['Серый шторм', 'storm-grey'], ['Новый серый', 'new-grey'],
  ['Светло-серый', 'light-grey'], ['Крем', 'cream'], ['Вижен', 'vizhen'], ['Мята', 'mint'], ['Волна', 'wave'],
] as const

function collection(
  slug: string,
  title: string,
  eyebrow: string,
  description: string,
  specs: string[],
  colors: readonly (readonly [string, string])[],
  photos: number,
  /** Подпись под палитрой — дословно со слайда «Цвета …» */
  paletteNote: string,
  /** Форма фасада со слайда «Цвета …»: есть у Velvet, Como и Garda */
  hasShape = false,
): CatalogGroup {
  return {
    id: slug,
    title,
    eyebrow,
    description,
    specs,
    paletteNote,
    shape: hasShape ? `/catalog/facades/${slug}/shape.webp` : undefined,
    hero: `/catalog/collections/${slug}-hero.webp`,
    gallery: Array.from({ length: photos }, (_, index) => ({
      image: `/catalog/collections/${slug}-${index + 1}.webp`,
      alt: `Коллекция ${title}: пример кухни, фото ${index + 1}`,
    })),
    layout: 'swatches',
    items: colors.map(([name, file]) => ({ name, image: `/catalog/facades/${slug}/${file}.webp` })),
  }
}

export const collections: CatalogGroup[] = [
  collection(
    'soft-wood',
    'Soft & Wood',
    'Однотонные фасады и композиции с текстурой дерева',
    'Пять спокойных однотонных цветов и пять декоров дуба. Однотонные фасады и текстура дерева собираются в одну композицию.',
    ['Фасад 16 мм', 'Торцы: кромка ПВХ 0,8 мм на PUR', '10 декоров'],
    softWoodColors,
    3,
    'Торцы деталей закромлены со всех сторон кромкой ПВХ 0,8 мм на PUR, 16 мм',
  ),
  collection(
    'touch',
    'Touch',
    'Однотонные фасады Soft Touch',
    'Однотонные фасады с покрытием Soft Touch — поверхность, приятная на ощупь. В палитре десять цветов, включая белый глянец.',
    ['Фасад 18 мм', 'Торцы: кромка ПВХ 0,8 мм на PUR', 'Тыльная сторона — белая', '10 цветов'],
    touchColors,
    3,
    'Торцы деталей закромлены со всех сторон кромкой ПВХ 0,8 мм на PUR, 18 мм. Тыльная сторона фасада — белая',
  ),
  collection(
    'flat',
    'Flat',
    'Однотонные фасады PVC',
    'Лаконичная гладкая плоскость без рельефа и рамок — фасад PVC в двенадцати цветах.',
    ['Фасад PVC', 'Тыльная сторона — белая', '12 цветов'],
    pvcColors,
    0,
    'Тыльная сторона фасада — белая',
  ),
  collection(
    'velvet',
    'Velvet',
    'Однотонные фасады PVC',
    'Рельефная поверхность с вертикальными линиями: тот же цвет выглядит глубже и объёмнее. Двенадцать цветов PVC.',
    ['Фасад PVC', 'Рельефная поверхность', 'Тыльная сторона — белая', '12 цветов'],
    pvcColors,
    3,
    'Тыльная сторона фасада — белая',
    true,
  ),
  collection(
    'como',
    'Como',
    'Однотонные фасады PVC',
    'Фасад с рамкой и утопленной филёнкой — классическая форма в современных цветах. Двенадцать цветов PVC.',
    ['Фасад PVC', 'Рамочный фасад с филёнкой', 'Тыльная сторона — белая', '12 цветов'],
    pvcColors,
    3,
    'Тыльная сторона фасада — белая',
    true,
  ),
  collection(
    'garda',
    'Garda',
    'Однотонные фасады PVC',
    'Рамочный фасад с тонким профилем по периметру. Двенадцать цветов PVC.',
    ['Фасад PVC', 'Рамочный фасад', 'Тыльная сторона — белая', '12 цветов'],
    pvcColors,
    0,
    'Тыльная сторона фасада — белая',
    true,
  ),
]

/** Цвета алюминиевой рамки витрин и профиля LINE — один набор (слайды 21 и 23) */
const frameColors: CatalogItem[] = [
  ['Серебро', 'silver'], ['Чёрный', 'black'], ['Латунь', 'brass'], ['Белый', 'white'],
].map(([name, file]) => ({ name, image: `/catalog/facades/frame/${file}.webp` }))

export type FacadeOptions = {
  label: string
  items: CatalogItem[]
  shape?: string
  note?: string
  /** Коллекция на странице «Коллекции» — для ссылки на фото кухонь */
  collectionId?: string
}

/**
 * Цвета к позиции страницы «Фасады». Позиции ведутся из панели, палитры —
 * из каталога производства, связаны они по названию позиции. Переименовали
 * позицию в панели так, что связь потерялась, — карточка просто покажется
 * без палитры.
 */
export function facadeOptionsFor(name: string): FacadeOptions | null {
  const key = name.trim().toLowerCase()
  const match = collections.find((collection) => collection.title.toLowerCase() === key)
  if (match?.items) {
    return {
      label: 'Цвета и декоры',
      items: match.items,
      shape: match.shape,
      note: match.paletteNote,
      collectionId: match.id,
    }
  }
  // Стекло и профили C/L уже названы в описании позиции — здесь только цвета
  if (key.includes('витрин')) return { label: 'Цвет рамки', items: frameColors }
  if (key.includes('line')) return { label: 'Цвет профиля', items: frameColors }
  return null
}

/** Декоры SLOTEX: название, артикул и фото образца — для схем, где нужен только этот список */
export const slotexDecors: CatalogItem[] = slotexNames.map(([name, meta, slug]) => ({ name, meta, image: `/catalog/materials/slotex/${slug}.webp` }))

const mdfBodyDecors = [
  'Белый',
  'Кашемир',
  'Серый Камень',
  'Антрацит',
  'Сатин',
  'Дуб Каселла Натуральный',
  'Дуб Каселла Коричневый',
  'Дуб Крафт Золотой',
  'Дуб Крафт Табачный',
  'Дуб Сторсунд',
].map((name, index) => ({ name, image: `/catalog/materials/mdf/${index + 1}.webp` }))

export const materials: CatalogGroup[] = [
  {
    id: 'body',
    eyebrow: 'Основа кухни',
    title: 'Корпус МДФ',
    description: 'Корпус — МДФ. Выберите один из десяти однотонных и древесных декоров.',
    specs: ['Торцы деталей закромлены кромкой со всех сторон 0,4 мм на PUR'],
    layout: 'swatches',
    items: mdfBodyDecors,
  },
  { id:'line', eyebrow:'Система без ручек', title:'Профиль LINE', description:'Профили C и L для нижних баз.', specs:['Серебро','Чёрный','Латунь','Белый'] },
  { id:'glass', eyebrow:'Стекло и алюминий', title:'Витрины', description:'Алюминиевая рамка и четыре варианта стекла.', specs:['Рамы: серебро, чёрный, латунь, белый','Стекло: прозрачное, сатин, графит, бронза'] },
  { id:'slotex', eyebrow:'Столешницы и стеновые панели', title:'SLOTEX', description:'Оригинальные фрагменты всех 23 декоров из каталога.', specs:['Столешница: 3000×600×40 / 4150×600×40 мм','Стеновая панель: 3000×600×10 / 4150×600×10 мм'], items:slotexNames.map(([name,meta,slug])=>({name,meta,image:`/catalog/materials/slotex/${slug}.webp`})) },
]

export const filling: CatalogGroup[] = [
  {
    id: 'lighting',
    eyebrow: 'Освещение',
    title: 'Накладная LED-подсветка',
    description: 'Устанавливается под навесными шкафами для равномерной и мягкой подсветки рабочей поверхности.',
    items: [
      { name: 'Серебро', image: '/catalog/hardware/lighting/silver.webp' },
      { name: 'Белый', image: '/catalog/hardware/lighting/white.webp' },
      { name: 'Чёрный', image: '/catalog/hardware/lighting/black.webp' },
      { name: 'Золото', image: '/catalog/hardware/lighting/gold.webp' },
    ],
  },
]

/**
 * Выдвижные системы хранения для кухни — отбор из каталога поставщика
 * наполнения: по одной позиции на задачу. Размеры и материалы из его
 * каталога, фото из его фотобанка, подогнаны к кадру карточки 20:17;
 * схема механизма к каждой — components/storage-scene.tsx.
 */
export const kitchenStorage: CatalogItem[] = [
  { name: 'Бутылочница 6033', meta: 'Фасад 150 мм · хромированная сталь', image: '/catalog/storage/kitchen/bottle-6033.webp' },
  { name: 'Корзина-сушка 4646', meta: 'Фасад 600, 700, 800, 900 мм · поддон и лоток для приборов', image: '/catalog/storage/kitchen/dryer-4646.webp' },
  { name: 'Волшебный уголок 6022', meta: 'Угловой модуль 800–900 мм · четыре корзины', image: '/catalog/storage/kitchen/corner-6022.webp' },
  { name: 'Выдвижная колонна 4862-64', meta: 'Фасад 300, 400, 450 мм · высота 1850–2200 мм · 6 уровней', image: '/catalog/storage/kitchen/column-4862.webp' },
  { name: 'Корзина в верхний модуль 6095', meta: 'Фасад 600–900 мм · стекло и алюминий · пневмомеханизм', image: '/catalog/storage/kitchen/upper-6095.webp' },
  { name: 'Система утилизации 6156', meta: 'Фасад 300 мм · два отсека по 10 л', image: '/catalog/storage/kitchen/waste-6156.webp' },
]

export const handles: CatalogItem[] = [
  { name: 'MONTE белый', meta: 'Торцевая ручка · 16 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4-0pwfMHWYzCyFMRSSzWe2Cgy29PWnX3.webp' },
  { name: 'MONTE золото сатиновое', meta: 'Торцевая ручка · 16 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2-RUjin6aFX0DqaK9HmN7uWB12yVBA0Y.webp' },
  { name: 'MONTE чёрный матовый', meta: 'Торцевая ручка · 16 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1-Y3jMq7xKZ3nIGbKwxWt8Ku1qtIgVaQ.webp' },
  { name: 'MONTE сатиновый хром', meta: 'Торцевая ручка · 16 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3-LLJGd6JEp7oRzFY8c07gu6vPRxIVU5.webp' },
  { name: 'MONTE белый', meta: 'Торцевая ручка · 128 / 900 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/8-MDa5FrIpOpiFfsvZH7g265YhEFZMXl.webp' },
  { name: 'MONTE золото сатиновое', meta: 'Торцевая ручка · 128 / 900 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/6-mOz9O8PklE2sbe8tEM41XytKjjo4jj.webp' },
  { name: 'MONTE чёрный матовый', meta: 'Торцевая ручка · 128 / 900 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/5-MNj8vRVw2Wj9xi7SeQxx3m8NAsvuur.webp' },
  { name: 'MONTE сатиновый хром', meta: 'Торцевая ручка · 128 / 900 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/7-gQ8lKffC5UfomPHsrHfJEwbzCj2PDo.webp' },
]

export const neoclassicalHandles: CatalogItem[] = [
  { name: 'UNICA чёрный матовый', meta: 'Ручка-кнопка · Неоклассика', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1-jNyEeq5XUYRCvBT73eYP1pFrRnieQs.webp' },
  { name: 'ANCHOR чёрный матовый', meta: 'Ручка-скоба · Неоклассика', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2-AHqWsszQledRnBQ6n2sO0hh2kPeGoI.webp' },
  { name: 'OLSEN чёрный матовый', meta: 'Ручка-кнопка · Неоклассика', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3-6cYfm71NExujshP9sHOIJnqe5UicaY.webp' },
  { name: 'OLSEN скоба чёрный матовый', meta: 'Ручка-скоба · 128 мм · Неоклассика', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4-BLcZvJErF1CcNpyx2ZPNZFHGvCxE9X.webp' },
]

export const bracketHandles: CatalogItem[] = [
  { name: 'QUADRA чёрный матовый', meta: 'Ручка-скоба · 160, 190, 256 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2-6PSI3uQpi8koDwf7QbXOz0HrY0KQq3.webp' },
  { name: 'QUADRA золото матовое брашированное', meta: 'Ручка-скоба · 160, 190, 256 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1-UIW8vT2M2npKepNBJVeMjVR2pnoWGb.webp' },
]

export const profileHandles: CatalogItem[] = [
  { name: 'Профиль-ручка графит', meta: 'Профиль · 320 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3-ldPIgDZzOFX2ThmgJA7gbN2XS4u3Ye.webp' },
  { name: 'Профиль-ручка чёрный матовый', meta: 'Профиль · 320 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1-0t2meDnohfWbMGuK4z4tuvpzWrCLyS.webp' },
  { name: 'Профиль-ручка золото матовое', meta: 'Профиль · 320 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2-Jw30d8P7StTXaLmvOBo515lWsSZKg4.webp' },
]

export const railings: CatalogItem[] = [
  { name: 'Рейлинг чёрный матовый', meta: '160, 192, 224, 256 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1-WL6GecReJ7uoKhgVKZnpibDjJaZODS.webp' },
  { name: 'Рейлинг золото брашированное', meta: '160, 192, 224 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2-72fXF0oWilDXQOH6J0pNxtZYEWxrtH.webp' },
  { name: 'Рейлинг матовый хром', meta: '160, 192, 224, 256 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3-GEGvbsy0uhBwd3bomcYDmnzrBTQm9Z.webp' },
]

export const dryers: CatalogItem[] = [
  { name: 'Boayrd Su03', meta: '400–900 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1-kyxCgoQ0dnjrHtq89lKhUhKUKrrP3S.webp' },
]

export const trays: CatalogItem[] = [
  { name: 'Поток AQ Tray', meta: '400/450/500/600/700/800/900 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2-EBKL5IM9IbSi6hEVB9sPlL5cPTKzVK.webp' },
]

export const hardware: CatalogItem[] = [
  { name: 'Петли с доводчиком', meta: 'Петли для фасадов с плавным закрыванием', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1-DrmJeQaizAN4mdwf3ngjq8wuMoRwbY.webp' },
  { name: 'Стандартный ящик', meta: 'Выдвижной ящик для хранения', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2-t5gXbW7VRFHpUzU786kULXktQpLp1d.webp' },
  { name: 'Ящик с рейлингом', meta: 'Выдвижной ящик с боковым рейлингом', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3-kwi0NZ8aKoKNJHgAnpPRTZEUWQnjzs.webp' },
  { name: 'Внутренний ящик', meta: 'Внутренний выдвижной ящик', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4-cCxNjuFKkFX7GcJxxs7OeX9eOAnChk.webp' },
]

export const technical: CatalogItem[] = [
  { name: 'Нижние базы с профилем LINE', meta: 'Конструктив · высота 780 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%D0%9D%D0%B8%D0%B6%D0%BD%D0%B8%D0%B5%20%D0%B1%D0%B0%D0%B7%D1%8B%20%D1%81%20%D0%BF%D1%80%D0%BE%D1%84%D0%B8%D0%BB%D0%B5%D0%BC%20-LINE-2H2Rk82nqxf0mEWTZgfPnyCWvqoNXN.png' },
  { name: 'Верхние базы', meta: 'Конструктив · глубина 320 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%D0%92%D0%B5%D1%80%D1%85%D0%BD%D0%B8%D0%B5%20%D0%B1%D0%B0%D0%B7%D1%8B-yKbipwus11DtK2NDIcP98bZ8GjnqOJ.png' },
  { name: 'Пеналы', meta: 'Конструктив · глубина 570 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%D0%9F%D0%B5%D0%BD%D0%B0%D0%BB%D1%8B-fwtEcYai78mjh3KUPIYKZqP2KYeEcR.png' },
  { name: 'Антресоли', meta: 'Конструктив · глубина 570 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%D0%90%D0%BD%D1%82%D1%80%D0%B5%D1%81%D0%BE%D0%BB%D0%B8-tXtXWvD7uqyqXSZs7uy7RaEp54A00S.png' },
  { name: 'Нижние базы с ручками', meta: 'Конструктив · высота 720 мм', image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%D0%9D%D0%B8%D0%B6%D0%BD%D0%B8%D0%B5%20%D0%B1%D0%B0%D0%B7%D1%8B%20%D1%81%20%D1%80%D1%83%D1%87%D0%BA%D0%B0%D0%BC%D0%B8-l8KxyHML7DP7kx0XB8tqT6d3Ogl5kd.png' },
]

/**
 * Страница «Наполнение» целиком, одним списком групп.
 *
 * Раньше эти блоки были расписаны в разметке компонента по одному — семь
 * почти одинаковых секций подряд. Данными они нужны затем, что теперь тот же
 * список переносится в базу и дальше редактируется из панели: и запасной
 * вариант из кода, и версия из базы рисуются одним и тем же кодом.
 */
export const fillingSections: CatalogGroup[] = [
  ...filling,
  {
    id: 'storage',
    eyebrow: 'Системы хранения',
    title: 'Корзины и колонны',
    description:
      'Выдвижные системы для нижних, верхних и угловых модулей: бутылочница на узкий фасад, сушка для посуды, «волшебный уголок», колонна для пенала, корзина, которая опускается из верхнего шкафа, и сортировка мусора.',
    specs: ['Фасады от 150 до 900 мм', 'Хромированная сталь, стекло и алюминий'],
    items: kitchenStorage,
  },
  {
    id: 'handles-profile',
    eyebrow: 'Ручки',
    title: 'Торцевые ручки MONTE',
    description:
      'Лаконичный монтаж на торец фасада для нижних и верхних баз. Доступны компактные версии 16 мм и удлинённые ручки 128 / 900 мм в четырёх финишных покрытиях.',
    items: handles,
  },
  {
    id: 'handles-profile-bar',
    eyebrow: 'Ручки',
    title: 'Профиль-ручки',
    description: 'Накладные профили длиной 320 мм для современных кухонь без выступающей фурнитуры.',
    items: profileHandles,
  },
  {
    id: 'handles-bracket',
    eyebrow: 'Ручки',
    title: 'Ручки-скобы QUADRA',
    description:
      'Чёткая прямоугольная геометрия в длинах 160, 190 и 256 мм. Цвета: матовый чёрный и брашированное матовое золото.',
    items: bracketHandles,
  },
  {
    id: 'handles-classic',
    eyebrow: 'Ручки',
    title: 'Неоклассика: кнопки и скобы',
    description:
      'Изящные ручки UNICA, ANCHOR и OLSEN в глубоком матовом чёрном цвете для рамочных и фрезерованных фасадов.',
    items: neoclassicalHandles,
  },
  {
    id: 'railings',
    eyebrow: 'Ручки',
    title: 'Рейлинговые ручки',
    description:
      'Универсальные цилиндрические рейлинги под стандартные межцентровые расстояния 160, 192, 224 и 256 мм.',
    items: railings,
  },
  {
    id: 'technical',
    eyebrow: 'Конструктив',
    title: 'Схемы модулей и размеры',
    description:
      'Стандартная размерная сетка корпусов: нижние базы с профилем LINE (780 мм) и под накладные ручки (720 мм), верхние шкафы, пеналы и антресоли глубиной 570 мм.',
    items: technical,
  },
]

/**
 * Позиции, которые есть в каталоге производства, но на странице сейчас
 * не показываются. При переносе в базу заводятся скрытыми — чтобы страница
 * не изменилась, но их можно было включить одной галочкой.
 */
export const fillingHiddenSections: CatalogGroup[] = [
  {
    id: 'hardware',
    eyebrow: 'Фурнитура',
    title: 'Петли и ящики',
    description: 'Механизмы, которые не видно снаружи, но от них зависит, как кухня открывается.',
    items: hardware,
  },
  {
    id: 'dryers',
    eyebrow: 'Системы хранения',
    title: 'Выдвижные сушилки',
    description: 'Сушка размещается в нижнем модуле и выезжает целиком.',
    items: dryers,
  },
  {
    id: 'trays',
    eyebrow: 'Системы хранения',
    title: 'Лотки и корзины',
    description: 'Полностью выдвигаются из шкафа и позволяют видеть всё содержимое.',
    items: trays,
  },
]

export const catalogPdf = '/data/module-estet-catalog.pdf'
