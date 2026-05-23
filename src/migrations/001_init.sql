CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  fingerprint   TEXT,
  user_agent    TEXT,
  country       TEXT,
  referer       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_views (
  id            BIGSERIAL PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id),
  app_slug      TEXT NOT NULL,
  variant       TEXT NOT NULL DEFAULT 'A',
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ,
  duration_ms   INTEGER,
  interactions  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS app_views_app_started_idx ON app_views (app_slug, started_at);
CREATE INDEX IF NOT EXISTS app_views_session_idx ON app_views (session_id);

CREATE TABLE IF NOT EXISTS events (
  id            BIGSERIAL PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id),
  app_view_id   BIGINT REFERENCES app_views(id),
  app_slug      TEXT,
  variant       TEXT,
  name          TEXT NOT NULL,
  payload       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_app_name_idx ON events (app_slug, name, created_at);
CREATE INDEX IF NOT EXISTS events_session_idx ON events (session_id, created_at);

CREATE TABLE IF NOT EXISTS discoveries (
  id            BIGSERIAL PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id),
  app_slug      TEXT NOT NULL,
  method        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, app_slug)
);

CREATE TABLE IF NOT EXISTS experiments (
  slug          TEXT PRIMARY KEY,
  app_slug      TEXT NOT NULL,
  variants      JSONB NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes         TEXT
);

CREATE TABLE IF NOT EXISTS assignments (
  session_id      TEXT NOT NULL REFERENCES sessions(id),
  app_slug        TEXT NOT NULL,
  experiment_slug TEXT NOT NULL,
  variant         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, app_slug)
);

CREATE TABLE IF NOT EXISTS llm_calls (
  id            BIGSERIAL PRIMARY KEY,
  session_id    TEXT NOT NULL,
  app_slug      TEXT NOT NULL,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  cost_usd      NUMERIC(10,6),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS llm_calls_created_idx ON llm_calls (created_at);
