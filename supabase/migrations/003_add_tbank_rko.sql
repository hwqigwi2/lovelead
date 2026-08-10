-- 003: добавить tbank-rko как полную копию rko.
-- Копируются ВСЕ поля из существующей строки slug='rko'; меняются только
-- slug, title, image, url, sort_order. url остаётся NULL (реальная ссылка
-- приходит из NEXT_PUBLIC_TBANK_RKO_URL).
-- Идемпотентно: повторный запуск безопасен. sort_order имеет UNIQUE
-- constraint, поэтому сначала переводим rko/mfo на временные значения,
-- чтобы не было коллизий при перестановке.

alter table public.tasks drop constraint tasks_slug_check;
alter table public.tasks add constraint tasks_slug_check check (slug in ('tbank','tbank-rko','rko','mfo'));

-- Шаг 1: освобождаем занятые sort_order (tbank не трогаем).
update public.tasks set sort_order = 1001 where slug = 'rko';
update public.tasks set sort_order = 1002 where slug = 'mfo';

-- Шаг 2: создаём tbank-rko как копию rko с sort_order = 2.
insert into public.tasks (slug, title, category, description, payout, payout_label, time_label, difficulty, image, url, is_active, sort_order)
select 'tbank-rko', 'Т-Банк РКО', category, description, payout, payout_label, time_label, difficulty, '/trko.jpg', null, is_active, 2
from public.tasks
where slug = 'rko'
on conflict (slug) do nothing;

-- Шаг 3: финальные значения. tbank = 1 (не трогаем), tbank-rko = 2, rko = 3, mfo = 4.
update public.tasks set sort_order = 2 where slug = 'tbank-rko';
update public.tasks set sort_order = 3 where slug = 'rko';
update public.tasks set sort_order = 4 where slug = 'mfo';
