# External Render Setup

## Состав инфраструктуры

Внешняя версия использует бесплатный Render Web Service, TiDB Cloud Starter как MySQL-совместимую базу и Backblaze B2 как S3-совместимое хранилище. Полные данные регистрации, отчётов, баллов и материалов не зависят от локального диска Render. Авторизация админ-панели выполняется двумя паролями Chief/P&C, которые хранятся в защищённых переменных Render.

| Компонент | Выбранный сервис | Бесплатная граница | Примечание |
|---|---|---|---|
| Web-приложение | Render Web Service | Free instance | Останавливается после простоя; первый webhook после простоя может задержаться. |
| База данных | TiDB Cloud Starter | До 5 GiB row storage и 50 млн RU в месяц | MySQL-совместима; требуется TLS-соединение. |
| Вложения | Backblaze B2 | Первые 10 GB хранения | Private bucket с серверным шифрованием; за пределами квоты возможны расходы. |

## TiDB Cloud Starter

Создайте один **Starter** instance в TiDB Cloud и откройте **Connect**. Используйте TLS-вариант MySQL connection string с базой `sys`; это значение передаётся как `DATABASE_URL` и никогда не попадает в GitHub. Для бесплатной эксплуатации задайте monthly spending limit `$0` и контролируйте расход Request Units.

> При исчерпании бесплатной квоты TiDB Starter ограничивает новые подключения до следующего месяца или повышения лимита. Следите за RU и размером базы в панели TiDB.

## Backblaze B2

Создайте private bucket `corporate-good-deeds`, включите Backblaze-managed server-side encryption и создайте Application Key с read/write-доступом только к этому bucket. Переменные Render должны иметь следующий вид.

| Переменная | Значение |
|---|---|
| `STORAGE_ENDPOINT` | `https://s3.ca-east-006.backblazeb2.com` |
| `STORAGE_BUCKET` | `corporate-good-deeds` |
| `STORAGE_ACCESS_KEY_ID` | Backblaze application key ID |
| `STORAGE_SECRET_ACCESS_KEY` | Backblaze application key |
| `STORAGE_REGION` | `ca-east-006` |

## Render Blueprint

Файл `render.yaml` создаёт Node Web Service на free plan, автоматически выполняет миграции Drizzle до старта и запускает сервис через `pnpm start`. При создании Blueprint заполните все поля с `sync: false`.

| Переменная | Источник |
|---|---|
| `DATABASE_URL` | TiDB Cloud Starter Connect |
| `TELEGRAM_BOT_TOKEN` | BotFather token |
| `CHIEF_ADMIN_PASSWORD` | Chief пароль, заданный при подготовке проекта |
| `PC_ADMIN_PASSWORD` | P&C пароль, заданный при подготовке проекта |
| `STORAGE_*` | Backblaze B2 bucket и Application Key |

`JWT_SECRET` Render генерирует сам. После первого успешного деплоя скопируйте public URL Render в раздел **Telegram** админ-панели, укажите chat ID каналов модерации и сохраните настройки. Система установит Telegram webhook и кнопку «Статистика» для этого URL.

## Обязательная проверка

Проверьте вход обоими ролями, создание участника, получение заявки в канале, подачу фото-отчёта, отклонение и подтверждение отчёта. Убедитесь, что баллы появляются только после подтверждения. При превышении бесплатных квот остановите массовые рассылки и проверьте использование в TiDB, Backblaze B2 и Render.

## References

[1] TiDB Cloud Starter plan: <https://docs.pingcap.com/tidbcloud/select-cluster-tier/>

[2] Backblaze B2 pricing: <https://www.backblaze.com/cloud-storage/pricing>

[3] Render Free instances: <https://render.com/docs/free>

[4] Render Blueprint specification: <https://render.com/docs/blueprint-spec>

[5] Backblaze B2 S3-compatible API: <https://www.backblaze.com/docs/cloud-storage-s3-compatible-api>
