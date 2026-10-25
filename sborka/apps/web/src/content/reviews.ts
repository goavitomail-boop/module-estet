/**
 * Отзывы клиентов для лендинга. Только настоящие отзывы с разрешения авторов:
 * пока массив пуст, блок отзывов на сайте не показывается.
 */
export interface Review {
  name: string;
  role: string;
  text: string;
  /** Фото автора в public/, по желанию. */
  photo?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
}

export const REVIEWS: Review[] = [];
