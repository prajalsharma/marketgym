/**
 * Repository factory. Local JSON store unless Supabase is configured.
 */
import { getEnv } from "@/lib/config/env";
import { createLocalRepository, localDataFilePath, type LocalRepository } from "./local-repository";
import type { Repository } from "./repository";

export type { KnowledgeCheckResult, Repository } from "./repository";

const localInstances = new Map<string, LocalRepository>();

/**
 * Returns the Repository for the current request. In Supabase mode a fresh
 * instance is created per call (it binds to the caller's cookie session);
 * in local mode one instance per data file is shared.
 */
export async function getRepository(): Promise<Repository> {
  if (getEnv().supabaseEnabled) {
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
