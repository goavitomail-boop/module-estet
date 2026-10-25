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

## Макеты для новых ниш

Те же правила, что и выше: русский текст лучше рисуют ChatGPT и Ideogram, для Midjourney — вариант без текста. Из макета вырезаются фото для первого экрана и карточек услуг.

### Фитнес-студия — «Пульс»

```
Website landing page design for a boutique fitness studio, dark mode, desktop screen 1440x900, straight front view, flat UI screenshot.
Style: bold, energetic, sporty, high contrast, orange glow accents. Colors: background #0E0E10, text #F4F4F5, accent #FF5A1F orange. Typography: wide bold geometric sans-serif like Unbounded for headings, clean sans-serif for body.
Layout: top navigation with logo "Пульс", menu "Направления", "О студии", "Контакты", phone "+7 900 000-00-00"; huge hero headline "Сильнее с каждой тренировкой", subtitle "Тренер следит за техникой каждого", orange button "Записаться на пробное"; large cinematic photo of athletes training with dumbbells in a dark gym with orange rim light on the right, faces not in focus; below — three cards with photos "Групповая тренировка 800 ₽", "Персональная тренировка 2 500 ₽", "Растяжка 700 ₽".
Premium modern web design, Awwwards quality, generous whitespace, precise grid, realistic photography, crisp readable Russian text.
--ar 16:10 --style raw --no device mockup, browser frame, perspective, watermark, lorem ipsum
```

### Юрист — «Бюро «Статус»»

```
Website landing page design for a law firm, desktop screen 1440x900, straight front view, flat UI screenshot.
Style: trustworthy, classic, calm, thin gold lines, sharp corners. Colors: background #F5F3EE warm ivory, text #13233A navy, accent #8A6A2E muted gold. Typography: elegant serif like Playfair Display for headings, clean sans-serif for body.
Layout: top navigation with logo "Бюро «Статус»", menu "Практика", "О бюро", "Контакты", phone "+7 900 000-00-00"; hero headline "Защитим ваши интересы", subtitle "Объясним риски простыми словами и доведём дело до результата", navy button "Записаться на консультацию"; large photo of a modern law office with a wooden desk, documents, fountain pen and bookshelves on the right, no people; below — three cards "Консультация 3 000 ₽", "Сопровождение сделки от 25 000 ₽", "Представительство в суде от 40 000 ₽".
Premium modern web design, Awwwards quality, generous whitespace, precise grid, realistic photography, crisp readable Russian text.
--ar 16:10 --style raw --no device mockup, browser frame, perspective, watermark, lorem ipsum
```

### Барбершоп — «Борода и ножницы»

```
Website landing page design for a barbershop, dark mode, desktop screen 1440x900, straight front view, flat UI screenshot.
Style: brutal, vintage, masculine, brick and leather textures, copper accents. Colors: background #141210, text #F2ECE4, accent #C8873E copper. Typography: bold condensed sans-serif like Oswald for headings, clean sans-serif for body.
Layout: top navigation with logo "Борода и ножницы", menu "Прайс", "О нас", "Контакты", phone "+7 900 000-00-00"; hero headline "Стрижка, после которой хочется улыбаться в зеркало", subtitle "Барберы с опытом и кофе, пока ждёте", copper button "Записаться"; large moody photo of a barber trimming a client's beard with scissors in a vintage barbershop, warm light, faces partly in shadow; below — price list "Мужская стрижка 1 800 ₽", "Стрижка и борода 2 600 ₽", "Королевское бритьё 2 000 ₽".
Premium modern web design, Awwwards quality, generous whitespace, precise grid, realistic photography, crisp readable Russian text.
--ar 16:10 --style raw --no device mockup, browser frame, perspective, watermark, lorem ipsum
```

### Клининг — «Чистый дом»

```
Website landing page design for a home cleaning service, desktop screen 1440x900, straight front view, flat UI screenshot.
Style: fresh, airy, friendly, rounded cards, lots of white. Colors: background #F3F8FB pale blue, text #0F2A3D, accent #1668C7 blue. Typography: rounded bold sans-serif like Rubik for headings and body.
Layout: top navigation with logo "Чистый дом", menu "Услуги", "О компании", "Контакты", phone "+7 900 000-00-00"; hero headline "Чистота, на которую не нужно тратить выходные", subtitle "Приедем со своими средствами и инвентарём", blue button "Рассчитать уборку"; large bright photo of a sparkling clean living room with a cleaner in a uniform seen from behind and a basket of supplies on the right; below — three cards "Поддерживающая уборка от 2 900 ₽", "Генеральная уборка от 6 900 ₽", "Мытьё окон от 1 500 ₽".
Premium modern web design, Awwwards quality, generous whitespace, precise grid, realistic photography, crisp readable Russian text.
--ar 16:10 --style raw --no device mockup, browser frame, perspective, watermark, lorem ipsum
```

### Стоматология — «Мята»

```
Website landing page design for a family dental clinic, desktop screen 1440x900, straight front view, flat UI screenshot.
Style: clean, calm, medical but warm, soft rounded shapes. Colors: background #F6FAFB, text #10242B, accent #0B7C7E teal. Typography: modern sans-serif like Onest for headings, friendly sans-serif for body.
Layout: top navigation with logo "Стоматология «Мята»", menu "Услуги", "О клинике", "Контакты", phone "+7 900 000-00-00"; hero headline "Лечение зубов без страха и сюрпризов", subtitle "Составим план лечения и назовём стоимость заранее", teal button "Записаться на консультацию"; large photo of a bright modern dental treatment room with a white chair and plants on the right, no people; below — three cards "Консультация 1 000 ₽", "Профгигиена 4 500 ₽", "Лечение кариеса от 5 000 ₽".
Premium modern web design, Awwwards quality, generous whitespace, precise grid, realistic photography, crisp readable Russian text.
--ar 16:10 --style raw --no device mockup, browser frame, perspective, watermark, lorem ipsum
```

### Фотограф — «Анна Лебедева»

```
Website landing page design for a portrait photographer, desktop screen 1440x900, straight front view, flat UI screenshot.
Style: editorial, minimal, film photography feel, sharp corners, beige and black. Colors: background #F4F1EC, text #151515, accent #151515. Typography: elegant serif like Cormorant Garamond for headings, clean sans-serif for body.
Layout: top navigation with logo "Анна Лебедева" and caption "фотограф", menu "Портфолио", "Съёмки", "Контакты"; hero headline "Фотографии, в которых вы узнаете себя", black button "Забронировать дату"; large warm film-style portrait of a woman in a golden-hour field on the right; below — a grid of six portfolio photos: portrait, family, couple, studio, reportage, walk.
Premium modern web design, Awwwards quality, generous whitespace, precise grid, realistic photography, crisp readable Russian text.
--ar 16:10 --style raw --no device mockup, browser frame, perspective, watermark, lorem ipsum
```

### Цветочный магазин — «Цветы на Садовой»

```
Website landing page design for a flower shop, desktop screen 1440x900, straight front view, flat UI screenshot.
Style: tender, romantic, editorial, arch-shaped photo frames. Colors: background #F8F3EF, text #2C2A26, accent #A8405F raspberry. Typography: elegant serif like Playfair Display for headings, clean sans-serif for body.
Layout: top navigation with logo "Цветы на Садовой", menu "Каталог", "О мастерской", "Контакты", phone "+7 900 000-00-00"; hero headline "Букеты, которые говорят за вас", subtitle "Пришлём фото букета перед доставкой", raspberry button "Заказать букет"; large photo of a florist's hands arranging a peony and eucalyptus bouquet in an arch frame on the right; below — three cards with photos "Букет дня от 2 500 ₽", "Авторский букет от 4 500 ₽", "Цветы в коробке от 3 900 ₽".
Premium modern web design, Awwwards quality, generous whitespace, precise grid, realistic photography, crisp readable Russian text.
--ar 16:10 --style raw --no device mockup, browser frame, perspective, watermark, lorem ipsum
```

## Фото для галерей

Галереи (блок «Работы» / «Портфолио») используют файлы `<ниша>-gallery-1.jpg` … `-6.jpg` в `apps/web/public/images/niches/`. Формат 1:1, без текста и логотипов.

- **Барбершоп** (4): `Close-up of a textured crop men's haircut, vintage barbershop, warm moody light, no face visible` · `Classic side-part men's haircut from behind, barbershop` · `Barber shaping a beard with a straight razor, close-up, warm light` · `Skin fade haircut from the side, studio light, dark background`
- **Фотограф** (6): `Film-style portrait of a woman in golden hour light` · `Family of four laughing on a picnic blanket in a summer park` · `Couple walking along a beach at sunset, film photography` · `Studio portrait of a man on a beige backdrop, soft light` · `Candid reportage moment at a small wedding dinner, warm light` · `Woman walking through an autumn city street, film grain`
- **Цветы** (4): `Peony and eucalyptus bouquet on a linen table` · `Delicate white wedding bouquet held in hands` · `Pink roses arranged in a round hat box, top view` · `Seasonal wildflower bouquet in a ceramic vase`
