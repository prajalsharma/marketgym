/**
 * One Socratic coach turn. The model may name at most one misconception and
 * attach at most one knowledge check; both are checked against known ids by
 * the coach before use.
 */
import { z } from "zod";

export const CoachTurnSchema = z.object({
  /** the coach's reply; must end with exactly one question unless objectiveComplete */
  message: z.string().min(1).max(1600),
  /** module id and evidence ids (snapshot:BTC, news:<id>, etf:BTC, index:<id>, orderbook:<market>) relied on */
  citations: z.array(z.string().max(120)).max(10),
  misconceptionId: z.string().max(80).nullable(),
  attachKnowledgeCheckId: z.string().max(120).nullable(),
  objectiveComplete: z.boolean(),
});

export type CoachTurn = z.infer<typeof CoachTurnSchema>;
