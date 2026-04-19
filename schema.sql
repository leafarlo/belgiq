-- BelgiQ PostgreSQL Schema
-- Run: psql -U postgres -d belgiq -f schema.sql

-- ── EXTENSIONS ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fast text search

-- ── PARTIES ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parties (
    id          TEXT PRIMARY KEY,            -- e.g. 'n-va', 'mr', 'ps'
    name        TEXT NOT NULL,
    color       TEXT NOT NULL DEFAULT '#6b7280',
    text_color  TEXT NOT NULL DEFAULT '#ffffff',
    ideology    TEXT,
    founded     INTEGER,
    website     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── POLITICIANS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS politicians (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id         TEXT UNIQUE,         -- Kamer.be or Vlaams Parlement ID
    name                TEXT NOT NULL,
    party_id            TEXT REFERENCES parties(id),
    role_nl             TEXT,
    role_fr             TEXT,
    photo_url           TEXT,
    government_level    TEXT[],              -- ['federal','flemish',...]
    region              TEXT,               -- 'flemish','walloon','brussels'
    is_active           BOOLEAN DEFAULT TRUE,

    -- Computed scores (updated by pipeline)
    cost_score          INTEGER DEFAULT 50 CHECK (cost_score BETWEEN 0 AND 100),
    consistency_score   INTEGER DEFAULT 50 CHECK (consistency_score BETWEEN 0 AND 100),
    commotion_score     INTEGER DEFAULT 50 CHECK (commotion_score BETWEEN 0 AND 100),
    annual_cost_eur     INTEGER DEFAULT 0,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_politicians_party   ON politicians(party_id);
CREATE INDEX idx_politicians_region  ON politicians(region);
CREATE INDEX idx_politicians_name    ON politicians USING gin(name gin_trgm_ops);

-- ── COST BREAKDOWN (per politician) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS politician_cost_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    politician_id   UUID REFERENCES politicians(id) ON DELETE CASCADE,
    label_nl        TEXT NOT NULL,
    label_fr        TEXT NOT NULL,
    amount_eur      INTEGER NOT NULL,
    source_title    TEXT,
    source_url      TEXT,
    year            INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER
);

-- ── CONSISTENCY EVENTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consistency_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    politician_id   UUID REFERENCES politicians(id) ON DELETE CASCADE,
    promise_nl      TEXT NOT NULL,
    promise_fr      TEXT,
    action_nl       TEXT NOT NULL,
    action_fr       TEXT,
    verdict         TEXT NOT NULL CHECK (verdict IN ('kept','partial','broken')),
    source_title    TEXT,
    source_url      TEXT,
    event_date      DATE,
    legislature     INTEGER
);

-- ── COMMOTION EVENTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commotion_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    politician_id   UUID REFERENCES politicians(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL CHECK (event_type IN ('audit','media','judicial','ethics','other')),
    description_nl  TEXT NOT NULL,
    description_fr  TEXT,
    severity        INTEGER DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
    source_title    TEXT,
    source_url      TEXT,
    event_date      DATE
);

-- ── GOVERNMENTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS governments (
    id              TEXT PRIMARY KEY,       -- 'federal','flemish','walloon','brussels','fwb'
    name_nl         TEXT NOT NULL,
    name_fr         TEXT NOT NULL,
    level           TEXT NOT NULL,          -- 'federal','regional','community'
    color           TEXT DEFAULT '#1a3a5c',
    icon            TEXT DEFAULT '🏛️',
    budget_eur      BIGINT DEFAULT 0,
    regions         TEXT[],
    coalition       TEXT[],                  -- party ids
    pm_politician_id UUID REFERENCES politicians(id),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── BILLS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
    id                  TEXT PRIMARY KEY,    -- e.g. 'kamer_3974' or 'vlaams_2054892'
    number              TEXT NOT NULL,       -- e.g. '3974/001'
    source              TEXT NOT NULL,       -- 'federal','flemish','walloon','brussels'
    introduced_date     DATE NOT NULL,
    status              TEXT NOT NULL CHECK (status IN ('introduced','committee','passed','rejected','withdrawn')),
    theme               TEXT,               -- 'fiscal','migration','energy',...
    theme_color         TEXT DEFAULT '#6b7280',
    title_nl            TEXT NOT NULL,
    title_fr            TEXT,
    summary_nl          TEXT,
    summary_fr          TEXT,
    impact_nl           TEXT,
    impact_fr           TEXT,
    introduced_by_name  TEXT,
    introduced_by_party TEXT,
    source_url          TEXT,
    legislature         INTEGER,
    raw_json            JSONB,              -- full raw API response for reference
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bills_source   ON bills(source);
CREATE INDEX idx_bills_theme    ON bills(theme);
CREATE INDEX idx_bills_status   ON bills(status);
CREATE INDEX idx_bills_date     ON bills(introduced_date DESC);
CREATE INDEX idx_bills_title    ON bills USING gin(title_nl gin_trgm_ops);

-- ── VOTES (per bill per politician) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id         TEXT REFERENCES bills(id) ON DELETE CASCADE,
    politician_name TEXT NOT NULL,
    party_id        TEXT,
    vote            TEXT NOT NULL CHECK (vote IN ('yes','no','abstain')),
    UNIQUE(bill_id, politician_name)
);

CREATE INDEX idx_votes_bill     ON votes(bill_id);
CREATE INDEX idx_votes_party    ON votes(party_id);

-- ── CONSISTENCY ALERTS (per bill) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bill_consistency_alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id         TEXT REFERENCES bills(id) ON DELETE CASCADE,
    politician_name TEXT NOT NULL,
    party_id        TEXT,
    alert_type      TEXT NOT NULL CHECK (alert_type IN ('against_party','flip','absent_key_vote')),
    description_nl  TEXT NOT NULL,
    description_fr  TEXT
);

-- ── TAX BUDGET BREAKDOWN ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    government_id   TEXT REFERENCES governments(id),
    parent_id       UUID REFERENCES budget_items(id),    -- NULL = top-level
    label_nl        TEXT NOT NULL,
    label_fr        TEXT NOT NULL,
    amount_eur      BIGINT NOT NULL,
    percentage      NUMERIC(5,2),
    color           TEXT DEFAULT '#6b7280',
    responsible_parties TEXT[],
    budget_year     INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
    source_url      TEXT
);

-- ── PIPELINE RUN LOG ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    finished_at     TIMESTAMPTZ,
    status          TEXT DEFAULT 'running' CHECK (status IN ('running','success','failed')),
    bills_fetched   INTEGER DEFAULT 0,
    bills_new       INTEGER DEFAULT 0,
    errors          TEXT[],
    notes           TEXT
);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_politicians_updated BEFORE UPDATE ON politicians FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bills_updated       BEFORE UPDATE ON bills       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_governments_updated BEFORE UPDATE ON governments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
