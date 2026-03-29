create table if not exists public.reporting_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  year integer not null,
  quarter smallint check (quarter between 1 and 4),
  month smallint check (month between 1 and 12),
  start_date date not null,
  end_date date not null,
  status public.period_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monthly_checkins (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  month smallint not null check (month between 1 and 12),
  year integer not null,
  status public.activity_status not null default 'planned',
  percent_complete numeric(5,2) not null default 0 check (percent_complete between 0 and 100),
  summary text,
  risks text,
  next_steps text,
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  unique (activity_id, month, year)
);

create table if not exists public.indicator_values (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references public.indicators(id) on delete cascade,
  reporting_period_id uuid not null references public.reporting_periods(id) on delete cascade,
  actual_value numeric(14,2) not null,
  comment text,
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  unique (indicator_id, reporting_period_id)
);

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references public.activities(id) on delete cascade,
  indicator_id uuid references public.indicators(id) on delete cascade,
  reporting_period_id uuid not null references public.reporting_periods(id) on delete cascade,
  title text not null,
  description text,
  evidence_type text not null,
  file_path text,
  external_url text,
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  verification_status public.verification_status not null default 'pending',
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  learning_note text,
  constraint evidence_link_required check (activity_id is not null or indicator_id is not null)
);

create table if not exists public.score_snapshots (
  id uuid primary key default gen_random_uuid(),
  reporting_period_id uuid not null references public.reporting_periods(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  objective_id uuid references public.objectives(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete cascade,
  score numeric(7,2) not null,
  weighted_score numeric(7,2) not null,
  calculated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

