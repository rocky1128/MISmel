create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  department_id uuid references public.departments(id) on delete set null,
  role public.app_role not null default 'contributor',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  weight numeric(5,2) not null default 0,
  start_year integer not null,
  end_year integer not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  code text not null unique,
  title text not null,
  description text,
  weight numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objectives(id) on delete cascade,
  title text not null,
  description text,
  owner_id uuid references public.profiles(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  collaboration_text text,
  weight numeric(5,2) not null default 0,
  planned_start_month smallint not null check (planned_start_month between 1 and 12),
  planned_end_month smallint not null check (planned_end_month between 1 and 12),
  planned_year integer not null,
  status public.activity_status not null default 'planned',
  priority smallint not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_valid_month_range check (planned_end_month >= planned_start_month)
);

create table if not exists public.activity_schedule (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  month smallint not null check (month between 1 and 12),
  year integer not null,
  is_planned boolean not null default true,
  created_at timestamptz not null default now(),
  unique (activity_id, month, year)
);

create table if not exists public.indicators (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objectives(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  code text not null unique,
  name text not null,
  description text,
  unit text,
  baseline_value numeric(14,2),
  target_value numeric(14,2),
  frequency text not null,
  data_source text,
  calculation_method text,
  owner_id uuid references public.profiles(id) on delete set null,
  verification_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

