/**
 * Wave 2 additions to existing modules: markets.trading-hours,
 * orderbook.spot-vs-perps and indexes.index-nav. Kept in one file so the
 * original module files stay readable; each module spreads these in.
 * Figures in concepts and checks are HYPOTHETICAL; exercises read real data
 * from the evidence pack.
 */
import type { ConceptSection, ExerciseTemplate, KnowledgeCheck } from "@/lib/types/curriculum";
import { makeRubric } from "../rubric";

// ---------------------------------------------------------------- markets.trading-hours

export const tradingHoursObjective =
  "Tell a 24/7 crypto quote from a market-hours quote, and say when a displayed price is stale.";

export const tradingHoursConcept: ConceptSection = {
  heading: "Trading hours: 24/7 quotes and market-hours quotes",
  body: `Crypto spot markets trade all day, every day. There is no closing bell, so a BTC quote at 03:00 on a Sunday is a real price that someone could trade at.

A **tokenised ETF** is different. Its share tracks a fund listed on a stock exchange, and the fund's own price only moves while that exchange is open. Outside those hours the board may show one of several things:

- **Pre-market** or **after-hours**: thin early or late trading, often with wide gaps between prints.
- **Closed**: the last official close, which can be many hours old.
- A provider estimate, labelled with its source.

So a price on a screen comes with two questions: **when was it set**, and **is the market it follows open right now**? A row that says "pre-market" next to an as-of time from last night is not the price you would get at the next open. Some providers also flag rows as stale or unavailable; read that flag before the number.

When markets reopen, the price can jump to reflect everything that happened while it was shut. That gap is not a crash or a rally that "happened at the open"; it is the catch-up of a price that could not move.

Habit: always write "last price X as of <time>, market <status>" for anything that is not 24/7.`,
  example:
    "Suppose a board shows a tokenised ETF at 100.00 with status 'closed' and an as-of time of 21:00 yesterday, next to BTC at 60,000 as of 09:30 today. The BTC figure is a live 24/7 quote; the ETF figure is a twelve-hour-old close. If the fund's home market opens at 101.50, that 1.5% jump is the catch-up of a price that was frozen overnight.",
};

export const tradingHoursCheck: KnowledgeCheck = {
  id: "kc.markets.trading-hours.1",
  skillId: "markets.trading-hours",
  prompt:
    "At 08:00 on a Saturday, a board shows BTC at 60,000 (as of 08:00) and a tokenised ETF at 250.00 with status 'closed' (as of 21:00 Friday). Which statement is most accurate?",
  options: [
    {
      id: "a",
      text: "Both are current prices you could trade at right now.",
      correct: false,
      explanation:
        "BTC trades 24/7, so its 08:00 quote is current. The ETF's home market is shut; 250.00 is Friday's close, eleven hours old.",
      misconceptionId: "stale-price-is-current",
    },
    {
      id: "b",
      text: "BTC's quote is current; the ETF figure is Friday's last price and may jump when its market reopens.",
      correct: true,
      explanation:
        "Reading the status and as-of time first tells you which number is live and which is frozen until the next session.",
    },
    {
      id: "c",
      text: "The ETF is safer because its price is not moving this weekend.",
      correct: false,
      explanation:
        "The price is not moving because the market is shut, not because risk has gone. News over the weekend shows up as a gap at the open.",
    },
    {
      id: "d",
      text: "The ETF price is wrong because it is older than the BTC price.",
      correct: false,
      explanation:
        "It is not wrong; it is the correct last price for a market that is closed. It just must be labelled with its time and status.",
    },
  ],
};

export const tradingHoursExercise: ExerciseTemplate = {
  id: "ex.markets.trading-hours",
  skillIds: ["markets.trading-hours", "markets.structure"],
  kind: "scenario",
  title: "Which prices are live?",
  difficulty: 2,
  learningObjective:
    "Sort the prices in a pack into live 24/7 quotes and market-hours quotes, read each one's status and time, and say what a stale price can and cannot tell you.",
  evidenceRequirements: ["wealth:board", "snapshot:BTC"],
  questions: [
    "From the fund board, list three funds and give each one's market status, as-of time and price source. Which of them follow a market that keeps exchange hours?",
    "Compare the as-of time of the BTC snapshot with the as-of time of one tokenised ETF row. How old is each figure relative to the pack's creation time?",
    "If a market-hours fund is in pre-market or closed, what could happen to its price at the next open, and why is that not a move that 'happened' at the open?",
    "Write one sentence that reports a market-hours fund's price honestly, with its status and time.",
  ],
  expectedReasoning: [
    "Reads market status and as-of time before the price",
    "Separates 24/7 crypto quotes from exchange-hours fund quotes",
    "Explains the opening gap as catch-up of a frozen price",
    "Reports a stale price with its time and status",
  ],
  rubric: makeRubric({
    factual: [
      "Reads the market status of each chosen fund correctly from the board",
      "Reads the as-of times correctly and computes their age against the pack time",
      "States that crypto spot trades 24/7 while tokenised ETFs follow their home market's hours",
      "Explains that a closed or pre-market price may not be the next tradeable price",
      "Does not describe an exchange-hours price as live when the status says otherwise",
    ],
    evidence: [
      "Cites fund ids and their market status from the board",
      "Cites the price source or price status field where present",
      "Cites the BTC snapshot's timestamp",
      "Notes the provenance of each figure: live, cached or demo",
    ],
    reasoning: [
      "Explains why the same screen can mix live and frozen prices",
      "Explains the opening gap as information arriving while the market was shut",
      "Separates what the row shows from what the next open might bring",
      "Writes an honest one-line report that includes status and time",
    ],
    uncertainty: [
      "Says the next opening price cannot be known from the pack",
      "Notes that pre-market prints can be thin and unrepresentative",
      "Flags any row whose price status is not ready",
      "Avoids forecasting the direction of any opening gap",
    ],
    keyPoints: [
      "crypto spot markets trade around the clock",
      "tokenised etfs follow the hours of their home market",
      "read the market status and as-of time before the price",
      "a closed market shows a last price that can be hours old",
      "prices can gap at the open to catch up",
      "report a stale price with its time and status",
    ],
    acceptableAlternatives: [
      "Choosing escrow vault rows instead of tokenised ETFs, if their status is shown",
      "Measuring age in minutes or hours, as long as it is consistent",
      "Describing pre-market as 'thin early trading' without naming the exchange",
    ],
    commonMisconceptionIds: ["stale-price-is-current", "price-equals-value", "percent-change-is-trend"],
  }),
  hints: [
    "Find the market status and the as-of time on each row before you look at the price.",
    "Subtract each as-of time from the pack's creation time. Which figures are minutes old and which are hours old, and why?",
    "A full answer lists funds with status, time and source; contrasts them with the 24/7 BTC quote; explains the opening gap as catch-up; and writes 'last price X as of <time>, market <status>'.",
  ],
};

// ---------------------------------------------------------------- orderbook.spot-vs-perps

export const spotVsPerpsObjective =
  "Compare the spot and perpetual books for the same asset on spread and depth, and explain why the tighter book is not the cheaper one for every order size.";

export const spotVsPerpsConcept: ConceptSection = {
  heading: "Same asset, two books: spot and perpetual",
  body: `One asset can trade on more than one book on the same venue. The **spot** book exchanges the token itself for a quote currency. A **perpetual** (perp) book trades a contract that tracks the asset's price, with no expiry. They are separate markets with their own resting orders, so they have their own best bid, best ask, spread and depth.

The perp's price is kept close to spot by a **funding** payment that passes between long and short holders at intervals. Funding is a real cost or income for perp positions, but it is not shown on an order book, so a book-only comparison leaves it out. Say so when you compare.

Why can a perp book be tighter? Derivative traders and market makers often concentrate there, and quoting a contract needs less capital than holding the token. Why can spot still be better for some orders? A tight perp spread may rest on small sizes at the top, while spot has fewer, larger orders a few ticks away.

To compare fairly for the same asset:

- Spread as a percentage of mid for each book.
- Depth in **quote value** (price × quantity) over the same number of levels.
- The average price a stated order size would get on each.

Neither book alone is "the" price of the asset.`,
  example:
    "Suppose spot shows 99.90 / 100.10 with 30 tokens on each of the top levels, and the perp shows 99.99 / 100.01 with 2 contracts per level. The perp's spread is 0.02% against spot's 0.20%. A buyer of 1 unit pays less on the perp. A buyer of 60 units walks the perp book many levels and may pay more than on spot, where 60 units fill within two levels.",
};

export const spotVsPerpsCheck: KnowledgeCheck = {
  id: "kc.orderbook.spot-vs-perps.1",
  skillId: "orderbook.spot-vs-perps",
  prompt:
    "For the same asset, the perp book shows a 0.02% spread with about 2 units per level; the spot book shows a 0.20% spread with about 30 units per level. You want to buy 60 units at once. Which statement is best?",
  options: [
    {
      id: "a",
      text: "The perp book is cheaper because its spread is ten times tighter.",
      correct: false,
      explanation:
        "The spread prices only the first small slice. Sixty units would walk about thirty perp levels, while spot fills them within two.",
      misconceptionId: "tighter-spread-best-for-any-size",
    },
    {
      id: "b",
      text: "Compare the average fill price for 60 units on each book; spot's deeper levels may make it cheaper despite the wider spread.",
      correct: true,
      explanation:
        "For a given size, spread and depth together set the cost. That needs the average fill on each book, not the spread alone.",
    },
    {
      id: "c",
      text: "The two books must show the same price, so either is fine.",
      correct: false,
      explanation:
        "They are separate markets with separate orders. Funding keeps the perp near spot, but their quotes and depth differ.",
      misconceptionId: "perps-price-is-spot-price",
    },
    {
      id: "d",
      text: "The spot book is always better because it trades the real token.",
      correct: false,
      explanation:
        "For a small order the perp's tighter spread can be cheaper. Which book is better depends on the size, and the perp also carries funding, which the book does not show.",
    },
  ],
};

export const spotVsPerpsExercise: ExerciseTemplate = {
  id: "ex.orderbook.spot-vs-perps",
  skillIds: ["orderbook.spot-vs-perps", "orderbook.spread", "orderbook.depth"],
  kind: "orderbook",
  title: "Spot or perpetual: which book?",
  difficulty: 4,
  learningObjective:
    "Compare the ANT/USDC spot book with the ANT-USD perpetual book on spread, quote-value depth and the cost of a stated size, and name what the books leave out.",
  evidenceRequirements: ["orderbook:vANT_vUSDC", "orderbook:perps:ANT-USD"],
  questions: [
    "Give the best bid, best ask and spread as a percentage of mid for each book. Which is tighter?",
    "Add up the quote value (price × quantity) of the top ten levels on each side of each book. Which book has more value near the top?",
    "For a buy worth about 2,000 in quote currency, walk each book's asks and estimate the average price. Does the tighter book still win?",
    "What does neither book show you about the cost of holding a perpetual position, and why is neither price 'the' price of ANT?",
  ],
  expectedReasoning: [
    "Computes spread as a percentage of mid for both books",
    "Measures depth in quote value over the same levels",
    "Walks the book for a stated size before choosing",
    "Names funding as a cost the order book does not show",
  ],
  rubric: makeRubric({
    factual: [
      "Reads best bid and best ask correctly from both books",
      "Computes spread as a percentage of mid correctly to two decimal places",
      "Sums top-ten quote value correctly on both sides of both books",
      "Estimates the average fill for the stated size from the level prices and quantities",
      "States that spot and perp are separate markets with separate orders",
    ],
    evidence: [
      "Cites both books by name and their timestamps",
      "Quotes level prices and quantities used in the walk",
      "Notes that the two books were captured at slightly different times",
      "Notes the provenance of each book",
    ],
    reasoning: [
      "Explains why spread alone prices only the first slice of an order",
      "Explains why depth must be compared in quote value, not contracts or tokens",
      "Links the answer to the stated order size",
      "Explains that funding keeps the perp near spot but is not on the book",
    ],
    uncertainty: [
      "Says the books can change within seconds",
      "Names funding and fees as costs not in the pack",
      "Avoids calling either book the true price",
      "Avoids any suggestion to trade either market",
    ],
    keyPoints: [
      "spot and perpetual books are separate markets",
      "spread as a percentage of mid compares the two books",
      "compare depth in quote value",
      "a tighter spread only prices the first slice of an order",
      "walk the book for the stated size",
      "funding is a cost the order book does not show",
      "neither book alone is the price of the asset",
    ],
    acceptableAlternatives: [
      "Using the top five levels instead of ten, if stated",
      "Estimating the worst fill price instead of the average",
      "Choosing a different order size and recomputing",
    ],
    commonMisconceptionIds: ["perps-price-is-spot-price", "tighter-spread-best-for-any-size", "bigger-book-always-more-liquid", "spread-is-fee"],
  }),
  hints: [
    "Start with best bid and best ask on each book, then spread ÷ mid × 100.",
    "Multiply each level's price by its quantity before adding, so both books are measured in the same money.",
    "A full answer gives both spreads in percent, both top-ten quote values, an average fill for the stated size on each book, and says funding is not on the book and neither price is 'the' ANT price.",
  ],
};

// ---------------------------------------------------------------- indexes.index-nav

export const indexNavObjective =
  "Read an index fund's NAV per share, relate it to its weighted holdings, and judge how concentrated a themed index is.";

export const indexNavConcept: ConceptSection = {
  heading: "Index NAV and themed indexes",
  body: `An **index fund** turns an index into something you can hold. It owns the index's members in their weights, and divides the total value by the number of shares. That figure is the **net asset value (NAV) per share**.

NAV moves for one reason: the value of the holdings changes. If a fund holds four tokens at weights 40%, 30%, 20% and 10%, and the 40% token rises 10% while the rest are flat, NAV rises about 4%. Weights drift as prices move, so funds **rebalance** on a schedule back to the target weights.

Two things to check on any index fund:

- **The theme.** A broad index picks members by size across a whole market. A **themed index** picks members that share one story, such as one ecosystem or one sector. Themed members tend to rise and fall together, so a themed index spreads single-token risk but not the risk of the theme falling out of favour.
- **The weights behind the NAV.** If the top two members hold 60%, NAV mostly follows those two.

NAV is also stamped with a time. Compare it with the traded price of the fund's share only when both carry similar times.

Plain description: "NAV X per share as of <time>; themed on Y; top-2 weight Z%."`,
  example:
    "Suppose a themed index fund has NAV 10.00 per share and holds five tokens from one ecosystem at 35%, 25%, 20%, 12% and 8%. If the whole ecosystem falls 20% in a week, NAV falls about 20% too: holding five names did not help, because they share one theme. If only the 8% member fell 50%, NAV would fall about 4%.",
};

export const indexNavCheck: KnowledgeCheck = {
  id: "kc.indexes.index-nav.1",
  skillId: "indexes.index-nav",
  prompt:
    "A themed index fund holds five tokens from one ecosystem at weights 35, 25, 20, 12 and 8 percent. Its NAV per share is 10.00. Which statement is most accurate?",
  options: [
    {
      id: "a",
      text: "It is a broad index, so a fall in that ecosystem would barely move NAV.",
      correct: false,
      explanation:
        "All five members share one theme, so an ecosystem-wide fall moves nearly all of the NAV.",
      misconceptionId: "themed-index-is-broad",
    },
    {
      id: "b",
      text: "NAV mostly follows the top two members (60%), and a theme-wide fall would hit almost all of it.",
      correct: true,
      explanation:
        "Weights set what drives NAV, and a shared theme means the members tend to move together.",
    },
    {
      id: "c",
      text: "Each member moves NAV by the same amount, because there are five of them.",
      correct: false,
      explanation:
        "Weights are not equal. A 10% move in the 35% member changes NAV by about 3.5%; the same move in the 8% member changes it by 0.8%.",
      misconceptionId: "index-is-equal-weight",
    },
    {
      id: "d",
      text: "A NAV of 10.00 means the fund is cheap.",
      correct: false,
      explanation:
        "NAV per share depends on how many shares exist. On its own it says nothing about value or cheapness.",
      misconceptionId: "price-equals-value",
    },
  ],
};
