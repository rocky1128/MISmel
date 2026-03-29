create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum (
      'admin',
      'mel_manager',
      'department_owner',
      'contributor',
      'executive_viewer'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'activity_status') then
    create type public.activity_status as enum (
      'not_started',
      'planned',
      'in_progress',
      'completed',
      'delayed',
      'cancelled',
      'overdue'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'period_status') then
    create type public.period_status as enum (
      'draft',
      'open',
      'locked',
      'archived'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type public.verification_status as enum (
      'pending',
      'verified',
      'rejected'
    );
  end if;
end $$;

