create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null unique,
  username text,
  first_name text not null,
  last_name text,
  avatar_url text,
  age smallint check (age is null or age between 0 and 120),
  has_tbank boolean,
  has_ip boolean,
  has_npd boolean,
  is_military boolean,
  has_arrest boolean,
  quiz_completed boolean not null default false,
  quiz_completed_at timestamptz,
  quiz_restart_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('tbank','rko','mfo')),
  title text not null,
  category text not null,
  description text not null,
  payout numeric,
  payout_label text not null,
  time_label text not null,
  difficulty text not null,
  image text not null,
  url text,
  is_active boolean not null default true,
  sort_order smallint not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  status text not null default 'available' check (status in ('available','started','hidden')),
  started_at timestamptz,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, task_id)
);

create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  answers jsonb not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_telegram_id bigint not null,
  user_id uuid not null references public.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  action text not null check (action in ('hide_task')),
  created_at timestamptz not null default now()
);

create index users_telegram_id_idx on public.users(telegram_id);
create index users_quiz_completed_idx on public.users(quiz_completed);
create index user_tasks_user_status_idx on public.user_tasks(user_id, status);
create index quiz_sessions_user_idx on public.quiz_sessions(user_id, created_at desc);
create index admin_actions_user_idx on public.admin_actions(user_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger users_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger user_tasks_updated_at before update on public.user_tasks for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.tasks enable row level security;
alter table public.user_tasks enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.admin_actions enable row level security;

-- Telegram identities are verified by the Next.js server. No direct client access is granted;
-- the service role bypasses RLS and queries are always restricted to the verified user.
create policy "No direct users access" on public.users for all to anon, authenticated using (false) with check (false);
create policy "No direct tasks access" on public.tasks for all to anon, authenticated using (false) with check (false);
create policy "No direct user_tasks access" on public.user_tasks for all to anon, authenticated using (false) with check (false);
create policy "No direct quiz access" on public.quiz_sessions for all to anon, authenticated using (false) with check (false);
create policy "No direct admin access" on public.admin_actions for all to anon, authenticated using (false) with check (false);

insert into public.tasks (slug, title, category, description, payout, payout_label, time_label, difficulty, image, url, sort_order)
values
('tbank','Карта Т-Банк','Карты','Оформи карту, получи её и выполни покупку от 500 ₽. После выполнения напиши менеджеру, чтобы получить выплату согласно условиям задания.',1000,'1 000 ₽','≈ 5 минут','1/5','/tbank.jpg',null,1),
('rko','РКО','Для бизнеса','Расчётно-кассовое обслуживание для бизнеса. Менеджер подскажет подходящий вариант и дальнейшие шаги.',null,'от 10 000 ₽','Индивидуально','2/5','/arko.jpg',null,2),
('mfo','Быстрая выплата','Партнёрское предложение','Выполни условия задания партнёра и получи выплату согласно его условиям.',null,'до 24 000 ₽','≈ 10 минут','1/5','/mfo.jpg',null,3);
