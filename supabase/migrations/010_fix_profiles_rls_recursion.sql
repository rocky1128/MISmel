-- Prevent recursive RLS evaluation when policies ask for the current user's role.
-- The helper must bypass profile-table RLS; otherwise the profiles policy can call
-- back into itself and trigger "stack depth limit exceeded" after login.

revoke all on function public.current_user_role() from public;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

grant execute on function public.current_user_role() to authenticated;
