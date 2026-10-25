import type { NicheId } from "@/lib/sites/schema";

/**
 * «Почерк» сайта ниши: чем он отличается от остальных, кроме цветов и шрифтов.
 * Тема (светлая или тёмная) меняет палитру, почерк у обеих тем ниши один.
 */
export interface Signature {
  /** Эффект первого экрана. */
  fx: "steam" | "swatches" | "blueprint" | "beam" | "aurora" | "pulse" | "document" | "pole" | "bubbles" | "liquid" | "trail" | "petals";
  /** Интро при открытии сайта. */
  intro: "photos" | "counter" | "split" | "circle" | "letters";
  /** Вид галереи. */
  gallery: "bento" | "polaroid" | "hscroll" | "filmstrip" | "masonry" | "arches";
  /** Вид этапов работы. */
  steps: "stack" | "timeline" | "row" | "big";
  /** Вид отзывов. */
  reviews: "grid" | "notes" | "marquee" | "slider" | "chat";
  /** Вид вопросов. */
  faq: "accordion" | "numbered" | "cards";
  /** Цитата на фото, раскрывающемся на весь экран при прокрутке. */
  cinema: boolean;
  /** Текст «О нас» проявляется по словам при прокрутке. */
  highlight: boolean;
  /** Плавающая кнопка записи и её надпись (коротко: она идёт по кругу или по вертикали). */
  fab: "circle" | "pill" | "square" | "tab";
  fabLabel: string;
  /** Свой курсор: кольцо или круг с инверсией цвета. */
  cursor: "ring" | "blend" | "none";
  /** Окно записи: заголовок, кнопка и поля по шагам. */
  booking: Booking;
}

export type BookingField =
  | { kind: "services"; label: string; multi?: boolean; qty?: boolean }
  | { kind: "chips"; label: string; options: string[]; multi?: boolean }
  | { kind: "masters"; label: string }
  | { kind: "days"; label: string }
  | { kind: "times"; label: string; times: string[] }
  | { kind: "input"; label: string; placeholder: string }
  | { kind: "textarea"; label: string; placeholder: string };

export interface Booking {
  title: string;
  lead: string;
  submit: string;
  done: string;
  steps: Array<{ title: string; fields: BookingField[] }>;
}

const TIMES_DAY = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00"];

export const SIGNATURES: Record<NicheId, Signature> = {
  coffee: {
    fx: "steam",
    intro: "photos",
    gallery: "polaroid",
    steps: "row",
    reviews: "notes",
    faq: "accordion",
    cinema: true,
    highlight: false,
    fab: "circle",
    fabLabel: "Предзаказ",
    cursor: "none",
    booking: {
      title: "Предзаказ",
      lead: "Соберите заказ — приготовим к вашему приходу.",
      submit: "Оформить предзаказ",
      done: "Заказ принят. Ждём вас — всё будет готово к назначенному времени.",
      steps: [
        { title: "Что приготовить", fields: [{ kind: "services", label: "Меню", multi: true, qty: true }] },
        {
          title: "Когда заберёте",
          fields: [{ kind: "chips", label: "Время", options: ["Через 15 минут", "Через 30 минут", "Через час", "Завтра утром"] }],
        },
      ],
    },
  },
  nails: {
    fx: "swatches",
    intro: "letters",
    gallery: "arches",
    steps: "row",
    reviews: "slider",
    faq: "accordion",
    cinema: false,
    highlight: false,
    fab: "pill",
    fabLabel: "Записаться",
    cursor: "ring",
    booking: {
      title: "Запись к мастеру",
      lead: "Выберите услугу и удобное время — мы подтвердим запись.",
      submit: "Записаться",
      done: "Вы записаны. Мастер напишет вам накануне визита.",
      steps: [
        { title: "Услуга", fields: [{ kind: "services", label: "Что делаем" }] },
        { title: "Дата и время", fields: [{ kind: "days", label: "День" }, { kind: "times", label: "Время", times: TIMES_DAY }] },
      ],
    },
  },
  repair: {
    fx: "blueprint",
    intro: "split",
    gallery: "bento",
    steps: "timeline",
    reviews: "grid",
    faq: "accordion",
    cinema: false,
    highlight: false,
    fab: "square",
    fabLabel: "Замер",
    cursor: "ring",
    booking: {
      title: "Вызвать замерщика",
      lead: "Приедем, замерим и составим смету. Бесплатно.",
      submit: "Вызвать замерщика",
      done: "Заявка принята. Позвоним в течение часа, чтобы согласовать время замера.",
      steps: [
        {
          title: "Объект",
          fields: [
            { kind: "chips", label: "Что ремонтируем", options: ["Квартира", "Новостройка", "Дом", "Офис"] },
            { kind: "chips", label: "Площадь", options: ["До 40 м²", "40–70 м²", "70–100 м²", "Больше 100 м²"] },
          ],
        },
        { title: "Когда удобно", fields: [{ kind: "days", label: "День замера" }] },
      ],
    },
  },
  auto: {
    fx: "beam",
    intro: "counter",
    gallery: "hscroll",
    steps: "row",
    reviews: "marquee",
    faq: "accordion",
    cinema: false,
    highlight: false,
    fab: "square",
    fabLabel: "Запись",
    cursor: "none",
    booking: {
      title: "Запись на сервис",
      lead: "Приезжайте к назначенному времени — без очереди.",
      submit: "Записаться",
      done: "Вы записаны. Пришлём напоминание за день до визита.",
      steps: [
        {
          title: "Машина и работы",
          fields: [
            { kind: "input", label: "Марка и модель", placeholder: "Например, Kia Rio 2019" },
            { kind: "services", label: "Что нужно сделать", multi: true },
          ],
        },
        { title: "Дата и время", fields: [{ kind: "days", label: "День" }, { kind: "times", label: "Время", times: ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"] }] },
      ],
    },
  },
  psychologist: {
    fx: "aurora",
    intro: "circle",
    gallery: "bento",
    steps: "stack",
    reviews: "slider",
    faq: "accordion",
    cinema: false,
    highlight: true,
    fab: "pill",
    fabLabel: "Записаться",
    cursor: "none",
    booking: {
      title: "Первая встреча",
      lead: "Всё, что вы расскажете, остаётся между нами.",
      submit: "Записаться",
      done: "Спасибо. Я напишу вам, чтобы договориться о времени встречи.",
      steps: [
        { title: "Формат", fields: [{ kind: "services", label: "Формат встречи" }, { kind: "chips", label: "Как удобнее", options: ["Очно", "Онлайн"] }] },
        { title: "Время", fields: [{ kind: "days", label: "День" }, { kind: "times", label: "Время", times: ["10:00", "12:00", "15:00", "17:00", "19:00"] }] },
      ],
    },
  },
  fitness: {
    fx: "pulse",
    intro: "counter",
    gallery: "filmstrip",
    steps: "big",
    reviews: "marquee",
    faq: "numbered",
    cinema: false,
    highlight: false,
    fab: "square",
    fabLabel: "Пробная",
    cursor: "none",
    booking: {
      title: "Пробная тренировка",
      lead: "Познакомитесь с тренером и залом. Возьмите удобную обувь.",
      submit: "Записаться на пробную",
      done: "Вы записаны. Тренер позвонит, чтобы уточнить цель и уровень подготовки.",
      steps: [
        { title: "Направление", fields: [{ kind: "services", label: "Что попробуем" }] },
        { title: "Время", fields: [{ kind: "days", label: "День" }, { kind: "times", label: "Время", times: ["07:30", "09:00", "12:00", "18:00", "19:00", "20:30"] }] },
      ],
    },
  },
  legal: {
    fx: "document",
    intro: "split",
    gallery: "bento",
    steps: "timeline",
    reviews: "grid",
    faq: "numbered",
    cinema: false,
    highlight: true,
    fab: "tab",
    fabLabel: "Консультация",
    cursor: "ring",
    booking: {
      title: "Консультация",
      lead: "Опишите ситуацию — юрист перезвонит и скажет, с чего начать.",
      submit: "Отправить",
      done: "Заявка принята. Юрист перезвонит в рабочее время и предложит время консультации.",
      steps: [
        {
          title: "Ситуация",
          fields: [
            { kind: "services", label: "Направление" },
            { kind: "textarea", label: "Коротко о ситуации", placeholder: "Например: подрядчик сорвал сроки, хочу вернуть аванс" },
          ],
        },
      ],
    },
  },
  barber: {
    fx: "pole",
    intro: "split",
    gallery: "bento",
    steps: "row",
    reviews: "notes",
    faq: "accordion",
    cinema: false,
    highlight: false,
    fab: "circle",
    fabLabel: "Записаться",
    cursor: "blend",
    booking: {
      title: "Запись",
      lead: "Выберите барбера и время. Кофе нальём на месте.",
      submit: "Записаться",
      done: "Вы записаны. Ждём вас — приходите за пять минут.",
      steps: [
        { title: "Барбер и услуга", fields: [{ kind: "masters", label: "Барбер" }, { kind: "services", label: "Услуга" }] },
        { title: "Время", fields: [{ kind: "days", label: "День" }, { kind: "times", label: "Время", times: TIMES_DAY }] },
      ],
    },
  },
  cleaning: {
    fx: "bubbles",
    intro: "circle",
    gallery: "bento",
    steps: "row",
    reviews: "chat",
    faq: "cards",
    cinema: false,
    highlight: false,
    fab: "pill",
    fabLabel: "Рассчитать",
    cursor: "none",
    booking: {
      title: "Рассчитать уборку",
      lead: "Назовём точную цену до приезда — без доплат на месте.",
      submit: "Рассчитать",
      done: "Заявка принята. Перезвоним за 10 минут и назовём точную цену.",
      steps: [
        {
          title: "Квартира",
          fields: [
            { kind: "services", label: "Вид уборки" },
            { kind: "chips", label: "Комнат", options: ["Студия", "1", "2", "3", "4+"] },
            { kind: "chips", label: "Дополнительно", options: ["Окна", "Духовка", "Холодильник", "Балкон"], multi: true },
          ],
        },
        { title: "Когда", fields: [{ kind: "days", label: "День уборки" }] },
      ],
    },
  },
  dental: {
    fx: "liquid",
    intro: "circle",
    gallery: "bento",
    steps: "stack",
    reviews: "grid",
    faq: "accordion",
    cinema: false,
    highlight: false,
    fab: "pill",
    fabLabel: "Записаться",
    cursor: "none",
    booking: {
      title: "Запись к стоматологу",
      lead: "Первичная консультация — с планом лечения и ценой.",
      submit: "Записаться",
      done: "Вы записаны. Администратор позвонит, чтобы подтвердить время.",
      steps: [
        { title: "Услуга", fields: [{ kind: "services", label: "Что беспокоит" }] },
        { title: "Время", fields: [{ kind: "days", label: "День" }, { kind: "times", label: "Время", times: ["09:00", "10:30", "12:00", "14:00", "16:00", "18:00"] }] },
      ],
    },
  },
  photo: {
    fx: "trail",
    intro: "letters",
    gallery: "masonry",
    steps: "big",
    reviews: "grid",
    faq: "accordion",
    cinema: false,
    highlight: true,
    fab: "tab",
    fabLabel: "Забронировать",
    cursor: "blend",
    booking: {
      title: "Забронировать дату",
      lead: "Расскажите об идее — предложу место, время и образы.",
      submit: "Забронировать",
      done: "Спасибо! Напишу вам сегодня, обсудим идею съёмки.",
      steps: [
        { title: "Съёмка", fields: [{ kind: "services", label: "Формат" }, { kind: "input", label: "Где хотите сниматься", placeholder: "Студия, парк, дома…" }] },
        { title: "Дата", fields: [{ kind: "days", label: "День" }] },
      ],
    },
  },
  florist: {
    fx: "petals",
    intro: "photos",
    gallery: "arches",
    steps: "row",
    reviews: "notes",
    faq: "accordion",
    cinema: true,
    highlight: false,
    fab: "circle",
    fabLabel: "Заказать букет",
    cursor: "ring",
    booking: {
      title: "Заказать букет",
      lead: "Соберём, пришлём фото и привезём к нужному времени.",
      submit: "Заказать",
      done: "Заказ принят. Флорист пришлёт фото букета перед доставкой.",
      steps: [
        { title: "Букет", fields: [{ kind: "services", label: "Что собираем" }, { kind: "chips", label: "Повод", options: ["День рождения", "Свидание", "Просто так", "Свадьба", "Извинение"] }] },
        { title: "Доставка", fields: [{ kind: "days", label: "День" }, { kind: "input", label: "Текст открытки", placeholder: "С днём рождения!" }] },
      ],
    },
  },
};
