-- ============================================================
-- 008: Assets, Metrics, and enhanced Indicator fields
-- ============================================================

-- Asset types
DO $$ BEGIN CREATE TYPE asset_type AS ENUM ('media', 'platform', 'service'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- KPI categories for indicators
DO $$ BEGIN CREATE TYPE kpi_category AS ENUM ('institutional', 'asset', 'process', 'outcome'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indicator types
DO $$ BEGIN CREATE TYPE indicator_type AS ENUM ('output', 'outcome', 'process'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Entry methods
DO $$ BEGIN CREATE TYPE entry_method AS ENUM ('manual', 'upload', 'api', 'hybrid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indicator lock status
DO $$ BEGIN CREATE TYPE indicator_status AS ENUM ('active', 'locked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Assets table
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  type        asset_type NOT NULL DEFAULT 'media',
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Metrics table (raw data layer)
-- ============================================================
CREATE TABLE IF NOT EXISTS metrics (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  source     text NOT NULL DEFAULT 'manual',
  asset_id   uuid REFERENCES assets(id) ON DELETE SET NULL,
  date       date NOT NULL,
  value      numeric NOT NULL DEFAULT 0,
  metadata   jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, source, asset_id, date)
);

CREATE INDEX idx_metrics_asset_id ON metrics(asset_id);
CREATE INDEX idx_metrics_date ON metrics(date);
CREATE INDEX idx_metrics_name ON metrics(name);
CREATE INDEX idx_metrics_source ON metrics(source);

CREATE TRIGGER set_metrics_updated_at
  BEFORE UPDATE ON metrics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Enhance indicators table with new fields
-- ============================================================
ALTER TABLE indicators
  ADD COLUMN IF NOT EXISTS kpi_category  kpi_category DEFAULT 'institutional',
  ADD COLUMN IF NOT EXISTS indicator_type indicator_type DEFAULT 'output',
  ADD COLUMN IF NOT EXISTS unit           text DEFAULT 'count',
  ADD COLUMN IF NOT EXISTS asset_id       uuid REFERENCES assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entry_method   entry_method DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS department     text,
  ADD COLUMN IF NOT EXISTS indicator_status indicator_status DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS formula        text;

-- ============================================================
-- Submissions log (audit trail for all data entries)
-- ============================================================
CREATE TABLE IF NOT EXISTS submissions_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action          text NOT NULL,
  entity_type     text NOT NULL,
  entity_id       uuid,
  changes         jsonb DEFAULT '{}',
  approval_status text DEFAULT 'pending',
  approved_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_submissions_log_user ON submissions_log(user_id);
CREATE INDEX idx_submissions_log_entity ON submissions_log(entity_type, entity_id);
CREATE INDEX idx_submissions_log_created ON submissions_log(created_at DESC);

-- ============================================================
-- Targets table (per-period targets for indicators)
-- ============================================================
CREATE TABLE IF NOT EXISTS targets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id        uuid NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  reporting_period_id uuid REFERENCES reporting_periods(id) ON DELETE SET NULL,
  target_value        numeric NOT NULL,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(indicator_id, reporting_period_id)
);

-- ============================================================
-- RLS for new tables
-- ============================================================
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read access to assets" ON assets FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin can manage assets" ON assets FOR ALL USING (current_user_role() IN ('admin', 'mel_manager'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read access to metrics" ON metrics FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can insert metrics" ON metrics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin can manage metrics" ON metrics FOR ALL USING (current_user_role() IN ('admin', 'mel_manager'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read access to submissions_log" ON submissions_log FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can insert submissions_log" ON submissions_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read access to targets" ON targets FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin can manage targets" ON targets FOR ALL USING (current_user_role() IN ('admin', 'mel_manager'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
