/**
 * Acceptance test 3: coach answers a topic question usefully.
 * In local mode (DEMO_MODE=true ⇒ no model) the coach runs the scripted
 * Socratic flow with mode "offline" and the UI must say so (CONTRACTS.md "AI boundary").
 *
 * Expected selectors: coach-input, coach-send, coach-message-coach, coach-mode-notice.
 */
import { test, expect } from "@playwright/test";
import { ROUTES, TID, ensureOnboarded, gotoFirst, tidOr } from "./helpers";

test("coach replies to a topic question and discloses offline mode", async ({ page }) => {
  test.setTimeout(120_000);
  await ensureOnboarded(page);
  await gotoFirst(page, ROUTES.coach);

  // The workspace starts a session on mount (POST /api/coach/session).
  const input = tidOr(page, TID.coachInput, page.getByRole("textbox").last());
  await expect(input).toBeVisible({ timeout: 20_000 });
  await expect(input).toBeEnabled({ timeout: 30_000 });
  // Coach turns render as <li class="coach-turn items-start">; learner turns as items-end.
  const coachMsgs = tidOr(page, TID.coachMessage, page.locator("li.coach-turn.items-start"));
  await expect(coachMsgs.first()).toBeVisible({ timeout: 30_000 }); // opening Socratic turn
  const before = await coachMsgs.count();

  const question = "What is the difference between volume and liquidity, and why does it matter for reading a move?";
  await input.fill(question);
  const send = tidOr(page, TID.coachSend, page.getByRole("button", { name: /send|ask/i })).first();
  await send.click();

  // The learner's message is shown.
  await expect(page.getByText(question).first()).toBeVisible();

  // A coach reply arrives (new coach message after ours).
  await expect
    .poll(async () => coachMsgs.count(), { timeout: 30_000, message: "coach reply count" })
    .toBeGreaterThan(before);
  const reply = (await coachMsgs.last().innerText()).trim();
  expect(reply.length, "coach reply should be substantive").toBeGreaterThan(40);

  // Offline-mode notice when there is no model key.
  const notice = tidOr(page, TID.coachModeNotice, page.getByText(/offline mode|scripted|no (ai|model) (key|configured)/i)).first();
  await expect(notice).toBeVisible();
  // The mode badge reads "Offline mode", never the AI badge (the page title "AI coach" is fine).
  await expect(page.getByText(/^Offline mode$/).first()).toBeVisible();
});
