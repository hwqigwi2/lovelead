-- 006: полностью убираем задание МФО из актуального состояния БД.
-- FK user_tasks.task_id и admin_actions.task_id имеют on delete cascade,
-- поэтому физическое удаление безопасно: связанные строки удалятся каскадом.
-- Исторические миграции 001-005 не изменяем.
-- Безопасна при повторном запуске.

delete from public.tasks
where slug = 'mfo';

-- Ослабляем check-constraint на slug (добавления новых задач не планируются,
-- constraint оставляем только для актуальных slug'ов).
alter table public.tasks drop constraint if exists tasks_slug_check;
alter table public.tasks add constraint tasks_slug_check check (slug in ('tbank','tbank-rko','rko'));

-- Актуализируем описание обоих РКО (совпадает с RKO_DESCRIPTION в lib/config.ts).
update public.tasks
set description = 'Бесплатно откроем ИП на НПД даже если бизнеса нет и не планировался. Никаких вложений ни сейчас, ни потом. Оформляешь карту и выполняешь условия'
where slug in ('rko', 'tbank-rko');
