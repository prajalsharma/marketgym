import type { Module } from "@/lib/types/curriculum";
import { makeRubric } from "../rubric";
import { spotVsPerpsObjective, spotVsPerpsConcept, spotVsPerpsCheck, spotVsPerpsExercise } from "./wave2-additions";

export const orderbookModule: Module = {
  id: "orderbook",
  sequence: 5,
  title: "The order book",
  summary:
    "Inside a limit order book: bids and asks, the spread, depth, liquidity, imbalance, tick and lot size, and price-time priority. Read a book as a snapshot of resting orders and estimate what a trade would cost, without turning the picture into a forecast.",
  learningObjectives: [
    "Read best bid, best ask and mid price from a book and say which price a market buyer and a market seller get.",
    "Compute the spread in ticks and as a percentage of mid, and explain it as the cost of immediacy, separate from exchange fees.",
    "Read per-level and cumulative depth, and estimate the average price and the worst price a given order size would reach.",
    "Judge liquidity from spread and depth within a fixed distance of mid, and explain why total book size is not the right measure.",
    "Apply tick size, lot size, minimum quantity and minimum notional to a proposed order, and work out fill order under price-time priority.",
    spotVsPerpsObjective,
  ],
  prerequisiteModuleIds: ["markets"],
  skillIds: [
    "orderbook.bid-ask",
    "orderbook.spread",
    "orderbook.depth",
    "orderbook.liquidity",
    "orderbook.imbalance",
    "orderbook.tick-lot",
    "orderbook.price-time-priority",
    "orderbook.spot-vs-perps",
  ],
  concepts: [
    {
      heading: "Bids, asks and the mid",
      body: `A **limit order book** is the list of orders that are waiting to trade on one venue. **Bids** are offers to buy at a stated price or lower. **Asks** are offers to sell at a stated price or higher. Each side is grouped by price into **levels**, and each level shows the total quantity resting there. Bids are listed from highest price down; asks from lowest price up.

The **best bid** is the highest bid. The **best ask** is the lowest ask. The **mid price** is halfway between them. Nobody is offering to trade at the mid. It is a reference number.

Who pays what:

- A **market buy** takes the best ask, then the next ask, and so on until it is filled. The buyer pays the ask side.
- A **market sell** hits the best bid, then the next bid. The seller receives the bid side.
- A **limit order** that does not cross the spread rests in the book and waits.

An order that takes resting liquidity is a **taker**. An order that rests is a **maker**. Venues often charge takers more than makers. The book is a snapshot at one block time: orders can be added or cancelled at any moment.`,
      example:
        "Suppose a BTC/USDC book shows best bid 59,990 for 0.4 and best ask 60,000 for 0.3. The mid is 59,995. A market buy of 0.1 BTC pays 60,000. A market sell of 0.1 BTC receives 59,990. Nobody can buy or sell at 59,995 right now; a limit order placed there would rest between the two sides.",
    },
    {
      heading: "The spread is a cost, not a fee",
      body: `The **spread** is best ask minus best bid. Express it two ways: in **ticks** (how many price steps wide) and as a **percentage of mid** (spread ÷ mid × 100), which lets you compare markets at different price levels.

The spread is the cost of trading immediately. If you buy at the ask and sell straight back at the bid, you lose the spread. Who gets it? The makers whose resting orders you traded against, not the exchange.

The **exchange fee** is a separate charge, usually a small percentage of the trade value, with different rates for makers and takers. It is added on top of the spread. The two are easy to confuse because both are costs of trading, but they go to different parties and behave differently: the spread changes from second to second with the book; the fee is a fixed schedule.

A rough all-in cost for a small round trip: spread percentage + 2 × taker fee percentage.

- Spread in ticks: how wide, in price steps.
- Spread as % of mid: comparable across markets.
- Fee: a separate charge set by the venue, not the spread.`,
      example:
        "Suppose best bid 59,999 and best ask 60,000 on a market with tick size 1 and taker fee 0.065%. The spread is 1 tick, or about 0.0017% of mid. A round trip of a small size costs roughly 0.0017% + 2 × 0.065% ≈ 0.13%. The fee dominates here; on a wide-spread market the spread would.",
    },
    {
      heading: "Depth: how much, and how far",
      body: `**Depth** is the quantity resting at each level, and **cumulative depth** is the running total from the top of the book outwards. Depth tells you what a given order size would do.

To estimate the fill of a market order:

- Walk down the levels on the side you trade against, taking each level's quantity until the order is filled.
- The last level you touch is the **worst price** you would pay or receive.
- The average of the prices you took, weighted by quantity, is the **average fill price**.
- The difference between the average fill and the mid (or the best price) is the **price impact**, usually shown as a percentage.

Depth is a snapshot. The orders you count can be cancelled before your order arrives, and new ones can appear. So any estimate carries the caveat "if the book stays as it was at this block time".

Compare depth within a fixed distance of mid, for example within 0.5%, across markets or across time. Total depth across all levels is dominated by far-away orders that a normal-sized trade never touches.`,
      example:
        "Suppose the asks are 60,000 for 0.3, 60,001 for 0.5, 60,002 for 1.0. A market buy of 1.0 BTC takes 0.3 at 60,000, 0.5 at 60,001 and 0.2 at 60,002. Worst price 60,002. Average ≈ (0.3 × 60,000 + 0.5 × 60,001 + 0.2 × 60,002) / 1.0 = 60,000.9. Impact over best ask about 0.0015%. The same order on a book with 0.05 per level would walk much further.",
    },
    {
      heading: "Liquidity and imbalance",
      body: `**Liquidity** in a book is spread and depth together: a narrow spread with plenty of quantity close to the mid means a trade of ordinary size is cheap. A book can have a large total quantity and still be illiquid, if most of that quantity sits far from the mid. So compare books by spread and by depth within a fixed band, not by total size.

**Imbalance** compares the two sides. One measure is **bid share of depth**: bid quantity ÷ (bid quantity + ask quantity) over a fixed number of levels. A value of 0.5 is balanced; 0.7 means bids hold 70% of the counted depth.

What imbalance is: a description of resting orders at one moment. What it is not: a forecast. Resting orders can be cancelled in milliseconds, can be placed to give an impression and then pulled, and only matter if an incoming order trades against them. A large resting bid is a large resting bid. It is not "support" and it is not "buying pressure".

- Liquidity: spread and depth near mid, not total size.
- Imbalance: bid share of depth over stated levels.
- Both are snapshots. Neither forecasts the next trade.`,
      example:
        "Suppose two books both hold 50 BTC in total. Book A has 10 BTC within 0.5% of mid and a 1-tick spread. Book B has 1 BTC within 0.5% and the rest more than 3% away, with a 20-tick spread. Book A is more liquid for any ordinary order, although both books are the same size. If Book A shows bid share 0.72 over ten levels, that is a description of the book now; whether price moves up or down next is a separate question that the number does not answer.",
    },
    {
      heading: "Tick, lot and priority: the matching rules",
      body: `A venue sets a grid. **Tick size** is the smallest price step: prices must be integer multiples of it. **Lot size** (often called step size) is the smallest quantity step: sizes must be integer multiples of it. These are two separate rules, one for price and one for quantity.

There are also size limits that are not the same as the grid: **minimum quantity** (the smallest order allowed) and **minimum notional** (the smallest price × quantity allowed). An order must satisfy all four at once. A quantity can be a valid multiple of the lot size and still be below the minimum notional.

Once orders are in the book, the venue matches them by **price-time priority**: the best price fills first, and at the same price the order that arrived first fills first. Size does not give priority. A large order at the same price as an earlier small one waits behind it. When an incoming order is bigger than the first resting order, it takes that order in full, then moves to the next in time order, then to the next price level.

- Tick size: price grid. Lot size: quantity grid.
- Minimum quantity and minimum notional: separate size floors.
- Price first, then time. Never size.`,
      example:
        "Suppose tick size 1, lot size 0.00001, minimum quantity 0.00001 and minimum notional 5 USDC on BTC/USDC near 60,000. A buy at 60,000.5 is rejected (not a tick multiple). A buy of 0.00005 at 60,000 is a valid lot multiple but has notional 3 USDC, below the minimum, so it is rejected. At the best bid, order X (0.2, placed 10:00:01) and order Y (1.0, placed 10:00:03) rest. A market sell of 0.5 fills X in full (0.2) and then 0.3 of Y. X went first because it was earlier, not because of size.",
    },
    spotVsPerpsConcept,
  ],
  knowledgeChecks: [
    {
      id: "kc.orderbook.bid-ask.1",
      skillId: "orderbook.bid-ask",
      prompt:
        "A BTC/USDC book shows best bid 59,990 for 0.4 and best ask 60,000 for 0.3. A trader sends a market buy for 0.1 BTC. What price do they pay?",
      options: [
        {
          id: "a",
          text: "59,995, the mid price.",
          correct: false,
          explanation:
            "Nobody is offering to sell at the mid. It is the average of the best bid and best ask, not a quote anyone has posted.",
          misconceptionId: "mid-price-is-tradeable",
        },
        {
          id: "b",
          text: "60,000, the best ask.",
          correct: true,
          explanation:
            "A market buy takes the lowest resting ask. 0.1 is less than the 0.3 available there, so the whole order fills at 60,000.",
        },
        {
          id: "c",
          text: "59,990, the best bid.",
          correct: false,
          explanation:
            "The best bid is what a market seller receives. A buyer trades against the ask side.",
        },
        {
          id: "d",
          text: "It depends on how many bids there are.",
          correct: false,
          explanation:
            "Bid quantity is irrelevant to a buy order. The buyer consumes asks, and the fill depends only on the ask side.",
          misconceptionId: "imbalance-predicts-price",
        },
      ],
    },
    {
      id: "kc.orderbook.spread.1",
      skillId: "orderbook.spread",
      prompt:
        "Best bid 59,999, best ask 60,000, tick size 1, taker fee 0.065%. Which statement is correct?",
      options: [
        {
          id: "a",
          text: "The spread of 1 tick is the fee the exchange charges per trade.",
          correct: false,
          explanation:
            "The spread goes to the maker whose order you trade against. The exchange fee (0.065% here) is a separate charge on top.",
          misconceptionId: "spread-is-fee",
        },
        {
          id: "b",
          text: "The spread is 1 tick (about 0.0017% of mid); a small round trip costs roughly spread plus two taker fees, about 0.13%.",
          correct: true,
          explanation:
            "Spread and fee are both costs but go to different parties. On this tight book, the fee is the larger part of the all-in cost.",
        },
        {
          id: "c",
          text: "Because the spread is 1 tick, trading here is free apart from the spread.",
          correct: false,
          explanation:
            "The taker fee applies to every taking trade regardless of how narrow the spread is.",
          misconceptionId: "spread-is-fee",
        },
        {
          id: "d",
          text: "The spread cannot be expressed as a percentage because it is quoted in ticks.",
          correct: false,
          explanation:
            "Spread ÷ mid × 100 gives the percentage. 1 ÷ 59,999.5 × 100 ≈ 0.0017%.",
        },
      ],
    },
    {
      id: "kc.orderbook.depth.1",
      skillId: "orderbook.depth",
      prompt:
        "Asks are 60,000 for 0.3, 60,001 for 0.5, 60,002 for 1.0. A market buy of 1.0 BTC arrives. What is the worst price paid, and what caveat applies?",
      options: [
        {
          id: "a",
          text: "60,000; the whole order fills at the best ask.",
          correct: false,
          explanation:
            "Only 0.3 is available at 60,000. The order must walk to 60,001 (0.5) and then 60,002 (0.2).",
        },
        {
          id: "b",
          text: "60,002; and the book may have changed before the order arrived.",
          correct: true,
          explanation:
            "0.3 + 0.5 + 0.2 = 1.0, so the last level touched is 60,002. Any estimate assumes the book stayed as it was at the snapshot's block time.",
        },
        {
          id: "c",
          text: "60,002; and this is guaranteed because the orders are resting.",
          correct: false,
          explanation:
            "Resting orders can be cancelled or changed at any time. A snapshot describes the book at one block, not at the moment your order lands.",
          misconceptionId: "depth-is-static",
        },
        {
          id: "d",
          text: "60,001, the average of the levels touched.",
          correct: false,
          explanation:
            "The average fill is about 60,000.9, but the question asks for the worst price, which is the last level touched: 60,002.",
        },
      ],
    },
    {
      id: "kc.orderbook.imbalance.1",
      skillId: "orderbook.imbalance",
      prompt:
        "Over the top ten levels, bids total 7.2 BTC and asks total 2.8 BTC, giving bid share of depth 0.72. What does this tell you?",
      options: [
        {
          id: "a",
          text: "Price is likely to rise because buyers outweigh sellers.",
          correct: false,
          explanation:
            "Resting bids are not buyers who have traded. They can be cancelled instantly and only matter if an order trades into them. Imbalance describes the book; it does not forecast.",
          misconceptionId: "imbalance-predicts-price",
        },
        {
          id: "b",
          text: "At this block time, 72% of the counted depth sat on the bid side; nothing about the next trade follows.",
          correct: true,
          explanation:
            "This is the full content of the number: a description of resting orders over a stated number of levels at one moment.",
        },
        {
          id: "c",
          text: "There is strong support at the bid, so a fall is unlikely.",
          correct: false,
          explanation:
            "'Support' is an interpretation. A large resting bid can be pulled in milliseconds, and the book cannot tell you whether it will be.",
          misconceptionId: "imbalance-predicts-price",
        },
        {
          id: "d",
          text: "The book is more liquid on the bid side, so selling is cheaper than buying.",
          correct: false,
          explanation:
            "Depth totals over ten levels do not tell you the spread or how the quantity is distributed by distance from mid. Liquidity needs that detail.",
          misconceptionId: "bigger-book-always-more-liquid",
        },
      ],
    },
    {
      id: "kc.orderbook.price-time-priority.1",
      skillId: "orderbook.price-time-priority",
      prompt:
        "At the best bid, order X (0.2 BTC, placed 10:00:01) and order Y (1.0 BTC, placed 10:00:03) are resting. A market sell of 0.5 BTC arrives. How is it filled?",
      options: [
        {
          id: "a",
          text: "0.5 against Y, because Y is larger.",
          correct: false,
          explanation:
            "Size gives no priority. At the same price, the earlier order fills first.",
          misconceptionId: "earlier-order-loses-to-bigger",
        },
        {
          id: "b",
          text: "0.2 against X, then 0.3 against Y.",
          correct: true,
          explanation:
            "Same price, so time decides: X arrived first and is filled in full, then the remainder goes to Y.",
        },
        {
          id: "c",
          text: "Split in proportion to size: about 0.08 to X and 0.42 to Y.",
          correct: false,
          explanation:
            "Pro-rata matching exists on some venues, but this book uses price-time priority, which fills the earliest order first.",
          misconceptionId: "earlier-order-loses-to-bigger",
        },
        {
          id: "d",
          text: "The sell is rejected because 0.5 is not a multiple of the tick size.",
          correct: false,
          explanation:
            "Tick size applies to price, not quantity. Quantity must be a multiple of the lot size, and 0.5 is a valid multiple of any lot size that divides it.",
          misconceptionId: "tick-size-is-min-order",
        },
      ],
    },
    spotVsPerpsCheck,
  ],
  exercises: [
    {
      id: "ex.orderbook.cost-of-a-trade",
      skillIds: ["orderbook.bid-ask", "orderbook.spread", "orderbook.depth"],
      kind: "orderbook",
      title: "What would this trade cost?",
      difficulty: 4,
      learningObjective:
        "Read a real book, compute spread and estimate the fill of a given market order, with the right caveats.",
      evidenceRequirements: ["orderbook:vBTC_vUSDC"],
      questions: [
        "State the best bid, best ask, mid price and spread, in ticks and as a percentage of mid.",
        "Walk the ask side for a market buy of 0.5 BTC. Give the worst price, the average fill price and the impact over the best ask. Show the levels you used.",
        "Do the same for a market sell of 0.5 BTC on the bid side. Is the book symmetric for this size?",
        "What two things could make your estimate wrong by the time an order arrived?",
      ],
      expectedReasoning: [
        "Reads best levels and computes spread correctly",
        "Walks cumulative depth level by level",
        "Reports worst and average prices separately",
        "States that the book is a snapshot and can change",
      ],
      rubric: makeRubric({
        factual: [
          "Reads best bid, best ask and mid correctly",
          "Computes the spread in ticks using the market's tick size and as a percentage of mid",
          "Walks the ask side correctly and reports the right worst price for 0.5 BTC",
          "Computes a quantity-weighted average fill price",
          "Walks the bid side correctly for the sell case",
        ],
        evidence: [
          "Cites the levels used, with price and quantity, from the pack's book",
          "Cites the book's timestamp (block time) and provenance",
          "Uses the market's stated tick size rather than a guess",
          "Uses cumulative quantity to show where 0.5 BTC is reached",
        ],
        reasoning: [
          "Distinguishes worst price from average price and explains why both matter",
          "Compares the two sides and says whether the book is symmetric for this size",
          "Explains impact as a percentage over the best price",
          "Notes that the exchange fee would be added on top",
        ],
        uncertainty: [
          "States that resting orders can be cancelled or added before an order arrives",
          "Notes that the book shows a limited number of levels",
          "Says that the estimate holds only for the snapshot's block time",
          "Avoids presenting the estimate as a guaranteed execution",
        ],
        keyPoints: [
          "the spread is best ask minus best bid",
          "spread divided by mid gives a percentage comparable across markets",
          "a market buy walks the ask side from the best ask outwards",
          "the worst price is the last level touched",
          "the average fill price is quantity weighted across the levels used",
          "the exchange fee is separate from the spread and the impact",
          "the book is a snapshot at one block time and can change",
        ],
        acceptableAlternatives: [
          "Reporting impact over mid instead of over best ask, if stated",
          "Using a different order size if the book is too thin for 0.5 BTC, with the reason given",
          "Expressing the spread in quote currency as well as ticks",
        ],
        commonMisconceptionIds: [
          "mid-price-is-tradeable",
          "spread-is-fee",
          "depth-is-static",
        ],
      }),
      hints: [
        "Start at the best ask and add quantities until you reach 0.5. The price where you stop is the worst price.",
        "For the average, multiply each level's price by the quantity you took there, add them up and divide by 0.5.",
        "A full answer lists best bid, ask, mid, spread (ticks and %), the levels walked on each side with worst and average prices, says whether the sides match, and ends with 'if the book is unchanged at the moment the order lands'.",
      ],
    },
    {
      id: "ex.orderbook.two-books",
      skillIds: ["orderbook.liquidity", "orderbook.imbalance", "orderbook.depth"],
      kind: "orderbook",
      title: "Which book is more liquid?",
      difficulty: 4,
      learningObjective:
        "Compare two books on spread and depth within a band, compute imbalance, and refuse to read imbalance as a forecast.",
      evidenceRequirements: ["orderbook:vBTC_vUSDC", "orderbook:vETH_vUSDC"],
      questions: [
        "For each book, give the spread as a percentage of mid and the quantity within 0.5% of mid on each side, in quote currency so the two markets are comparable.",
        "Which book is more liquid for an order worth 10,000 in quote currency? Why is total book size not the right basis for this answer?",
        "Compute bid share of depth over the top ten levels for each book. Write one sentence saying what each number does and does not tell you.",
        "If a news item claimed one of these books showed 'strong support' or 'heavy selling', how would you respond using the data?",
      ],
      expectedReasoning: [
        "Normalises depth to quote currency within a band",
        "Judges liquidity by spread and near-mid depth, not total size",
        "Computes bid share of depth correctly",
        "Treats imbalance as a description, not a forecast",
      ],
      rubric: makeRubric({
        factual: [
          "Computes spread as a percentage of mid for both books",
          "Sums depth within 0.5% of mid correctly for both sides of both books",
          "Converts base quantity to quote value using level prices",
          "Computes bid share of depth over ten levels correctly",
          "Picks the more liquid book for the stated size with a correct justification",
        ],
        evidence: [
          "Cites the levels and timestamps used from both books",
          "Uses each market's own tick size and mid",
          "Notes whether the two snapshots were taken at the same time",
          "States how many levels each book contains",
        ],
        reasoning: [
          "Explains why quote-currency depth in a band is the right comparison",
          "Explains why far-from-mid quantity does not help an ordinary order",
          "Explains what bid share of depth describes and why it cannot forecast",
          "Rebuts 'support' or 'selling pressure' language with the snapshot argument",
        ],
        uncertainty: [
          "Notes that both books can change before any order arrives",
          "Notes that the comparison holds for the stated order size only",
          "Says that resting orders may be placed and pulled without trading",
          "Avoids any directional claim",
        ],
        keyPoints: [
          "liquidity is spread and depth near the mid together",
          "depth should be compared within a fixed band such as half a percent of mid",
          "convert base quantity to quote value to compare markets",
          "total book size is dominated by far-away orders",
          "bid share of depth is bids divided by bids plus asks over stated levels",
          "imbalance describes resting orders at one block time",
          "resting orders can be cancelled and do not forecast the next trade",
        ],
        acceptableAlternatives: [
          "Using a 0.25% or 1% band with the choice stated",
          "Using five levels for imbalance if the book has fewer than ten on a side",
          "Concluding that neither book is liquid enough for the size, with figures",
        ],
        commonMisconceptionIds: [
          "bigger-book-always-more-liquid",
          "imbalance-predicts-price",
          "liquidity-equals-volume",
          "depth-is-static",
        ],
      }),
      hints: [
        "Fix the band first (0.5% each side of mid), then add up only the levels inside it. Multiply quantity by price to get quote value.",
        "Bid share = bid quantity ÷ (bid + ask quantity) over the same number of levels on each side.",
        "A full answer gives spread % and in-band depth for both books, names the more liquid one for 10,000 of quote with the band figures, gives both bid shares with a 'snapshot, not forecast' sentence, and answers the news claim by pointing out that resting orders can be pulled.",
      ],
    },
    {
      id: "ex.orderbook.valid-order-and-queue",
      skillIds: ["orderbook.tick-lot", "orderbook.price-time-priority", "orderbook.bid-ask"],
      kind: "orderbook",
      title: "Is this order valid, and where does it queue?",
      difficulty: 4,
      learningObjective:
        "Check proposed orders against tick size, lot size, minimum quantity and minimum notional, and work out their place under price-time priority.",
      evidenceRequirements: ["orderbook:vBTC_vUSDC"],
      questions: [
        "Using the market's tick size and lot size from the pack, check these proposed orders and say which are valid: (a) a bid at the best bid plus half a tick; (b) a bid of 0.000015 BTC at the best bid; (c) a bid of 0.00005 BTC at the best bid if the minimum notional is 5 in quote currency.",
        "Suppose you place a valid limit bid at the current best bid. Where does it sit in the queue at that level, and what has to happen before it fills?",
        "Suppose instead you place a bid one tick above the best bid. What changes about your priority, and what does it cost you?",
        "Explain why a large order at the same price as an earlier small order does not jump ahead of it.",
      ],
      expectedReasoning: [
        "Applies tick and lot rules separately to price and quantity",
        "Applies minimum notional as a separate check",
        "Reasons about queue position under price-time priority",
        "Trades off priority against price",
      ],
      rubric: makeRubric({
        factual: [
          "Rejects a price that is not a tick multiple",
          "Rejects a quantity that is not a lot multiple",
          "Rejects a lot-valid quantity whose notional is below the minimum, computing the notional from the book's price",
          "States that an order at the best bid queues behind existing quantity at that level",
          "States that an order one tick above becomes the new best bid with first priority at that price",
        ],
        evidence: [
          "Cites the market's tick size and lot size from the pack",
          "Uses the book's actual best bid and resting quantity at that level",
          "Computes notional using a price from the book",
          "Notes the book's timestamp",
        ],
        reasoning: [
          "Explains the difference between the price grid and the quantity grid",
          "Explains why minimum notional is a separate check from lot size",
          "Explains what must trade before a queued order fills",
          "Explains the cost of improving the price by one tick in terms of the spread",
        ],
        uncertainty: [
          "Notes that queue position depends on orders that may be cancelled ahead",
          "Notes that the minimum notional and minimum quantity values must be read from the venue's symbol data",
          "Says that a resting order may never fill",
          "Avoids claiming a specific time to fill",
        ],
        keyPoints: [
          "prices must be integer multiples of the tick size",
          "quantities must be integer multiples of the lot size",
          "minimum notional is price times quantity and is a separate floor",
          "an order at an existing level queues behind the quantity already there",
          "an order one tick better becomes the best price and goes to the front at that price",
          "at the same price the earlier order fills first regardless of size",
          "a resting order fills only when an incoming order trades against it",
        ],
        acceptableAlternatives: [
          "Using the pack's actual minimum notional if present instead of the hypothetical 5",
          "Describing a post-only order as the way to guarantee resting",
          "Noting that stepping ahead by one tick narrows the spread for everyone",
        ],
        commonMisconceptionIds: [
          "tick-size-is-min-order",
          "earlier-order-loses-to-bigger",
          "mid-price-is-tradeable",
        ],
      }),
      hints: [
        "Three separate checks: is the price on the grid, is the quantity on the grid, and is price × quantity big enough?",
        "At a given price, imagine a queue. New orders join the back. What makes an order move to the front of a new queue instead?",
        "A full answer rejects (a) for tick, (b) for lot, (c) for notional (0.00005 × price < 5), places the new bid behind the resting quantity at the best bid, explains that a one-tick-better bid is first in a new queue but pays one tick more, and states that priority is price then time, never size.",
      ],
    },
    spotVsPerpsExercise,
  ],
  rubricNotes:
    "These are written-reasoning exercises about a book; the interactive drills live in the Order Book Gym. Grade arithmetic strictly: spread, walks, averages and bid share should match the pack's levels. Reasoning marks hinge on two refusals: not reading the spread as the venue's fee, and not reading imbalance or 'walls' as a forecast. Every estimate must carry the snapshot caveat to earn full uncertainty marks.",
  recommendedNext:
    "Finish with 'Reasoning like an analyst', which pulls every data type together into a thesis with chosen evidence, labelled inferences, stated gaps, calibrated confidence and a written invalidation.",
};
