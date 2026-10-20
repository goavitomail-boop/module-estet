import type { CatalogInput, CatalogRow, CatalogSection } from '@/lib/db'
import { fillingHiddenSections, fillingSections } from '@/lib/pdf-catalog-data'

/**
 * Стартовое наполнение разделов «Фасады» и «Столешницы».
 *
 * Фото — из каталога производства: у коллекций фасадов это обложка
 * коллекции, у столешниц — образец декора. Где снимка в каталоге нет
 * (витрина, профиль LINE), стоит заглушка; владелец заменит её из панели —
 * там фото сразу приводится к нужному размеру.
 *
 * Названия и характеристики взяты из каталога производства, чтобы это был
 * рабочий черновик, а не «Позиция 1, Позиция 2».
 */
export const CATALOG_PLACEHOLDER = '/images/catalog-placeholder.svg'

type Draft = { group: string; name: string; meta: string; description?: string; slug?: string; image?: string }

const cover = (slug: string) => `/catalog/collections/${slug}-hero.webp`

const facades: Draft[] = [
  {
    group: 'Soft & Wood и Touch',
    name: 'SOFT & WOOD',
    image: cover('soft-wood'),
    meta: 'Однотонные цвета и дуб · фасад 16 мм',
    description:
      'Пять однотонных цветов и пять декоров дуба — их можно собрать в одной композиции. Торцы закрыты кромкой ПВХ 0,8 мм на PUR со всех сторон.',
  },
  {
    group: 'Soft & Wood и Touch',
    name: 'TOUCH',
    image: cover('touch'),
    meta: 'Soft Touch · фасад 18 мм · 10 цветов',
    description:
      'Однотонные фасады с покрытием Soft Touch — поверхность приятна на ощупь. В палитре есть белый глянец. Торцы: кромка ПВХ 0,8 мм на PUR, тыльная сторона белая.',
  },
  {
    group: 'Однотонные PVC',
    name: 'FLAT',
    image: cover('flat'),
    meta: 'Однотонный PVC · 12 цветов',
    description: 'Лаконичная гладкая плоскость без рельефа и рамок. Тыльная сторона фасада белая.',
  },
  {
    group: 'Однотонные PVC',
    name: 'VELVET',
    image: cover('velvet'),
    meta: 'Рельефный PVC · 12 цветов',
    description: 'Рельефная поверхность с вертикальными линиями — цвет выглядит глубже и объёмнее. Тыльная сторона белая.',
  },
  {
    group: 'Однотонные PVC',
    name: 'COMO',
    image: cover('como'),
    meta: 'PVC с рамкой · 12 цветов',
    description: 'Фасад с рамкой и утопленной филёнкой — классическая форма в современных цветах. Тыльная сторона белая.',
  },
  {
    group: 'Однотонные PVC',
    name: 'GARDA',
    image: cover('garda'),
    meta: 'PVC с тонкой рамкой · 12 цветов',
    description: 'Рамочный фасад с тонким профилем по периметру. Тыльная сторона белая.',
  },
  {
    group: 'Стекло и алюминий',
    name: 'Витрина в алюминиевой рамке',
    meta: 'Рамка: серебро, чёрный, латунь, белый',
    description:
      'Верхние шкафы с алюминиевой рамкой и стеклом на выбор: прозрачное, сатин, графит или бронза. Есть вариант с широкой рамкой.',
  },
  {
    group: 'Кухни без ручек',
    name: 'Профиль LINE',
    meta: 'Профили C и L · серебро, чёрный, латунь, белый',
    description:
      'Система без ручек: захват в профиле на нижних базах. У верхних шкафов дно на 20 мм меньше — за фасадом остаётся зазор для руки.',
  },
]

/**
 * Столешницы и стеновые панели SLOTEX — 23 декора из каталога производства.
 * Название и артикул — со слайдов каталога, описаний у декоров там нет, поэтому
 * их и нет здесь. Размеры плит общие для всех декоров и стоят на странице
 * отдельным разделом (components/countertop-sizes.tsx).
 */
const countertopDecors: Array<[name: string, article: string, slug: string, group: string]> = [
  ['Black Slate', '2333/Q', 'black-slate', 'Камень и мрамор'], ['Arcola', '8144/Pt', 'arcola', 'Камень и мрамор'], ['Verona', '2927/Q', 'verona', 'Камень и мрамор'],
  ['Calacatta Oro', '8115/Pt', 'calacatta-oro', 'Камень и мрамор'], ['Calacatta Bianco', '8251/Pt', 'calacatta-bianco', 'Камень и мрамор'],
  ['Ankara Marble', '2343/A', 'ankara-marble', 'Камень и мрамор'], ['Venice', '0081/A', 'venice', 'Камень и мрамор'], ['Quartzite', '8099/Bst', 'quartzite', 'Камень и мрамор'],
  ['Corinfos', '8299/Bst', 'corinfos', 'Камень и мрамор'], ['Silver Marble', '6035/SL', 'silver-marble', 'Камень и мрамор'], ['Naples', '2926/A', 'naples', 'Камень и мрамор'],
  ['Pattaya', '2324/Bst', 'pattaya', 'Камень и мрамор'], ['Dominicana', '5023/Pt', 'dominicana', 'Камень и мрамор'], ['Moon Stone', '8453/Pt', 'moon-stone', 'Камень и мрамор'],
  ['Phantom marble', '8125/Pt', 'phantom-marble', 'Камень и мрамор'], ['Breccia light', '2238/Pt', 'breccia-light', 'Камень и мрамор'], ['Vasto', '8285/Pt', 'vasto', 'Камень и мрамор'],
  ['Black', '1021/Q', 'black', 'Однотонные'], ['White', '1111/S', 'white', 'Однотонные'],
  ['Indian Rosewood', '3247/P', 'indian-rosewood', 'Дерево'], ['Bunratty Oak', '3829/Nw', 'bunratty-oak', 'Дерево'], ['Marino', '2631/7', 'marino', 'Дерево'],
  ['Carpenter Oak dark', '7122/Nw', 'carpenter-oak-dark', 'Дерево'],
]

const countertops: Draft[] = countertopDecors.map(([name, article, slug, group]) => ({
  group,
  name,
  slug,
  meta: `Артикул ${article}`,
  image: `/catalog/materials/slotex/${slug}.webp`,
}))

function toInput(section: CatalogSection, drafts: Draft[]): CatalogInput[] {
  return drafts.map((draft, index) => ({
    // Идентификатор стабильный: повторный посев ничего не задвоит
    id: `${section}-${draft.slug ?? index + 1}`,
    section,
    groupTitle: draft.group,
    name: draft.name,
    meta: draft.meta,
    description: draft.description ?? '',
    image: draft.image ?? CATALOG_PLACEHOLDER,
    published: true,
  }))
}

export function catalogSeed(section: CatalogSection): CatalogInput[] {
  if (section === 'facades') return toInput(section, facades)
  if (section === 'countertops') return toInput(section, countertops)
  return fillingFromCatalog()
}

/**
 * Что показывает страница «Фасады» или «Столешницы», пока раздел в панели
 * пуст или база не ответила: тот же черновик, но только позиции с настоящим
 * фото — заглушка на витрине выглядит недоделкой. Ссылки на эти страницы
 * стоят в меню, поэтому 404 здесь быть не должно
 */
export function catalogDraftRows(section: 'facades' | 'countertops'): CatalogRow[] {
  return catalogSeed(section)
    .filter((item) => item.image !== CATALOG_PLACEHOLDER)
    .map((item, position) => ({
      id: item.id,
      section: item.section,
      group_title: item.groupTitle,
      name: item.name,
      meta: item.meta,
      description: item.description,
      image: item.image,
      position,
      published: true,
      created_at: '',
      updated_at: '',
    }))
}

/**
 * Наполнение переносится из каталога производства как есть: те же позиции,
 * фотографии и подписи, что уже стоят на странице. После переноса страница
 * рисуется из базы и выглядит точно так же, но каждую позицию можно
 * поправить, скрыть или заменить ей фото.
 *
 * Идентификатор собирается из названия группы и позиции в ней, поэтому
 * повторный перенос ничего не задвоит.
 */
function fillingFromCatalog(): CatalogInput[] {
  const input: CatalogInput[] = []

  const add = (groups: typeof fillingSections, published: boolean) => {
    for (const group of groups) {
      group.items?.forEach((item, index) => {
        input.push({
          id: `filling-${group.id}-${index + 1}`,
          section: 'filling',
          groupTitle: group.title,
          name: item.name,
          meta: item.meta ?? '',
          description: '',
          image: item.image,
          published,
        })
      })
    }
  }

  add(fillingSections, true)
  // Эти позиции есть в каталоге, но на странице их сейчас нет. Заводим
  // скрытыми: страница не изменится, а включить их можно одной галочкой
  add(fillingHiddenSections, false)

  return input
}

/** Описания групп — переносятся вместе с позициями, иначе абзацы под заголовками пропали бы */
export function catalogGroupNotesSeed(section: CatalogSection): Array<{ title: string; description: string }> {
  if (section !== 'filling') return []
  return [...fillingSections, ...fillingHiddenSections]
    .filter((group) => group.description)
    .map((group) => ({ title: group.title, description: group.description }))
}
