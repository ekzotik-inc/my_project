# Бесплатное внешнее размещение

## Состав инфраструктуры

Внешняя версия использует один бесплатный Render Web Service, TiDB Cloud Starter как MySQL-совместимую базу и Cloudflare R2 как S3-совместимое хранилище. Полные данные регистрации, отчётов, баллов и материалов больше не зависят от локального диска Render. Авторизация админ-панели выполняется двумя паролями Chief/P&C, которые хранятся в защищённых переменных Render.

| Компонент | Выбранный сервис | Бесплатная граница | Примечание |
|---|---|---|---|
| Web-приложение | Render Web Service | Free instance | Останавливается после простоя; первый webhook после простоя может задержаться |
| База данных | TiDB Cloud Starter | 5 GiB row storage и 50 млн RU в месяц | MySQL-совместима; требуются TLS-параметры соединения |
| Вложения | Cloudflare R2 Standard | 10 GB-месяцев, 1 млн записей и 10 млн чтений в месяц | Требует R2 subscription; за пределами квоты возможны расходы |

## Создание TiDB Cloud Starter

Создайте один **Starter** instance в TiDB Cloud. После создания откройте **Connect**, создайте database `corporate_good_deeds` и скопируйте MySQL connection string. Для Render используйте TLS-вариант строки, который показывает TiDB. Значение передаётся как `DATABASE_URL` и никогда не попадает в GitHub.

> При исчерпании бесплатной квоты TiDB Starter ограничивает новые подключения до следующего месяца или повышения лимита. Следите за RU и размером базы в панели TiDB.

## Создание Cloudflare R2

В Cloudflare откройте **Storage & databases → R2**, завершите подключение R2, затем создайте bucket `corporate-good-deeds`. Создайте API token с правами чтения и записи только к этому bucket и скопируйте access key ID, secret access key и account ID. Переменные Render должны иметь вид:

| Переменная | Значение |
|---|---|
| `STORAGE_ENDPOINT` | `https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `STORAGE_BUCKET` | `corporate-good-deeds` |
| `STORAGE_ACCESS_KEY_ID` | R2 access key ID |
| `STORAGE_SECRET_ACCESS_KEY` | R2 secret access key |
| `STORAGE_REGION` | `auto` |

## Render Blueprint

Файл `render.yaml` создаёт Node Web Service на free plan, автоматически выполняет миграции Drizzle до старта и запускает сервис через `pnpm start`. В Render при создании Blueprint заполните все поля с `sync: false`:

| Переменная | Источник |
|---|---|
| `DATABASE_URL` | TiDB Cloud Starter Connect |
| `TELEGRAM_BOT_TOKEN` | BotFather token |
| `CHIEF_ADMIN_PASSWORD` | Chief пароль, заданный при подготовке проекта |
| `PC_ADMIN_PASSWORD` | P&C пароль, заданный при подготовке проекта |
| `STORAGE_*` | R2 bucket и API token |

`JWT_SECRET` Render генерирует сам. После первого успешного деплоя скопируйте public URL Render в раздел **Telegram** админ-панели, укажите chat ID каналов модерации и сохраните настройки. Система установит Telegram webhook и кнопку «Статистика» для этого URL.

## Обязательная проверка

Проверьте вход обоими ролями, создание участника, получение заявки в канале, подачу фото-отчёта, отклонение и подтверждение отчёта. Убедитесь, что баллы появляются только после подтверждения. При превышении бесплатных квот остановите массовые рассылки и проверьте использование в TiDB, R2 и Render.

## References

[1] TiDB Cloud Starter plan: <https://docs.pingcap.com/tidbcloud/select-cluster-tier/>

[2] Cloudflare R2 pricing: <https://developers.cloudflare.com/r2/pricing/>

[3] Render Free instances: <https://render.com/docs/free>

[4] Render Blueprint specification: <https://render.com/docs/blueprint-spec>
