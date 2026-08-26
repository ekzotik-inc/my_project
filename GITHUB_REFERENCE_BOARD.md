# GitHub Reference Board для «Добрых дел»

**Цель.** Следующий redesign не должен строиться на случайных визуальных правках. Эта подборка разделяет источники на Telegram-native основу, инструменты для создания и критики варианта и design-system reference. Все проекты проверены по их GitHub README и метаданным 26 августа 2026.

## Рекомендуемый shortlist

| Приоритет | Репозиторий | Что даёт | Лицензия | Решение для нашего проекта |
|---:|---|---|---|---|
| 1 | [Telegram-Mini-Apps/tma.js][1] | TypeScript packages, examples и документация для Telegram Mini Apps. | MIT | **Использовать как технический reference.** Проверять safe areas, lifecycle и нативные interaction patterns перед каждым mobile change. |
| 2 | [nexu-io/open-design][2] | Local-first agent-native workflow: `DESIGN.md`, design systems, skills и templates; заявлена работа с существующим репозиторием. | Apache-2.0 | **Главный design-agent кандидат.** Сначала создаём собственный `DESIGN.md` и только затем получаем варианты redesign. |
| 3 | [onlook-dev/onlook][3] | Visual-first AI design tool для React-приложений. | Apache-2.0 | **Кандидат для visual review.** Полезен, когда надо сравнить 2–3 варианта hierarchy на реальном React screen. |
| 4 | [abi/screenshot-to-code][4] | Преобразует screenshots, mockups, Figma и screen recordings в прототипы HTML/Tailwind/React/Vue. | MIT | **Кандидат для одноразовых prototype.** Загружаем только согласованные, обезличенные reference screens; результат не попадает в production без ручной адаптации. |
| 5 | [facebook/astryx][5] | Agent-ready React design system с CSS custom-property theming и accessible components. | MIT | **Reference для token architecture.** Берём подход к tokens/variants/accessibility, но не мигрируем текущий stack целиком. |
| 6 | [plugin87/ux-ui-agent-skills][6] | UX/UI review skills, tokens, specs и accessibility gates. | Лицензия не заявлена | **Только reading/reference.** Его rubric полезна для review, но код/контент нельзя копировать без лицензии. |

## Что именно брать как visual references

> Мы не копируем чужие экраны, бренд, тексты или изображения. Мы берём **принципы компоновки** и проверяем их на нашей Telegram-native архитектуре.

| Экран «Добрых дел» | Reference задача | Обязательный outcome |
|---|---|---|
| Мой путь | Один focal point: текущая активность или личный impact; supporting metrics второго уровня. | Один hero/action, не сетка равнозначных карточек. |
| Галерея | Photo-first reading: один главный кадр, спокойный контекст, предсказуемый touch interaction. | Фото сильнее UI-обвязки; нет тяжёлой многослойной декорации. |
| Команда / лидеры | Редакционная list hierarchy и сравнение только по одной понятной метрике. | У каждого списка есть первый элемент внимания и мягкие secondary rows. |
| Достижения | Смысловой прогресс, а не 20 одинаковых цветных плиток. | Открытая категория + один clear reward state. |

## Design-agent workflow

| Шаг | Инструмент | Артефакт | Контроль качества |
|---:|---|---|---|
| 1 | `tma.js` reference | Telegram-native constraints: safe area, gesture, haptic, touch targets. | Не меняем серверную Telegram verification или permissions. |
| 2 | Наш `DESIGN.md` / OpenDesign | Один approved visual direction: tokens, spacing, type scale, surface hierarchy, motion budget. | Пользователь утверждает один direction до кодирования. |
| 3 | screenshot-to-code | Disposable prototype на обезличенном reference/moodboard. | Никаких participant photo, токенов или production API. |
| 4 | Onlook или ручной review | Сравнение prototype с настоящими React screens. | Проверяем mobile screenshot, focus, reduced motion, loading/empty/error states. |
| 5 | Production implementation | Небольшой tested change set. | `pnpm test`, typecheck, build, Render bundle и real-device Telegram QA. |

## Чего не делать

Не стоит добавлять в production все найденные design systems или запускать design agents на репозитории с реальными данными участников без отдельного решения по privacy. Не стоит переносить компоненты из проекта без понятной лицензии. Самый высокий риск для нашего продукта — снова смешать несколько сильных стилей; поэтому следующий шаг должен быть не «ещё один визуальный эксперимент», а утверждение **одного** direction и его implementation по design contract.

## Рекомендация

Для «Добрых дел» рекомендую связку **tma.js + OpenDesign approach + screenshot-to-code только для прототипов**. Практически это означает: сначала я подготовлю один `DESIGN.md` с тремя возможными направлениями, затем вы выберете один, и только после этого мы переработаем 2–3 наиболее важных participant-экрана в одном цельном стиле.

## References

[1]: https://github.com/Telegram-Mini-Apps/tma.js "Telegram-Mini-Apps/tma.js"
[2]: https://github.com/nexu-io/open-design "nexu-io/open-design"
[3]: https://github.com/onlook-dev/onlook "onlook-dev/onlook"
[4]: https://github.com/abi/screenshot-to-code "abi/screenshot-to-code"
[5]: https://github.com/facebook/astryx "facebook/astryx"
[6]: https://github.com/plugin87/ux-ui-agent-skills "plugin87/ux-ui-agent-skills"
