/**
 * Curriculum engine: skill/module progress and the next-mission selector.
 * Pure rules, no model:
 *   1. overdue review (scheduledAt ≤ now, not completed)
 *   2. scenario targeting a recurring, unresolved misconception's skill
 *   3. first unlocked, non-mastered skill in path order
 *      (lesson → scenario → second scenario on another template → orderbook)
 * A mastered skill is never assigned except through a review.
 */
import type { KnowledgeCheckResult } from "@/lib/db/repository";
import { curriculum, getMisconception, getModule, getSkill, listExerciseTemplates } from "@/lib/curriculum";
import type { LearningPathResponse, SkillProgress } from "@/lib/types/api";
import type { Module, Skill } from "@/lib/types/curriculum";
import type { DiagnosticResult, MasteryRecord, MasteryStatus, NextMission, Profile, Review, ScenarioAttempt } from "@/lib/types/learning";
import { misconceptionOccurrences, recurringMisconceptions } from "./memory";
import { orderBookExercisesForSkill } from "./orderbook-exercises";
import { LEARNER_INPUT_TEMPLATE_IDS, labTemplatesForSkill } from "./scenario-generator";

const PRACTISING_OR_BETTER: ReadonlySet<MasteryStatus> = new Set<MasteryStatus>(["practising", "mastered"]);
const MASTERY_SCORE = 80;

export function hrefLesson(moduleId: string, skillId: string): string {
  return `/app/learn/${moduleId}?skill=${encodeURIComponent(skillId)}`;
}
export function hrefScenario(skillId: string): string {
  return `/app/scenario-lab?skill=${encodeURIComponent(skillId)}`;
}
export function hrefOrderBook(exerciseId: string): string {
  return `/app/orderbook-gym?exercise=${encodeURIComponent(exerciseId)}`;
}
export function hrefReview(reviewId: string): string {
  return `/app/review/${encodeURIComponent(reviewId)}`;
}
export const HREF_ONBOARDING = "/app/onboarding";
export const HREF_PORTFOLIO = "/app/portfolio";
export function hrefWealth(fundId: string): string {
  return `/app/wealth?fund=${encodeURIComponent(fundId)}`;
}

/**
 * Wealth reading skills and the fund whose real data illustrates the lesson
 * (fund ids from the SoDEX Wealth board). The lesson stays at /app/learn; the
 * frontend can offer this link as "see it in the Wealth lab".
 */
const WEALTH_LESSON_FUNDS: Record<string, string> = {
  "wealth.fund-types": "antb",
  "wealth.nav-vs-price": "antb",
  "wealth.yield-apy": "Morpho-Earn",
  "wealth.dca": "vVOO",
  "indexes.index-nav": "antb",
  "markets.trading-hours": "vQQQ",
};

/** `/app/wealth?fund=<id>` for skills taught with a fund's real data, else null */
export function wealthLabHrefForSkill(skillId: string): string | null {
  const fund = WEALTH_LESSON_FUNDS[skillId];
  return fund ? hrefWealth(fund) : null;
}

/** skills practised by reviewing the learner's own practice portfolio */
export function isPortfolioSkill(skillId: string): boolean {
  return listExerciseTemplates({ skillId }).some((t) => LEARNER_INPUT_TEMPLATE_IDS.has(t.id) && t.skillIds.includes(skillId));
}

/** modules by sequence */
export function orderedModules(): Module[] {
  return [...curriculum.modules].sort((a, b) => a.sequence - b.sequence);
}

/** leaf skills in path order (module sequence, then module.skillIds order) */
export function pathOrderedSkills(): Skill[] {
  const out: Skill[] = [];
  const seen = new Set<string>();
  for (const mod of orderedModules()) {
    for (const id of mod.skillIds) {
      const s = getSkill(id);
      if (s && !seen.has(id)) {
        out.push(s);
        seen.add(id);
      }
    }
  }
  for (const s of curriculum.skills) if (!seen.has(s.id)) out.push(s);
  return out;
}

function moduleOf(skill: Skill): Module | undefined {
  return getModule(skill.parentSkillId ?? skill.category) ?? orderedModules().find((m) => m.skillIds.includes(skill.id));
}

function isPractisingOrBetter(record: MasteryRecord | null | undefined): boolean {
  return Boolean(record && PRACTISING_OR_BETTER.has(record.masteryStatus));
}

function moduleShare(mod: Module, mastery: Map<string, MasteryRecord>): number {
  if (mod.skillIds.length === 0) return 0;
  const n = mod.skillIds.filter((id) => isPractisingOrBetter(mastery.get(id))).length;
  return n / mod.skillIds.length;
}

/** module gate: every prerequisite module has at least half its skills practising+ (or the diagnostic placed the learner at/after it) */
function moduleReachable(mod: Module, mastery: Map<string, MasteryRecord>, diagnostic: DiagnosticResult | null | undefined): boolean {
  if (diagnostic) {
    const start = getModule(diagnostic.recommendedStartModuleId);
    if (start && mod.sequence <= start.sequence) return true;
    const est = diagnostic.estimates.find((e) => e.skillId === mod.id);
    if (est && est.estimatedLevel >= 3) return true;
  }
  return mod.prerequisiteModuleIds.every((pid) => {
    const p = getModule(pid);
    return !p || moduleShare(p, mastery) >= 0.5;
  });
}

/** a prerequisite counts as met when practising+, or when the diagnostic rated it ≥3 or placed the learner past its module */
function prerequisiteMet(id: string, mastery: Map<string, MasteryRecord>, diagnostic: DiagnosticResult | null | undefined): boolean {
  if (isPractisingOrBetter(mastery.get(id))) return true;
  if (!diagnostic) return false;
  const est = diagnostic.estimates.find((e) => e.skillId === id);
  if (est && est.estimatedLevel >= 3) return true;
  const skill = getSkill(id);
  const mod = skill ? moduleOf(skill) : undefined;
  const start = getModule(diagnostic.recommendedStartModuleId);
  return Boolean(mod && start && mod.sequence < start.sequence);
}

export function computeSkillProgress(mastery: MasteryRecord[], opts: { diagnostic?: DiagnosticResult | null } = {}): SkillProgress[] {
  const byId = new Map(mastery.map((m) => [m.skillId, m] as const));
  return pathOrderedSkills().map((skill) => {
    const mod = moduleOf(skill);
    const prereqsOk = skill.prerequisiteSkillIds.every((id) => prerequisiteMet(id, byId, opts.diagnostic));
    const modOk = mod ? moduleReachable(mod, byId, opts.diagnostic) : true;
    return { skill, mastery: byId.get(skill.id) ?? null, unlocked: prereqsOk && modOk };
  });
}

export function computeModuleProgress(skills: SkillProgress[]): LearningPathResponse["modules"] {
  const byId = new Map(skills.map((s) => [s.skill.id, s] as const));
  const share = (mod: Module) =>
    mod.skillIds.length === 0 ? 0 : mod.skillIds.filter((id) => isPractisingOrBetter(byId.get(id)?.mastery)).length / mod.skillIds.length;
  return orderedModules().map((mod) => {
    const prereqs = mod.prerequisiteModuleIds.every((pid) => {
      const p = getModule(pid);
      return !p || share(p) >= 0.5;
    });
    const anyUnlocked = mod.skillIds.some((id) => byId.get(id)?.unlocked);
    return { module: mod, unlocked: prereqs || anyUnlocked, progress: share(mod) };
  });
}

export interface SelectNextMissionInput {
  profile: Profile;
  diagnostic: DiagnosticResult | null;
  mastery: MasteryRecord[];
  reviews: Review[];
  attempts: ScenarioAttempt[];
  kcResults: KnowledgeCheckResult[];
  /** defaults to new Date() */
  now?: Date;
}

function firstSkillOfPath(): { skillId: string; moduleId: string } {
  const first = pathOrderedSkills()[0];
  const mod = first ? moduleOf(first) : undefined;
  return { skillId: first?.id ?? "markets.price", moduleId: mod?.id ?? "markets" };
}

/** recurring misconceptions (≥2) whose skill has not since shown a clean attempt or a correct check */
export function unresolvedRecurringMisconceptions(
  attempts: ScenarioAttempt[],
  kcResults: KnowledgeCheckResult[],
): Array<{ misconceptionId: string; skillId: string; count: number; lastSeenAt: string }> {
  const out: Array<{ misconceptionId: string; skillId: string; count: number; lastSeenAt: string }> = [];
  const occurrences = misconceptionOccurrences(attempts, kcResults);
  for (const r of recurringMisconceptions(attempts, kcResults)) {
    const m = getMisconception(r.misconceptionId);
    if (!m) continue;
    const last = occurrences.filter((o) => o.misconceptionId === r.misconceptionId).map((o) => o.at).sort().pop() ?? r.lastSeenAt;
    const cleanAttempt = attempts.some(
      (a) => a.createdAt > last && a.skillIds.includes(m.skillId) && !a.evaluation.misconceptionIds.includes(r.misconceptionId),
    );
    const correctCheck = kcResults.some((k) => k.createdAt > last && k.skillId === m.skillId && k.correct);
    if (!cleanAttempt && !correctCheck) out.push({ misconceptionId: r.misconceptionId, skillId: m.skillId, count: r.count, lastSeenAt: last });
  }
  return out;
}

/** written exercises the scenario lab can serve for the skill (orderbook templates are answered the same way; the portfolio review is not lab-servable) */
function scenarioTemplatesFor(skillId: string) {
  return labTemplatesForSkill(skillId);
}

/** a written mission for the skill: the scenario lab, or the practice portfolio when that is the only exercise covering it */
function writtenMissionHref(skillId: string): string | null {
  if (scenarioTemplatesFor(skillId).length > 0) return hrefScenario(skillId);
  if (isPortfolioSkill(skillId)) return HREF_PORTFOLIO;
  return null;
}

/**
 * distinct scenarios on which the learner scored ≥80 for the skill. Keyed by
 * scenario id to match lib/learning/mastery.ts exactly: a new scenario (fresh
 * evidence pack) counts even when a skill has only one template.
 */
function highScoringDistinct(skillId: string, attempts: ScenarioAttempt[]): number {
  const keys = new Set<string>();
  for (const a of attempts) {
    if (!a.skillIds.includes(skillId) || a.evaluation.totalScore < MASTERY_SCORE) continue;
    keys.add(a.scenarioId);
  }
  return keys.size;
}

function missionForSkill(
  skill: Skill,
  mod: Module,
  record: MasteryRecord | null,
  attempts: ScenarioAttempt[],
  kcResults: KnowledgeCheckResult[],
): NextMission | null {
  const name = skill.name;
  const noActivity = !record || record.masteryStatus === "not-started";
  if (noActivity) {
    return {
      kind: "lesson",
      skillId: skill.id,
      moduleId: mod.id,
      title: `Lesson: ${name}`,
      reason: wealthLabHrefForSkill(skill.id)
        ? `You have not started ${name} yet, so the lesson comes first; the Wealth lab shows the same ideas on real fund data.`
        : `You have not started ${name} yet, so the lesson comes first.`,
      href: hrefLesson(mod.id, skill.id),
    };
  }
  const status = record.masteryStatus;
  const templates = scenarioTemplatesFor(skill.id);
  const writtenHref = writtenMissionHref(skill.id);
  const viaPortfolio = writtenHref === HREF_PORTFOLIO;
  const where = viaPortfolio ? "your practice portfolio review" : "a scenario";
  const skillAttempts = attempts.filter((a) => a.skillIds.includes(skill.id));
  const highDistinct = highScoringDistinct(skill.id, skillAttempts);

  if (writtenHref) {
    const titlePrefix = viaPortfolio ? "Practice portfolio" : "Scenario";
    if (status === "learning") {
      return {
        kind: "scenario",
        skillId: skill.id,
        moduleId: mod.id,
        title: `${titlePrefix}: ${name}`,
        reason: skillAttempts.length === 0
          ? viaPortfolio
            ? `You have read about ${name}; building a practice portfolio and explaining it with its real fund data will show whether you can apply it.`
            : `You have read about ${name}; a scenario with real evidence will show whether you can apply it.`
          : `Your best score on ${name} is under 60, so another attempt with ${viaPortfolio ? "a revised portfolio rationale" : "fresh evidence"} is the next step.`,
        href: writtenHref,
      };
    }
    if (highDistinct === 0) {
      return {
        kind: "scenario",
        skillId: skill.id,
        moduleId: mod.id,
        title: `${titlePrefix}: ${name}`,
        reason: `You are practising ${name}; mastery needs two scores of 80 or more on different ${viaPortfolio ? "portfolio reviews" : "scenarios"}.`,
        href: writtenHref,
      };
    }
    if (highDistinct === 1 && (templates.length > 1 || viaPortfolio || status !== "mastered")) {
      return {
        kind: "scenario",
        skillId: skill.id,
        moduleId: mod.id,
        title: `${titlePrefix}: ${name} (${viaPortfolio ? "another review" : "different evidence"})`,
        reason: `You scored 80 or more on one ${name} ${viaPortfolio ? "portfolio review" : "scenario"}; a second score of 80 on ${where === "a scenario" ? "a different scenario" : "another review"} is needed before a retention check.`,
        href: writtenHref,
      };
    }
  }

  if (skill.category === "orderbook") {
    const exercises = orderBookExercisesForSkill(skill.id);
    const done = record.evidence.some((e) => e.kind === "orderbook");
    if (exercises.length > 0 && !done) {
      return {
        kind: "orderbook",
        skillId: skill.id,
        moduleId: mod.id,
        title: `Order Book Gym: ${exercises[0].title}`,
        reason: `${name} is best practised on a live book, so the next step is the "${exercises[0].title}" exercise.`,
        href: hrefOrderBook(exercises[0].id),
      };
    }
  }

  if (!writtenHref && status === "learning") {
    const correct = kcResults.filter((k) => k.skillId === skill.id && k.correct && !k.reviewId).length;
    if (correct < 2) {
      return {
        kind: "lesson",
        skillId: skill.id,
        moduleId: mod.id,
        title: `Knowledge checks: ${name}`,
        reason: `${name} has no scenario yet; two correct knowledge checks move it to practising.`,
        href: hrefLesson(mod.id, skill.id),
      };
    }
  }
  return null; // nothing useful to assign now (e.g. waiting for a retention review)
}

export function selectNextMission(input: SelectNextMissionInput): NextMission {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const masteryById = new Map(input.mastery.map((m) => [m.skillId, m] as const));

  // 0. onboarding
  if (!input.diagnostic && !input.profile.onboardingCompletedAt) {
    const first = firstSkillOfPath();
    return {
      kind: "diagnostic",
      ...first,
      title: "Quick diagnostic",
      reason: "Seven short questions tell us where to start you on the path.",
      href: HREF_ONBOARDING,
    };
  }

  // 1. overdue review
  const overdue = input.reviews
    .filter((r) => r.completedAt === null && r.scheduledAt <= nowIso)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
  if (overdue) {
    const skill = getSkill(overdue.skillId);
    const mod = skill ? moduleOf(skill) : undefined;
    return {
      kind: "review",
      skillId: overdue.skillId,
      moduleId: mod?.id ?? overdue.skillId.split(".")[0],
      title: `Retention check: ${skill?.name ?? overdue.skillId}`,
      reason: `A retention check on ${skill?.name ?? overdue.skillId} was due ${overdue.scheduledAt.slice(0, 10)}; passing it keeps the skill on track for mastery.`,
      href: hrefReview(overdue.id),
    };
  }

  // 2. recurring misconception
  for (const m of unresolvedRecurringMisconceptions(input.attempts, input.kcResults)) {
    const skill = getSkill(m.skillId);
    const mod = skill ? moduleOf(skill) : undefined;
    const record = masteryById.get(m.skillId);
    if (!skill || !mod || record?.masteryStatus === "mastered") continue;
    const href = writtenMissionHref(skill.id);
    if (!href) continue;
    const label = getMisconception(m.misconceptionId)?.label ?? m.misconceptionId;
    const viaPortfolio = href === HREF_PORTFOLIO;
    return {
      kind: "scenario",
      skillId: skill.id,
      moduleId: mod.id,
      title: `${viaPortfolio ? "Practice portfolio" : "Scenario"}: ${skill.name}`,
      reason: `The pattern "${label}" has shown up ${m.count} times in your work; this ${viaPortfolio ? "portfolio review" : "scenario"} on ${skill.name} targets it directly.`,
      href,
    };
  }

  // 3. first unlocked, non-mastered skill in path order
  const progress = computeSkillProgress(input.mastery, { diagnostic: input.diagnostic });
  for (const p of progress) {
    if (!p.unlocked || p.mastery?.masteryStatus === "mastered") continue;
    const mod = moduleOf(p.skill);
    if (!mod) continue;
    const mission = missionForSkill(p.skill, mod, p.mastery, input.attempts, input.kcResults);
    if (mission) return mission;
  }

  // 4. nothing assignable: next upcoming review, else revisit the last module
  const upcoming = input.reviews.filter((r) => r.completedAt === null).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
  if (upcoming) {
    const skill = getSkill(upcoming.skillId);
    const mod = skill ? moduleOf(skill) : undefined;
    return {
      kind: "review",
      skillId: upcoming.skillId,
      moduleId: mod?.id ?? upcoming.skillId.split(".")[0],
      title: `Retention check: ${skill?.name ?? upcoming.skillId}`,
      reason: `Everything available is done for now; your next retention check on ${skill?.name ?? upcoming.skillId} opens ${upcoming.scheduledAt.slice(0, 10)}.`,
      href: hrefReview(upcoming.id),
    };
  }
  const mods = orderedModules();
  const last = mods[mods.length - 1];
  const lastSkill = last?.skillIds[last.skillIds.length - 1] ?? firstSkillOfPath().skillId;
  return {
    kind: "lesson",
    skillId: lastSkill,
    moduleId: last?.id ?? "reasoning",
    title: `Revisit: ${getSkill(lastSkill)?.name ?? lastSkill}`,
    reason: "You have mastered every unlocked skill on the path; revisit the final module to keep it fresh.",
    href: hrefLesson(last?.id ?? "reasoning", lastSkill),
  };
}
