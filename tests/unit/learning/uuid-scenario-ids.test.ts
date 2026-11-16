/**
 * Regression: the backend gives scenarios opaque uuids (scenarios.id is a uuid
 * column), so the engine must read the template from attempt.templateId rather
 * than parsing it out of the scenario id.
 */
import { describe, expect, it } from "vitest";
import { listExerciseTemplates } from "@/lib/curriculum";
import { attemptsPerTemplate, pickTemplateForSkill } from "@/lib/learning/scenario-generator";
import { makeAttempt, makeMemory, NOW } from "./fixtures";

const skillId = "etf.flows";
const templates = listExerciseTemplates({ skillId, kind: "scenario" });

describe("scenario ids are opaque uuids", () => {
  it("has at least two scenario templates for the test skill", () => {
    expect(templates.length).toBeGreaterThanOrEqual(2);
  });

  it("counts attempts per template via attempt.templateId", () => {
    const a = { ...makeAttempt({ id: "a1", scenarioId: crypto.randomUUID(), skillIds: [skillId], score: 85, createdAt: NOW.toISOString() }), templateId: templates[0].id };
    const counts = attemptsPerTemplate([a], templates);
    expect(counts.get(templates[0].id)).toBe(1);
  });

  it("prefers a template the learner has not attempted yet", () => {
    const a = { ...makeAttempt({ id: "a1", scenarioId: crypto.randomUUID(), skillIds: [skillId], score: 85, createdAt: NOW.toISOString() }), templateId: templates[0].id };
    const picked = pickTemplateForSkill(skillId, [a], makeMemory());
    expect(picked.id).not.toBe(templates[0].id);
  });
});
