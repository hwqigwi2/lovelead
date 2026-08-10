# LoveLead — Telegram Mini App

LoveLead — mobile-first Telegram Mini App для показа персонально доступных партнёрских заданий. Проект объединяет Next.js App Router, защищённую Telegram Mini Apps-авторизацию, Supabase PostgreSQL, админ-панель и Telegram Bot webhook.

## Что внутри

- серверная проверка Telegram `initData` по алгоритму Telegram Web Apps;
- автоматический upsert Telegram-профиля по уникальному `telegram_id`;
- quiz и изолированный qualification engine;
- задания T-Банк, РКО и МФО с серверной фильтрацией и состояниями `available` / `started` / `hidden`;
- админ-панель `/admin`, доступная только Telegram ID из `ADMIN_TELEGRAM_IDS`;
- миграция с таблицами, индексами, внешними ключами, триггерами и RLS;
- реальные предоставленные изображения партнёров и отзывов в `public/`;
- готовый к Vercel webhook Telegram-бота.

## Локальный запуск

1. Установите Node.js 20+ и зависимости:

   ```bash
   npm install
   ```

2. Создайте `.env.local` на основе `.env.example` и заполните значения:

   ```bash
   Copy-Item .env.example .env.local
   ```

   `SUPABASE_SECRET_KEY`, `TELEGRAM_BOT_TOKEN` и `TELEGRAM_WEBHOOK_SECRET` используются только на сервере. Никогда не передавайте их в браузер или Git.

3. Примените миграцию к новому Supabase-проекту:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   Либо вставьте содержимое `supabase/migrations/001_initial.sql` в SQL Editor нового проекта и выполните его один раз.

4. Запустите приложение:

   ```bash
   npm run dev
   ```

   Локальный URL нельзя использовать как Mini App URL: Telegram требует публичный HTTPS. Для разработки используйте временный HTTPS-туннель и поместите его в `NEXT_PUBLIC_APP_URL`.

## Настройка Supabase

В настройках проекта Supabase возьмите URL и publishable key для `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Для серверного слоя создайте секретный server key и поместите его только в `SUPABASE_SECRET_KEY`.

Клиент не обращается к таблицам напрямую: RLS запрещает прямой доступ `anon`/`authenticated`; сервер верифицирует Telegram identity и выдаёт только записи текущего пользователя. Админские запросы дополнительно проверяют список `ADMIN_TELEGRAM_IDS`.

## Подключение бота и Mini App

1. Создайте бота через [@BotFather](https://t.me/BotFather) и сохраните токен в `TELEGRAM_BOT_TOKEN`.
2. После первого Vercel deploy задайте `NEXT_PUBLIC_APP_URL=https://your-project.vercel.app`.
3. В BotFather откройте `/mybots` → ваш бот → **Bot Settings** → **Menu Button** (или **Configure Mini App**) и установите этот HTTPS URL.
4. Установите webhook c секретом, который совпадает с `TELEGRAM_WEBHOOK_SECRET`:

   ```text
   https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://your-project.vercel.app/api/bot/webhook&secret_token=<WEBHOOK_SECRET>
   ```

5. Отправьте боту `/start`. Webhook отправит приветствие и inline-кнопку «Получить задание», открывающую Mini App.

Для перехода на `lovelead.app` добавьте домен в Vercel, обновите `NEXT_PUBLIC_APP_URL`, домен Mini App в BotFather и webhook URL. Перезапустите deployment после изменения переменных.

## Vercel deployment

1. Импортируйте репозиторий в Vercel.
2. Добавьте все значения из `.env.example` в **Settings → Environment Variables** (для Production и Preview по необходимости).
3. Не добавляйте в Vercel переменные с пустыми значениями для недоступных партнёрских ссылок, если хотите явно отключить CTA.
4. Deploy. Перед production проверьте `/api/telegram/auth` из настоящего Telegram Mini App и `/admin` под разрешённым Telegram ID.

## Проверки

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

## Ручные production-шаги

- создать Supabase project и применить migration;
- заполнить реальные environment variables;
- создать бота в BotFather, зарегистрировать Mini App URL и webhook;
- подключить Vercel URL, затем production domain;
- вручную пройти auth и задания в Telegram на iOS/Android/Desktop.
