alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.objectives enable row level security;
alter table public.activities enable row level security;
alter table public.activity_schedule enable row level security;
alter table public.indicators enable row level security;
alter table public.reporting_periods enable row level security;
alter table public.monthly_checkins enable row level security;
alter table public.indicator_values enable row level security;
alter table public.evidence_items enable row level security;
alter table public.score_snapshots enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

do $$ begin
  create policy "authenticated users can read departments"
    on public.departments for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users can read own profile"
    on public.profiles for select to authenticated
    using (id = auth.uid() or public.current_user_role() in ('admin', 'mel_manager'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins manage profiles"
    on public.profiles for all to authenticated
    using (public.current_user_role() = 'admin')
    with check (public.current_user_role() = 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "authenticated users can read planning data"
    on public.goals for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "authenticated users can read objectives"
    on public.objectives for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "authenticated users can read activities"
    on public.activities for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins and mel managers manage planning data"
    on public.goals for all to authenticated
    using (public.current_user_role() in ('admin', 'mel_manager'))
    with check (public.current_user_role() in ('admin', 'mel_manager'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins and mel managers manage objectives"
    on public.objectives for all to authenticated
    using (public.current_user_role() in ('admin', 'mel_manager'))
    with check (public.current_user_role() in ('admin', 'mel_manager'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins and mel managers manage activity schedules"
    on public.activity_schedule for all to authenticated
    using (public.current_user_role() in ('admin', 'mel_manager'))
    with check (public.current_user_role() in ('admin', 'mel_manager'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "owners and managers manage activities"
    on public.activities for all to authenticated
    using (
      public.current_user_role() in ('admin', 'mel_manager')
      or owner_id = auth.uid()
    )
    with check (
      public.current_user_role() in ('admin', 'mel_manager')
      or owner_id = auth.uid()
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "authenticated users can read indicators"
    on public.indicators for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "managers manage indicators"
    on public.indicators for all to authenticated
    using (public.current_user_role() in ('admin', 'mel_manager'))
    with check (public.current_user_role() in ('admin', 'mel_manager'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "authenticated users can read reporting periods"
    on public.reporting_periods for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins manage reporting periods"
    on public.reporting_periods for all to authenticated
    using (public.current_user_role() = 'admin')
    with check (public.current_user_role() = 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "owners and managers manage monthly checkins"
    on public.monthly_checkins for all to authenticated
    using (
      public.current_user_role() in ('admin', 'mel_manager')
      or exists (
        select 1 from public.activities a
        where a.id = monthly_checkins.activity_id
          and a.owner_id = auth.uid()
      )
    )
    with check (
      public.current_user_role() in ('admin', 'mel_manager')
      or exists (
        select 1 from public.activities a
        where a.id = monthly_checkins.activity_id
          and a.owner_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "authenticated users can read indicator values"
    on public.indicator_values for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "managers manage indicator values"
    on public.indicator_values for all to authenticated
    using (public.current_user_role() in ('admin', 'mel_manager', 'department_owner'))
    with check (public.current_user_role() in ('admin', 'mel_manager', 'department_owner'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "authenticated users can read evidence"
    on public.evidence_items for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "contributors and managers manage evidence"
    on public.evidence_items for all to authenticated
    using (public.current_user_role() in ('admin', 'mel_manager', 'department_owner', 'contributor'))
    with check (public.current_user_role() in ('admin', 'mel_manager', 'department_owner', 'contributor'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "authenticated users can read scores"
    on public.score_snapshots for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "managers manage scores"
    on public.score_snapshots for all to authenticated
    using (public.current_user_role() in ('admin', 'mel_manager'))
    with check (public.current_user_role() in ('admin', 'mel_manager'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "managers read audit logs"
    on public.audit_logs for select to authenticated
    using (public.current_user_role() in ('admin', 'mel_manager'));
exception when duplicate_object then null; end $$;
