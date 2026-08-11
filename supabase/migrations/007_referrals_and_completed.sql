-- 007: реферальная модель, статус 'completed' и переименование tbank → debet.
-- Исторические миграции 001-006 не изменяем.

-- users: реферальные поля.
alter table public.users add column if not exists referral_code text unique;
alter table public.users add column if not exists referred_by uuid references public.users(id) on delete set null;

-- Бэкфилл referral_code для существующих пользователей.
update public.users
set referral_code = substr(md5(random()::text || telegram_id::text), 1, 10)
where referral_code is null;

create index if not exists users_referred_by_idx on public.users(referred_by);

-- tasks: актуальные slug'и (tbank уходит, появляется debet).
alter table public.tasks drop constraint if exists tasks_slug_check;

-- Переименовываем существующую строку tbank → debet (id сохраняется,
-- связанные строки user_tasks/admin_actions остаются валидными).
update public.tasks
set slug = 'debet',
    title = 'Дебетовые карты',
    category = 'Карты',
    description = 'Оформляй дебетовые карты, выполняй условия и получай выплату.',
    payout = 5000,
    payout_label = 'до 5 000 ₽',
    time_label = '≈ 5 минут',
    difficulty = '1/5',
    image = '/debet.jpg'
where slug = 'tbank';

-- Переименовываем РКО-задания.
update public.tasks
set title = 'Расчетный счет (Бизнес-карта) Альфа-Банк'
where slug = 'rko';

update public.tasks
set title = 'Расчетный счет (Бизнес-карта) Т-Банк'
where slug = 'tbank-rko';

-- sort_order UNIQUE, поэтому сначала переводим на временные значения,
-- финальные: debet = 1, rko = 2, tbank-rko = 3.
update public.tasks set sort_order = 1001 where slug = 'debet';
update public.tasks set sort_order = 1002 where slug = 'rko';
update public.tasks set sort_order = 1003 where slug = 'tbank-rko';
update public.tasks set sort_order = 1 where slug = 'debet';
update public.tasks set sort_order = 2 where slug = 'rko';
update public.tasks set sort_order = 3 where slug = 'tbank-rko';

alter table public.tasks add constraint tasks_slug_check check (slug in ('debet','rko','tbank-rko'));

-- user_tasks: статус 'completed' и отметка времени выполнения.
alter table public.user_tasks drop constraint if exists user_tasks_status_check;
alter table public.user_tasks add constraint user_tasks_status_check check (status in ('available','started','hidden','completed'));
alter table public.user_tasks add column if not exists completed_at timestamptz;
