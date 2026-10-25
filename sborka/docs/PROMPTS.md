# Промты для генерации изображений

## Макеты сайтов для портфолио

Цвета, шрифты и заголовки совпадают с шаблонами ниш (`apps/web/src/lib/sites/themes.ts` и `niches.ts`), чтобы сгенерированный макет можно было повторить в коде один в один.

**Сервис.** Русский текст лучше всего рисуют ChatGPT (генерация изображений) и Ideogram. Midjourney часто искажает кириллицу — для него используйте вариант без текста (в конце файла).

**Форматы.**
- Первый экран: `--ar 16:10` — для карточек портфолио.
- Вся страница: `--ar 9:16` — для страницы примера и прокрутки при наведении.
- Телефон: `--ar 9:19` — по желанию.

Параметры в конце (`--ar`, `--style raw`, `--no`) — для Midjourney. В других сервисах уберите их и выберите пропорции в настройках.

### Шаблон

```
Website landing page design for {бизнес}, desktop screen 1440x900, straight front view, flat UI screenshot.
Style: {стиль}. Colors: background {фон}, text {текст}, accent {акцент}. Typography: {шрифт} for headings, clean sans-serif for body text.
Layout: top navigation with logo "{название}", three menu links and a phone number; large hero headline "{заголовок}", one-line subtitle, one accent button "{кнопка}"; large real photo of {фото} on the right; below the fold the first row of service cards with prices.
Premium modern web design, Awwwards quality, generous whitespace, precise grid, realistic photography, crisp readable Russian text.
--ar 16:10 --style raw --no device mockup, browser frame, perspective, watermark, lorem ipsum
```

### Маникюр — «Студия «Лён»»

```
Website landing page design for a small nail studio, desktop screen 1440x900, straight front view, flat UI screenshot.
Style: soft feminine minimalism, arch-shaped photo frames, thin lines, airy layout. Colors: background #FBF5F2 blush cream, text #2A1E21, accent #A84E62 dusty rose. Typography: elegant high-contrast serif like Cormorant Garamond for headings, clean sans-serif for body text.
Layout: top navigation with logo "Студия «Лён»", menu links "Услуги", "О студии", "Контакты" and phone "+7 900 000-00-00"; large hero headline "Аккуратный маникюр без спешки", subtitle "Стерильные инструменты и запись онлайн за минуту", pill-shaped accent button "Записаться"; large photo of hands with a fresh dusty-pink manicure in an arch frame on the right; below — price list "Маникюр с покрытием — 2 200 ₽", "Педикюр — 2 800 ₽".
Premium modern web design, Awwwards quality, generous whitespace, precise grid, realistic photography, crisp readable Russian text.
--ar 16:10 --style raw --no device mockup, browser frame, perspective, watermark, lorem ipsum
```

### Ремонт — «Отвес»

```
Website landing page design for an apartment renovation company, desktop screen 1440x900, straight front view, flat UI screenshot.
Style: strict architectural, visible grid lines and blueprint details, sharp corners, bold confident layout. Colors: background #EDEBE6 warm concrete, text #1C1E21, accent #FF6A13 safety orange. Typography: bold condensed sans-serif like Oswald for headings, clean sans-serif for body text.
Layout: top navigation with logo "Отвес", menu links "Работы и цены", "Кто мы", "Контакты" and phone "+7 900 000-00-00"; huge hero headline "Ремонт квартир под ключ", subtitle "Смета до начала работ, сроки в договоре, фотоотчёт по каждому этапу", orange button "Вызвать замерщика"; large photo of a bright freshly renovated living room on the right; below — three cards "Косметический ремонт от 4 500 ₽/м²", "Капитальный ремонт от 9 000 ₽/м²", "Санузел под ключ от 180 000 ₽".
Premium modern web design, Awwwards quality, generous whitespace, precise grid, realistic photography, crisp readable Russian text.
--ar 16:10 --style raw --no device mockup, browser frame, perspective, watermark, lorem ipsum
```

### Автосервис — «Пятая передача»

```
Website landing page design for a car service garage, dark mode, desktop screen 1440x900, straight front view, flat UI screenshot.
Style: bold, technical, cinematic, high contrast, yellow highlights like workshop lights. Colors: background #121417 graphite, text #F2F3F5, accent #FFD23F yellow. Typography: bold geometric sans-serif like Rubik for headings and body.
Layout: top navigation with logo "Пятая передача", menu links "Услуги", "О сервисе", "Контакты" and phone "+7 900 000-00-00"; large hero headline "Ремонт авто без сюрпризов в чеке", subtitle "Согласуем каждую работу и цену до начала ремонта", yellow button "Записаться на сервис"; large moody photo of a dark car on a lift in a clean garage with yellow lights on the right, no license plates, no brand logos; below — price row "Замена масла от 900 ₽", "Диагностика 1 500 ₽", "Шиномонтаж от 2 000 ₽".
Premium modern web design, Awwwards quality, generous whitespace, precise grid, realistic photography, crisp readable Russian text.
--ar 16:10 --style raw --no device mockup, browser frame, perspective, watermark, lorem ipsum
```

### Психолог — «Мария Ветрова»

```
Website landing page design for a private psychologist, desktop screen 1440x900, straight front view, flat UI screenshot.
Style: calm, warm, trustworthy, soft rounded shapes, lots of air. Colors: background #EEF1EA pale sage, text #22302A, accent #3E6B55 deep sage green. Typography: refined serif like Lora for headings, friendly sans-serif for body text.
Layout: top navigation with logo "Мария Ветрова, психолог", menu links "Форматы", "Обо мне", "Контакты" and phone "+7 900 000-00-00"; large hero headline "Спокойное место, чтобы разобраться в себе", subtitle "Встречи очно и онлайн", rounded green button "Записаться на консультацию"; large photo of a calm therapy room with two armchairs and a monstera plant on the right, no people; below — formats "Знакомство — бесплатно", "Консультация, 50 минут — 4 500 ₽".
Premium modern web design, Awwwards quality, generous whitespace, precise grid, realistic photography, crisp readable Russian text.
--ar 16:10 --style raw --no device mockup, browser frame, perspective, watermark, lorem ipsum
```

### Кофейня — «Зерно и сахар»

```
Website landing page design for a cozy coffee shop and bakery, desktop screen 1440x900, straight front view, flat UI screenshot.
Style: warm editorial, food-magazine feel, soft shadows, rounded cards. Colors: background #F4ECE0 cream, text #2E1D14 espresso, accent #A65A1E caramel. Typography: elegant serif like Playfair Display for headings, clean sans-serif for body text.
Layout: top navigation with logo "Зерно и сахар", menu links "Меню", "О нас", "Контакты" and phone "+7 900 000-00-00"; large hero headline "Кофе и десерты, за которыми возвращаются", subtitle "Варим кофе и печём десерты каждое утро", caramel button "Заказать торт"; large photo of latte art and fresh croissants on a wooden counter on the right; below — menu cards "Капучино 220 ₽", "Круассан с миндалём 190 ₽", "Торт на заказ от 2 400 ₽/кг".
Premium modern web design, Awwwards quality, generous whitespace, precise grid, realistic photography, crisp readable Russian text.
--ar 16:10 --style raw --no device mockup, browser frame, perspective, watermark, lorem ipsum
```

### Вся страница целиком

В любом промте выше замените первую строку и пропорции:

```
Full landing page design for {бизнес}, long vertical scroll showing all sections stacked: hero, services with prices, about with a photo, three advantages, FAQ, contacts with a map and a booking form, footer. Straight front view, flat UI.
... (остальное без изменений)
--ar 9:16 --style raw --no device mockup, browser frame, perspective, watermark, lorem ipsum
```

### Без текста (для Midjourney)

Замените `crisp readable Russian text` на `text shown as neat grey placeholder lines, no readable words`.

## Фото для шаблонов

Отдельные фото для блоков сайта — см. список промтов в сообщении от 25.10.2026 (10 фото: `<ниша>-hero` 4:5 и `<ниша>-about` 1:1). Файлы кладутся в `apps/web/public/images/niches/`.
