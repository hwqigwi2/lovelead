-- Quiz restart is no longer time-limited: users may retake the survey at any moment,
-- so the temporary restart window column is obsolete.
alter table public.users drop column if exists quiz_restart_until;
