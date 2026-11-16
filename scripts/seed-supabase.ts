/**
 * Seed the Supabase curriculum tables.
 *
 *   pnpm seed:supabase
 *
 * Reads supabase/seed/seed.sql and runs it through the service role via the
 * `exec_sql` RPC if the project exposes one. Otherwise (the common case) it
 * prints the exact CLI commands, since the Supabase REST API cannot execute
 * arbitrary SQL. Nothing here touches learner data.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "../lib/config/env";

async function main(): Promise<void> {
  const env = getEnv();
  const seedPath = path.resolve(process.cwd(), "supabase/seed/seed.sql");
  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/0001_init.sql");

  let sql: string;
  try {
    sql = await readFile(seedPath, "utf8");
  } catch {
    console.error(`Seed file not found at ${seedPath}. The curriculum agent owns supabase/seed/.`);
    process.exitCode = 1;
    return;
  }

  const manual = [
    "Run the migration and seed with the Supabase CLI:",
    "  supabase link --project-ref <ref>",
    "  supabase db push                                   # applies supabase/migrations/*.sql",
    `  supabase db query --file ${path.relative(process.cwd(), seedPath)}`,
    "or paste both files into the SQL editor in the dashboard:",
    `  1. ${path.relative(process.cwd(), migrationPath)}`,
    `  2. ${path.relative(process.cwd(), seedPath)}`,
  ].join("\n");

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set, so nothing was executed.\n");
    console.log(manual);
    return;
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Optional helper some projects define: create function exec_sql(sql text) ... security definer.
  const { error } = await supabase.rpc("exec_sql", { sql });
  if (!error) {
    console.log(`Seed applied via exec_sql RPC (${sql.length} bytes from ${path.relative(process.cwd(), seedPath)}).`);
    return;
  }
  console.log(`Could not execute SQL through the API (${error.message}).\n`);
  console.log(manual);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
