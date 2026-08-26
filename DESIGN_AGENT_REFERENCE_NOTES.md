# GitHub design-agent candidates — shortlist

Проверено 26 августа 2026 по официальным GitHub README.

| Проект | Роль | Лицензия | Как использовать для «Добрых дел» | Не использовать для |
|---|---|---|---|---|
| [tma.js](https://github.com/Telegram-Mini-Apps/tma.js) | TypeScript packages, examples и documentation для Telegram Mini Apps. | MIT | Сверять safe areas, native capabilities, lifecycle и React SDK patterns перед любым mobile interaction redesign. | Замены существующей серверной initData verification или миграции framework без отдельного security-аудита. |
| [Onlook](https://github.com/onlook-dev/onlook) | Visual-first AI design tool для React: визуальное редактирование и AI-подсказки поверх существующего приложения. | Apache-2.0 | Review существующих React screens, правки hierarchy и tokens, быстрые варианты отдельных participant surfaces. | Автоматического замещения production-кода без review и проверки Telegram native flows. |
| [screenshot-to-code](https://github.com/abi/screenshot-to-code) | Превращает screenshots, mockups, Figma designs и записи экрана в прототипы HTML/Tailwind/React/Vue. | MIT | Извлечение компоновки из approved moodboard/screenshots и выпуск disposable prototype для design critique. | Копирования чужих интерфейсов, брендов, контента или прямого commit результата без accessibility/performance review. |
| [OpenDesign](https://github.com/nexu-io/open-design) | Agent-native, local-first design workflow с versioned `DESIGN.md`, design systems, skills и templates. | Apache-2.0 | Использовать как дизайн-контракт следующего redesign: зафиксировать visual system в `DESIGN.md`, получить варианты, затем вручную адаптировать tested React-code. | Подключения к production без review, а также передачи реальных participant photo/данных во внешний процесс. |
| [UX/UI Agent Skills](https://github.com/plugin87/ux-ui-agent-skills) | Набор design tokens, component specs, accessibility и review gates для coding agent. | Проверяется отдельно перед подключением | Использовать как review rubric: один focal point на экран, contrast/touch-target/state checks и запрет бесцельного набора одинаковых карточек. | Бесконтрольного добавления всего набора skills в текущий проект до совместимости с его design tokens. |
| [Astryx](https://github.com/facebook/astryx) | Agent-ready React design system с typed components, CSS custom property theming и accessibility-first подходом. | MIT | Использовать как компонентный/token reference для будущих additions: темы через CSS variables, typed variants, composable accessible patterns. | Замены текущего shadcn/Radix stack в середине production redesign: это отдельная миграция, а не визуальный hotfix. |

## Вывод

Для следующего дизайна оптимален трёхступенчатый workflow: `tma.js` задаёт Telegram-native ограничения; screenshot-to-code создаёт из согласованного reference board независимый disposable prototype; OpenDesign или Onlook фиксируют design contract и сверяют hierarchy/tokens с существующим React Mini App. В production попадает только вручную адаптированный, tested результат.
