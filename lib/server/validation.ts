/**
 * Zod schemas for every request body / query in docs/CONTRACTS.md.
 * Inferred types are structurally identical to lib/types/api.ts requests.
 */
import { z } from "zod";

const skillId = z.string().trim().min(1).max(80).regex(/^[a-z0-9.-]+$/, "invalid skill id");
const idString = z.string().trim().min(1).max(200);

// ---- auth ----
export const authCredentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  displayName: z.string().trim().max(80).optional(),
  next: z.string().max(500).optional(),
});

// ---- profile ----
export const profileUpsertSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  experienceLevel: z.enum(["new", "some", "experienced"]),
  learningGoal: z.enum(["understand-news", "read-market-data", "analyst-career", "etf-and-indexes", "market-structure"]),
  preferredLearningStyle: z.enum(["concise", "detailed", "examples"]),
  interests: z.array(z.string().trim().min(1).max(40)).max(12),
});

// ---- diagnostic ----
export const diagnosticSubmitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: idString,
        value: z.string().max(2000),
      }),
    )
    .min(1)
    .max(20),
});

// ---- learning ----
export const knowledgeCheckSubmitSchema = z.object({
  knowledgeCheckId: idString,
  optionId: idString,
});

export const reviewSubmitSchema = z.object({
  reviewId: idString,
  knowledgeCheckId: idString,
  optionId: idString,
});

// ---- coach ----
export const coachSessionCreateSchema = z.object({ skillId });
export const coachSessionQuerySchema = z.object({ id: idString });
export const coachRespondSchema = z.object({
  sessionId: idString,
  message: z.string().trim().min(1, "Say something first.").max(2000),
});
export const coachHintSchema = z.object({ sessionId: idString });

// ---- scenarios ----
export const scenarioNextQuerySchema = z.object({ skillId });
export const scenarioAttemptSchema = z.object({
  answer: z
    .string()
    .trim()
    .min(20, "Write at least 20 characters so the evaluator has something to work with.")
    .max(4000, "Keep your answer under 4000 characters."),
  hintsUsed: z.number().int().min(0).max(3),
});

// ---- orderbook gym ----
export const marketSymbol = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[A-Za-z0-9]+_[A-Za-z0-9]+$/, "market must look like vBTC_vUSDC");

export const orderBookExerciseSubmitSchema = z.object({
  exerciseId: idString,
  market: marketSymbol,
  answers: z.record(z.string().min(1).max(80), z.union([z.string().max(200), z.number().finite()])).refine((r) => Object.keys(r).length > 0, {
    message: "Answer at least one question.",
  }),
  snapshotTimestamp: z.string().min(1).max(64),
});

// ---- market ----
const assetList = z
  .string()
  .default("BTC,ETH")
  .transform((s) =>
    s
      .split(",")
      .map((a) => a.trim().toUpperCase())
      .filter((a) => a.length > 0),
  )
  .pipe(z.array(z.string().regex(/^[A-Z0-9]{2,10}$/)).min(1).max(6));

export const marketSnapshotQuerySchema = z.object({ assets: assetList });

export const marketNewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
  category: z.enum(["market", "etf", "macro"]).optional(),
});

export const marketEtfQuerySchema = z.object({
  asset: z
    .string()
    .default("BTC")
    .transform((s) => s.trim().toUpperCase())
    .pipe(z.enum(["BTC", "ETH"])),
});

export const marketOrderBookQuerySchema = z.object({
  market: marketSymbol.default("vBTC_vUSDC"),
  limit: z.coerce.number().int().min(5).max(100).default(20),
});

export const progressAttemptsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type AuthCredentials = z.infer<typeof authCredentialsSchema>;
