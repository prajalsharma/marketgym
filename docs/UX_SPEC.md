# MarketGym UX spec

Layout, states and interactions for every screen. Components referenced are in `components/ui` (see `docs/DESIGN_SYSTEM.md`). Copy is sentence case, plain, second person.

## 1. Information architecture

```
/                      Landing
/signup  /login        Auth (or local-mode notice)
/onboarding            5 steps, one route with ?step=1..5 (or /onboarding/[step])
/app                   Overview
/app/learning          My learning          (/app/learning/[skillId] lesson + check)
/app/coach             AI coach             (/app/coach?session=)
/app/lab               Scenario lab         (/app/lab/[scenarioId], /app/lab/[scenarioId]/result)
/app/orderbook         Order book gym       (/app/orderbook/[exerciseId])
/app/progress          My progress
/app/settings          Settings
```

Primary nav (in this order): Overview, My learning, AI coach, Scenario lab, Order book gym, My progress. Settings and theme live in the account menu.

### App shell

- Desktop (>= 1024px): left sidebar 240px, collapsible to 64px (icons + tooltips). Top bar 56px with page context on the left and account menu + ThemeToggle on the right. Content max 72rem, 32px gutter.
- Tablet (640 to 1023px): sidebar hidden, top bar with a menu button that opens a Dialog sheet listing the six destinations. 24px gutter.
- Phone (< 640px): bottom tab bar with five items: Overview, Learning, Lab, Order book, Progress. Coach is reachable from the Overview and the lab (it is a sub-task, not a destination). 16px gutter; safe-area padding on the tab bar.
- Sticky bars use the `surface-sticky` utility (translucent, 1px bottom line). That is the only glass in the product.
- Local mode and demo mode show a one-line `StatusDot` strip under the top bar: "Local mode: progress is stored on this machine" / "Demo data: market data is a fixture". Dismissable per session, returns on reload.

### Global state vocabulary

| State | Treatment |
|---|---|
| Loading | `Skeleton` in the exact footprint of the content. No spinners inside content; the only spinner is inside a `Button loading`. |
| Empty | `EmptyState` that says what will appear here and offers the one action that fills it. |
| Error | `ErrorState` with a plain sentence, a `retry` and the request id in `detail`. Market-data errors degrade to cached or demo data with a `DataSourceTag` note rather than an error. |
| Offline AI | A `StatusDot tone="neutral"` line: "Coach is in scripted mode" / "Grading by rules only". Never hidden. |

## 2. Landing `/`

Register: brand surface, but restrained. One accent, no hero glow, no card grid.

1. Top bar: mark + "MarketGym", links "How it works", "Log in", primary "Start learning".
2. Hero: `text-2xl` heading on the left ("Learn how markets work, with real data."), one paragraph, primary button, secondary "See a sample scenario". Right side: a real evidence card (demo, tagged as demo) and a cropped learner answer panel, so the product shows itself. No illustration, no blob.
3. How it works: a numbered list of the five steps of the loop (this is a real sequence, so numbers are allowed), each one line plus one sentence. Vertical list, not cards.
4. What you will learn: the six modules as a two-column definition list (module name, one sentence, skill count). Not a card grid.
5. Data honesty: one short section with the three freshness states rendered as real `DataSourceTag`s and one sentence each.
6. What it is not: three plain sentences (no trading, no advice, no wallet).
7. Footer: links, "Market data by SoSoValue and SoDEX", theme toggle.

Responsive: hero stacks at < 1024px, sample panels go full width. Phone: 16px gutter, heading clamp bottoms at 34px, no horizontal scroll.

Loading: static page. Error: n/a. Motion: hero content uses `animate-rise-in` once; nothing on scroll.

## 3. Auth `/signup` `/login`

Centred 400px panel on `bg-bg`. Title `text-xl`, one paragraph, `Label` + `Input` pairs, inline validation below each field in `text-danger text-sm`, primary button full width, link to the other page. Local mode replaces the form with an `EmptyState`-style panel: "This instance runs in local mode. Your progress is stored on this device." and a primary "Continue to onboarding".

Error: server message in an `ErrorState` above the form. Loading: button `loading`.

## 4. Onboarding `/onboarding` (5 steps)

Single centred column, 560px max. Top: step counter as text ("Step 2 of 5") and a `Progress` bar (no numbers). Bottom: `Back` (ghost) and `Continue` (primary). Enter advances when the step is valid.

| Step | Content | Control |
|---|---|---|
| 1 Goal | "What do you want to be able to do?" | `RadioGroup` of `RadioCard`s (one per `LearningGoal`) |
| 2 Experience | "How much have you done so far?" | three `RadioCard`s (new / some / experienced) |
| 3 Interests | "Which markets do you care about?" | checkbox rows (native input + Label), at least one |
| 4 Style | "How do you like explanations?" | three `RadioCard`s (concise / detailed / examples) with a two-line sample under each |
| 5 Diagnostic | 6 to 8 questions, one at a time, with a mini `Progress` | multiple choice as `RadioCard`s; the one open question is a `Textarea` with a 300-char hint |

After step 5: a result screen "Here is where you are starting" with the six modules as a list, each with a `MasteryIndicator`, then primary "See your first mission" to `/app`.

Loading: step 5 questions arrive via `/api/diagnostic/questions`; show three `Skeleton` rows. Error: `ErrorState` with retry; the learner can skip the diagnostic (secondary button) and gets a conservative starting path. Phone: controls are full width; buttons are stacked, primary on top.

## 5. Overview `/app`

`PageHeader` "Good evening, {name}" with description "Here is what to do next." (time-of-day greeting, no exclamation).

Layout, desktop two columns (8/4):

Main column
1. Next mission: `Card tone="raised"`. Title of the mission, why it was chosen (one sentence from `NextMission.reason`), estimated minutes, primary "Start". If a review is overdue, the mission is the review and the card gets a `Badge tone="warning"` "Review due".
2. Market context: a single-row strip of 3 to 4 `Stat`s (BTC, ETH price and 24h change; one index) with one shared `DataSourceTag` on the row. If data is demo, the tag is the dashed violet one. No chart here.
3. Recent activity: a plain list of the last 8 `ActivityEvent`s, each a row with a `StatusDot` tone by kind, text, relative time.

Side column
1. Reviews: list of due and upcoming reviews (skill name, due in / overdue by, "Review" ghost button).
2. Progress snapshot: six modules, each a row: name, `Progress` sm, `MasteryIndicator size="sm"`. Link "See my progress".
3. Coach: one line "Ask the coach about your last attempt" with a secondary button.

Tablet: side column drops under the main column. Phone: order is mission, reviews, market strip (scrolls horizontally with snap), progress, activity.

Loading: skeletons sized to the mission card and three list rows. Empty (new learner): mission card still renders (the first lesson); activity shows an `EmptyState` "Your attempts and reviews will appear here." Error: mission card becomes `ErrorState` with retry; the rest of the page still renders.

## 6. My learning `/app/learning`

`PageHeader` "My learning", description "Six modules, 32 skills. Work in order; prerequisites unlock as you go."

A vertical list of modules, each a `Collapsible` open by default for the current module, closed for others:
- Module row: name, one-sentence description, `Progress` sm with `showValue`, `MasteryIndicator` summary (count mastered / total), lock word "Needs: Markets" in `text-subtle` when prerequisites are unmet.
- Skill rows inside: skill name, `MasteryIndicator`, last assessed relative time, and the action: "Learn" (secondary) when not started, "Practise" (primary, only on the current mission's skill), "Review" when a review is due.

Lesson `/app/learning/[skillId]`: two-column on desktop (lesson 7 / aside 5). Lesson body in `.prose-lesson`, with any market example rendered as a `Card tone="evidence"` carrying a `DataSourceTag`. Aside: "Misconceptions to watch" list, "Knowledge check" with `RadioCard` questions submitted one at a time, feedback inline under the chosen option (`text-success` or `text-danger` sentence, not a modal). Footer: "Practise this skill" primary to the lab.

Loading: lesson skeleton with 8 lines. Empty: a skill with no lesson yet shows `EmptyState` "This lesson is being written. Practise it in the lab instead." Error: `ErrorState`.

## 7. AI coach `/app/coach`

Two-pane on desktop: conversation (8) and context (4).

Conversation pane
- Header row: skill name, `StatusDot` "Online coach" or "Scripted coach" (offline mode), ghost "New session".
- Messages: coach messages left-aligned in `.prose-lesson` on `bg-surface`; learner messages right-aligned on `bg-learner` with `border-learner-line`. No avatars. Timestamps on hover (title attribute).
- Composer: `Textarea` auto-growing to 6 lines, hint "Shift+Enter for a new line", primary "Send", ghost "Give me a hint" (calls `/api/coach/hint`, counts hints).

Context pane
- Evidence the coach is grounded in: compact `Card tone="evidence"` items with `DataSourceTag compact`.
- Learner memory: "Weak skills", "Recurring misconceptions" as plain lists.

Phone: context pane becomes a `Collapsible` above the conversation ("Show evidence"). Composer sticks to the bottom with safe-area padding.

Loading: coach reply shows a three-line `Skeleton` in a coach bubble; composer disabled with the send button `loading`. Empty: a new session opens with the coach's first question; no blank state. Error: `ErrorState` inline in the thread with "Retry" that resends the last learner message.

## 8. Scenario lab `/app/lab` and `/app/lab/[scenarioId]`

The centrepiece. Everything else exists to get people here.

Index `/app/lab`: `PageHeader` "Scenario lab", description "Read the evidence, write what you think is going on, get graded on the reasoning." A list of recommended scenarios (skill, kind, minutes, "Start") and a `Select` to filter by skill. Primary on the first row only.

Scenario `/app/lab/[scenarioId]`, desktop layout (two columns, 7/5, both independently scrollable within the viewport height; the page header stays above):

```
+--------------------------------------------------------------+
| PageHeader: scenario title · skill badge · time · DataSource  |
+-------------------------------+------------------------------+
| EVIDENCE (bg-evidence)        | YOUR ANSWER (bg-learner)     |
|  question prompt              |  the question again, short   |
|  evidence items (list):       |  Textarea (min 8 rows)       |
|   - news (title, source, t)   |  word count · "cite evidence"|
|   - market snapshot stats     |  hint drawer (Collapsible)   |
|   - etf flow table/chart      |  [Submit answer] [Save draft]|
|   - order book summary        |                              |
|  each with DataSourceTag      |                              |
+-------------------------------+------------------------------+
| EVALUATION PANEL (appears after submit, full width)          |
+--------------------------------------------------------------+
```

Evidence column (`Card tone="evidence"`, padding none; items as rows separated by `border-evidence-line`)
- Column title "Evidence" in `text-evidence-fg` `text-sm font-medium` with the frozen-at time ("Frozen at 14:02 UTC") in `text-subtle`. Frozen is stated in words because it matters for grading.
- Each item: small kind word (News, Price, ETF flows, Index, Order book) in `text-evidence-fg text-xs`, then content, then `DataSourceTag`. Numbers tabular. News shows title, source, published time, 2 to 3 sentence excerpt; no external link until after submission (prevents leaving mid-attempt).
- Items can be cited: hovering shows a ghost "Cite" button that inserts "[E2]" at the cursor in the answer. Citations are what the evaluator looks for.
- Charts here are small, titled, single-series, axis labelled, with a hover tooltip. Never decorative.

Answer column (`Card tone="learner"`)
- Column title "Your answer" in `text-learner-fg`. The prompt restated in one line.
- `Textarea` with placeholder "What do you think is happening, and what in the evidence makes you think so?". Under it: word count, a nudge line that appears after 40 words if no citation yet ("Tip: cite at least one evidence item, e.g. [E1]").
- Hint drawer: `CollapsibleRow` "Need a hint? (costs a few points)". Opening it reveals the first hint; a ghost "Another hint" reveals the next (max 3). Hints used are shown as "Hints used: 1 of 3".
- Buttons: primary "Submit answer", ghost "Save draft". Submit is disabled under 20 words with the reason shown in `text-subtle`, not a tooltip.
- Confirmation on submit is inline (button goes `loading`, column dims to 70% opacity). No modal.

Evaluation panel (slides in below with `animate-rise-in`, page scrolls to it; focus moves to its heading)
- Header: "Your evaluation", total score as a `Stat` ("72 / 100"), `StatusDot` "Graded by rules only" when `evaluatorMode === "rules"`.
- Four `Progress` bars with labels and `showValue`, max shown in the label: Factual (35), Evidence (25), Reasoning (25), Uncertainty (15). Tone: success at or above 80% of max, accent otherwise, warning below 40%.
- Three lists: "What you got right" (`text-success` dot rows), "What you missed" (`text-warning` dot rows, each naming the evidence item), "Misconception to watch" (if any; name + one-sentence correction, link to the lesson).
- Explanation in `.prose-lesson`. Follow-up question in a `Card tone="raised"` with "Discuss with the coach" (secondary) and "Try a similar scenario" (primary).
- After evaluation, evidence items gain their source links.

Responsive
- Tablet: columns stack, evidence first, answer second; a sticky bottom bar holds "Submit answer" so it is reachable without scrolling back.
- Phone: `Tabs` "Evidence" / "Your answer" above the content, answer tab is default after the first visit to evidence; the sticky bar shows the submit button and the hints count. Evaluation renders as its own section below with the same tabs hidden.

Loading: the two columns render as skeletons in their final shapes (evidence 4 rows, answer one tall block). Empty: no scenario for the skill yet shows `EmptyState` "No scenario for this skill yet. Practise a related skill." with a secondary action. Error: evidence fetch failure shows `ErrorState` in the evidence column; the answer column is disabled with "Waiting for evidence". Submission failure shows `ErrorState` under the buttons with retry; the draft is kept in localStorage.

Result `/app/lab/[scenarioId]/result`: the evaluation panel alone, with the submitted answer above it in a `Card tone="learner"` (read-only) and the evidence collapsed under a `CollapsibleRow` "Show the evidence".

## 9. Order book gym `/app/orderbook` and `/app/orderbook/[exerciseId]`

Index: `PageHeader` "Order book gym", description "Read a real order book: spread, depth, imbalance, priority." List of exercises (title, skill, minutes, "Start"). A `Select` for the market symbol used in the ladder.

Exercise, desktop (two columns 7/5):

Ladder (left, `Card tone="evidence"`, padding none)
- Header: symbol, `Stat`s for last price and 24h change (if available), `DataSourceTag`. Cached is the normal state here (15s TTL); the tag says so.
- Spread callout: a single row between asks and bids: "Spread 0.40 (0.08%)" in `text-fg` with the mid price in `text-muted`. Highlighted with `bg-surface-raised`, not a colour.
- Asks above (red ink, `bg-ask-soft` depth bars growing from the right), bids below (green ink, `bg-bid-soft` depth bars growing from the left). Columns: price, size, cumulative. Tabular numerals, `text-sm`. 12 levels each by default; a `Select` for 6/12/24.
- Depth bars are proportional to cumulative size at that level; the bar sits behind the text with 2px gap to the row edge.
- Hover or tap a level: a `Tooltip` with "If you bought 2.0 here you would fill at an average of 61,412" (or the exercise's relevant computed figure). Keyboard: rows are focusable, arrow keys move, tooltip follows focus.
- "Snapshot" ghost button freezes the book for the exercise and states the time; exercises always grade against the frozen snapshot.

Exercise panel (right, `Card tone="learner"`)
- Title, one-paragraph setup, then questions in order. Numeric answers use `Input type="number"` with the unit shown after the field; choices use `RadioCard`s; short text uses `Textarea` with 3 rows.
- "Check answers" primary; per-question feedback appears inline under the field (`text-success` or `text-danger`, plus a one-line explanation). Score as a `Stat`. "Next exercise" primary when all are checked.

Tablet/phone: the ladder is first, the exercise panel below; a sticky bottom bar shows "Check answers". The ladder's columns drop cumulative at < 400px.

Loading: ladder skeleton of 25 rows in the ladder footprint. Empty: no exercises for the symbol shows `EmptyState`. Error: book fetch failure falls back to cached or demo with the tag updated; if nothing is available, `ErrorState` with retry in the ladder and the exercise panel disabled.

## 10. My progress `/app/progress` (skill passport)

`PageHeader` "My progress", description "32 skills across six modules. Mastery needs practice and a passed review."

1. Summary row of four `Stat`s: Mastered, Practising, Reviews due, Attempts. No big-number hero, no icons.
2. Passport: a table (not cards). Columns: Skill, Module, Status (`MasteryIndicator`), Score, Last assessed, Next review. Sortable by status and next review; filter `Select` by module. Rows link to the lesson. On phone the table becomes a list where each row shows skill, `MasteryIndicator size="sm"` and next review.
3. Misconceptions: list of resolved and unresolved misconception ids rendered with their names, status `StatusDot` (success "Resolved", warning "Still showing up"), link to the lesson that addresses it.
4. Attempts: a chronological list (scenario title, skill, score as text, relative time) linking to results.
5. Review schedule: a seven-day strip (Mon to Sun) with counts per day; today is marked by a word, not just colour.

Charts on this page: one small single-series line of "Average score over your last 20 attempts" with axis and tooltip, chart-1 colour. Nothing else.

Loading: summary stats and six table rows as skeletons. Empty (no attempts): the table still lists all 32 skills as "Not started"; attempts list shows `EmptyState` "Your first graded scenario will appear here" with "Go to the lab". Error: `ErrorState` per section.

## 11. Settings `/app/settings`

Single column of labelled groups: Profile (goal, experience, interests, style, editable with the same controls as onboarding), Appearance (`ThemeToggle showLabel`), Data (`StatusDot` showing live/cached/demo mode; explanation), Account (sign out; "Delete my data" as `Button variant="danger"` with a `Dialog` confirmation that requires typing "delete").

## 12. Responsive rules

- Breakpoints: `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Layouts are structural (columns collapse, sidebar hides); type stays fixed except the landing hero.
- Phone: 16px gutter; bottom tab bar 56px plus safe area; sticky action bars for lab and gym; dialogs become bottom sheets; tables become lists; any horizontal scroller shows a 24px fade and snaps.
- Tablet: 24px gutter; two-column layouts stack with the evidence/ladder first.
- Desktop: 32px gutter; content max 72rem; two-pane screens keep both panes within viewport height and scroll independently.
- Minimum tap targets 44px on phone primary actions; 32px rows in dense desktop lists.

## 13. Micro-interactions

- Button hover: background shift, 120ms. Active: 90% opacity. Loading: spinner replaces nothing; it sits left of the label.
- Focus: 2px accent outline with 2px offset, everywhere, including table rows and ladder levels.
- Tabs: active underline is a 2px line; content fades in 180ms.
- Collapsible: chevron rotates 90 degrees in 120ms; content fades in. No height animation.
- Dialog: overlay fades, panel rises 6px and fades in 260ms; bottom sheet on phone.
- Progress bars: width transitions 260ms ease-out when a value changes (evaluation panel reveals bars at 0 then sets values on the next frame).
- Evaluation panel: rises in once; focus moves to its heading; page scrolls smoothly unless reduced motion.
- DataSourceTag: relative time refreshes every minute without reflow; the dot never animates.
- Ladder rows: hover raises row background to `bg-surface-raised`; depth bars do not animate on data refresh (values snap) to keep the book legible.
- Cite button: inserts "[E2]" at the caret, textarea keeps focus, a 1-second "Cited" word appears next to the item.
- Textarea word count: updates live; the citation tip appears once, fades in.
- Theme toggle: swaps icon instantly; colours change with no transition (avoid a cross-fade across every element).
- Skeleton: opacity pulse 1.6s; respects reduced motion (becomes static).
- Toasts: none in v1. Feedback is inline where the action happened.

## 14. Copy rules

Sentence case. No exclamation marks. Say what happened and what to do next. Name the evidence item rather than saying "some evidence". Never "great job"; prefer "you cited the ETF flows and the price move; you did not mention volume". Define a term inline the first time it appears in a lesson (`<dfn>`), not in a glossary modal.
