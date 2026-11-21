/**
 * Приведение фотографий каталога к одному формату.
 *
 * Позиции каталога стоят в одной сетке, и разнобой в пропорциях виден сразу:
 * одна карточка квадратная, соседняя вытянутая, третья — вертикальный кадр
 * с телефона. Поэтому кадрируем всё к 4:3 ещё в браузере, до загрузки.
 *
 * Именно в браузере, а не на сервере: файл с телефона легко весит 8 МБ, а тело
 * запроса к серверной функции на Vercel ограничено 4,5 МБ. Гонять оригинал
 * в хранилище, чтобы потом его оттуда же выкачать, обработать и залить
 * обратно, — три лишних обращения к хранилищу на каждое фото.
 *
 * Уменьшает браузер, а не мы вручную: createImageBitmap с resizeQuality
 * 'high' использует тот же алгоритм, что и при отрисовке страницы, и на
 * сжатии в три-четыре раза даёт заметно более чистый результат, чем один
 * проход drawImage.
 */

/** 4:3 — пропорция, в которой сетка каталога выглядит ровно на всех ширинах */
export const CATALOG_RATIO = 4 / 3
/** Больше ни к чему: карточка даже на широком экране не шире ~600 CSS-пикселей */
export const CATALOG_MAX_WIDTH = 1200
/** Ниже этого фото заметно мылит на ретине — предупреждаем, но не запрещаем */
export const CATALOG_MIN_WIDTH = 600

export type NormalizedImage = {
  file: File
  width: number
  height: number
  /** Заполнено, если с фото что-то не так, но загрузить его всё равно можно */
  warning?: string
}

export async function normalizeCatalogImage(file: File): Promise<NormalizedImage> {
  const source = await decode(file)

  try {
    // Самый большой прямоугольник 4:3, который влезает в исходный кадр.
    // Режем по центру: у предметной съёмки объект почти всегда в середине
    const cropWidth = Math.min(source.width, source.height * CATALOG_RATIO)
    const cropHeight = cropWidth / CATALOG_RATIO

    // Не увеличиваем: растянуть мелкое фото до 1200 px — это те же пиксели,
    // только файл тяжелее
    const width = Math.round(Math.min(CATALOG_MAX_WIDTH, cropWidth))
    const height = Math.round(width / CATALOG_RATIO)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas недоступен')

    // Белая подложка под прозрачные PNG: карточки стоят на светлом фоне,
    // и без неё прозрачность стала бы чёрной при переводе в JPEG
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)

    const scaled = await createImageBitmap(source, {
      resizeWidth: Math.round((source.width / cropWidth) * width),
      resizeHeight: Math.round((source.height / cropHeight) * height),
      resizeQuality: 'high',
    })

    try {
      context.drawImage(scaled, (width - scaled.width) / 2, (height - scaled.height) / 2)
    } finally {
      scaled.close()
    }

    const blob = await toBlob(canvas)
    const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'

    return {
      file: new File([blob], `${baseName(file.name)}.${extension}`, { type: blob.type }),
      width,
      height,
      warning:
        width < CATALOG_MIN_WIDTH
          ? `Фото мелковато (${width}×${height}) — на больших экранах будет нерезким.`
          : undefined,
    }
  } finally {
    source.close()
  }
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file)
  } catch {
    // Чаще всего это HEIC с айфона: формат браузеры не разбирают
    throw new Error(
      `Браузер не открыл «${file.name}». Пересохраните фото в JPEG или PNG и попробуйте снова.`
    )
  }
}

/** WebP при прочих равных вдвое легче JPEG того же качества */
function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (webp) => {
        if (webp && webp.type === 'image/webp') return resolve(webp)
        canvas.toBlob(
          (jpeg) => (jpeg ? resolve(jpeg) : reject(new Error('не удалось сохранить изображение'))),
          'image/jpeg',
          0.9
        )
      },
      'image/webp',
      0.9
    )
  })
}

function baseName(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[^\p{L}\p{N}\s._-]/gu, '')
      .trim()
      .slice(0, 60) || 'photo'
  )
}
