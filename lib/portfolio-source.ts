import {
  countPortfolio,
  isDbConfigured,
  listPortfolio,
  type PortfolioInput,
  type PortfolioRow,
} from '@/lib/db'
import { portfolioProjects, type PortfolioProject } from '@/lib/portfolio-data'

/**
 * Откуда галерея берёт проекты.
 *
 * Источников два. Основной — таблица portfolio_projects, которую наполняет
 * панель. Запасной — файл lib/portfolio-data.ts: он работает, пока база не
 * подключена или таблица пуста, поэтому сайт показывает те же восемь работ,
 * что и раньше, даже если панель ни разу не открывали.
 *
 * Сбой базы здесь не должен ронять главную страницу: галерея — не форма
 * заявки, и показать вчерашний набор проектов лучше, чем ошибку.
 */
export async function getPortfolioProjects(): Promise<PortfolioProject[]> {
  if (!isDbConfigured()) return portfolioProjects

  try {
    // Пустая таблица и «всё снято с публикации» — разные вещи: во втором
    // случае возвращать старый набор из файла нельзя. Поэтому рядом с самими
    // проектами спрашиваем общее число строк, а не тянем скрытые целиком
    const [rows, total] = await Promise.all([listPortfolio(), countPortfolio()])
    if (total === 0) return portfolioProjects
    return rows.map(rowToProject)
  } catch (error) {
    // Только текст ошибки: полный объект NeonDbError печатается на треть
    // экрана и при недоступной базе засоряет лог на каждый показ страницы
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[Портфолио] Не удалось прочитать проекты из базы, показываем список из кода: ${message}`)
    return portfolioProjects
  }
}

export function rowToProject(row: PortfolioRow): PortfolioProject {
  const photos = Array.isArray(row.photos) ? row.photos : []
  return {
    id: row.id,
    title: row.title,
    tag: row.tag,
    alt: row.alt || row.title,
    coverSrc: row.cover_src || photos[0]?.src || '',
    size: row.size === 'tall' ? 'tall' : 'short',
    style: row.style,
    area: row.area,
    duration: row.duration,
    materials: Array.isArray(row.materials) ? row.materials : [],
    features: Array.isArray(row.features) ? row.features : [],
    description: row.description,
    photos,
    // Карточка без фотографий подписывается «Скоро фотоотчёт» вместо
    // счётчика — так проект можно завести заранее и добавить съёмку позже
    isPlaceholder: photos.length === 0,
  }
}

/** Проекты из файла в том виде, в каком их принимает база */
export function staticProjectsAsInput(): PortfolioInput[] {
  return portfolioProjects.map((project) => ({
    id: project.id,
    title: project.title,
    tag: project.tag,
    alt: project.alt,
    coverSrc: project.coverSrc,
    size: project.size,
    style: project.style,
    area: project.area,
    duration: project.duration,
    description: project.description,
    materials: [...project.materials],
    features: [...project.features],
    photos: project.photos.map((photo) => ({ src: photo.src, alt: photo.alt })),
    published: true,
  }))
}
