# MarketGym product spec

## Vision

MarketGym teaches people how financial markets work by having them reason about real market data and getting coached on the reasoning, not the outcome. It is a gym: you practise, you get feedback on form, you come back. It is not a brokerage, a signal service, or a place to be told what to buy.

One sentence for the landing page: "Learn how markets work, with real data."

## Audience

- Primary: adults new to markets (crypto-curious, first index fund, reads headlines and doesn't know what to trust). Often on a phone in the evening, sometimes on a laptop at lunch.
- Secondary: people with some exposure (own a few assets, watch a few accounts) who want to stop guessing. They want to read an order book, an ETF flow table or a news item and know what it does and doesn't tell them.
- Not for: active traders looking for edge, professionals, or anyone wanting recommendations.

The scene that sets the theme: a learner at 9 pm on a phone or laptop, lamp on, reading a short piece of evidence and typing a paragraph. The screen should feel like a quiet research desk, so dark is the default and the accent is used only where they need to act.

## The core loop

1. Next mission. The dashboard tells the learner the one thing to do now (chosen by the curriculum engine: prerequisite order, weak skills, overdue reviews, recurring misconceptions, stated goal).
2. Learn. A short lesson in plain language with a worked example on real data, then a knowledge check.
3. Practise. A scenario in the lab: frozen evidence on one side, the learner's thesis on the other. Hints are available and cost a little.
4. Feedback. A four-dimension evaluation (factual, evidence, reasoning, uncertainty), what was right, what was missing, which misconception showed up, one follow-up question.
5. Coach. An optional Socratic conversation about the attempt, grounded in the same evidence.
6. Review. Spaced retention checks days later. Mastery is only granted after a passed review.
7. Progress. A skill passport showing the 32 skills across 6 modules, with status and evidence.

Every loop closes with a visible change in the passport, so effort always shows up somewhere.

## Screens

| Route | Purpose |
|---|---|
| `/` | Landing: what it is, how it works, what it isn't, sign up. |
| `/signup`, `/login` | Email and password (Supabase) or local mode notice. |
| `/onboarding` | Five steps: goal, experience, interests, learning style, diagnostic. |
| `/app` (Overview) | Next mission, due reviews, recent activity, market context strip with provenance. |
| `/app/learning` (My learning) | The path: six modules, skills with status, lessons and checks. |
| `/app/coach` (AI coach) | Socratic session on a skill or an attempt. Shows offline/online mode. |
| `/app/lab` (Scenario lab) | The centrepiece. Evidence column, answer column, hint drawer, evaluation panel. |
| `/app/orderbook` (Order book gym) | Ladder, depth bars, spread callout, exercise panel. |
| `/app/progress` (My progress) | Skill passport, reviews schedule, attempts history, misconceptions resolved. |
| `/app/settings` | Profile, theme, data mode, delete account. |

## Data honesty

Every piece of market data on screen carries a `DataSourceTag`: provider, live/cached/demo, and time. Demo is violet, dashed and says "Demo data". Scenarios freeze their evidence pack so the grade never depends on data that moved after the learner answered. When the AI runs in rules-only mode or the coach is scripted, the UI says so in words.

## Non-goals

- No trading, order entry, wallets, signatures, deposits or balances.
- No investment advice, price targets, "buy/sell" language, portfolio suggestions or alerts.
- No leaderboards, streak shaming or dark-pattern urgency. Streaks are shown; lapses are not punished.
- No social feed, comments, or sharing of other learners' answers.
- No real-money simulation ("paper trading"). The lab grades reasoning, not P&L.
- No gamified currency. Mastery and reviews are the only progression.

## Success measures

- A new learner reaches their first evaluated scenario within 10 minutes of sign-up.
- Median scenario attempt gets at least one specific "missing evidence" line that the learner can act on.
- 7-day return driven by reviews due, not notifications.
- Zero screens where demo data could be read as live (QA checks screenshots).

## Tone

Plain, specific, calm. Second person. No jargon without an inline definition. No exclamation marks. Numbers over adjectives. "You cited the price move but not the volume behind it" beats "Great effort!".
