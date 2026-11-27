/**
 * Onboarding diagnostic: six multiple-choice questions (one per module, with
 * distractors mapped to misconception ids) plus one open question about
 * volume. Scoring is deterministic; the open answer may be blended with an
 * LLM assessment when a model is available. Self-reported experience only
 * nudges the starting module by at most one step and never marks anything
 * mastered.
 */
import { curriculum, getMisconception, getModule } from "@/lib/curriculum";
import type { Module } from "@/lib/types/curriculum";
import type {
  DiagnosticAnswer,
  DiagnosticQuestion,
  DiagnosticResult,
  DiagnosticSkillEstimate,
  LearningGoal,
  Profile,
} from "@/lib/types/learning";
import type { LanguageModel } from "@/lib/ai/provider";
import { callStructured } from "@/lib/ai/structured";
import { diagnosticOpenPrompt } from "@/lib/ai/prompts/diagnostic-open";
import { DiagnosticOpenAssessmentSchema } from "@/lib/ai/schemas/diagnostic";
import { detectMisconceptionCues } from "@/lib/ai/evaluators/rules";
import { clamp, normalise, uniq, wordCount } from "@/lib/ai/evaluators/text";

type Level = DiagnosticSkillEstimate["estimatedLevel"];

interface ChoiceSpec {
  id: string;
  moduleId: string;
  skillId: string;
  prompt: string;
  options: Array<{ id: string; text: string; correct: boolean; misconceptionId?: string }>;
}

export const OPEN_QUESTION_ID = "dq-open-volume";
export const OPEN_QUESTION_SKILL = "markets.volume";
export const OPEN_QUESTION_PROMPT =
  "In two sentences, what does a day of high trading volume tell you, and what doesn't it tell you?";

const CHOICE_QUESTIONS: ChoiceSpec[] = [
  {
    id: "dq-markets",
    moduleId: "markets",
    skillId: "markets.liquidity",
    prompt: "A token's 24-hour volume doubled while its price barely moved. Which statement is best supported by that alone?",
    options: [
      { id: "a", text: "More value changed hands than the day before; by itself that says nothing about which way the price will go", correct: true },
      { id: "b", text: "Buyers outnumbered sellers, so the price should rise next", correct: false, misconceptionId: "volume-implies-direction" },
      { id: "c", text: "The token is now twice as liquid as yesterday", correct: false, misconceptionId: "liquidity-equals-volume" },
      { id: "d", text: "Twice as much money is now invested in the token", correct: false, misconceptionId: "market-cap-is-money-invested" },
    ],
  },
  {
    id: "dq-news",
    moduleId: "news",
    skillId: "news.facts-vs-opinions",
    prompt: "A headline reads: \"Analysts say the rally is just getting started.\" What is this?",
    options: [
      { id: "a", text: "An opinion attributed to a source; it needs separate evidence before it counts for anything", correct: true },
      { id: "b", text: "A fact, because a news site published it", correct: false, misconceptionId: "headline-is-fact" },
      { id: "c", text: "Evidence that the rally will continue", correct: false, misconceptionId: "narrative-is-evidence" },
      { id: "d", text: "Proof, as long as more than one site repeats it", correct: false, misconceptionId: "single-source-certainty" },
    ],
  },
  {
    id: "dq-etf",
    moduleId: "etf",
    skillId: "etf.flows",
    prompt: "Spot bitcoin ETFs report +$300m of net inflow on one day. Which reading is sound?",
    options: [
      { id: "a", text: "Roughly $300m of new money entered the funds that day; on its own that does not tell you the price impact or whether it is a trend", correct: true },
      { id: "b", text: "The bitcoin price must rise by a matching amount", correct: false, misconceptionId: "flows-equal-price-impact" },
      { id: "c", text: "Inflows have turned into a sustained trend", correct: false, misconceptionId: "one-day-flow-is-trend" },
      { id: "d", text: "The funds' total assets rose by exactly $300m", correct: false, misconceptionId: "aum-change-equals-flows" },
    ],
  },
  {
    id: "dq-indexes",
    moduleId: "indexes",
    skillId: "indexes.weighting",
    prompt: "A crypto index is up 4% today. What does that tell you about its constituents?",
    options: [
      { id: "a", text: "The weighted average moved 4%; the largest weights drove most of it and some constituents may have fallen", correct: true },
      { id: "b", text: "Every constituent rose by about 4%", correct: false, misconceptionId: "index-return-is-every-asset" },
      { id: "c", text: "Each constituent contributed equally to the move", correct: false, misconceptionId: "index-is-equal-weight" },
      { id: "d", text: "Holding the index is well diversified whatever the weights are", correct: false, misconceptionId: "concentration-is-diversification" },
    ],
  },
  {
    id: "dq-orderbook",
    moduleId: "orderbook",
    skillId: "orderbook.spread",
    prompt: "On an order book the best bid is 75,576 and the best ask is 75,577. What is the 1 USDC gap between them?",
    options: [
      { id: "a", text: "The spread: what it costs to buy and immediately sell at the current quotes", correct: true },
      { id: "b", text: "The exchange's trading fee", correct: false, misconceptionId: "spread-is-fee" },
      { id: "c", text: "The minimum order size for the market", correct: false, misconceptionId: "tick-size-is-min-order" },
      { id: "d", text: "A signal that the price is about to rise because bids are so close", correct: false, misconceptionId: "imbalance-predicts-price" },
    ],
  },
  {
    id: "dq-reasoning",
    moduleId: "reasoning",
    skillId: "reasoning.observation-vs-interpretation",
    prompt: "\"BTC fell 3% today, so the market has lost confidence.\" How would you classify the two halves of that sentence?",
    options: [
      { id: "a", text: "The 3% fall is an observation; \"lost confidence\" is an interpretation that needs more evidence", correct: true },
      { id: "b", text: "Both halves are observations read straight from the data", correct: false, misconceptionId: "observation-is-interpretation" },
      { id: "c", text: "The fall proves the loss of confidence", correct: false, misconceptionId: "correlation-is-causation" },
      { id: "d", text: "It is a sound conclusion if the author sounds confident", correct: false, misconceptionId: "confidence-is-evidence" },
    ],
  },
];

const GOAL_MODULES: Record<LearningGoal, string[]> = {
  "understand-news": ["news", "reasoning"],
  "read-market-data": ["markets", "orderbook"],
  "analyst-career": ["reasoning", "indexes"],
  "etf-and-indexes": ["etf", "indexes"],
  "market-structure": ["orderbook", "markets"],
};

function moduleOrder(): Module[] {
  return [...curriculum.modules].sort((a, b) => a.sequence - b.sequence);
}

/** six choice questions (modules the learner cares about first) + the open question last */
export function getDiagnosticQuestions(profile: Profile): DiagnosticQuestion[] {
  const priority = uniq([...GOAL_MODULES[profile.learningGoal], ...profile.interests]);
  const order = moduleOrder().map((m) => m.id);
  const rank = (moduleId: string) => {
    const p = priority.indexOf(moduleId);
    return p === -1 ? 100 + order.indexOf(moduleId) : p;
  };
  const choices = [...CHOICE_QUESTIONS]
    .sort((a, b) => rank(a.moduleId) - rank(b.moduleId))
    .map<DiagnosticQuestion>((q) => ({
      id: q.id,
      skillId: q.skillId,
      kind: "choice",
      prompt: q.prompt,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
    }));
  return [...choices, { id: OPEN_QUESTION_ID, skillId: OPEN_QUESTION_SKILL, kind: "open", prompt: OPEN_QUESTION_PROMPT }];
}

// ---------- open-answer scoring ----------

const OPEN_RUBRIC = {
  tells: ["how much changed hands / how active the market was", "attention, participation or interest in the asset", "whether activity is unusual compared with the asset's own recent history"],
  doesNotTell: ["which way the price will go next", "whether buyers or sellers 'won' (every trade has one of each)", "why people traded, or who they were", "what the asset is worth"],
};

const TELLS_RE = /(activity|active|interest|attention|participation|particip|changed hands|change hands|turnover|how much (was )?traded|trading happened|a lot of trading|lots of trading|busy|many trades|people (are )?trading|engagement|unusual|compared? (to|with)|than (usual|normal|average))/;
const DOES_NOT_RE = /\b(does ?n.?t|doesnt|not|cannot|can.?t|never|no way to|won.?t|isn.?t)\b[^.?!]{0,60}\b(direction|which way|up or down|where (the )?price|buy(ing|ers)?|sell(ing|ers)?|who|why|future|next|predict|forecast|value|worth|bullish|bearish|cause|reason)/;
const NUANCE_RE = /(one buyer|a buyer and a seller|buyer for every seller|every trade has|each trade has|its own (history|average|baseline)|own recent|normal (range|level)|typical|baseline|not the same as liquidity|liquidity is (different|not)|spread|wash|single day|one day)/;

export interface OpenAnswerRuleScore {
  level: Level;
  evidence: string[];
  gaps: string[];
  misconceptionIds: string[];
}

export function scoreOpenAnswerByRules(answer: string): OpenAnswerRuleScore {
  const norm = normalise(answer);
  const words = wordCount(answer);
  const onTopic = /(volume|trad|activity|turnover|changed hands)/.test(norm);
  const marketsMisconceptions = curriculum.misconceptions.filter((m) => m.skillId.startsWith("markets."));
  const misconceptionIds = uniq(detectMisconceptionCues(answer, marketsMisconceptions).map((c) => c.misconceptionId));
  if (words < 4 || !onTopic) {
    return { level: 0, evidence: [], gaps: ["No usable answer about volume was given."], misconceptionIds };
  }
  const tells = TELLS_RE.test(norm);
  const doesNot = DOES_NOT_RE.test(norm);
  const nuance = NUANCE_RE.test(norm);
  const evidence: string[] = [];
  const gaps: string[] = [];
  if (tells) evidence.push("Describes volume as activity or participation.");
  else gaps.push("Did not say what volume measures (activity, how much changed hands).");
  if (doesNot) evidence.push("States something volume does not tell you.");
  else gaps.push("Did not say what volume cannot tell you (direction, who or why).");
  if (nuance) evidence.push("Adds a nuance (buyer per seller, comparison with history, or volume vs liquidity).");
  let level: Level = 1;
  if (tells && doesNot) level = nuance ? 4 : 3;
  else if (tells || doesNot) level = 2;
  if (misconceptionIds.includes("volume-implies-direction")) {
    level = Math.min(level, 2) as Level;
    gaps.push("Treats volume as showing buying or selling pressure.");
  }
  return { level, evidence, gaps, misconceptionIds };
}

async function scoreOpenAnswer(answer: string, model: LanguageModel | null | undefined): Promise<OpenAnswerRuleScore & { blended: boolean }> {
  const rules = scoreOpenAnswerByRules(answer);
  if (model === null || rules.level === 0) return { ...rules, blended: false };
  const allowed = curriculum.misconceptions.filter((m) => m.skillId.startsWith("markets.")).map((m) => ({ id: m.id, label: m.label }));
  const result = await callStructured(
    DiagnosticOpenAssessmentSchema,
    diagnosticOpenPrompt,
    { question: OPEN_QUESTION_PROMPT, answer, rubric: OPEN_RUBRIC, allowedMisconceptions: allowed },
    { schemaName: "diagnostic_open_assessment", model, timeoutMs: 12_000 },
  );
  if (!result.ok) return { ...rules, blended: false };
  const allowedIds = new Set(allowed.map((a) => a.id));
  const llmIds = result.value.misconceptionIds.filter((id) => allowedIds.has(id));
  // blend: never more than one level above the rules score, so fluent-but-empty answers stay low
  const blendedLevel = clamp(Math.round((rules.level + result.value.level) / 2), 0, Math.min(4, rules.level + 1)) as Level;
  return {
    level: blendedLevel,
    evidence: uniq([...rules.evidence, ...result.value.understands]),
    gaps: uniq([...rules.gaps, ...result.value.gaps]),
    misconceptionIds: uniq([...rules.misconceptionIds, ...llmIds]),
    blended: true,
  };
}

// ---------- runDiagnostic ----------

interface ModuleOutcome {
  moduleId: string;
  targetSkillId: string;
  answered: boolean;
  correct: boolean;
  misconceptionId: string | null;
  chosenText: string | null;
}

function choiceOutcome(q: ChoiceSpec, answers: DiagnosticAnswer[]): ModuleOutcome {
  const a = answers.find((x) => x.questionId === q.id);
  const opt = a ? q.options.find((o) => o.id === a.value) : undefined;
  return {
    moduleId: q.moduleId,
    targetSkillId: q.skillId,
    answered: Boolean(opt),
    correct: Boolean(opt?.correct),
    misconceptionId: opt?.misconceptionId ?? null,
    chosenText: opt?.text ?? null,
  };
}

function levelFromChoice(o: ModuleOutcome): Level {
  if (!o.answered) return 0;
  return o.correct ? 3 : 1;
}

export interface RunDiagnosticOptions {
  /** test seam: undefined → getModel(); null → rules only */
  model?: LanguageModel | null;
  now?: Date;
}

export async function runDiagnostic(profile: Profile, answers: DiagnosticAnswer[], opts: RunDiagnosticOptions = {}): Promise<DiagnosticResult> {
  const now = opts.now ?? new Date();
  const outcomes = CHOICE_QUESTIONS.map((q) => choiceOutcome(q, answers));
  const openAnswer = answers.find((a) => a.questionId === OPEN_QUESTION_ID)?.value?.trim() ?? "";
  const open = openAnswer ? await scoreOpenAnswer(openAnswer, opts.model) : null;

  const estimates: DiagnosticSkillEstimate[] = [];
  const moduleLevel = new Map<string, Level>();
  const moduleConfidence = new Map<string, number>();

  for (const mod of moduleOrder()) {
    const outcome = outcomes.find((o) => o.moduleId === mod.id);
    const choiceLevel: Level = outcome ? levelFromChoice(outcome) : 0;
    let level: Level = choiceLevel;
    let confidence = outcome?.answered ? 0.45 : 0.1;
    const evidence: string[] = [];
    const gaps: string[] = [];
    if (outcome?.answered) {
      evidence.push(outcome.correct ? `Answered the ${mod.title} question correctly.` : `Chose: "${outcome.chosenText}".`);
      if (outcome.misconceptionId) {
        const m = getMisconception(outcome.misconceptionId);
        gaps.push(m ? `${m.label}: ${m.correction}` : outcome.misconceptionId);
      }
    } else gaps.push(outcome ? `No answer to the ${mod.title} question.` : `${mod.title} is not covered by the diagnostic; its lessons start from the basics.`);

    if (mod.id === "markets" && open) {
      level = clamp(Math.round((choiceLevel + open.level) / 2), 0, 4) as Level;
      confidence = open.blended ? 0.65 : 0.55;
      evidence.push(...open.evidence);
      gaps.push(...open.gaps);
    }
    moduleLevel.set(mod.id, level);
    moduleConfidence.set(mod.id, confidence);
    estimates.push({ skillId: mod.id, estimatedLevel: level, evidence, gaps, confidence });

    for (const skillId of mod.skillIds) {
      const isTarget = outcome?.targetSkillId === skillId;
      const isOpen = skillId === OPEN_QUESTION_SKILL && open !== null;
      if (isOpen) {
        estimates.push({
          skillId,
          estimatedLevel: open.level,
          evidence: open.evidence,
          gaps: [...open.gaps, ...open.misconceptionIds.map((id) => getMisconception(id)?.label ?? id)],
          confidence: open.blended ? 0.6 : 0.5,
        });
        continue;
      }
      if (isTarget && outcome) {
        estimates.push({ skillId, estimatedLevel: choiceLevel, evidence: [...evidence], gaps: [...gaps], confidence: outcome.answered ? 0.45 : 0.1 });
        continue;
      }
      const inferred: Level = !outcome?.answered ? 0 : outcome.correct ? 2 : 1;
      estimates.push({
        skillId,
        estimatedLevel: inferred,
        evidence: outcome?.answered ? [`Inferred from the ${mod.title} question; not asked directly.`] : [],
        gaps: outcome?.answered ? [] : ["Not assessed."],
        confidence: outcome?.answered ? 0.2 : 0.05,
      });
    }
  }

  // recommended start: first module (in path order, prerequisites come earlier) with estimate ≤ 2
  const ordered = moduleOrder();
  let startIdx = ordered.findIndex((m) => (moduleLevel.get(m.id) ?? 0) <= 2);
  if (startIdx === -1) {
    const weakest = ordered.reduce((best, m) => ((moduleLevel.get(m.id) ?? 0) < (moduleLevel.get(best.id) ?? 0) ? m : best), ordered[0]);
    startIdx = ordered.indexOf(weakest);
  }
  const startLevel = moduleLevel.get(ordered[startIdx].id) ?? 0;
  let nudge = "";
  if (profile.experienceLevel === "experienced" && startLevel === 2 && startIdx < ordered.length - 1) {
    startIdx += 1;
    nudge = " Because you said you have experience, we start one module later than the answers alone would suggest.";
  } else if (profile.experienceLevel === "new" && startIdx > 0 && (moduleConfidence.get(ordered[startIdx - 1].id) ?? 0) < 0.5) {
    startIdx -= 1;
    nudge = " Because you are new to this, we start one module earlier to make the foundations solid.";
  }
  const startModule = ordered[startIdx];
  const startSkillId =
    startModule.skillIds.find((s) => (estimates.find((e) => e.skillId === s)?.estimatedLevel ?? 0) <= 2) ?? startModule.skillIds[0] ?? startModule.id;

  const correctCount = outcomes.filter((o) => o.correct).length;
  const misconceptionLabels = uniq([
    ...outcomes.map((o) => o.misconceptionId).filter((id): id is string => Boolean(id)),
    ...(open?.misconceptionIds ?? []),
  ]).map((id) => getMisconception(id)?.label ?? id);
  const summary =
    `You answered ${correctCount} of ${CHOICE_QUESTIONS.length} multiple-choice questions correctly` +
    (open ? ` and your volume answer scored ${open.level} out of 4.` : ".") +
    ` We recommend starting with ${startModule.title}.` +
    (misconceptionLabels.length > 0 ? ` Watch for: ${misconceptionLabels.join("; ")}.` : "") +
    nudge;

  return {
    id: `diag_${profile.id}_${now.getTime()}`,
    userId: profile.id,
    estimates,
    recommendedStartSkillId: startSkillId,
    recommendedStartModuleId: getModule(startModule.id)?.id ?? startModule.id,
    summary,
    createdAt: now.toISOString(),
  };
}

/** exported for tests: the choice specs including correct/misconception mapping */
export function diagnosticChoiceSpecs(): ReadonlyArray<ChoiceSpec> {
  return CHOICE_QUESTIONS;
}
