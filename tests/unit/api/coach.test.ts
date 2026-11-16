import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { get, noParams, okData, post, setupLocalEnv } from "./helpers";
import type { CoachHintResponse, CoachRespondResponse, CoachSessionResponse } from "@/lib/types";

let cleanup: () => Promise<void>;

beforeAll(async () => {
  ({ cleanup } = await setupLocalEnv());
});
afterAll(async () => cleanup());

describe("/api/coach/* (offline scripted coach, no model key)", () => {
  it("starts a session, answers a learner message, reveals hints and 404s unknown sessions", async () => {
    const session = await import("@/app/api/coach/session/route");
    expect((await session.POST(post("/api/coach/session", { skillId: "nope.skill" }), noParams)).status).toBe(404);
    expect((await session.POST(post("/api/coach/session", {}), noParams)).status).toBe(400);
    const created = await okData<CoachSessionResponse>(await session.POST(post("/api/coach/session", { skillId: "markets.price" }), noParams));
    expect(created.userId).toBe("local-demo-user");
    expect(created.skillId).toBe("markets.price");
    expect(created.mode).toBe("offline");
    expect(created.messages.length).toBeGreaterThan(0);

    const fetched = await okData<CoachSessionResponse>(await session.GET(get(`/api/coach/session?id=${created.id}`), noParams));
    expect(fetched.id).toBe(created.id);
    expect((await session.GET(get("/api/coach/session?id=missing"), noParams)).status).toBe(404);

    const respond = await import("@/app/api/coach/respond/route");
    const after = await okData<CoachRespondResponse>(await respond.POST(post("/api/coach/respond", { sessionId: created.id, message: "I think the price went up because volume was high." }), noParams));
    expect(after.messages.length).toBeGreaterThan(created.messages.length);
    expect((await respond.POST(post("/api/coach/respond", { sessionId: created.id, message: "" }), noParams)).status).toBe(400);

    const hint = await import("@/app/api/coach/hint/route");
    const hinted = await okData<CoachHintResponse>(await hint.POST(post("/api/coach/hint", { sessionId: created.id }), noParams));
    expect(hinted.hintsRevealed).toBe(1);
    expect((await hint.POST(post("/api/coach/hint", { sessionId: "missing" }), noParams)).status).toBe(404);
  });
});
