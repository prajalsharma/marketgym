import type { Module } from "@/lib/types/curriculum";
import { makeRubric } from "../rubric";
import { tradingHoursObjective, tradingHoursConcept, tradingHoursCheck, tradingHoursExercise } from "./wave2-additions";

export const marketsModule: Module = {
  id: "markets",
  sequence: 1,
  title: "Reading a market snapshot",
  summary:
    "Price, 24-hour change, volume, market capitalisation, liquidity and volatility: what each number measures, what it does not, and how to say so in plain words.",
  learningObjectives: [
    "Read a price and a 24-hour percentage change and describe them without turning them into a forecast.",
    "Explain why volume measures activity and cannot show whether buyers or sellers dominated.",
    "Compute market capitalisation from price and circulating supply and explain why it is not money invested.",
    "Separate liquidity (the cost of trading now) from volume (what traded in the past) and from volatility (how much price moves).",
    "Describe how crypto prices arise across many venues and why two quotes for the same asset can differ.",
    tradingHoursObjective,
  ],
  prerequisiteModuleIds: [],
  skillIds: [
    "markets.price",
    "markets.volume",
    "markets.market-cap",
    "markets.liquidity",
    "markets.volatility",
    "markets.structure",
    "markets.trading-hours",
  ],
  concepts: [
    {
      heading: "A price is a record, not a verdict",
      body: `A quoted price is the price of the most recent trade, or the midpoint between the best bid and the best ask. Either way, it records one agreement between one buyer and one seller at one moment. It is not a measurement of what the asset is worth. It is a fact about a trade.

The **24-hour change** compares the current price with the price 24 hours earlier. It is two points joined by a line. It does not show the path between them, how many trades happened, or what will happen next. A +3% day and a day that rose 8% and then fell 5% both print as +3%.

When you read a snapshot, write the observation first and keep it plain: "BTC is quoted at X, Y% above its price 24 hours ago." Then, if you want to interpret, do that in a separate sentence and say it is your reading.

- Price: what the last trade cost.
- 24h change: current price against one earlier point.
- Neither one is a forecast, and neither one is a value.`,
      example:
        "Suppose BTC is quoted at 60,000 with a 24-hour change of +2.5%. The observation is: price is 60,000, about 1,460 above where it was yesterday. It does not follow that BTC is 'worth' 60,000, that it is 'going up', or that buyers were 'in control'. Those are interpretations you would need other evidence for.",
    },
    {
      heading: "Volume measures activity, not direction",
      body: `**Volume** is the total amount traded over a window, usually 24 hours, measured either in units of the asset or in the quote currency (dollars). Data providers often call the dollar figure **turnover**.

Every trade has exactly one buyer and one seller. If 1,000 BTC changed hands, then 1,000 BTC were bought and 1,000 BTC were sold. So volume cannot tell you whether "buyers" or "sellers" dominated. It tells you how much changed hands.

What volume can do is show how unusual today's activity is. The useful comparison is with the asset's own recent history: is today's volume near its 30-day average, or two or three times higher? High volume on a large price move suggests a lot of people repriced the asset at once. Low volume on a large move suggests the move happened with few participants, which can mean a thin market.

- Always compare volume with its own recent average, not with another asset.
- Say "volume was high" and stop. Do not say "buying volume was high".
- Check whether the figure is in units or in dollars, and which venues it covers.`,
      example:
        "Suppose ETH shows 24-hour volume of 12 billion dollars against a 30-day average of 8 billion, with price up 4%. A sound observation is: 'volume was about 50% above its recent average on a 4% rise'. An unsound one is: 'strong buying volume pushed ETH up'. The data shows activity. It does not show which side wanted it more.",
    },
    {
      heading: "Market capitalisation is a label for size",
      body: `**Market capitalisation** (market cap) is the current price multiplied by the circulating supply. If a coin trades at 2 and there are 500 million in circulation, its market cap is 1 billion.

Because it is a multiplication, market cap moves whenever price moves, even if no new money arrives. One small trade at a 1% higher price lifts the whole figure by 1%. That is why "X billion was wiped out" headlines are misleading: nobody lost that cash, because that cash never existed as a pool. Market cap is a way of ranking and comparing size, not a count of money invested.

Related fields you will see in a snapshot:

- **Circulating supply**: coins available to trade now.
- **Total supply** and **max supply**: coins that exist, and coins that could ever exist. Max supply can be unlimited.
- **Fully diluted valuation (FDV)**: price multiplied by max (or total) supply. A large gap between FDV and market cap means a lot of supply is still to come.
- **Market cap rank**: position among all assets by market cap.`,
      example:
        "Suppose a token has price 4, circulating supply 250 million and max supply 1 billion. Market cap is 1 billion; FDV is 4 billion. If price rises to 4.40, market cap becomes 1.1 billion. No 100 million of new money arrived; the price of the last trade changed and the multiplication followed it.",
    },
    {
      heading: "Liquidity and volatility are different things",
      body: `**Liquidity** is how cheaply you can trade a given size right now. It shows up as a narrow gap between the best bid and best ask, and as plenty of resting orders close to the current price. It is a property of the market at this moment.

**Volume** is a property of the past: what traded over a window. A market can have high volume over the last 24 hours and a thin order book right now. The two often go together, but they are not the same measurement, and you should not use one as a stand-in for the other.

**Volatility** is how much price moves over time. One simple proxy is the 24-hour high minus the 24-hour low as a percentage of price. Volatility has no sign: a market that rose 6% and one that fell 6% were equally volatile. It is not good or bad on its own. What matters is whether today's range is normal for this asset. BTC moving 2% in a day is ordinary; a stablecoin moving 2% is extraordinary.

- Liquidity: cost to trade now (spread and depth).
- Volume: amount traded in the past window.
- Volatility: size of price moves over time, compared with the asset's own normal range.`,
      example:
        "Suppose a snapshot shows a 24-hour high of 62,000 and low of 58,000 with price at 60,000. The day's range is about 6.7% of price. Before calling that 'wild', compare it with the asset's usual daily range. If recent days ranged 2 to 3%, today is unusual. If they ranged 5 to 8%, today is ordinary.",
    },
    {
      heading: "Where a crypto price comes from",
      body: `There is no single place where "the" bitcoin price is set. BTC trades on many venues at once: centralised exchanges, on-chain order books and automated market makers. Each venue has its own order book and its own last trade. A data provider's price is usually an average or a volume-weighted blend across venues.

Assets are quoted against a **quote currency**: a stablecoin such as USDC or USDT, or a fiat currency. "BTC/USDC" means the price of one BTC in USDC. Two quotes for the same asset can differ by a little because they come from different venues at slightly different times, or because the quote currencies themselves differ slightly from one dollar.

There are also **spot** markets, where the asset itself changes hands, and **derivative** markets, where contracts referencing the asset trade. Derivative volume is often many times larger than spot volume. A snapshot usually shows spot figures, so it describes only part of the activity.

- Ask which venues and which quote currency a price covers.
- Expect small differences between sources; large differences deserve a check of timestamps.
- Remember that spot data leaves out derivatives.`,
      example:
        "Suppose one provider quotes BTC at 60,010 and an on-chain order book shows a last trade at 59,985. Both can be correct: the first is a blended figure across venues as of one timestamp; the second is a single venue's last trade a few seconds earlier. The right description is 'quotes differ by about 0.04% across sources', not 'one of them is wrong'.",
    },
    tradingHoursConcept,
  ],
  knowledgeChecks: [
    {
      id: "kc.markets.price.1",
      skillId: "markets.price",
      prompt:
        "A snapshot shows BTC at 60,000 with a 24-hour change of +2.5%. Which statement is an observation rather than an interpretation?",
      options: [
        {
          id: "a",
          text: "BTC is now worth 60,000.",
          correct: false,
          explanation:
            "This treats the last traded price as a value judgement. Price records what a trade cost, not what the asset is worth.",
          misconceptionId: "price-equals-value",
        },
        {
          id: "b",
          text: "BTC is quoted at 60,000, about 2.5% above its price 24 hours ago.",
          correct: true,
          explanation:
            "This restates the two data points without adding a claim about value, direction or cause. That is what an observation looks like.",
        },
        {
          id: "c",
          text: "BTC is trending up and should keep rising.",
          correct: false,
          explanation:
            "A single 24-hour change is two points in time. It says nothing about the path or what comes next.",
          misconceptionId: "percent-change-is-trend",
        },
        {
          id: "d",
          text: "Buyers were in control over the last 24 hours.",
          correct: false,
          explanation:
            "Every trade has one buyer and one seller. A price rise shows trades happened at higher prices, not that one side was 'in control'.",
          misconceptionId: "volume-implies-direction",
        },
      ],
    },
    {
      id: "kc.markets.volume.1",
      skillId: "markets.volume",
      prompt:
        "ETH's 24-hour volume is 12 billion dollars against a 30-day average of 8 billion, and price rose 4%. What can you conclude from the volume figure alone?",
      options: [
        {
          id: "a",
          text: "Buyers outnumbered sellers by a wide margin.",
          correct: false,
          explanation:
            "Volume is always balanced: each unit bought is a unit sold. It cannot show which side dominated.",
          misconceptionId: "volume-implies-direction",
        },
        {
          id: "b",
          text: "Activity was about 50% above its recent average.",
          correct: true,
          explanation:
            "Comparing today's volume with the asset's own recent average is the one sound inference. It tells you more changed hands than usual, nothing more.",
        },
        {
          id: "c",
          text: "ETH is more liquid than usual right now.",
          correct: false,
          explanation:
            "Volume describes the past window. Liquidity is the cost of trading now, which needs spread and depth, not volume.",
          misconceptionId: "liquidity-equals-volume",
        },
        {
          id: "d",
          text: "The rise will continue because volume confirms it.",
          correct: false,
          explanation:
            "'Volume confirms the move' is a slogan, not a measurement. Volume shows how much traded, and no amount of it forecasts the next move.",
          misconceptionId: "volume-implies-direction",
        },
      ],
    },
    {
      id: "kc.markets.market-cap.1",
      skillId: "markets.market-cap",
      prompt:
        "A token has price 4, circulating supply 250 million and max supply 1 billion. Price rises to 4.40. Which statement is correct?",
      options: [
        {
          id: "a",
          text: "100 million dollars of new money flowed into the token.",
          correct: false,
          explanation:
            "Market cap rose by 100 million because price times supply rose. No cash pool grew; a trade at a higher price changed the multiplication.",
          misconceptionId: "market-cap-is-money-invested",
        },
        {
          id: "b",
          text: "Market cap is now 1.1 billion and FDV is 4.4 billion.",
          correct: true,
          explanation:
            "Market cap = 4.40 × 250 million = 1.1 billion. FDV = 4.40 × 1 billion = 4.4 billion. Both followed the price mechanically.",
        },
        {
          id: "c",
          text: "FDV is now 1.1 billion.",
          correct: false,
          explanation:
            "FDV uses max (or total) supply, not circulating supply. 4.40 × 1 billion is 4.4 billion.",
        },
        {
          id: "d",
          text: "Market cap cannot change unless supply changes.",
          correct: false,
          explanation:
            "Market cap is price multiplied by supply, so it moves whenever price moves, even with supply fixed.",
          misconceptionId: "market-cap-is-money-invested",
        },
      ],
    },
    {
      id: "kc.markets.volatility.1",
      skillId: "markets.volatility",
      prompt:
        "BTC's 24-hour high is 62,000 and low is 58,000, with price at 60,000. Recent daily ranges were 2 to 3%. What is the best description?",
      options: [
        {
          id: "a",
          text: "Volatility is dangerous and the market is unstable.",
          correct: false,
          explanation:
            "Volatility is a measurement with no sign. 'Dangerous' and 'unstable' are judgements that the range figure alone does not support.",
          misconceptionId: "volatility-is-bad",
        },
        {
          id: "b",
          text: "Today's range is about 6.7% of price, roughly two to three times the recent norm.",
          correct: true,
          explanation:
            "(62,000 − 58,000) / 60,000 ≈ 6.7%. Comparing with the asset's own recent range is what makes 'unusual' a defensible word.",
        },
        {
          id: "c",
          text: "The market is highly liquid because it moved a lot.",
          correct: false,
          explanation:
            "A wide range says nothing about the cost of trading now. Liquidity needs spread and depth, not the day's high and low.",
          misconceptionId: "liquidity-equals-volume",
        },
        {
          id: "d",
          text: "BTC is now worth less because it was volatile.",
          correct: false,
          explanation:
            "Volatility describes movement. It does not tell you anything about value, which is a separate concept from price in any case.",
          misconceptionId: "price-equals-value",
        },
      ],
    },
    tradingHoursCheck,
  ],
  exercises: [
    {
      id: "ex.markets.describe-snapshot",
      skillIds: ["markets.price", "markets.volume", "markets.market-cap"],
      kind: "scenario",
      title: "Describe a snapshot without forecasting",
      difficulty: 1,
      learningObjective:
        "Restate price, 24-hour change, volume and market cap as plain observations and keep interpretation separate.",
      evidenceRequirements: ["snapshot:BTC", "snapshot:ETH"],
      questions: [
        "For BTC and ETH, state the price, the 24-hour change and the 24-hour volume as plain observations. What exactly does each number measure?",
        "Which of the two assets changed more over 24 hours, and what can you not conclude from that comparison?",
        "What would you need in addition to these snapshots to say whether today's volume is unusual?",
      ],
      expectedReasoning: [
        "Separates observation from interpretation in distinct sentences",
        "Explains volume as activity with one buyer and one seller per trade",
        "Explains market cap as price multiplied by circulating supply",
        "Names a comparison baseline (recent average) as missing",
      ],
      rubric: makeRubric({
        factual: [
          "States each asset's price and 24-hour change correctly from the snapshot",
          "Describes the 24-hour change as a comparison of two points in time",
          "Describes volume as total traded, not as buying or selling",
          "Describes market cap as price multiplied by circulating supply",
          "Does not present any figure as a value judgement or forecast",
        ],
        evidence: [
          "Cites the actual figures from both snapshots",
          "Notes the timestamp and provenance of the data",
          "Uses the figures to compare the two assets rather than describing them in isolation",
          "Does not invent figures that are not in the pack",
        ],
        reasoning: [
          "Explains why a larger 24-hour change does not mean a stronger trend",
          "Explains why volume cannot show which side dominated",
          "Keeps interpretation, if any, clearly labelled as the learner's reading",
          "Draws only conclusions the two snapshots can support",
        ],
        uncertainty: [
          "Names the missing baseline (recent average volume or range) needed to judge 'unusual'",
          "Acknowledges that the snapshot covers spot data from the provider's venues only",
          "Avoids words such as 'clearly' or 'definitely' where the data does not support them",
          "Says what cannot be concluded from a 24-hour comparison",
        ],
        keyPoints: [
          "price is the last traded or blended quote at one timestamp",
          "24-hour change compares two points in time and does not show the path",
          "volume counts units or dollars traded and every trade has one buyer and one seller",
          "market cap equals price multiplied by circulating supply",
          "a larger percentage change is not evidence of a stronger trend",
          "judging volume as unusual needs the asset's own recent average",
          "the snapshot covers spot markets only",
        ],
        acceptableAlternatives: [
          "Comparing volume with the other asset's volume as a size comparison, as long as it is not used to judge 'unusual'",
          "Describing the change in dollars rather than percent",
          "Noting that the two snapshots may have slightly different timestamps",
        ],
        commonMisconceptionIds: [
          "price-equals-value",
          "volume-implies-direction",
          "percent-change-is-trend",
          "market-cap-is-money-invested",
        ],
      }),
      hints: [
        "Start each sentence with the number and what it measures. Leave out any word that describes a cause or a future.",
        "Remember that every trade has one buyer and one seller. What does that mean for any sentence that says 'buyers' or 'sellers'?",
        "A full answer reads like: 'BTC is quoted at X at time T, Y% above 24 hours earlier; 24h volume was Z. I cannot say whether this is unusual without the recent average.'",
      ],
    },
    {
      id: "ex.markets.liquidity-vs-volume",
      skillIds: ["markets.liquidity", "markets.volume", "markets.volatility"],
      kind: "scenario",
      title: "Liquidity, volume and volatility: which is which?",
      difficulty: 1,
      learningObjective:
        "Use a snapshot and an order book to show that volume, liquidity and volatility are three separate measurements.",
      evidenceRequirements: ["snapshot:BTC", "orderbook:vBTC_vUSDC"],
      questions: [
        "From the snapshot, what is BTC's 24-hour volume? From the order book, what is the spread as a percentage of the mid price? Which of these describes liquidity, and why?",
        "If the 24-hour volume were twice as high but the order book looked the same, would BTC be more liquid right now? Explain.",
        "What one extra piece of data would let you say whether today's price range was volatile for BTC?",
      ],
      expectedReasoning: [
        "Defines liquidity as the cost of trading a given size now",
        "Defines volume as past activity over a window",
        "Uses spread from the order book as a liquidity measure",
        "Treats volatility as a comparison with the asset's own normal range",
      ],
      rubric: makeRubric({
        factual: [
          "Reads the 24-hour volume from the snapshot correctly",
          "Computes or reads the spread and expresses it as a share of the mid price",
          "Identifies spread and depth, not volume, as the liquidity measure",
          "Describes volatility as the size of price moves, with no sign",
          "States that doubling past volume does not change the current book",
        ],
        evidence: [
          "Cites specific figures from the snapshot and the order book",
          "Notes that the order book and the snapshot come from different providers and times",
          "Uses the book's best bid and best ask rather than a vague 'tight' or 'wide'",
          "Does not use volume as a stand-in for either liquidity or volatility",
        ],
        reasoning: [
          "Explains the difference between a past window and a present snapshot",
          "Explains why volume and liquidity often move together but are not the same",
          "Reasons about what a doubled volume with an unchanged book would and would not mean",
          "Identifies the recent range as the right baseline for volatility",
        ],
        uncertainty: [
          "Notes that the order book is a snapshot that may change before any trade",
          "Notes that the order book is one venue while the snapshot blends several",
          "Says that without a recent range the volatility question cannot be answered",
          "Avoids overstating what a single spread reading shows",
        ],
        keyPoints: [
          "liquidity is the cost of trading a given size now",
          "spread as a share of mid price measures the cost of immediacy",
          "volume is what traded over the past 24 hours",
          "doubling past volume does not change the current order book",
          "volatility is the size of price moves compared with the asset's normal range",
          "the order book is one venue and the snapshot is a blend",
          "a snapshot of the book may change before a trade arrives",
        ],
        acceptableAlternatives: [
          "Using depth near the mid instead of spread as the primary liquidity measure",
          "Expressing spread in ticks rather than percent, if the percentage is also implied",
          "Using the 24-hour high and low as a rough volatility proxy, with the caveat that a baseline is still needed",
        ],
        commonMisconceptionIds: [
          "liquidity-equals-volume",
          "volatility-is-bad",
          "depth-is-static",
        ],
      }),
      hints: [
        "One of these numbers is about the past, one is about right now, and one is about movement. Sort them first.",
        "The spread is (best ask − best bid). Divide it by the mid price to get a percentage. Which concept does that percentage belong to?",
        "A full answer says: volume is past activity; spread/depth is current liquidity; volatility needs today's range compared with recent ranges, which the pack does not include.",
      ],
    },
    {
      id: "ex.markets.two-quotes",
      skillIds: ["markets.structure", "markets.price"],
      kind: "scenario",
      title: "Why do two quotes for BTC differ?",
      difficulty: 2,
      learningObjective:
        "Explain small differences between a blended price and a single-venue order book using market structure, not error.",
      evidenceRequirements: ["snapshot:BTC", "orderbook:vBTC_vUSDC"],
      questions: [
        "Compare the snapshot price for BTC with the mid price of the order book. How far apart are they, in percent?",
        "Give at least two structural reasons the two figures can differ without either being wrong.",
        "What would make you suspect that one of the figures is stale or faulty rather than just different?",
      ],
      expectedReasoning: [
        "Computes the difference as a percentage",
        "Names venue, quote currency and timestamp as sources of difference",
        "Distinguishes a normal spread between sources from a stale or faulty feed",
        "Uses provenance timestamps as evidence",
      ],
      rubric: makeRubric({
        factual: [
          "Computes the gap between snapshot price and order book mid correctly",
          "States that the snapshot is a blended or provider price and the book is one venue",
          "States that the book is quoted in a stablecoin that may not be exactly one dollar",
          "Recognises that timestamps differ between the two sources",
          "Does not claim one source is the 'real' price",
        ],
        evidence: [
          "Cites both figures and both timestamps from the pack",
          "Uses the provenance tags (live, cached, demo) in the reasoning",
          "Notes the venue's displayed market name and quote asset",
          "Uses the spread of the book to put the difference in context",
        ],
        reasoning: [
          "Explains why many venues produce many prices at once",
          "Explains how a blended price is built from several venues",
          "Sets a rough threshold for when a gap deserves investigation",
          "Links a stale timestamp or a halted market to the possibility of a faulty figure",
        ],
        uncertainty: [
          "Acknowledges not knowing exactly how the provider blends its price",
          "Notes that the book snapshot could be seconds old",
          "Says what extra data (more venues, exact timestamps) would settle the question",
          "Avoids declaring an error without evidence",
        ],
        keyPoints: [
          "there is no single bitcoin price because many venues trade it at once",
          "a provider price is a blend across venues at one timestamp",
          "the order book mid is one venue at its block time",
          "the quote currency is a stablecoin that may not equal exactly one dollar",
          "a small gap between sources is normal",
          "a large gap or an old timestamp suggests a stale or faulty feed",
          "provenance tags show whether data is live, cached or demo",
        ],
        acceptableAlternatives: [
          "Using the order book's best bid or best ask instead of the mid for the comparison, if stated",
          "Treating a gap wider than the book's own spread as the threshold for 'worth checking'",
          "Mentioning derivative markets as another reason prices can lead or lag",
        ],
        commonMisconceptionIds: ["price-equals-value", "mid-price-is-tradeable"],
      }),
      hints: [
        "Look at where each number comes from and when. The snapshot and the book are not from the same place.",
        "Think about: different venues, different quote currencies, different timestamps, and whether a price is blended or single-trade.",
        "A full answer computes the gap, lists venue, quote asset and timestamp as reasons, and says that a gap much wider than the book's own spread or a timestamp hours old would make you suspect a stale feed.",
      ],
    },
    tradingHoursExercise,
  ],
  rubricNotes:
    "This module rewards plain description. Full marks on 'factual' need the right numbers and the right definitions; full marks on 'reasoning' need a visible gap between what was seen and what is inferred. Penalise any sentence that reads a price as a value, volume as a side, or a 24-hour change as a trend. Do not penalise a learner for declining to interpret.",
  recommendedNext:
    "Move to 'Reading the news' to learn how to split headlines into facts, claims and opinions before you connect them to the numbers you can now read.",
};
