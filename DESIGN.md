# Добрые дела — design contract

## 1. Назначение

«Добрые дела» — корпоративный Telegram Mini App для участия в активностях, подтверждения результата P&C и видимого командного вклада. Интерфейс должен ощущаться как **спокойный, уверенный и живой internal product**, а не как пёстрый gamification dashboard. Каждый экран отвечает на один вопрос: что происходит, почему это важно и какое следующее действие доступно.

## 2. Design direction

> **Calm impact editorial.** Тёплый базовый canvas, сильная тёмная типографика, один cobalt action, подтверждение лаймом и content-first фото.

### Дизайн-принципы

1. **Один focal point на экран.** Hero metric, current action или главный кадр — но не несколько одновременно сильных карточек.
2. **Сначала content, затем chrome.** Фотография, задание, прогресс или участник важнее рамок, теней, орбов и декоративных эффектов.
3. **Одна semantic роль — один цвет.** Cobalt для primary/selected/focus, lime только для confirmed/success, coral только для attention/revise. Нейтральная информация не получает акцентный цвет.
4. **Section sheet вместо card-in-card.** Белая поверхность задаёт логическую секцию; внутри применяются divider rows и пространство, а не новые вложенные контейнеры.
5. **Motion подтверждает действие.** Анимации короткие, прерываемые, построены только на `transform` и `opacity`; они никогда не служат декорацией в idle состоянии.

## 3. Foundation tokens

| Роль | Токен | Использование |
|---|---|---|
| Canvas | `#F8F6F1` | Основной фон participant Mini App. |
| Ink | `#172033` | Заголовки, ключевые числа и тёмные media surfaces. |
| Text secondary | `#667085` | Подписи и контекст. |
| Border | `#E8E5DF` | Нейтральные разделители. |
| Primary | `#315FF4` | CTA, selected tab, focus, активное состояние. |
| Primary wash | `#EEF2FF` | Тихая metadata подложка. |
| Confirmed | `#BDEB68` | Подтверждённые достижения и успешный статус. |
| Attention | `#FF8A70` | Только revise/внимание модератора. |

## 4. Layout and typography

- Mobile content column: `max-width: 672px`; horizontal padding 16px (24px от `sm`).
- Вертикальный ритм: 12px для связанных элементов, 16px между section sheets, 24px перед новым смысловым блоком.
- Hero radius: 24px; section radius: 20–23px; control radius: 12–16px.
- Display title: Onest ExtraBold, letter-spacing от `-0.055em` до `-0.04em`; body text не конкурирует с display type.
- Kicker/label: 10px, upper-case, letter-spacing `0.14–0.16em`, только contextual color.

## 5. Component contracts

### Participant progress

Экран показывает одну leading мысль: текущий период либо следующий шаг. Дополнительные метрики — secondary grid или list rows. Не создавать четыре равнозначные statistic cards.

### Activity feed

Feed — editorial list внутри одного sheet: initial mark, одна sentence, спокойная metadata row и divider. Не использовать цветные background cards на каждое событие.

### Gallery

Один front photo stage с максимум двумя quiet depth planes. Caption находится в нижней gradient safe-zone. Обычный tap открывает lightbox; горизонтальный intentional swipe меняет кадр; вертикальный scroll страницы сохраняется. Никаких autoplay, WebGL, idle drift, blur-heavy layers или ручного drag-follow.

### Achievements

Открыта одна category; other categories свернуты. Badge — одинаковый framed size. Full catalog reward отображается одним compact reward row, не отдельной яркой карточкой в карточке.

### Bottom navigation

Пять равнозначных touch targets. Только active tab имеет cobalt fill. Dock остаётся нейтральным, не должен быть главным визуальным объектом экрана.

## 6. Interaction and accessibility

- Минимальный hit target — 44×44 CSS px для основных touch controls.
- Состояния focus, pressed, loading, empty, error и disabled проектируются намеренно.
- `prefers-reduced-motion` выключает несущественные transitions.
- Вход/смена секции: 180–260ms, `cubic-bezier(0.23, 1, 0.32, 1)`.
- Не анимировать `width`, `height`, `top`, `left`, `padding` или `margin` в interactive flows.

## 7. Definition of done for a UI change

1. Design change соответствует semantic roles из этого документа.
2. Нет лишнего hardcoded accent color, card-in-card или декоративной motion без user purpose.
3. Есть loading, empty, error, focus и reduced-motion path.
4. Прошли typecheck, Vitest, production build и screenshot/real-device Telegram QA.
5. Production change не ослабляет server-side Telegram verification, P&C moderation или privacy фильтры.
