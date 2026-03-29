-- ============================================================
-- 009: Seed data for Assets and Metrics from Excel indicators
-- ============================================================

-- ============================================================
-- Assets
-- ============================================================
INSERT INTO assets (id, name, type, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Virtual University', 'media', 'Springboard Your Virtual University - educational video content across Facebook, YouTube, TikTok, and LinkedIn'),
  ('a0000000-0000-0000-0000-000000000002', 'Hangout', 'media', 'Hangout with Comfort Ocran - interview and discussion series across social media platforms'),
  ('a0000000-0000-0000-0000-000000000003', 'Springboard TV', 'media', 'Springboard TV broadcast and digital programming'),
  ('a0000000-0000-0000-0000-000000000004', 'Call Centre', 'service', 'Springboard call centre for audience engagement and support'),
  ('a0000000-0000-0000-0000-000000000005', 'LMS', 'platform', 'Learning Management System for course delivery and tracking')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Virtual University Metrics (from Excel: VU-001 to VU-004)
-- ============================================================

-- VU-001: Facebook
INSERT INTO metrics (name, source, asset_id, date, value, metadata) VALUES
  ('views',           'facebook', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 8200,  '{"video_id": "VU-001", "title": "Leading with Purpose Interview"}'),
  ('unique_reach',    'facebook', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 6500,  '{"video_id": "VU-001"}'),
  ('watch_time_min',  'facebook', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 1850,  '{"video_id": "VU-001"}'),
  ('completion_rate', 'facebook', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 0.55,  '{"video_id": "VU-001"}'),
  ('engagement_rate', 'facebook', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 0.041, '{"video_id": "VU-001"}'),
  ('cta_clicks',      'facebook', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 210,   '{"video_id": "VU-001"}'),
  ('shares',          'facebook', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 150,   '{"video_id": "VU-001"}'),
  ('new_followers',   'facebook', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 120,   '{"video_id": "VU-001"}')
ON CONFLICT (name, source, asset_id, date) DO UPDATE
SET
  value = EXCLUDED.value,
  metadata = EXCLUDED.metadata;

-- VU-002: YouTube
INSERT INTO metrics (name, source, asset_id, date, value, metadata) VALUES
  ('views',           'youtube', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 6500,  '{"video_id": "VU-002", "title": "Leading with Purpose Interview"}'),
  ('unique_reach',    'youtube', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 6000,  '{"video_id": "VU-002"}'),
  ('watch_time_min',  'youtube', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 2300,  '{"video_id": "VU-002"}'),
  ('completion_rate', 'youtube', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 0.35,  '{"video_id": "VU-002"}'),
  ('engagement_rate', 'youtube', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 0.038, '{"video_id": "VU-002"}'),
  ('cta_clicks',      'youtube', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 180,   '{"video_id": "VU-002"}'),
  ('shares',          'youtube', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 95,    '{"video_id": "VU-002"}'),
  ('new_followers',   'youtube', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 90,    '{"video_id": "VU-002"}')
ON CONFLICT (name, source, asset_id, date) DO UPDATE
SET
  value = EXCLUDED.value,
  metadata = EXCLUDED.metadata;

-- VU-003: TikTok
INSERT INTO metrics (name, source, asset_id, date, value, metadata) VALUES
  ('views',           'tiktok', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 9300,  '{"video_id": "VU-003", "title": "Leading with Purpose Interview"}'),
  ('unique_reach',    'tiktok', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 8800,  '{"video_id": "VU-003"}'),
  ('watch_time_min',  'tiktok', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 1200,  '{"video_id": "VU-003"}'),
  ('completion_rate', 'tiktok', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 0.38,  '{"video_id": "VU-003"}'),
  ('engagement_rate', 'tiktok', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 0.055, '{"video_id": "VU-003"}'),
  ('cta_clicks',      'tiktok', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 140,   '{"video_id": "VU-003"}'),
  ('shares',          'tiktok', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 180,   '{"video_id": "VU-003"}'),
  ('new_followers',   'tiktok', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 200,   '{"video_id": "VU-003"}')
ON CONFLICT (name, source, asset_id, date) DO UPDATE
SET
  value = EXCLUDED.value,
  metadata = EXCLUDED.metadata;

-- VU-004: LinkedIn
INSERT INTO metrics (name, source, asset_id, date, value, metadata) VALUES
  ('views',           'linkedin', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 2100,  '{"video_id": "VU-004", "title": "Leading with Purpose Interview"}'),
  ('unique_reach',    'linkedin', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 1900,  '{"video_id": "VU-004"}'),
  ('watch_time_min',  'linkedin', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 380,   '{"video_id": "VU-004"}'),
  ('completion_rate', 'linkedin', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 0.50,  '{"video_id": "VU-004"}'),
  ('engagement_rate', 'linkedin', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 0.029, '{"video_id": "VU-004"}'),
  ('cta_clicks',      'linkedin', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 75,    '{"video_id": "VU-004"}'),
  ('shares',          'linkedin', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 30,    '{"video_id": "VU-004"}'),
  ('new_followers',   'linkedin', 'a0000000-0000-0000-0000-000000000001', '2025-05-01', 45,    '{"video_id": "VU-004"}')
ON CONFLICT (name, source, asset_id, date) DO UPDATE
SET
  value = EXCLUDED.value,
  metadata = EXCLUDED.metadata;

-- ============================================================
-- Hangout Metrics (from Excel: HO-001 to HO-004)
-- ============================================================

-- HO-001: Facebook
INSERT INTO metrics (name, source, asset_id, date, value, metadata) VALUES
  ('views',           'facebook', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 8200,  '{"video_id": "HO-001", "title": "Leading with Purpose Interview"}'),
  ('unique_reach',    'facebook', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 6500,  '{"video_id": "HO-001"}'),
  ('watch_time_min',  'facebook', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 1850,  '{"video_id": "HO-001"}'),
  ('completion_rate', 'facebook', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 0.42,  '{"video_id": "HO-001"}'),
  ('engagement_rate', 'facebook', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 0.041, '{"video_id": "HO-001"}'),
  ('cta_clicks',      'facebook', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 210,   '{"video_id": "HO-001"}'),
  ('shares',          'facebook', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 150,   '{"video_id": "HO-001"}'),
  ('new_followers',   'facebook', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 120,   '{"video_id": "HO-001"}')
ON CONFLICT (name, source, asset_id, date) DO UPDATE
SET
  value = EXCLUDED.value,
  metadata = EXCLUDED.metadata;

-- HO-002: YouTube
INSERT INTO metrics (name, source, asset_id, date, value, metadata) VALUES
  ('views',           'youtube', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 6500,  '{"video_id": "HO-002", "title": "Leading with Purpose Interview"}'),
  ('unique_reach',    'youtube', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 6000,  '{"video_id": "HO-002"}'),
  ('watch_time_min',  'youtube', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 2300,  '{"video_id": "HO-002"}'),
  ('completion_rate', 'youtube', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 0.35,  '{"video_id": "HO-002"}'),
  ('engagement_rate', 'youtube', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 0.038, '{"video_id": "HO-002"}'),
  ('cta_clicks',      'youtube', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 180,   '{"video_id": "HO-002"}'),
  ('shares',          'youtube', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 95,    '{"video_id": "HO-002"}'),
  ('new_followers',   'youtube', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 90,    '{"video_id": "HO-002"}')
ON CONFLICT (name, source, asset_id, date) DO UPDATE
SET
  value = EXCLUDED.value,
  metadata = EXCLUDED.metadata;

-- HO-003: TikTok
INSERT INTO metrics (name, source, asset_id, date, value, metadata) VALUES
  ('views',           'tiktok', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 9300,  '{"video_id": "HO-003", "title": "Leading with Purpose Interview"}'),
  ('unique_reach',    'tiktok', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 8800,  '{"video_id": "HO-003"}'),
  ('watch_time_min',  'tiktok', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 1200,  '{"video_id": "HO-003"}'),
  ('completion_rate', 'tiktok', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 0.28,  '{"video_id": "HO-003"}'),
  ('engagement_rate', 'tiktok', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 0.055, '{"video_id": "HO-003"}'),
  ('cta_clicks',      'tiktok', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 140,   '{"video_id": "HO-003"}'),
  ('shares',          'tiktok', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 180,   '{"video_id": "HO-003"}'),
  ('new_followers',   'tiktok', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 200,   '{"video_id": "HO-003"}')
ON CONFLICT (name, source, asset_id, date) DO UPDATE
SET
  value = EXCLUDED.value,
  metadata = EXCLUDED.metadata;

-- HO-004: LinkedIn
INSERT INTO metrics (name, source, asset_id, date, value, metadata) VALUES
  ('views',           'linkedin', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 2100,  '{"video_id": "HO-004", "title": "Leading with Purpose Interview"}'),
  ('unique_reach',    'linkedin', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 1900,  '{"video_id": "HO-004"}'),
  ('watch_time_min',  'linkedin', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 380,   '{"video_id": "HO-004"}'),
  ('completion_rate', 'linkedin', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 0.50,  '{"video_id": "HO-004"}'),
  ('engagement_rate', 'linkedin', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 0.029, '{"video_id": "HO-004"}'),
  ('cta_clicks',      'linkedin', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 75,    '{"video_id": "HO-004"}'),
  ('shares',          'linkedin', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 30,    '{"video_id": "HO-004"}'),
  ('new_followers',   'linkedin', 'a0000000-0000-0000-0000-000000000002', '2025-05-01', 45,    '{"video_id": "HO-004"}')
ON CONFLICT (name, source, asset_id, date) DO UPDATE
SET
  value = EXCLUDED.value,
  metadata = EXCLUDED.metadata;

-- ============================================================
-- Media-specific indicators
-- ============================================================
WITH resolved_objective AS (
  SELECT id
  FROM objectives
  WHERE code = 'MEL 01.2'
  LIMIT 1
)
INSERT INTO indicators (
  id,
  objective_id,
  code,
  name,
  frequency,
  baseline_value,
  target_value,
  kpi_category,
  indicator_type,
  unit,
  asset_id,
  entry_method,
  department
)
SELECT
  gen_random_uuid(),
  ro.id,
  seed.code,
  seed.name,
  seed.frequency,
  seed.baseline_value,
  seed.target_value,
  seed.kpi_category,
  seed.indicator_type,
  seed.unit,
  seed.asset_id,
  seed.entry_method,
  seed.department
FROM resolved_objective ro
CROSS JOIN (
  VALUES
    ('VU-IND-001', 'Virtual University Total Monthly Views', 'monthly', 0, 30000, 'asset'::kpi_category, 'output'::indicator_type, 'count', 'a0000000-0000-0000-0000-000000000001'::uuid, 'hybrid'::entry_method, 'Media & Comms'),
    ('VU-IND-002', 'Virtual University Average Completion Rate', 'monthly', 0, 0.50, 'asset'::kpi_category, 'outcome'::indicator_type, 'percentage', 'a0000000-0000-0000-0000-000000000001'::uuid, 'hybrid'::entry_method, 'Media & Comms'),
    ('VU-IND-003', 'Virtual University Average Engagement Rate', 'monthly', 0, 0.05, 'asset'::kpi_category, 'outcome'::indicator_type, 'percentage', 'a0000000-0000-0000-0000-000000000001'::uuid, 'hybrid'::entry_method, 'Media & Comms'),
    ('VU-IND-004', 'Virtual University Total New Followers', 'monthly', 0, 500, 'asset'::kpi_category, 'output'::indicator_type, 'count', 'a0000000-0000-0000-0000-000000000001'::uuid, 'hybrid'::entry_method, 'Media & Comms'),
    ('HO-IND-001', 'Hangout Total Monthly Views', 'monthly', 0, 30000, 'asset'::kpi_category, 'output'::indicator_type, 'count', 'a0000000-0000-0000-0000-000000000002'::uuid, 'hybrid'::entry_method, 'Media & Comms'),
    ('HO-IND-002', 'Hangout Average Completion Rate', 'monthly', 0, 0.45, 'asset'::kpi_category, 'outcome'::indicator_type, 'percentage', 'a0000000-0000-0000-0000-000000000002'::uuid, 'hybrid'::entry_method, 'Media & Comms'),
    ('HO-IND-003', 'Hangout Average Engagement Rate', 'monthly', 0, 0.04, 'asset'::kpi_category, 'outcome'::indicator_type, 'percentage', 'a0000000-0000-0000-0000-000000000002'::uuid, 'hybrid'::entry_method, 'Media & Comms'),
    ('HO-IND-004', 'Hangout Total New Followers', 'monthly', 0, 500, 'asset'::kpi_category, 'output'::indicator_type, 'count', 'a0000000-0000-0000-0000-000000000002'::uuid, 'hybrid'::entry_method, 'Media & Comms')
) AS seed(code, name, frequency, baseline_value, target_value, kpi_category, indicator_type, unit, asset_id, entry_method, department)
ON CONFLICT (code) DO UPDATE
SET
  objective_id = EXCLUDED.objective_id,
  name = EXCLUDED.name,
  frequency = EXCLUDED.frequency,
  baseline_value = EXCLUDED.baseline_value,
  target_value = EXCLUDED.target_value,
  kpi_category = EXCLUDED.kpi_category,
  indicator_type = EXCLUDED.indicator_type,
  unit = EXCLUDED.unit,
  asset_id = EXCLUDED.asset_id,
  entry_method = EXCLUDED.entry_method,
  department = EXCLUDED.department;
