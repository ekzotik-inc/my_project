# Telegram-native возможности для «Добрых дел»

Источник: официальная документация Telegram Mini Apps и Bot API, проверено 25 августа 2026 года.

## Применимые возможности

| Возможность | Продуктовое применение в «Добрых делах» | Решение |
|---|---|---|
| ThemeParams, safe area и адаптивная высота Mini App | Нативное ощущение Mini App на iOS/Android, без конфликтов с системными зонами Telegram | Внедрить обязательно |
| HapticFeedback, BottomButton, SecondaryButton | Тактильное подтверждение редких, значимых действий: переход по вкладке, открытие задачи, копирование шаблона | Внедрить с feature detection и reduced-motion fallback |
| Main Mini App | Кнопка запуска в профиле бота и демонстрационные превью | Описать шаги настройки в BotFather; технически сайт уже готов к запуску |
| Fullscreen и swipes control | Использовать только на широких participant-facing экранах; не делать полноэкранный режим обязательным | Опционально, не блокировать базовый сценарий |
| DeviceStorage / SecureStorage | Локально запоминать необязательные UI-предпочтения, не хранить бизнес-данные или учётные данные | Использовать только для view-state при наличии поддержки |
| Rich Messages / Custom Emoji | У Telegram появились структурированные rich messages и custom emoji в Bot API. Их доступность зависит от актуальной конфигурации и прав бота, поэтому вместо жёстко заданных чужих ID необходим capability-aware fallback на стандартные emoji и Markdown | Спроектировать fallback; не использовать непроверенные custom emoji IDs |
| Main Mini App profile previews | Качественные скриншоты и короткие видео в профиле бота помогают объяснить продукт до запуска | Отдельная операционная настройка владельца в BotFather |

## Неприменимые или отложенные возможности

- Telegram Stars, подписки и подарки не относятся к корпоративной системе и не должны влиять на начисление внутренних баллов.
- Геолокация, движение устройства, QR-коды и attachment menu не нужны для базового сценария и не будут добавляться ради новизны.
- Бейджи и любые новые стимулы должны сохранять инвариант: баллы — только после явного подтверждения P&C.

## Источники

1. [Telegram Mini Apps](https://core.telegram.org/bots/webapps): theme parameters, safe areas, fullscreen, HapticFeedback, BottomButton, DeviceStorage, Main Mini App и guidance по дизайну.
2. [Telegram Bot API](https://core.telegram.org/bots/api): Bot API 10.1–10.3, Rich Messages, custom emoji, inline keyboard enhancements и webhook updates.
