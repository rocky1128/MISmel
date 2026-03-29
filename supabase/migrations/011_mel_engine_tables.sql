-- ============================================================
-- MEL Engine: Multi-Source Data Architecture & Governance
-- Migration 011 — New tables for survey, follow-up, indicator
-- governance, indicator results, and asset scores
-- ============================================================

-- ===== ENUMS =====

DO $$ BEGIN
  CREATE TYPE mel_domain AS ENUM (
    'reach_and_scale',
    'inclusion',
    'engagement',
    'learning',
    'outcomes'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE indicator_lifecycle AS ENUM (
    'draft',
    'submitted',
    'approved',
    'active',
    'deprecated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE calculation_type AS ENUM (
    'sum',
    'average',
    'count',
    'ratio'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE data_source_type AS ENUM (
    'episodes',
    'participants',
    'survey_responses',
    'follow_up_data'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE aggregation_level AS ENUM (
    'weekly',
    'monthly',
    'quarterly',
    'yearly'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE result_status AS ENUM (
    'good',
    'warning',
    'critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE survey_type AS ENUM (
    'pre',
    'post'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE follow_up_outcome AS ENUM (
    'employed',
    'self_employed',
    'business_created',
    'further_education',
    'unemployed',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== PARTICIPANTS TABLE =====
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  program_name text,
  full_name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  age integer,
  region text,
  district text,
  is_pwd boolean DEFAULT false,
  is_rural boolean DEFAULT false,
  education_level text,
  registration_date date DEFAULT CURRENT_DATE,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participants_asset ON participants(asset_id);
CREATE INDEX IF NOT EXISTS idx_participants_gender ON participants(gender);
CREATE INDEX IF NOT EXISTS idx_participants_region ON participants(region);
CREATE INDEX IF NOT EXISTS idx_participants_date ON participants(registration_date);

-- ===== EPISODES TABLE (formalize existing metrics for media) =====
CREATE TABLE IF NOT EXISTS episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  title text NOT NULL,
  episode_number integer,
  air_date date,
  platform text NOT NULL,
  views bigint DEFAULT 0,
  unique_reach bigint DEFAULT 0,
  likes bigint DEFAULT 0,
  comments bigint DEFAULT 0,
  shares bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  watch_time_minutes numeric DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  completion_rate numeric DEFAULT 0,
  new_followers bigint DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_episodes_asset ON episodes(asset_id);
CREATE INDEX IF NOT EXISTS idx_episodes_date ON episodes(air_date);
CREATE INDEX IF NOT EXISTS idx_episodes_platform ON episodes(platform);

-- ===== SURVEY RESPONSES TABLE =====
CREATE TABLE IF NOT EXISTS survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  program_name text,
  survey_type survey_type NOT NULL,
  survey_date date DEFAULT CURRENT_DATE,
  -- Structured survey measures
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 10),
  job_readiness_score numeric CHECK (job_readiness_score >= 0 AND job_readiness_score <= 10),
  leadership_score numeric CHECK (leadership_score >= 0 AND leadership_score <= 10),
  skills_application_score numeric CHECK (skills_application_score >= 0 AND skills_application_score <= 10),
  -- Additional structured fields
  knowledge_score numeric CHECK (knowledge_score >= 0 AND knowledge_score <= 10),
  satisfaction_score numeric CHECK (satisfaction_score >= 0 AND satisfaction_score <= 10),
  -- Metadata
  responses jsonb DEFAULT '{}',
  submitted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_asset ON survey_responses(asset_id);
CREATE INDEX IF NOT EXISTS idx_survey_type ON survey_responses(survey_type);
CREATE INDEX IF NOT EXISTS idx_survey_date ON survey_responses(survey_date);
CREATE INDEX IF NOT EXISTS idx_survey_participant ON survey_responses(participant_id);

-- ===== FOLLOW-UP DATA TABLE =====
CREATE TABLE IF NOT EXISTS follow_up_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  program_name text,
  follow_up_date date DEFAULT CURRENT_DATE,
  months_after_completion integer,
  outcome follow_up_outcome NOT NULL,
  is_employed boolean DEFAULT false,
  employment_type text,
  employer_name text,
  business_created boolean DEFAULT false,
  business_type text,
  income_level text,
  transition_status text,
  notes text,
  metadata jsonb DEFAULT '{}',
  submitted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followup_asset ON follow_up_data(asset_id);
CREATE INDEX IF NOT EXISTS idx_followup_participant ON follow_up_data(participant_id);
CREATE INDEX IF NOT EXISTS idx_followup_date ON follow_up_data(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_followup_outcome ON follow_up_data(outcome);

-- ===== GOVERNED INDICATOR REGISTRY =====
CREATE TABLE IF NOT EXISTS governed_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  parent_id uuid REFERENCES governed_indicators(id) ON DELETE SET NULL,
  -- Core fields
  name text NOT NULL,
  description text,
  code text,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  -- MEL Framework
  domain mel_domain NOT NULL,
  data_source data_source_type NOT NULL,
  aggregation aggregation_level NOT NULL DEFAULT 'monthly',
  calculation calculation_type NOT NULL DEFAULT 'sum',
  -- Structured formula (NO free text)
  numerator_fields text[] NOT NULL DEFAULT '{}',
  denominator_fields text[] DEFAULT '{}',
  filters jsonb DEFAULT '{}',
  -- Targets & weights
  target numeric NOT NULL,
  weight numeric DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 10),
  unit text DEFAULT 'count',
  -- Governance
  status indicator_lifecycle NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  deprecated_at timestamptz,
  rejection_reason text,
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Constraints
  UNIQUE(code, version)
);

CREATE INDEX IF NOT EXISTS idx_gov_indicators_domain ON governed_indicators(domain);
CREATE INDEX IF NOT EXISTS idx_gov_indicators_status ON governed_indicators(status);
CREATE INDEX IF NOT EXISTS idx_gov_indicators_asset ON governed_indicators(asset_id);
CREATE INDEX IF NOT EXISTS idx_gov_indicators_source ON governed_indicators(data_source);
CREATE INDEX IF NOT EXISTS idx_gov_indicators_parent ON governed_indicators(parent_id);

-- ===== INDICATOR RESULTS (Computed by Engine) =====
CREATE TABLE IF NOT EXISTS indicator_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES governed_indicators(id) ON DELETE CASCADE,
  version_id integer NOT NULL,
  period text NOT NULL,
  period_start date,
  period_end date,
  -- Computed values
  value numeric,
  numerator numeric,
  denominator numeric,
  -- Performance
  target numeric,
  performance numeric,
  status result_status NOT NULL DEFAULT 'critical',
  -- Audit
  computed_at timestamptz DEFAULT now(),
  data_points_used integer DEFAULT 0,
  data_coverage numeric DEFAULT 0,
  -- Constraint: one result per indicator per period
  UNIQUE(indicator_id, period)
);

CREATE INDEX IF NOT EXISTS idx_results_indicator ON indicator_results(indicator_id);
CREATE INDEX IF NOT EXISTS idx_results_period ON indicator_results(period);
CREATE INDEX IF NOT EXISTS idx_results_status ON indicator_results(status);

-- ===== ASSET SCORES (Weighted aggregation) =====
CREATE TABLE IF NOT EXISTS asset_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  period text NOT NULL,
  -- Scores by domain
  reach_score numeric DEFAULT 0,
  inclusion_score numeric DEFAULT 0,
  engagement_score numeric DEFAULT 0,
  learning_score numeric DEFAULT 0,
  outcomes_score numeric DEFAULT 0,
  -- Overall
  overall_score numeric DEFAULT 0,
  indicator_count integer DEFAULT 0,
  data_coverage numeric DEFAULT 0,
  -- Audit
  computed_at timestamptz DEFAULT now(),
  UNIQUE(asset_id, period)
);

CREATE INDEX IF NOT EXISTS idx_asset_scores_asset ON asset_scores(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_scores_period ON asset_scores(period);

-- ===== INDICATOR APPROVAL LOG =====
CREATE TABLE IF NOT EXISTS indicator_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES governed_indicators(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'deprecated')),
  from_status indicator_lifecycle,
  to_status indicator_lifecycle NOT NULL,
  performed_by uuid REFERENCES profiles(id),
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_indicator ON indicator_approvals(indicator_id);

-- ===== UPDATE TRIGGERS =====
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_participants_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_episodes_updated_at
    BEFORE UPDATE ON episodes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_survey_responses_updated_at
    BEFORE UPDATE ON survey_responses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_follow_up_data_updated_at
    BEFORE UPDATE ON follow_up_data
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_governed_indicators_updated_at
    BEFORE UPDATE ON governed_indicators
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== RLS POLICIES =====
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE governed_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_approvals ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "authenticated read participants" ON participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read episodes" ON episodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read surveys" ON survey_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read followup" ON follow_up_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read gov_indicators" ON governed_indicators FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read results" ON indicator_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read asset_scores" ON asset_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read approvals" ON indicator_approvals FOR SELECT TO authenticated USING (true);

-- Write access for managers
CREATE POLICY "managers write participants" ON participants FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'mel_manager', 'department_owner', 'contributor'));
CREATE POLICY "managers write episodes" ON episodes FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'mel_manager', 'department_owner', 'contributor'));
CREATE POLICY "managers write surveys" ON survey_responses FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'mel_manager', 'department_owner', 'contributor'));
CREATE POLICY "managers write followup" ON follow_up_data FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'mel_manager', 'department_owner', 'contributor'));
CREATE POLICY "managers write gov_indicators" ON governed_indicators FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'mel_manager'));
CREATE POLICY "managers write results" ON indicator_results FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'mel_manager'));
CREATE POLICY "managers write asset_scores" ON asset_scores FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'mel_manager'));
CREATE POLICY "managers write approvals" ON indicator_approvals FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'mel_manager'));
