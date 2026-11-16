/**
 * Scenario generation = exercise template + frozen evidence pack. No model.
 * The description only summarises what evidence is attached and how fresh it
 * is (counts and kinds); it never invents figures.
 *
 * Scenario ids: the backend should create ids with `makeScenarioId(templateId,
 * evidenceId)` so attempts (which only carry scenarioId) can be mapped back to
 * templates. `templateIdFromScenarioId` also accepts any id that starts with a
 * known template id.
 */
import { listExerciseTemplates } from "@/lib/curriculum";
import type { ExerciseTemplate } from "@/lib/types/curriculum";
import type { Scenario, ScenarioAttempt } from "@/lib/types/learning";
import type { DataSourceKind, EvidencePack } from "@/lib/types/market";
import type { LearningMemory } from "./memory";

export const SCENARIO_ID_SEPARATOR = "__";

export function makeScenarioId(templateId: string, evidenceId: string): string {
  return `${templateId}${SCENARIO_ID_SEPARATOR}${evidenceId}`;
}

/** template id encoded in a scenario id, or null when it cannot be recovered */
export function templateIdFromScenarioId(scenarioId: string, knownTemplateIds: string[]): string | null {
  const idx = scenarioId.indexOf(SCENARIO_ID_SEPARATOR);
  if (idx > 0) {
    const candidate = scenarioId.slice(0, idx);
    if (knownTemplateIds.includes(candidate)) return candidate;
  }
  const byPrefix = knownTemplateIds.filter((t) => scenarioId.startsWith(t)).sort((a, b) => b.length - a.length)[0];
  return byPrefix ?? null;
}

function plural(n: number, singular: string, pluralWord = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralWord}`;
}

function freshness(pack: EvidencePack): string {
  const kinds = new Map<DataSourceKind, number>();
  const fetchedAts: string[] = [];
  const add = (k: DataSourceKind, at: string) => {
    kinds.set(k, (kinds.get(k) ?? 0) + 1);
    fetchedAts.push(at);
  };
  for (const s of pack.snapshots) add(s.provenance.kind, s.provenance.fetchedAt);
  for (const n of pack.news) add(n.provenance.kind, n.provenance.fetchedAt);
  for (const f of pack.etfFlows) add(f.provenance.kind, f.provenance.fetchedAt);
  for (const i of pack.indexes) add(i.provenance.kind, i.provenance.fetchedAt);
  for (const b of pack.orderBooks) add(b.provenance.kind, b.provenance.fetchedAt);
  if (fetchedAts.length === 0) return "No evidence is attached.";
  const parts: string[] = [];
  const label: Record<DataSourceKind, string> = { live: "live", cached: "cached", demo: "demo (fixture, not real-time)" };
  for (const k of ["live", "cached", "demo"] as const) {
    const c = kinds.get(k);
    if (c) parts.push(`${c} ${label[k]}`);
  }
  const latest = fetchedAts.sort()[fetchedAts.length - 1];
  return `Data sources: ${parts.join(", ")}; most recent fetch ${latest}. The evidence is frozen for this scenario.`;
}

/** plain-language inventory of the pack, counts and kinds only */
export function describeEvidenceSummary(pack: EvidencePack): string {
  const items: string[] = [];
  if (pack.snapshots.length > 0) items.push(`${plural(pack.snapshots.length, "market snapshot")} (${pack.snapshots.map((s) => s.asset).join(", ")})`);
  if (pack.news.length > 0) items.push(plural(pack.news.length, "news item"));
  if (pack.etfFlows.length > 0) items.push(`${plural(pack.etfFlows.length, "ETF flow series", "ETF flow series")} (${pack.etfFlows.map((f) => f.asset).join(", ")})`);
  if (pack.indexes.length > 0) items.push(`${plural(pack.indexes.length, "index snapshot")} (${pack.indexes.map((i) => i.name).join(", ")})`);
  if (pack.orderBooks.length > 0) items.push(`${plural(pack.orderBooks.length, "order book")} (${pack.orderBooks.map((b) => b.displayName).join(", ")})`);
  return items.length > 0 ? `Attached evidence: ${items.join("; ")}.` : "Attached evidence: none.";
}

export function buildScenario(template: ExerciseTemplate, evidence: EvidencePack, id: string): Scenario {
  const createdAt = new Date().toISOString();
  return {
    id,
    templateId: template.id,
    title: template.title,
    description: `${template.learningObjective} ${describeEvidenceSummary(evidence)} ${freshness(evidence)}`,
    difficulty: template.difficulty,
    skillIds: [...template.skillIds],
    learningObjective: template.learningObjective,
    evidence,
    questions: template.questions.map((prompt, i) => ({ id: `q${i + 1}`, prompt })),
    expectedReasoning: [...template.expectedReasoning],
    rubric: template.rubric,
    hints: [...template.hints],
    createdAt,
  };
}

/** number of attempts per template id, derived from attempt scenario ids */
export function attemptsPerTemplate(attempts: ScenarioAttempt[], templates: ExerciseTemplate[]): Map<string, number> {
  const known = templates.map((t) => t.id);
  const counts = new Map<string, number>();
  for (const a of attempts) {
    const t = a.templateId ?? templateIdFromScenarioId(a.scenarioId, known);
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return counts;
}

/**
 * Prefers templates not yet attempted; among those, ones whose common
 * misconceptions intersect the learner's recurring misconceptions; then lower
 * difficulty. If every template was attempted, the least-attempted one wins.
 */
export function pickTemplateForSkill(skillId: string, attempts: ScenarioAttempt[], memory: LearningMemory): ExerciseTemplate {
  let templates = listExerciseTemplates({ skillId, kind: "scenario" });
  if (templates.length === 0) templates = listExerciseTemplates({ skillId });
  if (templates.length === 0) throw new Error(`no exercise template for skill ${skillId}`);
  const counts = attemptsPerTemplate(attempts, templates);
  const recurring = new Set(memory.recurringMisconceptions.map((m) => m.misconceptionId));
  const overlap = (t: ExerciseTemplate) => t.rubric.commonMisconceptionIds.filter((id) => recurring.has(id)).length;
  const ranked = [...templates].sort((a, b) => {
    const ca = counts.get(a.id) ?? 0;
    const cb = counts.get(b.id) ?? 0;
    if (ca !== cb) return ca - cb;
    const oa = overlap(a);
    const ob = overlap(b);
    if (oa !== ob) return ob - oa;
    return a.difficulty - b.difficulty;
  });
  return ranked[0];
}
