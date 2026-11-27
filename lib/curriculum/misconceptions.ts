import type { Misconception } from "@/lib/types/curriculum";

/**
 * Misconceptions the grader and coach watch for. The first 24 ids are frozen in
 * docs/CONTRACTS.md; the rest follow the same style. `cues` are lowercase phrases
 * a deterministic grader can look for in free text. `critical` ones block mastery
 * until the learner shows they have resolved them.
 */
export const misconceptions: Misconception[] = [
  // ---------------- markets ----------------
  {
    id: "price-equals-value",
    skillId: "markets.price",
    label: "Price equals value",
    description:
      "Treats the last traded price as a statement of what an asset is worth, rather than the price at which the most recent buyer and seller agreed.",
    cues: [
      "the price shows it is worth",
      "price proves its value",
      "worth exactly what it trades at",
      "the market says it is worth",
      "price is the true value",
      "undervalued because the price fell",
    ],
    correction:
      "A price is a record of one agreement between a buyer and a seller. It tells you what a trade cost, not what the asset is worth. Keep 'price' and 'value' as separate words in your analysis.",
    critical: true,
  },
  {
    id: "percent-change-is-trend",
    skillId: "markets.price",
    label: "A 24-hour change is a trend",
    description:
      "Reads a single 24-hour percentage change as evidence of a direction that will continue.",
    cues: [
      "up 3% so it is trending",
      "the trend is up because today",
      "24h change shows momentum",
      "it is going up",
      "keeps rising",
    ],
    correction:
      "A 24-hour change compares two points in time. It says nothing about the path between them or what comes next. A trend needs a longer window and a stated definition.",
    critical: false,
  },
  {
    id: "volume-implies-direction",
    skillId: "markets.volume",
    label: "Volume shows buying or selling",
    description:
      "Reads high volume as evidence that buyers (or sellers) dominated, when every trade has one buyer and one seller.",
    cues: [
      "volume shows buyers",
      "high volume means buying",
      "heavy selling volume",
      "buying volume",
      "volume confirms the move",
      "lots of people are buying",
    ],
    correction:
      "Every trade has exactly one buyer and one seller, so volume is always balanced. Volume measures how much changed hands, not which side wanted it more. Direction needs other evidence.",
    critical: false,
  },
  {
    id: "market-cap-is-money-invested",
    skillId: "markets.market-cap",
    label: "Market cap is money invested",
    description:
      "Treats market capitalisation as cash that has flowed in or could flow out, rather than price multiplied by circulating supply.",
    cues: [
      "money invested in",
      "billion has flowed into",
      "money left the market",
      "wiped out billions of dollars",
      "market cap is the money",
      "cash in the market",
    ],
    correction:
      "Market cap is the last price multiplied by circulating supply. If one coin trades 1% higher, the whole cap moves 1% with no new money arriving. It is a label for size, not a count of cash.",
    critical: false,
  },
  {
    id: "liquidity-equals-volume",
    skillId: "markets.liquidity",
    label: "Liquidity is the same as volume",
    description:
      "Uses 24-hour volume as a measure of how cheaply a trade can be done right now.",
    cues: [
      "high volume so it is liquid",
      "liquid because the volume",
      "volume means liquidity",
      "liquidity is high because",
      "plenty of volume to trade",
    ],
    correction:
      "Volume is what traded over a past window. Liquidity is what it costs to trade a given size now, shown by spread and depth. A market can have high past volume and a thin book at this moment.",
    critical: false,
  },
  {
    id: "volatility-is-bad",
    skillId: "markets.volatility",
    label: "Volatility is bad",
    description:
      "Treats any large move as a problem, and a calm market as healthy, rather than measuring volatility against its own normal range.",
    cues: [
      "volatility is bad",
      "dangerous volatility",
      "too volatile to",
      "unstable market",
      "risky because it moved",
      "healthy because it is calm",
    ],
    correction:
      "Volatility is a measurement of how much price moves, with no sign attached. Whether it matters depends on the question you are asking. Compare today's move with the asset's usual range before you call it unusual.",
    critical: false,
  },

  // ---------------- news ----------------
  {
    id: "headline-is-fact",
    skillId: "news.facts-vs-opinions",
    label: "The headline is the fact",
    description:
      "Accepts a headline or summary as established fact without checking what the body actually says, who said it, and whether it is confirmed.",
    cues: [
      "the headline says",
      "according to the headline",
      "it was reported that so",
      "news confirms",
      "the article proves",
      "as the news says",
    ],
    correction:
      "A headline is a compression written to get attention. Open the item, find the claim, find who made it, and check whether it is a document, a quote or a rumour. Treat it as a claim until you can see the source.",
    critical: true,
  },
  {
    id: "catalyst-guarantees-move",
    skillId: "news.catalysts",
    label: "A catalyst guarantees a move",
    description:
      "Assumes a scheduled or announced event must move price, ignoring that expectations may already be reflected and outcomes vary.",
    cues: [
      "will definitely move",
      "guaranteed to pump",
      "has to go up when",
      "the event will cause",
      "when the news drops it will",
    ],
    correction:
      "A catalyst is an event that could change what people expect. If the outcome matches what was already expected, there may be no move at all. State the expected outcome and what a surprise would look like.",
    critical: false,
  },
  {
    id: "narrative-is-evidence",
    skillId: "news.narratives",
    label: "The narrative is the evidence",
    description:
      "Uses a popular story (for example 'institutions are coming') as if it were data, instead of checking which facts support it.",
    cues: [
      "everyone knows that",
      "the narrative is",
      "institutions are coming",
      "the story is clear",
      "it is obvious that",
      "this is the season for",
    ],
    correction:
      "A narrative is a story that connects facts. It can be useful, but it is not itself a fact. Write down the two or three observations the story relies on and check each one separately.",
    critical: false,
  },
  {
    id: "single-source-certainty",
    skillId: "news.uncertainty",
    label: "One source is enough",
    description:
      "Treats a claim from a single, unconfirmed or anonymous source as settled.",
    cues: [
      "a source said so",
      "reportedly means",
      "one report confirms",
      "someone on x said",
      "it has been confirmed by a post",
      "sources say so it is true",
    ],
    correction:
      "One source is a lead, not a fact. Look for a primary document, a named official, or two independent outlets. Until then, say 'reported, unconfirmed' and keep your confidence low.",
    critical: false,
  },
  {
    id: "correlation-is-causation",
    skillId: "news.causation",
    label: "Correlation is causation",
    description:
      "Concludes that because a headline and a price move happened near each other, the headline caused the move.",
    cues: [
      "because of the news",
      "the headline caused",
      "price rose on the news",
      "fell due to the announcement",
      "the move was driven by",
      "reacted to the report",
    ],
    correction:
      "Two things happening close together is not proof that one caused the other. Check timing (which came first, to the minute), size (is the move unusual?), and mechanism (how would this news change who trades?). Then list other things that could explain the move.",
    critical: true,
  },

  // ---------------- etf ----------------
  {
    id: "cumulative-inflow-is-profit",
    skillId: "etf.flows",
    label: "Cumulative inflow is profit",
    description:
      "Reads cumulative net inflow as investor gains or as the fund's value, rather than as the running sum of money that came in minus money that went out.",
    cues: [
      "investors have made",
      "cumulative inflow shows gains",
      "profit of",
      "total value is the cumulative inflow",
      "earned since launch",
    ],
    correction:
      "Cumulative net inflow adds up daily net inflows since launch. It ignores price. Total net assets is what the fund holds today. The difference between them is mostly price change, not profit for any particular investor.",
    critical: false,
  },
  {
    id: "flows-equal-price-impact",
    skillId: "etf.flow-limits",
    label: "Flows equal price impact",
    description:
      "Assumes that a net inflow of X dollars pushed the price up by a corresponding amount, or that outflows must mean price fell.",
    cues: [
      "inflows pushed the price",
      "outflows caused the drop",
      "flows drove the price",
      "buying pressure from etf",
      "the inflow explains the rally",
      "selling pressure from outflows",
    ],
    correction:
      "A day's ETF net flow is usually a small fraction of total spot and derivative trading, it is reported a day late, and the related purchases are spread across the session. Flows tell you about ETF demand. They do not tell you how price formed.",
    critical: true,
  },
  {
    id: "aum-change-equals-flows",
    skillId: "etf.aum",
    label: "A change in total net assets is a flow",
    description:
      "Reads a rise or fall in total net assets as investors adding or withdrawing money, ignoring the effect of price on holdings.",
    cues: [
      "aum rose so money came in",
      "net assets fell so investors sold",
      "assets dropped because of outflows",
      "aum went up because of inflows",
      "total net assets shows the flow",
    ],
    correction:
      "Total net assets change for two reasons: the price of what the fund holds moved, and shares were created or redeemed. Only the second is a flow. Compare the change in net assets with the reported net inflow to separate them.",
    critical: false,
  },
  {
    id: "one-day-flow-is-trend",
    skillId: "etf.change-over-time",
    label: "One day of flow is a trend",
    description:
      "Treats a single day's inflow or outflow as the start of a sustained pattern.",
    cues: [
      "outflows have begun",
      "the tide has turned",
      "inflows are back",
      "today's outflow shows investors are leaving",
      "a new trend of",
      "one day of inflows means",
    ],
    correction:
      "Flows are noisy day to day. Compare a day against the last 10 to 20 trading days, note the sign of the recent run, and only call something a trend if it persists and you say over what window.",
    critical: false,
  },

  // ---------------- indexes ----------------
  {
    id: "index-members-are-fixed",
    skillId: "indexes.constituents",
    label: "Index members never change",
    description:
      "Assumes an index's constituent list is permanent, rather than set by rules and reviewed on a schedule.",
    cues: [
      "always in the index",
      "permanent member",
      "the index is fixed",
      "constituents never change",
      "will stay in the index",
    ],
    correction:
      "Index membership follows published rules (for example market cap and liquidity thresholds) and is reviewed on a schedule. Assets enter and leave. Check the methodology and the last rebalance date.",
    critical: false,
  },
  {
    id: "index-is-equal-weight",
    skillId: "indexes.weighting",
    label: "Every member counts the same",
    description:
      "Assumes each constituent contributes equally to an index's return, when most indexes are weighted by market capitalisation.",
    cues: [
      "each coin counts equally",
      "same weight",
      "all members contribute the same",
      "the average of the members",
      "equally weighted so",
      "one of seven members",
    ],
    correction:
      "Unless the methodology says equal weight, members have different weights, often set by market capitalisation. A member with a 40% weight moves the index four times as much as one with a 10% weight for the same percentage move.",
    critical: false,
  },
  {
    id: "concentration-is-diversification",
    skillId: "indexes.concentration",
    label: "Many names means diversified",
    description:
      "Counts the number of constituents as a measure of diversification, ignoring that a few names may hold most of the weight.",
    cues: [
      "diversified across 7",
      "well diversified because it has",
      "spread across many",
      "lots of constituents so",
      "diversified basket",
    ],
    correction:
      "Diversification depends on weights, not the count of names. If the top two members hold 70% of the index, the other members barely matter. Report the top-N weight share before you call anything diversified.",
    critical: false,
  },
  {
    id: "diversification-removes-risk",
    skillId: "indexes.diversification",
    label: "Diversification removes risk",
    description:
      "Believes holding several crypto assets removes most risk, ignoring that crypto assets tend to move together.",
    cues: [
      "diversified so it is safe",
      "no risk because it is spread",
      "spreading removes the risk",
      "protected by diversification",
      "cannot fall much because it is diversified",
    ],
    correction:
      "Diversification only reduces risk when the members do not all move together. Crypto assets often fall together in a stress event. Diversification across them reduces single-asset risk, not market-wide risk.",
    critical: false,
  },
  {
    id: "index-return-is-every-asset",
    skillId: "indexes.performance",
    label: "The index moved, so every member moved",
    description:
      "Reads an index's return as the return of each constituent, missing that a few heavy members can drive the whole figure.",
    cues: [
      "every coin in the index went up",
      "all members rose",
      "the whole sector moved",
      "all of them gained",
      "the index is up so each",
    ],
    correction:
      "An index return is a weighted sum. One large member rising can lift the index while most members fall. Look at member contributions (weight multiplied by return) before you describe the sector.",
    critical: false,
  },

  // ---------------- orderbook ----------------
  {
    id: "mid-price-is-tradeable",
    skillId: "orderbook.bid-ask",
    label: "You can trade at the mid price",
    description:
      "Treats the mid price as a price you can buy or sell at, when it is only the average of the best bid and best ask.",
    cues: [
      "buy at the mid",
      "trade at mid price",
      "the mid is the price you get",
      "sell at the midpoint",
      "the price is the mid",
    ],
    correction:
      "The mid price is halfway between the best bid and best ask. Nobody is offering to trade there. A market buy pays the ask; a market sell receives the bid. The mid is a reference, not a quote.",
    critical: false,
  },
  {
    id: "spread-is-fee",
    skillId: "orderbook.spread",
    label: "The spread is a fee",
    description:
      "Confuses the bid-ask spread with the exchange's trading fee, or thinks one replaces the other.",
    cues: [
      "spread is the fee",
      "the exchange charges the spread",
      "spread is what the exchange takes",
      "fee is the spread",
      "no fee because the spread",
      "pay the spread to the exchange",
    ],
    correction:
      "The spread is the gap between the best bid and best ask. A taker crosses it and the counterparty at the other side receives it. The exchange fee (maker or taker rate) is a separate charge on top. Count both when you estimate cost.",
    critical: true,
  },
  {
    id: "depth-is-static",
    skillId: "orderbook.depth",
    label: "Depth stays where it is",
    description:
      "Assumes the resting orders in a snapshot will still be there when an order arrives.",
    cues: [
      "the depth will absorb",
      "there is enough depth to",
      "the orders will still be there",
      "the book guarantees",
      "depth is fixed",
      "can rely on the depth",
    ],
    correction:
      "A book is a snapshot of orders that can be cancelled or changed in milliseconds. Depth you see is depth that existed at that block time. Estimate with it, but say that it may move before a trade arrives.",
    critical: false,
  },
  {
    id: "bigger-book-always-more-liquid",
    skillId: "orderbook.liquidity",
    label: "A bigger book is always more liquid",
    description:
      "Judges liquidity by total quantity on the book, ignoring how far from the mid that quantity sits.",
    cues: [
      "more total depth so more liquid",
      "bigger book is more liquid",
      "more orders means better liquidity",
      "larger book so cheaper to trade",
      "liquidity because of total size",
    ],
    correction:
      "Liquidity is about the cost to trade a given size now. Quantity far from the mid does not help a small order. Compare spread and depth within a fixed distance (for example 0.5%) of the mid, not total book size.",
    critical: false,
  },
  {
    id: "imbalance-predicts-price",
    skillId: "orderbook.imbalance",
    label: "Imbalance predicts price",
    description:
      "Reads more bid quantity than ask quantity as a signal that price will rise (or the reverse).",
    cues: [
      "more bids so price will rise",
      "imbalance shows price will",
      "buy wall means support",
      "sell wall means it will fall",
      "bids outweigh asks so",
      "the book is bullish",
    ],
    correction:
      "Bid share of depth is a snapshot of resting orders. Resting orders can be cancelled, can be placed to mislead, and only matter if someone trades into them. An imbalance describes the book now. It does not forecast the next trade.",
    critical: true,
  },
  {
    id: "tick-size-is-min-order",
    skillId: "orderbook.tick-lot",
    label: "Tick size is the minimum order",
    description:
      "Confuses tick size (the price grid) with lot size (the quantity grid) or with minimum order quantity and minimum notional.",
    cues: [
      "tick size is the minimum order",
      "minimum trade is one tick",
      "tick size of quantity",
      "smallest order is the tick",
      "lot size for price",
    ],
    correction:
      "Tick size is the smallest allowed price step. Lot size (step size) is the smallest allowed quantity step. Minimum quantity and minimum notional are separate limits on order size. All four apply at once.",
    critical: false,
  },
  {
    id: "earlier-order-loses-to-bigger",
    skillId: "orderbook.price-time-priority",
    label: "Bigger orders fill first",
    description:
      "Believes a larger resting order at the same price fills before a smaller one that arrived earlier.",
    cues: [
      "bigger order fills first",
      "larger size gets priority",
      "size priority",
      "the big order jumps the queue",
      "fills the biggest first",
    ],
    correction:
      "Matching is price first, then time. At the same price, the order that arrived first fills first, whatever its size. Size only matters for how much of the incoming order each resting order absorbs.",
    critical: false,
  },

  // ---------------- reasoning ----------------
  {
    id: "more-evidence-is-stronger",
    skillId: "reasoning.evidence-selection",
    label: "More evidence is stronger evidence",
    description:
      "Cites every available data point in support of a claim, including items that have no bearing on it, as if quantity added strength.",
    cues: [
      "all the evidence points to",
      "everything supports",
      "every indicator agrees",
      "the data all shows",
      "all signs point",
    ],
    correction:
      "Evidence is strong when it bears directly on the claim and would look different if the claim were false. Listing unrelated data makes an argument longer, not stronger. Pick the two or three items that matter and say why.",
    critical: false,
  },
  {
    id: "observation-is-interpretation",
    skillId: "reasoning.observation-vs-interpretation",
    label: "Mixing what you saw with what you think",
    description:
      "States an inference ('buyers stepped in') in the same voice as an observation ('price rose 2%'), so the reader cannot tell which is which.",
    cues: [
      "buyers stepped in",
      "sellers are exhausted",
      "the market is nervous",
      "smart money is",
      "investors are worried",
      "whales are accumulating",
    ],
    correction:
      "Write observations as what the data shows ('24h volume was 40% above its 30-day average'). Write interpretations as yours ('I read this as...'). Keep the two in separate sentences so a reader can check each.",
    critical: false,
  },
  {
    id: "missing-data-is-neutral",
    skillId: "reasoning.missing-info",
    label: "Missing data does not matter",
    description:
      "Draws a conclusion without noting that the evidence pack lacks something the conclusion depends on.",
    cues: [
      "there is nothing else to consider",
      "the data is complete",
      "no other factors",
      "this is all we need",
      "nothing is missing",
    ],
    correction:
      "Every evidence pack is partial. Before concluding, list what you would want but do not have (for example derivatives data, intraday timing, the other venues), and say which conclusions that gap weakens.",
    critical: false,
  },
  {
    id: "confidence-is-evidence",
    skillId: "reasoning.uncertainty",
    label: "Confidence is evidence",
    description:
      "Uses strong language ('clearly', 'definitely', 'without doubt') as a substitute for evidence, or raises confidence because others sound sure.",
    cues: [
      "clearly",
      "definitely",
      "without a doubt",
      "it is certain that",
      "obviously",
      "no question that",
      "100% sure",
    ],
    correction:
      "Confidence should track evidence, not tone. State a rough probability or a confidence level, say what it rests on, and what would raise or lower it. Strong words add nothing a reader can check.",
    critical: true,
  },
  {
    id: "thesis-without-invalidation",
    skillId: "reasoning.invalidation",
    label: "A thesis with no way to be wrong",
    description:
      "States a claim without saying what observation would show it to be wrong, so any outcome can be read as confirming it.",
    cues: [
      "either way it confirms",
      "cannot be wrong",
      "whatever happens",
      "if it falls that also proves",
      "no scenario where",
      "will be right eventually",
    ],
    correction:
      "A useful thesis names its own failure condition in advance: a specific observation, with a number and a time window, that would make you drop it. If nothing could show it wrong, it is not an analysis.",
    critical: true,
  },

  // ---------------- wave 2: trading hours, index NAV, spot vs perps, wealth ----------------
  {
    id: "stale-price-is-current",
    skillId: "markets.trading-hours",
    label: "A displayed price is always current",
    description:
      "Treats every price on a screen as a live, tradeable quote, even when the underlying market is closed, in pre-market, or the row is flagged stale.",
    cues: [
      "the price right now is",
      "it is trading at that price now",
      "the quote is live",
      "the shown price is live",
      "prices update all the time",
      "it trades around the clock",
    ],
    correction:
      "Check the market status and the as-of time before you read a price. A tokenised ETF follows its home market's hours; outside them the shown price may be a last close, a pre-market print or a provider estimate. Say 'last price as of <time>, market closed' rather than 'the price is'.",
    critical: false,
  },
  {
    id: "themed-index-is-broad",
    skillId: "indexes.index-nav",
    label: "A themed index is a broad market index",
    description:
      "Assumes an index fund built around one theme or ecosystem spreads risk like a broad market index, because it holds several tokens.",
    cues: [
      "it covers the whole market",
      "an index is always diversified",
      "index means low risk",
      "it holds many tokens so it is safe",
      "broad exposure because it is an index",
    ],
    correction:
      "An index is only as broad as its selection rule. A themed index holds assets that share one story and tend to move together, and its weights may put most of the NAV in a few names. Check the theme, the top weights and how the members co-move.",
    critical: false,
  },
  {
    id: "perps-price-is-spot-price",
    skillId: "orderbook.spot-vs-perps",
    label: "The perpetual price is the spot price",
    description:
      "Treats the price on a perpetual futures book as the same thing as the spot price for the asset, so a gap between them looks like an error or a free profit.",
    cues: [
      "perps price is the spot price",
      "perp and spot are the same",
      "the perp price is the real price",
      "free money between spot and perp",
      "the two prices must be equal",
    ],
    correction:
      "A perpetual is a separate contract on a separate book. Its price is kept near spot by a funding mechanism, but the two books have different participants, depth and spreads, so small gaps are normal. Neither book alone is 'the' price.",
    critical: false,
  },
  {
    id: "tighter-spread-best-for-any-size",
    skillId: "orderbook.spot-vs-perps",
    label: "A tighter spread means the better price for any order",
    description:
      "Picks the book with the tighter top-of-book spread as cheaper for every order size, ignoring how much quantity sits at each level.",
    cues: [
      "tighter spread so it is always cheaper",
      "the tighter book is better for any size",
      "best price for every order",
      "spread is all that matters",
      "always get a better price on the tighter book",
    ],
    correction:
      "The spread only prices the first small slice of an order. A larger order walks down the levels, so the book with more quote value near the top can be cheaper overall even with a wider spread. Compare spread and depth for the size you have in mind.",
    critical: false,
  },
  {
    id: "fund-types-same-risk",
    skillId: "wealth.fund-types",
    label: "All funds on a board carry the same kind of risk",
    description:
      "Treats a tokenised ETF, an escrow fund vault, a yield vault and an index fund as interchangeable 'funds' because they appear on one board.",
    cues: [
      "all funds are the same",
      "a fund is a fund",
      "they are all just funds",
      "same risk because they are all funds",
      "every product on the board is similar",
    ],
    correction:
      "Each fund type gets its price from a different place: an ETF share tracks its listed fund and trades on an order book; a yield vault's value grows from lending interest; an index fund's NAV follows its weighted tokens; an escrow vault holds a specific asset. Name the type before you compare.",
    critical: false,
  },
  {
    id: "nav-equals-price",
    skillId: "wealth.nav-vs-price",
    label: "NAV and traded price are the same number",
    description:
      "Assumes a fund's net asset value per share and the price it trades at are always equal, so any gap is ignored or read as an error.",
    cues: [
      "nav is the price",
      "the price is the nav",
      "nav and price are the same",
      "trades exactly at nav",
      "price always equals nav",
    ],
    correction:
      "NAV is what the fund's holdings are worth per share at a stated time; the traded price is what the last buyer paid. They can differ (a premium or discount), and they are often stamped at different times. Quote both with their times.",
    critical: false,
  },
  {
    id: "fees-dont-matter",
    skillId: "wealth.fees",
    label: "Small fees do not matter",
    description:
      "Dismisses a management or performance fee as too small to change the outcome, or treats a missing fee figure as zero.",
    cues: [
      "fees are too small to matter",
      "fees do not matter",
      "the fee is negligible",
      "no fee listed so it is free",
      "fees are irrelevant",
    ],
    correction:
      "Fees compound: a yearly charge comes off every year's balance, so the gap grows over time. And a fee that is not shown is unknown, not zero. Work out the drag over the horizon you care about, and say when the figure is missing.",
    critical: false,
  },
  {
    id: "apy-is-guaranteed",
    skillId: "wealth.yield-apy",
    label: "A quoted APY is a promised return",
    description:
      "Reads an annual percentage yield as a rate the holder will receive, rather than an annualised estimate from a recent window that can change or turn negative.",
    cues: [
      "guaranteed yield",
      "guaranteed return",
      "you will earn",
      "locked in apy",
      "risk free yield",
      "the apy is what you get",
      "safe yield",
    ],
    correction:
      "An APY is a past window's return, annualised. Lending rates change daily, rewards can stop, and a vault can lose money through a bad loan or a contract fault. Read it as 'recent rate, annualised', with its basis and time.",
    critical: true,
  },
  {
    id: "short-window-apy-is-annual",
    skillId: "wealth.yield-apy",
    label: "A 7-day APY is a sensible yearly figure",
    description:
      "Treats an APY computed from a few days of price movement as a meaningful annual return, even when it is in the hundreds or thousands of percent.",
    cues: [
      "it yields thousands of percent",
      "the apy shows it will return",
      "annual return of thousands",
      "the weekly apy is the yearly return",
    ],
    correction:
      "Annualising one week multiplies its noise by about fifty-two, with compounding on top. For a price-driven fund a single good week produces absurd APYs. Use APY only for income-type products, and prefer longer windows and ROI for everything else.",
    critical: false,
  },
  {
    id: "past-return-predicts",
    skillId: "wealth.dca",
    label: "Past returns predict future returns",
    description:
      "Uses a historical return or a back-tested DCA simulation as a forecast of what the fund will do next.",
    cues: [
      "it will keep returning",
      "past performance shows it will",
      "so it will return",
      "returned 20% so it will",
      "the simulation shows what i will make",
      "history shows it will go up",
      "it always goes up",
    ],
    correction:
      "A past return describes one path that already happened. The next period has its own prices, rates and events. Use history to see how bumpy a fund has been, not to forecast it, and say so in your write-up.",
    critical: true,
  },
  {
    id: "dca-always-wins",
    skillId: "wealth.dca",
    label: "Regular investing always beats a lump sum",
    description:
      "Believes that spreading purchases over time (DCA) always produces a better result than investing the same amount at once.",
    cues: [
      "dca always wins",
      "dca always beats",
      "averaging in is always better",
      "dca removes the risk",
      "you cannot lose with dca",
    ],
    correction:
      "DCA smooths the entry price; it does not guarantee a better one. In a market that mostly rises, a lump sum at the start usually ends higher; in one that falls then recovers, DCA can end higher. Which is better depends on the path, which nobody knows in advance.",
    critical: false,
  },
  {
    id: "more-funds-is-diversified",
    skillId: "wealth.diversification",
    label: "More funds means more diversification",
    description:
      "Counts the number of funds held as a measure of diversification, even when the funds hold overlapping or co-moving assets.",
    cues: [
      "more funds means diversified",
      "i hold five funds so",
      "spread across many funds so it is safe",
      "lots of funds lower the risk",
      "owning many funds diversifies",
    ],
    correction:
      "Diversification depends on how the holdings move together, not how many there are. Several US tech-heavy ETFs, or several crypto-linked products, can rise and fall as one. Check the largest weight, the effective number of holdings and the themes they share.",
    critical: false,
  },
  {
    id: "incentive-volume-is-demand",
    skillId: "wealth.incentives",
    label: "Incentivised volume is real demand",
    description:
      "Reads high trading volume on a market with points multipliers or volume-based rewards as evidence of genuine interest in the asset.",
    cues: [
      "volume shows demand",
      "everyone wants to trade it",
      "high volume means people want",
      "volume proves interest",
      "the volume shows real buyers",
      "popular because the volume is high",
    ],
    correction:
      "When a venue pays rewards per dollar traded, some volume exists to earn the reward, including trades that buy and sell back quickly. Before reading volume as interest, check which markets carry multipliers or reward boxes, and compare with volume when the incentive was off.",
    critical: true,
  },
  {
    id: "feed-shows-typical-reward",
    skillId: "wealth.incentives",
    label: "A feed of wins shows the typical reward",
    description:
      "Takes a public feed of reward openings as a fair picture of what a typical participant receives, when the feed only lists large wins.",
    cues: [
      "people win big",
      "most people win",
      "the typical reward is big",
      "you usually win big",
      "everyone is winning",
      "the feed shows what you get",
    ],
    correction:
      "A feed that only shows wins above a threshold is a survivorship-biased sample: the many small results are filtered out before you see them. Without the published odds you cannot work out the expected value of a reward.",
    critical: false,
  },
];

export const CRITICAL_MISCONCEPTION_IDS = misconceptions
  .filter((m) => m.critical)
  .map((m) => m.id);
