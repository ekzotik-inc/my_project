# Design-agent workflow — Добрые дела

## Выбранный набор

| Инструмент | Роль | Разрешённый вход | Запрещённый вход |
|---|---|---|---|
| OpenDesign approach | Главный design contract и critique workflow через `DESIGN.md`. | Наш код, собственные tokens, обезличенные screenshots, утверждённый brief. | Токены, cookies, Telegram initData, production database exports, реальные private participant photos без отдельного решения. |
| tma.js | Telegram-native guardrail. | Публичная документация/SDK patterns для safe areas, lifecycle, haptics и controls. | Замена существующего server-side initData verification без security review. |
| screenshot-to-code | Одноразовый prototype из approved moodboard/screenshots. | Собственные wireframes, обезличенные/согласованные reference images. | Чужие интерфейсы для копирования, реальные фото участников, production API responses, секреты. |

## Цикл следующего redesign

1. Сформулировать screen brief: пользователь, один основной outcome, states, data constraints и Telegram context.
2. Зафиксировать token/visual direction в `DESIGN.md`; не кодировать три конкурирующих стиля одновременно.
3. При необходимости собрать disposable prototype через screenshot-to-code; он живёт отдельно от production source.
4. Провести critique по `DESIGN.md`: focal point, hierarchy, token roles, touch targets, states, motion budget.
5. Вручную внедрить небольшие изменения в React и сохранить business/security invariants.
6. Проверить typecheck, tests, build, rendered states и реальный Telegram WebView.

## Release gate

Ни один agent output не идёт в `main` напрямую. Перед production release необходимы code review, tests, production build, server-side security invariants и реальный mobile check. Если visual direction не утверждён, работа останавливается на prototype/review, а не превращается в очередной набор точечных CSS-правок.
