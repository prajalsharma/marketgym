/**
 * Socratic coach. `startCoachSession` builds a grounded opener from the
 * module's own concept sections (objective → short primer → ONE question).
 * `coachRespond` runs an LLM turn validated by CoachTurnSchema, or — with no
 * model — a scripted flow: concept sections in order, then the skill's
 * knowledge checks, answering with option explanations and misconception
 * corrections. `coachHint` reveals up to three graduated hints.
 * The coach never writes mastery and never gives trading advice.
 */
import { curriculum, getKnowledgeCheck, getModule, getModuleForSkill, getSkill, listKnowledgeChecks } from "@/lib/curriculum";
import type { ConceptSection, KnowledgeCheck, Misconception, Module, Skill } from "@/lib/types/curriculum";
import type { CoachMessage, CoachSession } from "@/lib/types/learning";
import type { EvidencePack } from "@/lib/types/market";
import type { LearningMemory } from "@/lib/learning/memory";
import { detectMisconceptionCues } from "./evaluators/rules";
import { contentTokens, normalise, sentences, tokenCoverage, uniq } from "./evaluators/text";
import type { LanguageModel } from "./provider";
import { getModel } from "./provider";
import { coachPrompt } from "./prompts/coach";
import { evidenceIds } from "./prompts/shared";
import { CoachTurnSchema } from "./schemas/coach";
import { callStructured } from "./structured";

const HINT_PREFIX_RE = /^Hint [123]\/3:/;
const MAX_CONCEPTS = 3;

type Beat = { kind: "concept"; concept: ConceptSection } | { kind: "kc"; check: KnowledgeCheck };

interface CoachContext {
  skill: Skill;
  module: Module;
  beats: Beat[];
  misconceptions: Misconception[];
}

function newId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${uuid}`;
}

function firstSentences(text: string, n: number): string[] {
  return sentences(text.replace(/\*\*/g, "").replace(/^- /gm, ""))
    .filter((s) => s.length > 0)
    .slice(0, n);
}

/** concept sections most related to the skill, in module order */
export function relevantConcepts(mod: Module, skill: Skill): ConceptSection[] {
  const key = new Set(contentTokens(`${skill.name} ${skill.description} ${skill.id.split(".")[1] ?? ""}`));
  const scored = mod.concepts.map((c, i) => {
    const tokens = contentTokens(`${c.heading} ${c.heading} ${c.body}`);
    const hits = tokens.filter((t) => key.has(t)).length;
    const headingHit = tokenCoverage(c.heading, key) >= 0.5 ? 3 : 0;
    return { c, i, score: hits + headingHit };
  });
  const best = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, MAX_CONCEPTS);
  const chosen = best.length > 0 ? best : scored.slice(0, MAX_CONCEPTS);
  return chosen.sort((a, b) => a.i - b.i).map((s) => s.c);
}

function buildContext(skillId: string): CoachContext {
  const skill = getSkill(skillId);
  const mod = getModuleForSkill(skillId) ?? (skill ? getModule(skill.parentSkillId ?? skill.category) : undefined);
  if (!skill || !mod) throw new Error(`unknown skill ${skillId}`);
  const concepts = relevantConcepts(mod, skill);
  const checks = listKnowledgeChecks(skillId);
  const beats: Beat[] = [...concepts.map<Beat>((concept) => ({ kind: "concept", concept })), ...checks.map<Beat>((check) => ({ kind: "kc", check }))];
  const misconceptions = curriculum.misconceptions.filter((m) => mod.skillIds.includes(m.skillId));
  return { skill, module: mod, beats, misconceptions };
}

function objectiveFor(skill: Skill): string {
  return `${skill.name}: ${skill.description}`;
}

function conceptQuestion(concept: ConceptSection, skill: Skill): string {
  return `In your own words, what does "${concept.heading}" change about how you read ${skill.name.toLowerCase()}?`;
}

function kcQuestion(check: KnowledgeCheck): string {
  return `${check.prompt}\n${check.options.map((o) => `(${o.id}) ${o.text}`).join("\n")}`;
}

function beatQuestion(beat: Beat, skill: Skill): { text: string; knowledgeCheckId?: string } {
  return beat.kind === "concept" ? { text: conceptQuestion(beat.concept, skill) } : { text: kcQuestion(beat.check), knowledgeCheckId: beat.check.id };
}

function conceptSummary(concept: ConceptSection, style: LearningMemory["preferredStyle"]): string {
  const n = style === "detailed" ? 3 : 2;
  const lines = firstSentences(concept.body, n);
  const example = style === "examples" && concept.example ? ` For example: ${firstSentences(concept.example, 2).join(" ")}` : "";
  return `${concept.heading}. ${lines.join(" ")}${example}`;
}

function pctText(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

/** fund / yield / DCA / rewards / perps lines for wave 2 skills; null when the pack lacks the data */
function wealthEvidenceLine(skill: Skill, pack: EvidencePack): { text: string; citation: string } | null {
  const funds = pack.wealthFunds ?? [];
  const quotes = pack.wealthQuotes ?? [];
  const quoteOf = (id: string) => quotes.find((q) => q.fundId === id);
  switch (skill.id) {
    case "markets.trading-hours": {
      const q = quotes.find((x) => x.marketStatus !== "always-open" && x.marketStatus !== "unknown");
      if (q) return { text: `In the attached wealth board (${q.provenance.kind} data, ${q.provenance.provider}) ${q.fundId} shows a price of ${q.price} with market status "${q.marketStatus}" as of ${q.asOf ?? "an unstated time"}.`, citation: `wealth:fund:${q.fundId}` };
      break;
    }
    case "orderbook.spot-vs-perps": {
      const spot = pack.orderBooks.find((b) => b.marketType !== "perps" && !b.market.startsWith("perps:"));
      const perp = pack.orderBooks.find((b) => b.marketType === "perps" || b.market.startsWith("perps:"));
      if (spot && perp && spot.bestBid !== null && spot.bestAsk !== null && perp.bestBid !== null && perp.bestAsk !== null) {
        return { text: `The attached ${spot.displayName} spot book (${spot.provenance.kind}) shows ${spot.bestBid} / ${spot.bestAsk}, and the ${perp.displayName} perpetual book shows ${perp.bestBid} / ${perp.bestAsk}.`, citation: `orderbook:${perp.market}` };
      }
      break;
    }
    case "indexes.index-nav":
    case "wealth.nav-vs-price":
    case "wealth.fund-types": {
      const f = funds.find((x) => x.nav !== null) ?? null;
      if (f) {
        const q = quoteOf(f.fundId);
        return { text: `The attached ${f.name} (${f.kindLabel}, ${f.provenance.kind} data) has a NAV of ${f.nav} per share as of ${f.asOf}${q ? `, and the board shows a price of ${q.price} as of ${q.asOf ?? "an unstated time"}` : ""}.`, citation: `wealth:fund:${f.fundId}` };
      }
      break;
    }
    case "wealth.fees": {
      const f = funds[0];
      if (f) return { text: `For ${f.name} the attached fund detail (${f.provenance.kind}) shows a management fee of ${f.managementFeePct === null ? "not published, which is unknown rather than zero" : `${f.managementFeePct}% a year`}.`, citation: `wealth:fund:${f.fundId}` };
      break;
    }
    case "wealth.yield-apy": {
      const q = quotes.find((x) => x.apy7dPct !== null);
      if (q && q.apy7dPct !== null) return { text: `On the attached board (${q.provenance.kind} data) ${q.fundId} shows a 7-day APY of ${q.apy7dPct.toFixed(2)}%${q.roi1YPct !== null ? ` next to a 1-year ROI of ${pctText(q.roi1YPct)}` : ""}; the APY annualises one recent week.`, citation: `wealth:fund:${q.fundId}` };
      break;
    }
    case "wealth.dca": {
      const d = (pack.dcaSimulations ?? []).find((x) => x.totalReturnPct !== null);
      if (d && d.totalReturnPct !== null) {
        const first = d.points[0]?.tradeDate;
        const last = d.points[d.points.length - 1]?.tradeDate;
        return { text: `The attached ${d.range} DCA simulation for ${d.fundId} (${d.provenance.kind} data) shows a total return of ${pctText(d.totalReturnPct)}${first && last ? ` over weekly points from ${first} to ${last}` : ""}; it is a past back-test, not a forecast.`, citation: `wealth:dca:${d.fundId}:${d.range}` };
      }
      break;
    }
    case "wealth.diversification": {
      if (quotes.length > 1) return { text: `The attached board (${quotes[0].provenance.kind} data) lists ${quotes.length} funds, including ${quotes.slice(0, 3).map((q) => q.fundId).join(", ")}.`, citation: "wealth:board" };
      break;
    }
    case "wealth.incentives": {
      const inc = pack.rewardIncentives;
      if (inc && inc.multipliers.length > 0) {
        const m = inc.multipliers[0];
        return { text: `The attached rewards rules (${inc.provenance.kind} data) give ${inc.multipliers.length} markets a points multiplier, such as ${m.symbol} at ${m.coefficient}x${inc.volumePerBoxUsd !== null ? `, and one reward box per ${inc.volumePerBoxUsd.toLocaleString("en-US")} USD of weighted volume` : ""}; drop probabilities are ${inc.probabilitiesPublished ? "published" : "not published"}.`, citation: "rewards:incentives" };
      }
      break;
    }
    default:
      break;
  }
  return null;
}

/** one grounded line from the pack relevant to the skill's category, with the evidence id it cites */
export function evidenceLineForSkill(skill: Skill, pack: EvidencePack): { text: string; citation: string } | null {
  const snap = pack.snapshots[0];
  const book = pack.orderBooks[0];
  const flow = pack.etfFlows[0];
  const index = pack.indexes[0];
  const news = pack.news[0];
  const wealthLine = wealthEvidenceLine(skill, pack);
  if (wealthLine) return wealthLine;
  switch (skill.category) {
    case "orderbook":
      if (book && book.bestBid !== null && book.bestAsk !== null) {
        return { text: `In the attached ${book.displayName} book (${book.provenance.kind} data) the best bid is ${book.bestBid} and the best ask is ${book.bestAsk}.`, citation: `orderbook:${book.market}` };
      }
      break;
    case "etf":
      if (flow && flow.latest) {
        return { text: `The attached ${flow.asset} ETF series (${flow.provenance.kind} data) shows a net flow of ${Math.round(flow.latest.netInflowUsd).toLocaleString("en-US")} USD on ${flow.latest.date}.`, citation: `etf:${flow.asset}` };
      }
      break;
    case "indexes":
      if (index && index.constituents.length > 0) {
        const top = index.constituents[0];
        return { text: `In the attached ${index.name} snapshot (${index.provenance.kind} data) the largest constituent is ${top.symbol} at ${(top.weight * 100).toFixed(1)}% of the index.`, citation: `index:${index.id}` };
      }
      break;
    case "news":
      if (news) return { text: `The attached news item from ${news.source} (${news.provenance.kind}, published ${news.publishedAt.slice(0, 10)}) is the kind of text this skill is about.`, citation: `news:${news.id}` };
      break;
    default:
      break;
  }
  if (snap) {
    const change = snap.percentageChange24h === null ? "an unknown 24h change" : `a 24h change of ${snap.percentageChange24h.toFixed(2)}%`;
    return { text: `The attached ${snap.name} snapshot (${snap.provenance.kind} data) shows a price of ${snap.price.toLocaleString("en-US")} USD with ${change}.`, citation: `snapshot:${snap.asset}` };
  }
  return null;
}

function coachMessage(content: string, citations: string[], knowledgeCheckId?: string): CoachMessage {
  const msg: CoachMessage = { id: newId("msg"), role: "coach", content, createdAt: new Date().toISOString(), citations };
  if (knowledgeCheckId) msg.knowledgeCheckId = knowledgeCheckId;
  return msg;
}

function learnerMessage(content: string): CoachMessage {
  return { id: newId("msg"), role: "learner", content, createdAt: new Date().toISOString() };
}

/** index of the current beat = number of non-hint coach messages − 1 */
function beatIndex(session: CoachSession, ctx: CoachContext): number {
  const n = session.messages.filter((m) => m.role === "coach" && !HINT_PREFIX_RE.test(m.content)).length;
  return Math.max(0, Math.min(n - 1, ctx.beats.length - 1));
}

export async function startCoachSession(input: { userId: string; skillId: string; memory: LearningMemory; evidence: EvidencePack; model?: LanguageModel | null }): Promise<CoachSession> {
  const ctx = buildContext(input.skillId);
  const model = input.model === undefined ? getModel() : input.model;
  const style = input.memory.preferredStyle;
  const objective = objectiveFor(ctx.skill);

  const primerSentences: string[] = [];
  const want = style === "concise" ? 2 : style === "detailed" ? 4 : 2;
  for (const c of ctx.beats.filter((b): b is Extract<Beat, { kind: "concept" }> => b.kind === "concept")) {
    for (const s of firstSentences(c.concept.body, want)) {
      if (primerSentences.length < want) primerSentences.push(s);
    }
    if (primerSentences.length >= want) break;
  }
  const firstConcept = ctx.beats.find((b): b is Extract<Beat, { kind: "concept" }> => b.kind === "concept")?.concept;
  const example = style === "examples" && firstConcept?.example ? ` For example: ${firstSentences(firstConcept.example, 1).join(" ")}` : "";
  const evidenceLine = evidenceLineForSkill(ctx.skill, input.evidence);
  const citations = uniq([ctx.module.id, ...(evidenceLine ? [evidenceLine.citation] : [])]);

  const firstBeat = ctx.beats[0];
  const question = firstBeat ? beatQuestion(firstBeat, ctx.skill) : { text: `What does ${ctx.skill.name.toLowerCase()} tell you, and what does it not tell you?` };
  const recurring = input.memory.recurringMisconceptions
    .map((r) => ctx.misconceptions.find((m) => m.id === r.misconceptionId))
    .filter((m): m is Misconception => Boolean(m))[0];
  const recurringLine = recurring ? ` One thing to watch, because it has come up before: ${recurring.label.toLowerCase()} — ${recurring.correction}` : "";

  const content = [
    `Objective: ${objective}`,
    `${primerSentences.join(" ")}${example}${evidenceLine ? ` ${evidenceLine.text}` : ""}${recurringLine}`,
    question.text,
  ].join("\n\n");

  const now = new Date().toISOString();
  return {
    id: newId("coach"),
    userId: input.userId,
    skillId: input.skillId,
    moduleId: ctx.module.id,
    objective,
    messages: [coachMessage(content, citations, question.knowledgeCheckId)],
    hintsRevealed: 0,
    mode: model ? "llm" : "offline",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

function matchOption(check: KnowledgeCheck, text: string): KnowledgeCheck["options"][number] | null {
  const norm = normalise(text);
  const letters = check.options.map((o) => o.id.toLowerCase());
  const bare = norm.replace(/[().]/g, "").trim();
  const direct = check.options.find((o) => o.id.toLowerCase() === bare);
  if (direct) return direct;
  const letterRe = new RegExp(`(^|[^a-z0-9])\\(?(${letters.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\)?([^a-z0-9]|$)`);
  const m = letterRe.exec(norm);
  if (m && bare.split(" ").length <= 6) {
    const found = check.options.find((o) => o.id.toLowerCase() === m[2]);
    if (found) return found;
  }
  const tokens = new Set(contentTokens(text));
  const scored = check.options
    .map((o) => ({ o, cov: tokenCoverage(o.text, tokens) }))
    .sort((a, b) => b.cov - a.cov);
  return scored[0] && scored[0].cov >= 0.6 && (scored[1]?.cov ?? 0) < scored[0].cov ? scored[0].o : null;
}

/** scripted response for one learner turn; returns the message and whether the objective is complete */
export function offlineTurn(session: CoachSession, learnerText: string, memory: LearningMemory): { message: CoachMessage; complete: boolean } {
  const ctx = buildContext(session.skillId);
  const idx = beatIndex(session, ctx);
  const current = ctx.beats[idx];
  const feedback: string[] = [];
  let knowledgeCheckId: string | undefined;

  const cues = detectMisconceptionCues(learnerText, ctx.misconceptions);
  if (current?.kind === "kc") {
    const opt = matchOption(current.check, learnerText);
    if (opt) {
      feedback.push(`${opt.correct ? "Correct." : "Not quite."} ${opt.explanation}`);
      if (!opt.correct && opt.misconceptionId) {
        const m = ctx.misconceptions.find((x) => x.id === opt.misconceptionId) ?? curriculum.misconceptions.find((x) => x.id === opt.misconceptionId);
        if (m) feedback.push(`This is the "${m.label}" pattern. ${m.correction}`);
      }
      if (!opt.correct) {
        const right = current.check.options.find((o) => o.correct);
        if (right) feedback.push(`The option that holds up is (${right.id}): ${right.text}.`);
      }
    } else if (cues.length > 0) {
      const m = ctx.misconceptions.find((x) => x.id === cues[0].misconceptionId);
      if (m) feedback.push(`That sounds like "${m.label}". ${m.correction}`);
    } else {
      feedback.push("I could not match that to one of the options, so let's move on and come back to it later.");
    }
  } else if (cues.length > 0) {
    const m = ctx.misconceptions.find((x) => x.id === cues[0].misconceptionId);
    if (m) feedback.push(`That sounds like "${m.label}". ${m.correction}`);
  } else if (learnerText.trim().length > 0) {
    feedback.push("Good, hold on to that.");
  }

  const next = ctx.beats[idx + 1];
  const atEnd = !next || idx >= ctx.beats.length - 1;
  let body: string;
  let complete = false;
  if (!atEnd && next) {
    const q = beatQuestion(next, ctx.skill);
    knowledgeCheckId = q.knowledgeCheckId;
    const intro = next.kind === "concept" ? `Next idea: ${conceptSummary(next.concept, memory.preferredStyle)}` : "Let's check it with a quick question.";
    body = [feedback.join(" "), intro, q.text].filter(Boolean).join("\n\n");
  } else {
    complete = true;
    body = [
      feedback.join(" "),
      `That covers the key ideas for ${ctx.skill.name.toLowerCase()}. The next step is a scenario with real evidence, where you apply this in writing. (Scripted coach: no model is configured, so this walkthrough follows the lesson exactly.)`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  return { message: coachMessage(body, [ctx.module.id], knowledgeCheckId), complete };
}

export async function coachRespond(
  session: CoachSession,
  learnerText: string,
  ctxIn: { memory: LearningMemory; evidence: EvidencePack; model?: LanguageModel | null },
): Promise<CoachSession> {
  if (session.status === "completed") return session;
  const withLearner: CoachSession = { ...session, messages: [...session.messages, learnerMessage(learnerText)] };
  const model = ctxIn.model === undefined ? getModel() : ctxIn.model;

  if (session.mode === "llm" && model) {
    const ctx = buildContext(session.skillId);
    const result = await callStructured(
      CoachTurnSchema,
      coachPrompt,
      {
        moduleId: ctx.module.id,
        skillId: ctx.skill.id,
        skillName: ctx.skill.name,
        objective: session.objective,
        concepts: ctx.beats.filter((b): b is Extract<Beat, { kind: "concept" }> => b.kind === "concept").map((b) => b.concept),
        knowledgeChecks: listKnowledgeChecks(session.skillId),
        allowedMisconceptions: ctx.misconceptions.map((m) => ({ id: m.id, label: m.label, cues: m.cues })),
        preferredStyle: ctxIn.memory.preferredStyle,
        recurringMisconceptionIds: ctxIn.memory.recurringMisconceptions.map((r) => r.misconceptionId),
        evidence: ctxIn.evidence,
        history: session.messages,
        learnerMessage: learnerText,
        hintsRevealed: session.hintsRevealed,
      },
      { schemaName: "coach_turn", model, timeoutMs: 20_000 },
    );
    if (result.ok) {
      const turn = result.value;
      const knownMisconceptions = new Set(ctx.misconceptions.map((m) => m.id));
      const knownChecks = new Set(listKnowledgeChecks(session.skillId).map((k) => k.id));
      const allowedCitations = new Set([ctx.module.id, ctx.skill.id, ...evidenceIds(ctxIn.evidence)]);
      const citations = uniq([ctx.module.id, ...turn.citations.filter((c) => allowedCitations.has(c))]);
      const checkId = turn.attachKnowledgeCheckId && knownChecks.has(turn.attachKnowledgeCheckId) ? turn.attachKnowledgeCheckId : undefined;
      let content = turn.message.trim();
      if (turn.misconceptionId && knownMisconceptions.has(turn.misconceptionId)) {
        const m = ctx.misconceptions.find((x) => x.id === turn.misconceptionId);
        if (m && !content.toLowerCase().includes(m.label.toLowerCase())) content = `${content}\n\n(Pattern to watch: ${m.label}.)`;
      }
      if (checkId && !content.includes(getKnowledgeCheck(checkId)?.prompt ?? "\u0000")) {
        const check = getKnowledgeCheck(checkId);
        if (check) content = `${content}\n\n${kcQuestion(check)}`;
      }
      const now = new Date().toISOString();
      return {
        ...withLearner,
        messages: [...withLearner.messages, coachMessage(content, citations, checkId)],
        status: turn.objectiveComplete ? "completed" : "active",
        updatedAt: now,
      };
    }
    // model failed or produced invalid output: fall back to the scripted flow and say so
    const fallback = offlineTurn(withLearner, learnerText, ctxIn.memory);
    return {
      ...withLearner,
      mode: "offline",
      messages: [...withLearner.messages, fallback.message],
      status: fallback.complete ? "completed" : "active",
      updatedAt: new Date().toISOString(),
    };
  }

  const turn = offlineTurn(withLearner, learnerText, ctxIn.memory);
  return {
    ...withLearner,
    mode: "offline",
    messages: [...withLearner.messages, turn.message],
    status: turn.complete ? "completed" : "active",
    updatedAt: new Date().toISOString(),
  };
}

/** three graduated hints for the current beat, mildest first */
export function hintsForBeat(beat: Beat | undefined, skill: Skill): [string, string, string] {
  if (!beat) {
    return [
      `Start from the definition of ${skill.name.toLowerCase()}: ${skill.description}`,
      "Separate what the data shows from what you conclude from it.",
      "Say what the evidence cannot tell you before you give your reading.",
    ];
  }
  if (beat.kind === "concept") {
    const lines = firstSentences(beat.concept.body, 3);
    return [
      `Re-read the idea "${beat.concept.heading}" and say it back in one sentence.`,
      lines[0] ?? `Focus on how "${beat.concept.heading}" applies to ${skill.name.toLowerCase()}.`,
      beat.concept.example ? `Example from the lesson: ${firstSentences(beat.concept.example, 2).join(" ")}` : lines[1] ?? lines[0] ?? skill.description,
    ];
  }
  const wrong = beat.check.options.find((o) => !o.correct);
  const right = beat.check.options.find((o) => o.correct);
  return [
    "Rule out any option that contradicts the lesson's definition before choosing.",
    wrong ? `Why (${wrong.id}) does not hold: ${wrong.explanation}` : "Compare each option with what the data can actually show.",
    right ? `The option that holds up says: ${right.text}` : "Pick the option that separates observation from interpretation.",
  ];
}

export function coachHint(session: CoachSession): CoachSession {
  if (session.status === "completed" || session.hintsRevealed >= 3) return session;
  const ctx = buildContext(session.skillId);
  const beat = ctx.beats[beatIndex(session, ctx)];
  const hints = hintsForBeat(beat, ctx.skill);
  const n = session.hintsRevealed + 1;
  const content = `Hint ${n}/3: ${hints[n - 1]}`;
  return {
    ...session,
    hintsRevealed: n,
    messages: [...session.messages, coachMessage(content, [ctx.module.id], beat?.kind === "kc" ? beat.check.id : undefined)],
    updatedAt: new Date().toISOString(),
  };
}
