-- Эндпоинт app/api/admin/users/[id]/tasks/[taskId]/complete пишет
-- admin_actions.action = 'complete_task', а constraint из 001 разрешал только 'hide_task'.
alter table public.admin_actions
  drop constraint if exists admin_actions_action_check;

alter table public.admin_actions
  add constraint admin_actions_action_check
  check (action in ('hide_task', 'complete_task'));
