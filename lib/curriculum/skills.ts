import type { Skill } from "@/lib/types/curriculum";

/**
 * The leaf skills of "Crypto Market Analyst Foundations", grouped by module.
 * Ids are frozen in docs/CONTRACTS.md. Difficulty rises within each module.
 */
export const skills: Skill[] = [
  // ---------------- markets ----------------
  {
    id: "markets.price",
    name: "Reading price",
    description:
      "Read a quoted price and a 24-hour percentage change, and say what they do and do not tell you.",
    category: "markets",
    difficulty: 1,
    parentSkillId: "markets",
    prerequisiteSkillIds: [],
  },
  {
    id: "markets.volume",
    name: "Reading volume",
    description:
      "Interpret 24-hour traded volume as activity, not direction, and compare it with its own recent history.",
    category: "markets",
    difficulty: 1,
    parentSkillId: "markets",
    prerequisiteSkillIds: ["markets.price"],
  },
  {
    id: "markets.market-cap",
    name: "Market capitalisation",
    description:
      "Compute market capitalisation from price and circulating supply, and avoid treating it as money invested.",
    category: "markets",
    difficulty: 1,
    parentSkillId: "markets",
    prerequisiteSkillIds: ["markets.price"],
  },
  {
    id: "markets.liquidity",
    name: "Liquidity basics",
    description:
      "Describe liquidity as the cost of trading a given size now, and separate it from volume.",
    category: "markets",
    difficulty: 2,
    parentSkillId: "markets",
    prerequisiteSkillIds: ["markets.volume"],
  },
  {
    id: "markets.volatility",
    name: "Volatility",
    description:
      "Describe volatility as the size of price moves over time, and judge a move against normal range rather than calling it good or bad.",
    category: "markets",
    difficulty: 2,
    parentSkillId: "markets",
    prerequisiteSkillIds: ["markets.price"],
  },
  {
    id: "markets.structure",
    name: "Market structure",
    description:
      "Explain where crypto prices come from: many venues, spot and derivatives, quote currencies, and why quotes differ.",
    category: "markets",
    difficulty: 2,
    parentSkillId: "markets",
    prerequisiteSkillIds: ["markets.liquidity"],
  },

  {
    id: "markets.trading-hours",
    name: "Trading hours and stale prices",
    description:
      "Tell a 24/7 crypto quote from a market-hours quote (tokenised ETFs, pre-market, closed), and say when a displayed price is stale.",
    category: "markets",
    difficulty: 2,
    parentSkillId: "markets",
    prerequisiteSkillIds: ["markets.structure"],
  },

  // ---------------- news ----------------
  {
    id: "news.facts-vs-opinions",
    name: "Facts versus opinions",
    description:
      "Split a news item into verifiable facts, attributed claims and the writer's opinion.",
    category: "news",
    difficulty: 2,
    parentSkillId: "news",
    prerequisiteSkillIds: ["markets.price"],
  },
  {
    id: "news.catalysts",
    name: "Catalysts",
    description:
      "Identify scheduled and unscheduled events that could plausibly move a market, and say what would have to be true for them to matter.",
    category: "news",
    difficulty: 2,
    parentSkillId: "news",
    prerequisiteSkillIds: ["news.facts-vs-opinions"],
  },
  {
    id: "news.narratives",
    name: "Narratives",
    description:
      "Recognise a market narrative as a story that organises facts, and test whether the facts actually support it.",
    category: "news",
    difficulty: 2,
    parentSkillId: "news",
    prerequisiteSkillIds: ["news.facts-vs-opinions"],
  },
  {
    id: "news.uncertainty",
    name: "Source uncertainty",
    description:
      "Weigh a claim by its sourcing: primary document, named official, anonymous source or repost, and treat single sources as unconfirmed.",
    category: "news",
    difficulty: 3,
    parentSkillId: "news",
    prerequisiteSkillIds: ["news.facts-vs-opinions"],
  },
  {
    id: "news.causation",
    name: "Correlation and causation",
    description:
      "Resist 'price moved because of this headline' unless timing, size and mechanism all fit, and name alternative explanations.",
    category: "news",
    difficulty: 3,
    parentSkillId: "news",
    prerequisiteSkillIds: ["news.catalysts", "markets.volatility"],
  },

  // ---------------- etf ----------------
  {
    id: "etf.flows",
    name: "Reading ETF flows",
    description:
      "Read daily net inflow and cumulative net inflow for spot crypto ETFs and state what each number measures.",
    category: "etf",
    difficulty: 2,
    parentSkillId: "etf",
    prerequisiteSkillIds: ["markets.market-cap"],
  },
  {
    id: "etf.aum",
    name: "Total net assets",
    description:
      "Separate changes in total net assets caused by price from changes caused by flows.",
    category: "etf",
    difficulty: 2,
    parentSkillId: "etf",
    prerequisiteSkillIds: ["etf.flows"],
  },
  {
    id: "etf.flow-limits",
    name: "Limits of flow data",
    description:
      "Explain why flows are settled a day late, why they are a small share of total trading, and why they cannot be read as price impact.",
    category: "etf",
    difficulty: 3,
    parentSkillId: "etf",
    prerequisiteSkillIds: ["etf.aum", "markets.volume"],
  },
  {
    id: "etf.change-over-time",
    name: "Flows over time",
    description:
      "Compare a flow against its own recent history and distinguish one day from a run of days.",
    category: "etf",
    difficulty: 3,
    parentSkillId: "etf",
    prerequisiteSkillIds: ["etf.flow-limits"],
  },

  // ---------------- indexes ----------------
  {
    id: "indexes.constituents",
    name: "Index constituents",
    description:
      "Read an index's member list and explain that membership follows published rules and can change.",
    category: "indexes",
    difficulty: 2,
    parentSkillId: "indexes",
    prerequisiteSkillIds: ["markets.market-cap"],
  },
  {
    id: "indexes.weighting",
    name: "Weighting",
    description:
      "Work out what a weight means for an index's return, and compare capitalisation-weighted with equal-weighted designs.",
    category: "indexes",
    difficulty: 3,
    parentSkillId: "indexes",
    prerequisiteSkillIds: ["indexes.constituents"],
  },
  {
    id: "indexes.concentration",
    name: "Concentration",
    description:
      "Measure how much of an index sits in its top members and explain what that does to risk.",
    category: "indexes",
    difficulty: 3,
    parentSkillId: "indexes",
    prerequisiteSkillIds: ["indexes.weighting"],
  },
  {
    id: "indexes.diversification",
    name: "Diversification",
    description:
      "Judge whether an index actually spreads risk, given how its members move together.",
    category: "indexes",
    difficulty: 3,
    parentSkillId: "indexes",
    prerequisiteSkillIds: ["indexes.concentration"],
  },
  {
    id: "indexes.performance",
    name: "Index performance",
    description:
      "Decompose an index return into member contributions and avoid assuming every member moved the same way.",
    category: "indexes",
    difficulty: 3,
    parentSkillId: "indexes",
    prerequisiteSkillIds: ["indexes.weighting"],
  },

  {
    id: "indexes.index-nav",
    name: "Index NAV and themed indexes",
    description:
      "Read an index fund's NAV per share, relate it to the weights behind it, and judge how concentrated a themed index is.",
    category: "indexes",
    difficulty: 3,
    parentSkillId: "indexes",
    prerequisiteSkillIds: ["indexes.concentration"],
  },

  // ---------------- orderbook ----------------
  {
    id: "orderbook.bid-ask",
    name: "Bids and asks",
    description:
      "Read best bid, best ask and mid price from a limit order book and say who pays which price.",
    category: "orderbook",
    difficulty: 3,
    parentSkillId: "orderbook",
    prerequisiteSkillIds: ["markets.liquidity"],
  },
  {
    id: "orderbook.spread",
    name: "The spread",
    description:
      "Compute the spread in ticks and as a percentage, and explain it as a cost of immediacy rather than a fee.",
    category: "orderbook",
    difficulty: 3,
    parentSkillId: "orderbook",
    prerequisiteSkillIds: ["orderbook.bid-ask"],
  },
  {
    id: "orderbook.depth",
    name: "Depth",
    description:
      "Read quantity per level and cumulative depth, and estimate the price a given order size would reach.",
    category: "orderbook",
    difficulty: 3,
    parentSkillId: "orderbook",
    prerequisiteSkillIds: ["orderbook.spread"],
  },
  {
    id: "orderbook.liquidity",
    name: "Order book liquidity",
    description:
      "Judge liquidity from spread and depth together, and explain why a bigger book is not always a more liquid one.",
    category: "orderbook",
    difficulty: 4,
    parentSkillId: "orderbook",
    prerequisiteSkillIds: ["orderbook.depth"],
  },
  {
    id: "orderbook.imbalance",
    name: "Imbalance",
    description:
      "Compute bid share of depth and explain why an imbalance is a snapshot of resting orders, not a forecast.",
    category: "orderbook",
    difficulty: 4,
    parentSkillId: "orderbook",
    prerequisiteSkillIds: ["orderbook.depth"],
  },
  {
    id: "orderbook.tick-lot",
    name: "Tick size and lot size",
    description:
      "Apply tick size and lot size rules to prices and quantities, and separate them from minimum order size and minimum notional.",
    category: "orderbook",
    difficulty: 4,
    parentSkillId: "orderbook",
    prerequisiteSkillIds: ["orderbook.spread"],
  },
  {
    id: "orderbook.price-time-priority",
    name: "Price-time priority",
    description:
      "Work out which resting orders fill first and in what quantity under price-time priority.",
    category: "orderbook",
    difficulty: 4,
    parentSkillId: "orderbook",
    prerequisiteSkillIds: ["orderbook.tick-lot", "orderbook.depth"],
  },

  {
    id: "orderbook.spot-vs-perps",
    name: "Spot versus perpetual books",
    description:
      "Compare the spot book and the perpetual book for the same asset: spread, depth in quote value, and why a tighter book is not the better price for every size.",
    category: "orderbook",
    difficulty: 4,
    parentSkillId: "orderbook",
    prerequisiteSkillIds: ["orderbook.liquidity", "orderbook.spread"],
  },

  // ---------------- reasoning ----------------
  {
    id: "reasoning.thesis",
    name: "Writing a thesis",
    description:
      "State a one-sentence claim about a market that is specific, bounded in time and testable.",
    category: "reasoning",
    difficulty: 4,
    parentSkillId: "reasoning",
    prerequisiteSkillIds: ["news.causation", "etf.change-over-time"],
  },
  {
    id: "reasoning.evidence-selection",
    name: "Selecting evidence",
    description:
      "Choose the few pieces of evidence that bear on a question and leave out the rest, with reasons.",
    category: "reasoning",
    difficulty: 4,
    parentSkillId: "reasoning",
    prerequisiteSkillIds: ["reasoning.thesis"],
  },
  {
    id: "reasoning.observation-vs-interpretation",
    name: "Observation versus interpretation",
    description:
      "Label each sentence of an analysis as something seen in the data or something inferred from it.",
    category: "reasoning",
    difficulty: 4,
    parentSkillId: "reasoning",
    prerequisiteSkillIds: ["reasoning.evidence-selection"],
  },
  {
    id: "reasoning.missing-info",
    name: "Missing information",
    description:
      "Name what the evidence pack does not contain and say how it limits each conclusion.",
    category: "reasoning",
    difficulty: 5,
    parentSkillId: "reasoning",
    prerequisiteSkillIds: ["reasoning.observation-vs-interpretation"],
  },
  {
    id: "reasoning.uncertainty",
    name: "Expressing uncertainty",
    description:
      "Attach a calibrated confidence to each claim and keep confidence tied to evidence, not tone.",
    category: "reasoning",
    difficulty: 5,
    parentSkillId: "reasoning",
    prerequisiteSkillIds: ["reasoning.missing-info", "news.uncertainty"],
  },
  {
    id: "reasoning.invalidation",
    name: "Invalidation",
    description:
      "Write down, in advance, the observation that would show a thesis is wrong.",
    category: "reasoning",
    difficulty: 5,
    parentSkillId: "reasoning",
    prerequisiteSkillIds: ["reasoning.uncertainty"],
  },

  // ---------------- wealth ----------------
  {
    id: "wealth.fund-types",
    name: "Fund types",
    description:
      "Tell apart a tokenised ETF on an order book, an escrow fund vault, a bridged yield vault and an index fund, and say what drives each one's price.",
    category: "wealth",
    difficulty: 3,
    parentSkillId: "wealth",
    prerequisiteSkillIds: ["etf.aum", "indexes.weighting"],
  },
  {
    id: "wealth.nav-vs-price",
    name: "NAV versus traded price",
    description:
      "Separate a fund's net asset value per share from the price it trades at, and explain premiums, discounts and timing gaps.",
    category: "wealth",
    difficulty: 3,
    parentSkillId: "wealth",
    prerequisiteSkillIds: ["wealth.fund-types"],
  },
  {
    id: "wealth.fees",
    name: "Fees and fee drag",
    description:
      "Work out how management and performance fees compound into a drag on returns, and treat an unknown fee as unknown, not zero.",
    category: "wealth",
    difficulty: 3,
    parentSkillId: "wealth",
    prerequisiteSkillIds: ["wealth.fund-types"],
  },
  {
    id: "wealth.yield-apy",
    name: "Yield, APY and ROI",
    description:
      "Separate a backward-looking return (ROI) from an annualised yield (APY), explain why a 7-day APY can mislead, and name where vault yield comes from and its risks.",
    category: "wealth",
    difficulty: 4,
    parentSkillId: "wealth",
    prerequisiteSkillIds: ["wealth.fees"],
  },
  {
    id: "wealth.dca",
    name: "Regular investing (DCA) simulations",
    description:
      "Read a weekly equal-contribution simulation, compare it with a lump sum, and explain why past simulated returns do not predict future ones.",
    category: "wealth",
    difficulty: 4,
    parentSkillId: "wealth",
    prerequisiteSkillIds: ["wealth.yield-apy", "etf.change-over-time"],
  },
  {
    id: "wealth.diversification",
    name: "Diversifying across funds",
    description:
      "Measure a portfolio's concentration (largest weight, HHI, effective holdings) and explain why several correlated funds are not diversification.",
    category: "wealth",
    difficulty: 4,
    parentSkillId: "wealth",
    prerequisiteSkillIds: ["wealth.fees", "indexes.diversification"],
  },
  {
    id: "wealth.incentives",
    name: "Trading incentives and reward feeds",
    description:
      "Explain how points multipliers and volume-based reward boxes inflate trading volume, and why a feed of big wins is a biased sample.",
    category: "wealth",
    difficulty: 4,
    parentSkillId: "wealth",
    prerequisiteSkillIds: ["wealth.fund-types", "markets.volume"],
  },
];

export const SKILL_IDS = skills.map((s) => s.id);
