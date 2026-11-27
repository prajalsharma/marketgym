/**
 * Repository factory, chosen by getEnv().authMode:
 *  - privy    → Postgres (postgres.js, DATABASE_URL, schema DB_SCHEMA); one pool per process
 *  - supabase → Supabase (fresh per call: binds to the caller's cookie session)
 *  - local    → JSON file in ./.data; one instance per data file
 */
import { getEnv } from "@/lib/config/env";
import { createLocalRepository, localDataFilePath, type LocalRepository } from "./local-repository";
import type { PostgresRepository } from "./postgres/postgres-repository";
import type { Repository } from "./repository";

export type { KnowledgeCheckResult, Repository } from "./repository";

const localInstances = new Map<string, LocalRepository>();

/** Privy mode only: the Postgres repository (also exposes the users table). */
export async function getPostgresRepositoryFromEnv(): Promise<PostgresRepository> {
  const env = getEnv();
  if (env.authMode !== "privy" || !env.DATABASE_URL) throw new Error("Postgres storage is only available in privy mode (DATABASE_URL).");
  const { getPostgresRepository } = await import("./postgres/postgres-repository");
  return getPostgresRepository(env.DATABASE_URL, env.DB_SCHEMA);
}

export async function getRepository(): Promise<Repository> {
  const env = getEnv();
  if (env.authMode === "privy") return getPostgresRepositoryFromEnv();
  if (env.authMode === "supabase") {
    const { createSupabaseRepository } = await import("./supabase-repository");
    return createSupabaseRepository();
  }
  const file = localDataFilePath();
  let repo = localInstances.get(file);
  if (!repo) {
    repo = createLocalRepository(file);
    localInstances.set(file, repo);
  }
  return repo;
}

/** test helper */
export function resetRepositoryCache(): void {
  localInstances.clear();
}
