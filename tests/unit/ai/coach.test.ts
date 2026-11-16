import { describe, expect, it } from "vitest";
import { curriculum, listKnowledgeChecks } from "@/lib/curriculum";
import { coachHint, coachRespond, startCoachSession } from "@/lib/ai/coach";
import type { CoachSession } from "@/lib/types/learning";
import { fakeModel, makeMemory, makePack } from "../learning/fixtures";

const evidence = makePack();
const memory = makeMemory();
const ctx = { memory, evidence, model: null };

function coachMessages(s: CoachSession) {
  return s.messages.filter((m) => m.role === "coach");
}
function last(s: CoachSession) {
  return s.messages[s.messages.length - 1];
}

describe("startCoachSession (offline)", () => {
  it("opens with the objective, a grounded primer, one question, and citations", async () => {
    const s = await startCoachSession({ userId: "user-1", skillId: "markets.volume", memory, evidence, model: null });
    expect(s.mode).toBe("offline");
    expect(s.status).toBe("active");
    expect(s.moduleId).toBe("markets");
    expect(s.messages).toHaveLength(1);
    const opener = s.messages[0];
    expect(opener.role).toBe("coach");
    expect(opener.content.startsWith("Objective: Reading volume")).toBe(true);
    expect(opener.content.trim().endsWith("?")).toBe(true);
    expect((opener.content.match(/\?/g) ?? []).length).toBe(1);
    expect(opener.content).toContain("75,576"); // from the attached BTC snapshot, cited
    expect(opener.citations).toEqual(["markets", "snapshot:BTC"]);
    expect(opener.content).toMatch(/one buyer and one seller/);
  });

  it("works for every leaf skill in the curriculum", async () => {
    for (const skill of curriculum.skills) {
      const s = await startCoachSession({ userId: "u", skillId: skill.id, memory, evidence, model: null });
      expect(s.messages[0].content.length).toBeGreaterThan(80);
      expect(s.messages[0].citations?.[0]).toBe(s.moduleId);
    }
  });

  it("mentions a recurring misconception up front and adapts to the examples style", async () => {
    const mem = makeMemory({ preferredStyle: "examples", recurringMisconceptions: [{ misconceptionId: "volume-implies-direction", count: 2, lastSeenAt: "2026-11-01" }] });
    const s = await startCoachSession({ userId: "u", skillId: "markets.volume", memory: mem, evidence, model: null });
    expect(s.messages[0].content).toMatch(/volume shows buying or selling/i);
    expect(s.messages[0].content).toMatch(/For example:/);
  });
});

describe("coachRespond (offline scripted flow)", () => {
  it("names the misconception when the learner's text contains a cue", async () => {
    const s0 = await startCoachSession({ userId: "u", skillId: "markets.volume", memory, evidence, model: null });
    const s1 = await coachRespond(s0, "I think high volume means buying, the whales are loading up.", ctx);
    expect(s1.mode).toBe("offline");
    expect(last(s1).role).toBe("coach");
    expect(last(s1).content).toMatch(/Volume shows buying or selling/);
    expect(last(s1).content).toMatch(/one buyer and one seller/);
  });

  it("walks the concept sections, then asks the knowledge check and explains the chosen option", async () => {
    let s = await startCoachSession({ userId: "u", skillId: "markets.volume", memory, evidence, model: null });
    const kc = listKnowledgeChecks("markets.volume")[0];
    let guard = 0;
    while (!last(s).knowledgeCheckId && guard++ < 6) s = await coachRespond(s, "Volume is how much changed hands over the window.", ctx);
    expect(last(s).knowledgeCheckId).toBe(kc.id);
    expect(last(s).content).toContain(kc.prompt);
    const wrong = await coachRespond(s, "a", ctx);
    expect(last(wrong).content).toMatch(/^Not quite\./);
    expect(last(wrong).content).toMatch(/Volume shows buying or selling/);
    expect(last(wrong).content).toContain(`(${kc.options.find((o) => o.correct)?.id})`);
    const right = await coachRespond(s, "I'd say b, activity was about 50% above its recent average", ctx);
    expect(last(right).content).toMatch(/^Correct\./);
  });

  it("completes the session after the last beat and ignores further input", async () => {
    let s = await startCoachSession({ userId: "u", skillId: "markets.volume", memory, evidence, model: null });
    let guard = 0;
    while (s.status === "active" && guard++ < 10) s = await coachRespond(s, "b", ctx);
    expect(s.status).toBe("completed");
    expect(last(s).content).toMatch(/Scripted coach/);
    const again = await coachRespond(s, "more?", ctx);
    expect(again.messages).toHaveLength(s.messages.length);
  });
});

describe("coachHint", () => {
  it("reveals three graduated hints and then stops", async () => {
    const s0 = await startCoachSession({ userId: "u", skillId: "markets.volume", memory, evidence, model: null });
    const s1 = coachHint(s0);
    const s2 = coachHint(s1);
    const s3 = coachHint(s2);
    const s4 = coachHint(s3);
    expect([s1, s2, s3].map((s) => s.hintsRevealed)).toEqual([1, 2, 3]);
    expect(last(s3).content.startsWith("Hint 3/3:")).toBe(true);
    expect(s4).toBe(s3);
    expect(coachMessages(s3)).toHaveLength(4);
    // hints do not advance the scripted beat
    const after = await coachRespond(s3, "ok", ctx);
    expect(last(after).content).toMatch(/Next idea|quick question/);
  });
});

describe("coachRespond (llm mode)", () => {
  const validTurn = {
    message: "Good observation. What does the -1.2% change compare, exactly?",
    citations: ["markets", "snapshot:BTC", "https://evil.example", "news:unknown"],
    misconceptionId: "volume-implies-direction",
    attachKnowledgeCheckId: "kc.does-not-exist",
    objectiveComplete: false,
  };

  it("validates the turn, filters citations and unknown ids, and keeps mode llm", async () => {
    const model = fakeModel([validTurn]);
    const s0 = await startCoachSession({ userId: "u", skillId: "markets.volume", memory, evidence, model });
    expect(s0.mode).toBe("llm");
    const s1 = await coachRespond(s0, "The price fell 1.2% so people are selling.", { memory, evidence, model });
    expect(s1.mode).toBe("llm");
    expect(last(s1).citations).toEqual(["markets", "snapshot:BTC"]);
    expect(last(s1).knowledgeCheckId).toBeUndefined();
    expect(last(s1).content).toContain("Volume shows buying or selling");
    expect(s1.status).toBe("active");
    expect(model.requests[0].user).toMatch(/<untrusted_content label="learner_message">/);
    expect(model.requests[0].system).toMatch(/No buy\/sell\/hold advice/);
  });

  it("marks the session completed when the model says the objective is met", async () => {
    const model = fakeModel([{ ...validTurn, objectiveComplete: true, misconceptionId: null, attachKnowledgeCheckId: null, citations: ["markets"] }]);
    const s0 = await startCoachSession({ userId: "u", skillId: "markets.volume", memory, evidence, model });
    const s1 = await coachRespond(s0, "Volume is activity, not direction.", { memory, evidence, model });
    expect(s1.status).toBe("completed");
  });

  it("falls back to the scripted flow and switches mode to offline on invalid model output", async () => {
    const model = fakeModel(["garbage", "{\"message\": 1}"]);
    const s0 = await startCoachSession({ userId: "u", skillId: "markets.volume", memory, evidence, model });
    const s1 = await coachRespond(s0, "Volume is how much changed hands.", { memory, evidence, model });
    expect(s1.mode).toBe("offline");
    expect(last(s1).role).toBe("coach");
    expect(last(s1).content).toMatch(/Next idea|quick question/);
  });
});
