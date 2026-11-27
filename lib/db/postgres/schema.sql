-- MarketGym schema for privy mode (plain Postgres via postgres.js, DATABASE_URL).
--
-- Applied idempotently by lib/db/postgres/postgres-repository.ts once per
-- process before the first query. `__SCHEMA__` is replaced with the quoted
-- DB_SCHEMA identifier (default "marketgym"); every object is schema-qualified
-- so nothing is ever created in, or read from, the `public` schema (which
-- belongs to another app on the shared project).
--
-- Equivalent to supabase/migrations/0001_init.sql learner/scenario/snapshot
-- tables, but:
--   * no auth.users: user_id references __SCHEMA__.users(id) (Privy DID mapped
--     to a MarketGym uuid; no wallet addresses are ever stored);
--   * no curriculum tables (curriculum lives in code), so skill ids are text
--     without foreign keys;
--   * row level security is enabled on every table with NO policies: only the
--     server (table owner) can read/write; PostgREST anon/authenticated get nothing.
-- gen_random_uuid() is built in since Postgres 13 (no extension needed).

create schema if not exists __SCHEMA__;

create table if not exists __SCHEMA__.users (
  id uuid primary key default gen_random_uuid(),
  privy_did text unique not null,
  display_name text,
  created_at timestamptz not null default now()
);
-- sign-out everywhere: session cookies issued before this moment are refused
alter table __SCHEMA__.users add column if not exists sessions_valid_after timestamptz;

create table if not exists __SCHEMA__.profiles (
  id uuid primary key references __SCHEMA__.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  experience_level text not null default 'new' check (experience_level in ('new','some','experienced')),
  learning_goal text not null default 'read-market-data',
  preferred_learning_style text not null default 'concise' check (preferred_learning_style in ('concise','detailed','examples')),
  interests text[] not null default '{}',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists __SCHEMA__.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references __SCHEMA__.users(id) on delete cascade,
  learning_path_id text not null,
  active_skill_id text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'active' check (status in ('active','completed','abandoned'))
);

-- diagnostics.id and coach_sessions.id are text: the learning engine mints
-- prefixed ids ("diag_…", "coach_…"), not bare uuids.
create table if not exists __SCHEMA__.diagnostics (
  id text primary key,
  user_id uuid not null references __SCHEMA__.users(id) on delete cascade,
  result jsonb not null, -- DiagnosticResult
  created_at timestamptz not null default now()
);
create index if not exists diagnostics_user on __SCHEMA__.diagnostics (user_id, created_at desc);

create table if not exists __SCHEMA__.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  market text not null,
  data_type text not null,
  payload jsonb not null,
  source_url text not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists market_snapshots_lookup on __SCHEMA__.market_snapshots (provider, market, data_type, fetched_at desc);

create table if not exists __SCHEMA__.scenarios (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  title text not null,
  description text not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  skill_ids text[] not null,
  source_snapshot_id uuid references __SCHEMA__.market_snapshots(id),
  assessment_rubric jsonb not null,
  scenario_content jsonb not null, -- full Scenario (incl. frozen evidence pack)
  created_at timestamptz not null default now()
);
create index if not exists scenarios_template on __SCHEMA__.scenarios (template_id, created_at desc);

create table if not exists __SCHEMA__.scenario_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references __SCHEMA__.users(id) on delete cascade,
  scenario_id uuid not null references __SCHEMA__.scenarios(id) on delete cascade,
  template_id text,
  skill_ids text[] not null default '{}',
  submitted_answer text not null,
  hints_used smallint not null default 0,
  rubric_scores jsonb not null,
  total_score smallint not null check (total_score between 0 and 100),
  feedback jsonb not null, -- Evaluation
  evaluation_confidence real not null,
  created_at timestamptz not null default now()
);
create index if not exists scenario_attempts_user on __SCHEMA__.scenario_attempts (user_id, created_at desc);

create table if not exists __SCHEMA__.user_skill_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references __SCHEMA__.users(id) on delete cascade,
  skill_id text not null,
  mastery_score smallint not null default 0 check (mastery_score between 0 and 100),
  mastery_status text not null default 'not-started' check (mastery_status in ('not-started','learning','practising','mastered')),
  evidence_count integer not null default 0,
  evidence jsonb not null default '[]',
  unresolved_misconception_ids text[] not null default '{}',
  last_assessed_at timestamptz,
  next_review_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, skill_id)
);

create table if not exists __SCHEMA__.learning_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references __SCHEMA__.users(id) on delete cascade,
  skill_id text not null,
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  result text check (result in ('passed','failed')),
  attempt_id uuid
);
create index if not exists learning_reviews_due on __SCHEMA__.learning_reviews (user_id, scheduled_at) where completed_at is null;

create table if not exists __SCHEMA__.knowledge_check_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references __SCHEMA__.users(id) on delete cascade,
  skill_id text not null,
  knowledge_check_id text not null,
  option_id text not null,
  correct boolean not null,
  misconception_id text,
  review_id uuid references __SCHEMA__.learning_reviews(id),
  created_at timestamptz not null default now()
);
create index if not exists knowledge_check_results_user on __SCHEMA__.knowledge_check_results (user_id, created_at desc);

create table if not exists __SCHEMA__.coach_sessions (
  id text primary key,
  user_id uuid not null references __SCHEMA__.users(id) on delete cascade,
  skill_id text not null,
  module_id text not null,
  session jsonb not null, -- CoachSession
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists coach_sessions_user on __SCHEMA__.coach_sessions (user_id, updated_at desc);

create table if not exists __SCHEMA__.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references __SCHEMA__.users(id) on delete cascade,
  kind text not null,
  skill_ids text[] not null default '{}',
  summary text not null,
  score smallint,
  ref_id text,
  created_at timestamptz not null default now()
);
create index if not exists activity_events_user on __SCHEMA__.activity_events (user_id, created_at desc);

-- practice (paper) portfolios: educational only, no funds, no wallet
create table if not exists __SCHEMA__.paper_portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references __SCHEMA__.users(id) on delete cascade,
  name text not null check (char_length(name) <= 80),
  portfolio jsonb not null, -- PaperPortfolio
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists paper_portfolios_user on __SCHEMA__.paper_portfolios (user_id, updated_at desc);

-- RLS on, no policies: the server connects as the table owner; nobody else reads anything.
alter table __SCHEMA__.users enable row level security;
alter table __SCHEMA__.profiles enable row level security;
alter table __SCHEMA__.learning_sessions enable row level security;
alter table __SCHEMA__.diagnostics enable row level security;
alter table __SCHEMA__.market_snapshots enable row level security;
alter table __SCHEMA__.scenarios enable row level security;
alter table __SCHEMA__.scenario_attempts enable row level security;
alter table __SCHEMA__.user_skill_mastery enable row level security;
alter table __SCHEMA__.learning_reviews enable row level security;
alter table __SCHEMA__.knowledge_check_results enable row level security;
alter table __SCHEMA__.coach_sessions enable row level security;
alter table __SCHEMA__.activity_events enable row level security;
alter table __SCHEMA__.paper_portfolios enable row level security;
