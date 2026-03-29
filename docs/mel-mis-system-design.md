# MEL MIS System Design Blueprint

## 1. Purpose

This system should act as a lightweight Management Information System (MIS) for the MEL team.
Its job is to turn the MEL KPI workplan into a live operational system that:

- tracks strategic goals, objectives, activities, and indicators
- captures monthly and quarterly progress updates
- stores evidence for verification and reporting
- calculates weighted performance automatically
- sends reminders before reporting deadlines
- produces dashboard views for management and departments

The KPI table you shared becomes the backbone of the system. Each row in that table should become a trackable activity with an owner, timeline, collaboration unit, weight, status, and evidence trail.

## 2. Core Design Principle

The safest design is:

- one source of truth in the database
- one controlled data access layer in the frontend
- evidence linked to every reported status
- reporting periods handled explicitly
- score calculation automated in the backend

That means:

- frontend pages should never calculate business logic differently from reports
- users should not upload evidence without linking it to an activity or indicator
- dashboard scores should be precomputed, not rebuilt every page load

## 3. What The System Must Capture

### Strategic structure

- strategic goal
- MEL objective
- activity
- indicator
- department or collaboration unit
- assigned owner
- weight
- timeframe

### Operational progress

- planned start month
- planned end month
- current status
- percent complete
- monthly narrative update
- risks and blockers
- next actions
- completion date

### Performance data

- baseline value
- target value
- actual value by period
- unit of measure
- disaggregation if needed
- scoring formula

### Evidence and learning

- file or link
- evidence type
- upload date
- submitted by
- linked activity or indicator
- short summary
- verification status
- learning note or lesson

### Governance and audit

- who created or edited data
- when it changed
- who approved it
- reminders sent
- submission history

## 4. Recommended Main Screens

These five screens are a strong starting point and match your suggestion well.

### 1. Executive Dashboard

Purpose:
- show overall progress by goal, objective, department, and quarter

Widgets:
- overall weighted score
- progress by objective
- activities due this month
- overdue activities
- evidence submission rate
- indicator performance vs target
- recent risks and issues

### 2. Workplan Tracker

Purpose:
- digitize the KPI workplan table exactly as the MEL team already understands it

This page should display:
- activity name
- related goal and objective
- months planned
- owner
- collaboration unit
- weight
- status for each month
- percent complete
- latest update

This becomes the operational working page for the MEL team.

### 3. Indicator Registry

Purpose:
- store the institutional indicators in a structured way

Each indicator record should include:
- code
- name
- description
- definition
- calculation method
- data source
- reporting frequency
- baseline
- targets
- owner
- verification rule

### 4. Evidence Log

Purpose:
- central repository for all supporting documents, links, photos, reports, and meeting notes

Filters:
- reporting period
- activity
- indicator
- department
- evidence type
- verification status

### 5. Admin Settings

Purpose:
- configure users, roles, reporting periods, score weights, departments, and system rules

## 5. Users And Roles

Recommended minimum roles:

- `admin`: full control over setup, users, periods, weights, and approval rules
- `mel_manager`: validates submissions, reviews evidence, runs reports
- `department_owner`: updates activities and indicators assigned to their unit
- `contributor`: uploads evidence and drafts updates
- `executive_viewer`: dashboard and report access only

## 6. Data Model

Below is the simplest scalable structure.

### Master tables

#### `departments`
- `id`
- `name`
- `type`

#### `profiles`
- `id`
- `full_name`
- `email`
- `department_id`
- `role`
- `is_active`

#### `goals`
- `id`
- `code`
- `title`
- `description`
- `weight`
- `start_year`
- `end_year`

#### `objectives`
- `id`
- `goal_id`
- `code`
- `title`
- `description`
- `weight`

#### `activities`
- `id`
- `objective_id`
- `title`
- `description`
- `owner_id`
- `department_id`
- `collaboration_text`
- `weight`
- `planned_start_month`
- `planned_end_month`
- `planned_year`
- `status`
- `priority`

#### `activity_schedule`
- `id`
- `activity_id`
- `month`
- `year`
- `is_planned`

This table lets you replicate the X marks in the KPI table month by month.

#### `indicators`
- `id`
- `objective_id`
- `activity_id` nullable
- `code`
- `name`
- `description`
- `unit`
- `baseline_value`
- `target_value`
- `frequency`
- `data_source`
- `calculation_method`
- `owner_id`
- `verification_rule`

#### `reporting_periods`
- `id`
- `name`
- `year`
- `quarter`
- `month`
- `start_date`
- `end_date`
- `status`

### Transaction tables

#### `monthly_checkins`
- `id`
- `activity_id`
- `month`
- `year`
- `status`
- `percent_complete`
- `summary`
- `risks`
- `next_steps`
- `submitted_by`
- `submitted_at`
- `reviewed_by`
- `reviewed_at`

Constraint:
- `UNIQUE(activity_id, month, year)`

This is the right rule for preventing duplicate monthly submissions.

#### `indicator_values`
- `id`
- `indicator_id`
- `reporting_period_id`
- `actual_value`
- `comment`
- `submitted_by`
- `submitted_at`
- `reviewed_by`
- `reviewed_at`

#### `evidence_items`
- `id`
- `activity_id` nullable
- `indicator_id` nullable
- `reporting_period_id`
- `title`
- `description`
- `evidence_type`
- `file_path`
- `external_url`
- `submitted_by`
- `submitted_at`
- `verification_status`
- `verified_by`
- `verified_at`

#### `score_snapshots`
- `id`
- `reporting_period_id`
- `goal_id` nullable
- `objective_id` nullable
- `activity_id` nullable
- `score`
- `weighted_score`
- `calculated_at`

#### `audit_logs`
- `id`
- `table_name`
- `record_id`
- `action`
- `old_value`
- `new_value`
- `changed_by`
- `changed_at`

## 7. How The KPI Table Maps Into The System

Using your sample:

- `GOAL 1` becomes one record in `goals`
- `MEL 01.2` becomes one record in `objectives`
- each row under Activities becomes one record in `activities`
- the X marks under months become rows in `activity_schedule`
- `Collaboration` maps to `department_id` or `collaboration_text`
- `Weights` maps to `activities.weight`
- `Assigned` maps to `owner_id`

This is important because it means the team can continue thinking in the same planning format while the system stores it in a structured form.

## 8. Key Workflows

### Workflow A: Setup at start of year

1. Admin creates the goal and objective structure.
2. MEL team enters activities from the annual KPI workplan.
3. Planned months are marked for each activity.
4. Owners, weights, and collaboration units are assigned.
5. Indicators and target values are registered.

### Workflow B: Monthly implementation update

1. Department owner receives reminder.
2. Owner opens Workplan Tracker.
3. Owner submits monthly update for planned activity.
4. Owner uploads evidence.
5. MEL manager reviews and validates the submission.
6. Dashboard status updates automatically.

### Workflow C: Quarterly review

1. Indicator values are entered for the period.
2. Evidence completeness is checked.
3. Score calculation job runs.
4. Report package is generated for leadership.

### Workflow D: Evidence verification

1. Contributor uploads file or link.
2. MEL manager checks relevance and completeness.
3. Evidence is marked verified or returned for correction.

## 9. Status Logic

To keep reporting consistent, use clear status rules.

Recommended activity statuses:

- `not_started`
- `planned`
- `in_progress`
- `completed`
- `delayed`
- `cancelled`
- `overdue`

Suggested derived logic:

- if a planned month exists and no check-in has been submitted by period end, mark as `overdue`
- if check-in exists and `percent_complete` is between 1 and 99, mark as `in_progress`
- if `percent_complete = 100`, mark as `completed`

## 10. Recommended Technical Architecture

Your proposed stack is sensible for a first version.

### Frontend

- React
- route-based pages under `src/pages/`
- reusable cards, tables, filters, forms, and charts in `src/components/`
- a single data access hook such as `src/hooks/useMELData.js`

Recommended page structure:

- `src/pages/Dashboard.jsx`
- `src/pages/WorkplanTracker.jsx`
- `src/pages/IndicatorRegistry.jsx`
- `src/pages/EvidenceLog.jsx`
- `src/pages/AdminSettings.jsx`

Recommended shared modules:

- `src/hooks/useMELData.js`
- `src/lib/supabaseClient.js`
- `src/lib/scoreUtils.js`
- `src/lib/dateUtils.js`
- `src/components/workplan/`
- `src/components/dashboard/`
- `src/components/evidence/`

### Backend

- Supabase Postgres for structured data
- Supabase Auth for user access
- Supabase Storage for evidence files
- Supabase Edge Functions for scheduled jobs and report generation

Recommended functions:

- `calculate-scores`
- `send-reminders`
- `generate-report`

This aligns well with your suggestion and keeps heavy logic off the client.

## 11. What `useMELData.js` Should Own

The discipline you proposed is correct. Keep all frontend data access behind one layer.

`useMELData.js` should:

- fetch dashboard summaries
- fetch activities with schedules and latest check-ins
- fetch indicators and values
- fetch evidence records
- submit check-ins
- upload evidence metadata
- trigger refreshes after mutations

Frontend pages should call functions from this hook and should not query Supabase directly.

## 12. Recommended Backend Logic

### `calculate-scores`

Run nightly or on demand.

Responsibilities:
- compute completion rate per activity
- apply activity weight
- roll scores up to objective level
- roll scores up to goal level
- save results in `score_snapshots`

### `send-reminders`

Run daily.

Responsibilities:
- find activities planned for the current month
- notify assigned owners before due date
- notify MEL manager on overdue items

### `generate-report`

Run on demand or at quarter end.

Responsibilities:
- assemble activities completed and pending
- include indicator performance
- attach evidence summary
- output PDF or structured HTML report for leadership review

## 13. Reporting Views To Include

At minimum, leadership will need:

- overall score by goal
- objective progress table
- activities due this month
- overdue items by department
- evidence completeness rate
- indicator target achievement
- risk register summary

Department users will need:

- their assigned activities
- upcoming deadlines
- missing evidence
- submission history

## 14. Data Quality Controls

To capture everything properly, add these controls early:

- required owner for each activity
- required weight for each scored activity
- planned months cannot be empty
- evidence must be linked to an activity or indicator
- one monthly check-in per activity per month
- only reviewers can verify evidence
- all edits logged in `audit_logs`

## 15. Phased Delivery Plan

### Phase 1: Foundation

- user roles and authentication
- goals, objectives, activities, schedules
- workplan tracker
- monthly check-in form

### Phase 2: Measurement

- indicator registry
- indicator value entry
- dashboard score calculation

### Phase 3: Evidence and compliance

- evidence uploads
- verification workflow
- audit logs
- reminders

### Phase 4: Leadership reporting

- quarterly report generation
- export to PDF or Excel
- comparative trend analysis

## 16. Minimum Viable Product

If you want to start lean, the MVP should include only:

- goals and objectives setup
- activity workplan table
- monthly check-in submission
- evidence upload
- executive dashboard summary

Everything else can layer in afterward.

## 17. Recommendation

Your suggested structure is a strong starting point.
The main thing to add is a strict data model and workflow logic so the dashboard is not just visual, but operationally reliable.

In simple terms:

- use the KPI sheet as the source planning template
- store each activity, month, owner, and weight as structured data
- require monthly check-ins and linked evidence
- calculate performance automatically
- separate data entry, verification, and reporting roles

That is what turns a dashboard into a real MEL MIS.
