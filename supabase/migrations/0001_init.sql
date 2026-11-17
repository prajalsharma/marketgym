-- MarketGym initial schema. Postgres 15+, Supabase Auth.
-- Curriculum tables (skills, learning_paths, learning_path_skills, scenario templates)
-- are public read. Learner tables are RLS-isolated to auth.uid().

create extension if not exists "pgcrypto";

-- ---------- curriculum (public, seeded) ----------
create table if not exists public.skills (
  id text primary key,
  name text not null,
  description text not null,
  category text not null check (category in ('markets','news','etf','indexes','orderbook','reasoning')),
  difficulty smallint not null check (difficulty between 1 and 5),
  parent_skill_id text references public.skills(id),
  prerequisite_skill_ids text[] not null default '{}'
);

create table if not exists public.learning_paths (
  id text primary key,
  title text not null,
  description text not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  published boolean not null default false
);

create table if not exists public.learning_path_skills (
  id uuid primary key default gen_random_uuid(),
  learning_path_id text not null references public.learning_paths(id) on delete cascade,
  skill_id text not null references public.skills(id) on delete cascade,
  sequence integer not null,
  prerequisite_skill_ids text[] not null default '{}',
  unique (learning_path_id, skill_id)
);

create table if not exists public.modules (
  id text primary key,
  learning_path_id text not null references public.learning_paths(id) on delete cascade,
  sequence integer not null,
  content jsonb not null -- lib/types/curriculum.ts Module
);

-- ---------- learner data (RLS) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  experience_level text not null default 'new' check (experience_level in ('new','some','experienced')),
  learning_goal text not null default 'read-market-data',
  preferred_learning_style text not null default 'concise' check (preferred_learning_style in ('concise','detailed','examples')),
  interests text[] not null default '{}',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learning_path_id text not null references public.learning_paths(id),
  active_skill_id text references public.skills(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'active' check (status in ('active','completed','abandoned'))
);

create table if not exists public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  result jsonb not null, -- DiagnosticResult
  created_at timestamptz not null default now()
);

create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  market text not null,
  data_type text not null,
  payload jsonb not null,
  source_url text not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists market_snapshots_lookup on public.market_snapshots (provider, market, data_type, fetched_at desc);

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  title text not null,
  description text not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  skill_ids text[] not null,
  source_snapshot_id uuid references public.market_snapshots(id),
  assessment_rubric jsonb not null,
  scenario_content jsonb not null, -- full Scenario (incl. frozen evidence pack)
  created_at timestamptz not null default now()
);
create index if not exists scenarios_template on public.scenarios (template_id, created_at desc);

create table if not exists public.scenario_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
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
create index if not exists scenario_attempts_user on public.scenario_attempts (user_id, created_at desc);

create table if not exists public.user_skill_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null references public.skills(id),
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

create table if not exists public.learning_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null references public.skills(id),
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  result text check (result in ('passed','failed')),
  attempt_id uuid
);
create index if not exists learning_reviews_due on public.learning_reviews (user_id, scheduled_at) where completed_at is null;

create table if not exists public.knowledge_check_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null references public.skills(id),
  knowledge_check_id text not null,
  option_id text not null,
  correct boolean not null,
  misconception_id text,
  review_id uuid references public.learning_reviews(id),
  created_at timestamptz not null default now()
);

create table if not exists public.coach_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null references public.skills(id),
  module_id text not null,
  session jsonb not null, -- CoachSession
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  skill_ids text[] not null default '{}',
  summary text not null,
  score smallint,
  ref_id text,
  created_at timestamptz not null default now()
);
create index if not exists activity_events_user on public.activity_events (user_id, created_at desc);

-- ---------- RLS ----------
alter table public.skills enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_path_skills enable row level security;
alter table public.modules enable row level security;
alter table public.market_snapshots enable row level security;
alter table public.scenarios enable row level security;

create policy "curriculum is public" on public.skills for select using (true);
create policy "paths are public" on public.learning_paths for select using (published);
create policy "path skills are public" on public.learning_path_skills for select using (true);
create policy "modules are public" on public.modules for select using (true);
create policy "snapshots readable" on public.market_snapshots for select to authenticated using (true);
create policy "scenarios readable" on public.scenarios for select to authenticated using (true);
-- writes to curriculum/snapshots/scenarios happen with the service role only.

alter table public.profiles enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.diagnostics enable row level security;
alter table public.scenario_attempts enable row level security;
alter table public.user_skill_mastery enable row level security;
alter table public.learning_reviews enable row level security;
alter table public.knowledge_check_results enable row level security;
alter table public.coach_sessions enable row level security;
alter table public.activity_events enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own sessions" on public.learning_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own diagnostics read" on public.diagnostics for select using (auth.uid() = user_id);
-- attempts, knowledge-check results, coach sessions and diagnostics feed mastery and the
-- model context, so learners can only read them; the server writes with the service role.
create policy "own attempts read" on public.scenario_attempts for select using (auth.uid() = user_id);
-- mastery is read-only for learners; only the server (service role) writes it.
create policy "own mastery read" on public.user_skill_mastery for select using (auth.uid() = user_id);
create policy "own reviews read" on public.learning_reviews for select using (auth.uid() = user_id);
create policy "own kc results read" on public.knowledge_check_results for select using (auth.uid() = user_id);
create policy "own coach sessions read" on public.coach_sessions for select using (auth.uid() = user_id);
create policy "own activity read" on public.activity_events for select using (auth.uid() = user_id);

-- auto-create profile on signup
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
