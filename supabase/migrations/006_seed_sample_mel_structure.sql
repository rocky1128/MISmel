insert into public.departments (name, type)
values
  ('Directors', 'leadership'),
  ('MEL Team', 'support'),
  ('All Departments', 'cross-functional'),
  ('ICT', 'technical')
on conflict (name) do nothing;

with inserted_goal as (
  insert into public.goals (code, title, description, weight, start_year, end_year)
  values (
    'GOAL 1',
    'Strengthen MEL integration across Springboard Programs and Activities',
    'Organisation-wide MEL integration across strategic and non-programmatic operations.',
    25,
    2026,
    2030
  )
  on conflict (code) do update set title = excluded.title
  returning id
),
resolved_goal as (
  select id from inserted_goal
  union all
  select id from public.goals where code = 'GOAL 1'
  limit 1
),
inserted_objective as (
  insert into public.objectives (goal_id, code, title, description, weight)
  select
    id,
    'MEL 01.2',
    'Deploy Executive Evidence & Learning Dashboards',
    'Design and operationalise the MEL dashboard and evidence management workflow.',
    25
  from resolved_goal
  on conflict (code) do update set title = excluded.title
  returning id
)
insert into public.activities (
  objective_id,
  title,
  description,
  collaboration_text,
  weight,
  planned_start_month,
  planned_end_month,
  planned_year,
  status
)
select
  io.id,
  seed.title,
  seed.description,
  seed.collaboration_text,
  seed.weight,
  seed.planned_start_month,
  seed.planned_end_month,
  2026,
  'planned'
from inserted_objective io
cross join (
  values
    (
      'Develop organisation wide non programmatic MEL Framework',
      'Anchor the framework in the 2026-2030 strategic plan and director priorities.',
      'Directors',
      30,
      4,
      5
    ),
    (
      'Define standard institutional MEL indicators for institutional assets',
      'Develop indicators for assets such as the virtual university, LMS, hangout, and call centre.',
      'All Departments',
      10,
      4,
      6
    ),
    (
      'Identify priority dashboard indicators',
      'Confirm the core metrics the executive team wants to track each period.',
      'Directors',
      30,
      4,
      6
    ),
    (
      'Design dashboard architecture and data flows',
      'Define the data collection, verification, and reporting architecture.',
      'All Departments',
      10,
      4,
      6
    )
) as seed(title, description, collaboration_text, weight, planned_start_month, planned_end_month)
where not exists (
  select 1
  from public.activities a
  where a.objective_id = io.id and a.title = seed.title
);

