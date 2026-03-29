create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at
  before update on public.goals
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_objectives_updated_at on public.objectives;
create trigger set_objectives_updated_at
  before update on public.objectives
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_activities_updated_at on public.activities;
create trigger set_activities_updated_at
  before update on public.activities
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_indicators_updated_at on public.indicators;
create trigger set_indicators_updated_at
  before update on public.indicators
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_reporting_periods_updated_at on public.reporting_periods;
create trigger set_reporting_periods_updated_at
  before update on public.reporting_periods
  for each row execute procedure public.set_updated_at();

create index if not exists idx_activities_objective on public.activities(objective_id);
create index if not exists idx_activities_owner on public.activities(owner_id);
create index if not exists idx_schedule_activity_period on public.activity_schedule(activity_id, year, month);
create index if not exists idx_checkins_activity_period on public.monthly_checkins(activity_id, year, month);
create index if not exists idx_indicator_values_period on public.indicator_values(reporting_period_id);
create index if not exists idx_evidence_period on public.evidence_items(reporting_period_id);
create index if not exists idx_score_snapshots_period on public.score_snapshots(reporting_period_id);

create or replace view public.dashboard_activity_status as
select
  a.id,
  a.title,
  a.status,
  a.weight,
  o.code as objective_code,
  g.code as goal_code,
  d.name as department_name,
  p.full_name as owner_name
from public.activities a
join public.objectives o on o.id = a.objective_id
join public.goals g on g.id = o.goal_id
left join public.departments d on d.id = a.department_id
left join public.profiles p on p.id = a.owner_id;

