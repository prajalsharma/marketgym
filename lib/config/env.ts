import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().or(z.literal("")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal("")),
  OPENAI_API_KEY: z.string().optional().or(z.literal("")),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  SOSOVALUE_API_KEY: z.string().optional().or(z.literal("")),
  SOSOVALUE_BASE_URL: z.string().url().default("https://openapi.sosovalue.com/openapi/v1"),
  SODEX_MARKET_DATA_BASE_URL: z.string().url().default("https://mainnet-gw.sodex.dev/api/v1/spot"),
  SODEX_MARKET_DATA_API_KEY: z.string().optional().or(z.literal("")),
  DEMO_MODE: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

export type Env = z.infer<typeof schema> & {
  supabaseEnabled: boolean;
  openaiEnabled: boolean;
  sosovalueEnabled: boolean;
  sodexEnabled: boolean;
};

let cached: Env | null = null;

/** Server-only. Never import from client components. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.parse(process.env);
  cached = {
    ...parsed,
    supabaseEnabled: Boolean(parsed.NEXT_PUBLIC_SUPABASE_URL && parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    openaiEnabled: Boolean(parsed.OPENAI_API_KEY) && !parsed.DEMO_MODE,
    sosovalueEnabled: Boolean(parsed.SOSOVALUE_API_KEY) && !parsed.DEMO_MODE,
    sodexEnabled: !parsed.DEMO_MODE,
  };
  return cached;
}

/** test helper */
export function resetEnvCache(): void {
  cached = null;
}
