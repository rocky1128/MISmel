-- ============================================================
-- Migration 014 — Programs, Learning Logs, Disaggregation,
-- Goal/Program Links, and Performance Views
-- ============================================================

-- ===== PROGRAMS TABLE =====
-- Tracks program models (e.g. YLO, ATVET, Tech) independently from assets
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  description text,
  model text,          -- e.g. 'YLO', 'ATVET', 'Tech'
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  start_date date,
  end_date date,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);
CREATE INDEX IF NOT EXISTS idx_programs_model ON programs(model);

-- ===== EXTEND governed_indicators WITH GOAL AND PROGRAM LINKS =====
ALTER TABLE governed_indicators
  ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES goals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES programs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gov_indicators_goal ON governed_indicators(goal_id);
CREATE INDEX IF NOT EXISTS idx_gov_indicators_program ON governed_indicators(program_id);

-- ===== PROGRAM ↔ INDICATOR JOIN TABLE =====
CREATE TABLE IF NOT EXISTS program_indicators (
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  indicator_id uuid NOT NULL REFERENCES governed_indicators(id) ON DELETE CASCADE,
  PRIMARY KEY (program_id, indicator_id)
);

-- ===== INDICATOR DISAGGREGATION TABLE =====
-- Stores breakdowns of indicator results by dimension (gender, location, age, etc.)
CREATE TABLE IF NOT EXISTS indicator_disaggregation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES governed_indicators(id) ON DELETE CASCADE,
  period text NOT NULL,
  dimension text NOT NULL,   -- 'gender', 'location', 'age_group', 'disability'
  category text NOT NULL,    -- 'female', 'male', 'rural', 'urban', 'pwd', etc.
  value numeric,
  percentage numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disagg_indicator ON indicator_disaggregation(indicator_id);
CREATE INDEX IF NOT EXISTS idx_disagg_period ON indicator_disaggregation(period);
CREATE INDEX IF NOT EXISTS idx_disagg_dimension ON indicator_disaggregation(dimension);

-- ===== LEARNING LOGS TABLE =====
CREATE TABLE IF NOT EXISTS learning_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('insight', 'lesson', 'recommendation')),
  title text NOT NULL,
  content text NOT NULL,
  goal_id uuid REFERENCES goals(id) ON DELETE SET NULL,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  submitted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_logs_type ON learning_logs(type);
CREATE INDEX IF NOT EXISTS idx_learning_logs_goal ON learning_logs(goal_id);
CREATE INDEX IF NOT EXISTS idx_learning_logs_program ON learning_logs(program_id);
CREATE INDEX IF NOT EXISTS idx_learning_logs_created ON learning_logs(created_at DESC);

-- ===== UPDATED_AT TRIGGERS =====

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_programs_updated_at
    BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_learning_logs_updated_at
    BEFORE UPDATE ON learning_logs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== GOAL PERFORMANCE VIEW =====
-- Aggregates legacy indicator performance per goal
-- Green ≥ 90%, Yellow 70–89%, Red < 70%
CREATE OR REPLACE VIEW goal_performance_view AS
SELECT
  g.id                          AS goal_id,
  g.code                        AS goal_code,
  g.title                       AS goal_title,
  g.description                 AS goal_description,
  g.weight,
  g.start_year,
  g.end_year,
  COUNT(DISTINCT o.id)          AS objective_count,
  COUNT(DISTINCT i.id)          AS indicator_count,
  COUNT(DISTINCT CASE WHEN iv_latest.actual_value IS NOT NULL THEN i.id END)
                                AS indicators_with_data,
  ROUND(
    AVG(
      CASE
        WHEN i.target_value > 0 AND iv_latest.actual_value IS NOT NULL
        THEN LEAST((iv_latest.actual_value / i.target_value) * 100, 150)
      END
    )::numeric, 1
  )                             AS avg_performance,
  COUNT(DISTINCT
    CASE WHEN i.target_value > 0
          AND iv_latest.actual_value IS NOT NULL
          AND (iv_latest.actual_value / i.target_value) * 100 >= 90
    THEN i.id END)              AS on_track_count,
  COUNT(DISTINCT
    CASE WHEN i.target_value > 0
          AND iv_latest.actual_value IS NOT NULL
          AND (iv_latest.actual_value / i.target_value) * 100 >= 70
          AND (iv_latest.actual_value / i.target_value) * 100 < 90
    THEN i.id END)              AS warning_count,
  COUNT(DISTINCT
    CASE WHEN i.target_value > 0
          AND iv_latest.actual_value IS NOT NULL
          AND (iv_latest.actual_value / i.target_value) * 100 < 70
    THEN i.id END)              AS critical_count
FROM goals g
LEFT JOIN objectives o ON o.goal_id = g.id
LEFT JOIN indicators i ON i.objective_id = o.id
LEFT JOIN LATERAL (
  SELECT actual_value
  FROM indicator_values
  WHERE indicator_id = i.id
  ORDER BY created_at DESC
  LIMIT 1
) iv_latest ON TRUE
GROUP BY g.id, g.code, g.title, g.description, g.weight, g.start_year, g.end_year;

-- ===== PROGRAM PERFORMANCE VIEW =====
-- Based on governed_indicators linked to programs
CREATE OR REPLACE VIEW program_performance_view AS
SELECT
  p.id                          AS program_id,
  p.name                        AS program_name,
  p.code                        AS program_code,
  p.model,
  p.status,
  COUNT(DISTINCT gi.id)         AS indicator_count,
  COUNT(DISTINCT CASE WHEN ir_latest.status = 'good' THEN gi.id END)
                                AS on_track_count,
  COUNT(DISTINCT CASE WHEN ir_latest.status = 'warning' THEN gi.id END)
                                AS warning_count,
  COUNT(DISTINCT CASE WHEN ir_latest.status = 'critical' THEN gi.id END)
                                AS critical_count,
  ROUND(AVG(ir_latest.performance)::numeric, 1)
                                AS avg_performance
FROM programs p
LEFT JOIN governed_indicators gi ON gi.program_id = p.id
  AND gi.status IN ('active', 'approved')
LEFT JOIN LATERAL (
  SELECT performance, status
  FROM indicator_results
  WHERE indicator_id = gi.id
  ORDER BY computed_at DESC
  LIMIT 1
) ir_latest ON TRUE
GROUP BY p.id, p.name, p.code, p.model, p.status;

-- ===== ASSET PERFORMANCE VIEW =====
-- One row per asset with domain scores and status
CREATE OR REPLACE VIEW asset_performance_view AS
SELECT
  a.id                          AS asset_id,
  a.name                        AS asset_name,
  a.type                        AS asset_type,
  s.period,
  s.reach_score,
  s.inclusion_score,
  s.engagement_score,
  s.learning_score,
  s.outcomes_score,
  s.overall_score,
  s.indicator_count,
  s.data_coverage,
  CASE
    WHEN s.overall_score >= 90 THEN 'good'
    WHEN s.overall_score >= 70 THEN 'warning'
    ELSE 'critical'
  END                           AS status
FROM assets a
LEFT JOIN LATERAL (
  SELECT *
  FROM asset_scores
  WHERE asset_id = a.id
  ORDER BY computed_at DESC
  LIMIT 1
) s ON TRUE;

-- ===== RLS POLICIES =====

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_disaggregation ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_logs ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated users
CREATE POLICY "auth read programs" ON programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read program_indicators" ON program_indicators FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read disaggregation" ON indicator_disaggregation FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read learning_logs" ON learning_logs FOR SELECT TO authenticated USING (true);

-- Write: managers and admins
CREATE POLICY "managers write programs" ON programs FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'mel_manager'));
CREATE POLICY "managers write program_indicators" ON program_indicators FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'mel_manager'));
CREATE POLICY "managers write disaggregation" ON indicator_disaggregation FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'mel_manager'));

-- Learning logs: all authenticated can write
CREATE POLICY "auth write learning_logs" ON learning_logs FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "auth update own learning_logs" ON learning_logs FOR UPDATE TO authenticated
  USING (submitted_by = auth.uid());
CREATE POLICY "managers delete learning_logs" ON learning_logs FOR DELETE TO authenticated
  USING (current_user_role() IN ('admin', 'mel_manager') OR submitted_by = auth.uid());
