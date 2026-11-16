import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { getDiagnosticQuestions } from "@/lib/learning/diagnostic";
import { handle, ok } from "@/lib/server/api";
import { ensureProfile } from "@/lib/server/learner";
import type { DiagnosticQuestion } from "@/lib/types";

export const GET = handle(async () => {
  const user = await requireUser();
  const repo = await getRepository();
  const profile = await ensureProfile(repo, user);
  return ok<DiagnosticQuestion[]>(getDiagnosticQuestions(profile));
});
