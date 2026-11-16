/**
 * Curriculum validator. Run with: pnpm tsx lib/curriculum/validate.ts
 * Exits non-zero and lists every problem if the curriculum is inconsistent.
 */
import { curriculum } from "./index";

const EXPECTED_SKILL_IDS = [
  "markets.price", "markets.volume", "markets.market-cap", "markets.liquidity", "markets.volatility", "markets.structure",
  "news.facts-vs-opinions", "news.catalysts", "news.narratives", "news.uncertainty", "news.causation",
  "etf.flows", "etf.aum", "etf.flow-limits", "etf.change-over-time",
  "indexes.constituents", "indexes.weighting", "indexes.concentration", "indexes.diversification", "indexes.performance",
  "orderbook.bid-ask", "orderbook.spread", "orderbook.depth", "orderbook.liquidity", "orderbook.imbalance", "orderbook.tick-lot", "orderbook.price-time-priority",
  "reasoning.thesis", "reasoning.evidence-selection", "reasoning.observation-vs-interpretation", "reasoning.missing-info", "reasoning.uncertainty", "reasoning.invalidation",
];

const EXPECTED_MISCONCEPTION_IDS = [
  "price-equals-value", "volume-implies-direction", "market-cap-is-money-invested",
  "liquidity-equals-volume", "volatility-is-bad", "spread-is-fee",
  "headline-is-fact", "correlation-is-causation", "narrative-is-evidence",
  "single-source-certainty", "flows-equal-price-impact", "aum-change-equals-flows",
  "one-day-flow-is-trend", "index-is-equal-weight", "concentration-is-diversification",
  "index-return-is-every-asset", "depth-is-static", "imbalance-predicts-price",
  "bigger-book-always-more-liquid", "tick-size-is-min-order", "earlier-order-loses-to-bigger",
  "observation-is-interpretation", "confidence-is-evidence", "thesis-without-invalidation",
];

const MODULE_PREREQS: Record<string, string[]> = {
  markets: [],
  news: ["markets"],
  etf: ["markets"],
  indexes: ["markets"],
  orderbook: ["markets"],
  reasoning: ["news", "etf"],
};

const EVIDENCE_TOKENS = new Set([
  "snapshot:BTC", "snapshot:ETH", "news:market", "news:etf", "news:macro",
  "etf:BTC", "etf:ETH", "index:all", "orderbook:vBTC_vUSDC", "orderbook:vETH_vUSDC",
]);

export function validateCurriculum(): string[] {
  const errors: string[] = [];
  const { path, modules, skills, misconceptions } = curriculum;
  const skillIds = new Set(skills.map((s) => s.id));
  const moduleIds = new Set(modules.map((m) => m.id));
  const misconceptionIds = new Set(misconceptions.map((m) => m.id));
  const isSkillOrModule = (id: string) => skillIds.has(id) || moduleIds.has(id);

  // ---- skills ----
  // docs/CONTRACTS.md says "32 skills" in prose but enumerates 33 ids (6+5+4+5+7+6). The ids are the contract.
  if (skills.length !== EXPECTED_SKILL_IDS.length) errors.push(`expected ${EXPECTED_SKILL_IDS.length} skills, got ${skills.length}`);
  for (const id of EXPECTED_SKILL_IDS) if (!skillIds.has(id)) errors.push(`missing skill ${id}`);
  for (const s of skills) {
    if (!EXPECTED_SKILL_IDS.includes(s.id)) errors.push(`unexpected skill ${s.id}`);
    if (s.parentSkillId !== s.category) errors.push(`skill ${s.id}: parentSkillId ${s.parentSkillId} != category ${s.category}`);
    if (!s.id.startsWith(`${s.category}.`)) errors.push(`skill ${s.id}: id does not start with category`);
    for (const p of s.prerequisiteSkillIds) {
      if (!skillIds.has(p)) errors.push(`skill ${s.id}: unknown prerequisite ${p}`);
      if (p === s.id) errors.push(`skill ${s.id}: prerequisite of itself`);
    }
    if (!s.name || !s.description) errors.push(`skill ${s.id}: empty name/description`);
  }
  // prerequisite cycle check
  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (id: string, trail: string[]) => {
    if (done.has(id)) return;
    if (visiting.has(id)) { errors.push(`prerequisite cycle: ${[...trail, id].join(" -> ")}`); return; }
    visiting.add(id);
    const s = skills.find((x) => x.id === id);
    for (const p of s?.prerequisiteSkillIds ?? []) visit(p, [...trail, id]);
    visiting.delete(id);
    done.add(id);
  };
  for (const s of skills) visit(s.id, []);

  // ---- path ----
  if (path.id !== "crypto-market-analyst-foundations") errors.push(`path id ${path.id}`);
  for (const mid of path.moduleIds) if (!moduleIds.has(mid)) errors.push(`path references unknown module ${mid}`);
  if (path.moduleIds.length !== modules.length) errors.push("path.moduleIds length != modules length");

  // ---- modules ----
  if (modules.length !== 6) errors.push(`expected 6 modules, got ${modules.length}`);
  const seenKc = new Set<string>();
  const seenEx = new Set<string>();
  const coveredSkills = new Set<string>();
  modules.forEach((m, i) => {
    const tag = `module ${m.id}`;
    if (m.sequence !== i + 1) errors.push(`${tag}: sequence ${m.sequence}, expected ${i + 1}`);
    if (!MODULE_PREREQS[m.id]) errors.push(`${tag}: unexpected module id`);
    const expectedPre = MODULE_PREREQS[m.id] ?? [];
    if (JSON.stringify([...m.prerequisiteModuleIds].sort()) !== JSON.stringify([...expectedPre].sort()))
      errors.push(`${tag}: prerequisites ${m.prerequisiteModuleIds.join(",")} != ${expectedPre.join(",")}`);
    for (const p of m.prerequisiteModuleIds) if (!moduleIds.has(p)) errors.push(`${tag}: unknown prerequisite module ${p}`);
    if (m.learningObjectives.length < 3 || m.learningObjectives.length > 5) errors.push(`${tag}: ${m.learningObjectives.length} learning objectives (want 3-5)`);
    if (m.concepts.length < 3 || m.concepts.length > 5) errors.push(`${tag}: ${m.concepts.length} concepts (want 3-5)`);
    if (m.knowledgeChecks.length < 3 || m.knowledgeChecks.length > 5) errors.push(`${tag}: ${m.knowledgeChecks.length} knowledge checks (want 3-4)`);
    if (m.exercises.length < 2 || m.exercises.length > 3) errors.push(`${tag}: ${m.exercises.length} exercises (want 2-3)`);
    if (!m.rubricNotes || !m.recommendedNext || !m.summary) errors.push(`${tag}: empty rubricNotes/recommendedNext/summary`);
    for (const sid of m.skillIds) {
      if (!skillIds.has(sid)) errors.push(`${tag}: unknown skill ${sid}`);
      else if (!sid.startsWith(`${m.id}.`)) errors.push(`${tag}: skill ${sid} belongs to another module`);
      coveredSkills.add(sid);
    }
    for (const c of m.concepts) {
      const words = c.body.split(/\s+/).filter(Boolean).length;
      if (words < 120 || words > 260) errors.push(`${tag}: concept "${c.heading}" has ${words} words (want 120-250)`);
      if (!c.example) errors.push(`${tag}: concept "${c.heading}" has no example`);
    }
    for (const kc of m.knowledgeChecks) {
      if (seenKc.has(kc.id)) errors.push(`duplicate knowledge check id ${kc.id}`);
      seenKc.add(kc.id);
      if (!skillIds.has(kc.skillId)) errors.push(`${kc.id}: unknown skill ${kc.skillId}`);
      if (!m.skillIds.includes(kc.skillId)) errors.push(`${kc.id}: skill ${kc.skillId} not in ${tag}`);
      if (kc.options.length !== 4) errors.push(`${kc.id}: ${kc.options.length} options (want 4)`);
      const correct = kc.options.filter((o) => o.correct).length;
      if (correct !== 1) errors.push(`${kc.id}: ${correct} correct options (want 1)`);
      const optIds = new Set<string>();
      for (const o of kc.options) {
        if (optIds.has(o.id)) errors.push(`${kc.id}: duplicate option id ${o.id}`);
        optIds.add(o.id);
        if (!o.explanation || !o.explanation.trim()) errors.push(`${kc.id}/${o.id}: empty explanation`);
        if (o.misconceptionId && !misconceptionIds.has(o.misconceptionId)) errors.push(`${kc.id}/${o.id}: unknown misconception ${o.misconceptionId}`);
        if (o.misconceptionId && o.correct) errors.push(`${kc.id}/${o.id}: correct option carries a misconception`);
      }
    }
    for (const ex of m.exercises) {
      if (seenEx.has(ex.id)) errors.push(`duplicate exercise id ${ex.id}`);
      seenEx.add(ex.id);
      const expectedKind = m.id === "orderbook" ? "orderbook" : "scenario";
      if (ex.kind !== expectedKind) errors.push(`${ex.id}: kind ${ex.kind}, expected ${expectedKind}`);
      if (ex.skillIds.length === 0) errors.push(`${ex.id}: no skills`);
      for (const sid of ex.skillIds) {
        if (!skillIds.has(sid)) errors.push(`${ex.id}: unknown skill ${sid}`);
        else if (!m.skillIds.includes(sid)) errors.push(`${ex.id}: skill ${sid} not in ${tag}`);
      }
      if (ex.evidenceRequirements.length === 0) errors.push(`${ex.id}: no evidence requirements`);
      for (const token of ex.evidenceRequirements) if (!EVIDENCE_TOKENS.has(token)) errors.push(`${ex.id}: unknown evidence token ${token}`);
      if (ex.questions.length < 3) errors.push(`${ex.id}: only ${ex.questions.length} questions`);
      if (ex.hints.length !== 3 || ex.hints.some((h) => !h.trim())) errors.push(`${ex.id}: need exactly 3 non-empty hints`);
      const r = ex.rubric;
      const total = r.dimensions.reduce((a, d) => a + d.maxPoints, 0);
      if (total !== 100) errors.push(`${ex.id}: rubric sums to ${total}`);
      const keys = r.dimensions.map((d) => d.key).join(",");
      if (keys !== "factual,evidence,reasoning,uncertainty") errors.push(`${ex.id}: rubric dimension order ${keys}`);
      const expectedMax: Record<string, number> = { factual: 35, evidence: 25, reasoning: 25, uncertainty: 15 };
      for (const d of r.dimensions) {
        if (d.maxPoints !== expectedMax[d.key]) errors.push(`${ex.id}: ${d.key} maxPoints ${d.maxPoints}`);
        if (d.criteria.length < 4 || d.criteria.length > 6) errors.push(`${ex.id}: ${d.key} has ${d.criteria.length} criteria (want 4-6)`);
      }
      if (r.keyPoints.length < 5 || r.keyPoints.length > 8) errors.push(`${ex.id}: ${r.keyPoints.length} keyPoints (want 5-8)`);
      for (const kp of r.keyPoints) if (/\(/.test(kp)) errors.push(`${ex.id}: keyPoint contains parentheses: "${kp}"`);
      if (r.acceptableAlternatives.length === 0) errors.push(`${ex.id}: no acceptableAlternatives`);
      for (const mid of r.commonMisconceptionIds) if (!misconceptionIds.has(mid)) errors.push(`${ex.id}: unknown misconception ${mid}`);
    }
  });
  for (const sid of skillIds) if (!coveredSkills.has(sid)) errors.push(`skill ${sid} is not in any module`);

  // ---- misconceptions ----
  for (const id of EXPECTED_MISCONCEPTION_IDS) if (!misconceptionIds.has(id)) errors.push(`missing misconception ${id}`);
  const seenMis = new Set<string>();
  for (const m of misconceptions) {
    if (seenMis.has(m.id)) errors.push(`duplicate misconception ${m.id}`);
    seenMis.add(m.id);
    if (!isSkillOrModule(m.skillId)) errors.push(`misconception ${m.id}: unknown skill ${m.skillId}`);
    if (m.cues.length < 3 || m.cues.length > 7) errors.push(`misconception ${m.id}: ${m.cues.length} cues (want 3-6)`);
    for (const c of m.cues) if (c !== c.toLowerCase()) errors.push(`misconception ${m.id}: cue not lowercase: "${c}"`);
    if (!m.label || !m.description || !m.correction) errors.push(`misconception ${m.id}: empty text field`);
  }
  const critical = misconceptions.filter((m) => m.critical).length;
  if (critical < 6 || critical > 10) errors.push(`${critical} critical misconceptions (want about 8)`);

  return errors;
}

const isDirectRun =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  /validate\.ts$/.test(process.argv[1] ?? "");

if (isDirectRun) {
  const errors = validateCurriculum();
  const c = curriculum;
  const summary = `skills=${c.skills.length} modules=${c.modules.length} misconceptions=${c.misconceptions.length} exercises=${c.modules.flatMap((m) => m.exercises).length} knowledgeChecks=${c.modules.flatMap((m) => m.knowledgeChecks).length} critical=${c.misconceptions.filter((m) => m.critical).length}`;
  if (errors.length) {
    console.error(`Curriculum validation FAILED (${errors.length} problems)\n` + errors.map((e) => `  - ${e}`).join("\n"));
    console.error(summary);
    process.exit(1);
  }
  console.log(`Curriculum validation OK. ${summary}`);
}
