import type { Module } from "@/lib/types/curriculum";
import { makeRubric } from "../rubric";

export const etfModule: Module = {
  id: "etf",
  sequence: 3,
  title: "ETF flows",
  summary:
    "Daily net inflow, cumulative net inflow, total net assets and value traded for spot crypto ETFs: what each field measures, how price and flows get mixed up, and why a flow number is not a price-impact number.",
  learningObjectives: [
    "Read daily net inflow and cumulative net inflow and say what each one measures.",
    "Separate a change in total net assets caused by price from one caused by creations and redemptions.",
    "Explain why flows are reported a day late, why they are a small share of total trading, and why they cannot be read as price impact.",
    "Compare a day's flow with its own recent history and distinguish one day from a run.",
  ],
  prerequisiteModuleIds: ["markets"],
  skillIds: ["etf.flows", "etf.aum", "etf.flow-limits", "etf.change-over-time"],
  concepts: [
    {
      heading: "What a spot ETF flow is",
      body: `A spot crypto ETF holds the asset (for example BTC) and issues shares that trade on a stock exchange. When demand for shares exceeds supply, an authorised participant creates new shares by delivering cash or the asset to the fund. When the reverse happens, shares are redeemed. **Net inflow** for a day is the dollar value of creations minus redemptions across the funds counted. A negative number is a net outflow.

**Cumulative net inflow** is the running sum of daily net inflows since the funds launched. It ignores price entirely. It answers "how much net money has entered the wrapper since the start", not "what are the funds worth" and not "how much have investors made".

**Total value traded** is the dollar value of ETF shares that changed hands on the stock exchange that day. Most of that is investors trading shares with each other. It is not a flow. Only the net creations and redemptions are flows.

- Net inflow: creations minus redemptions, in dollars, for one trading day.
- Cumulative net inflow: the sum of all daily net inflows since launch.
- Total value traded: share turnover on the exchange, mostly not a flow.`,
      example:
        "Suppose a day's aggregate figures read: net inflow +120 million, value traded 2.4 billion, cumulative net inflow 14.0 billion. The honest reading is: on that day, 120 million more came in through creations than left through redemptions; shares worth 2.4 billion changed hands, which is twenty times the net flow; since launch, net money in is 14.0 billion before any price effect.",
    },
    {
      heading: "Total net assets: price and flows, mixed",
      body: `**Total net assets** (often called assets under management, or AUM) is what the funds hold, valued at today's price. It changes for two reasons:

- the price of the asset moved, so the same holdings are worth more or less; and
- shares were created or redeemed, so the holdings themselves grew or shrank.

Only the second is a flow. On most days, price does more to total net assets than flows do. If the funds hold 50 billion and BTC falls 4%, total net assets fall by about 2 billion with no redemptions at all. A day of 100 million net inflow is a 0.2% effect by comparison.

So never read a change in total net assets as a flow. Use the reported net inflow for flows, and use the difference between the change in net assets and the net inflow as a rough price effect.

Rough decomposition: change in total net assets ≈ net inflow + (previous total net assets × asset return for the day). It will not be exact, because of timing and fees, but it separates the two forces well enough for analysis.`,
      example:
        "Suppose total net assets went from 50.0 billion to 48.3 billion, and the reported net inflow was +100 million. The 1.7 billion fall cannot be outflows, because the flow was positive. The decomposition gives roughly −1.8 billion from price, which matches a day where the asset fell about 3.6%. Writing 'investors pulled 1.7 billion' would be wrong.",
    },
    {
      heading: "Three limits of flow data",
      body: `**Settlement lag.** Creations and redemptions settle after the trading day. Providers publish a day's flow on the next trading day, and the newest row in a history series may show null for flow fields until it settles. Any flow figure you read describes yesterday or earlier, never right now.

**Scale.** A day's ETF net flow is usually a small fraction of total spot trading across all venues, and a much smaller fraction once derivatives are included. A 200 million net inflow on a day when spot markets traded 30 billion is under 1% of spot volume.

**No price mapping.** The purchases behind a net inflow are spread across the trading session, often executed by the authorised participant in the way that least moves the market. The price that day was formed by everything that traded, of which ETF demand was one part. So "inflows pushed the price up X" and "outflows caused the fall" are not conclusions the data supports. Flows tell you about demand for the ETF wrapper. They do not tell you how the price formed.

- Flows are a day late.
- Flows are small relative to total trading.
- Flows are a demand measure, not a price-impact measure.`,
      example:
        "Suppose BTC rose 5% on a day that later shows +300 million net inflow. It is tempting to say the inflow drove the rise. But the flow was unknown until the next day, it was perhaps 1% of that day's spot volume, and the buying was spread across the session. The defensible sentence: 'ETF demand was positive that day; the price rise was formed by the whole market and cannot be attributed to the inflow.'",
    },
    {
      heading: "Reading flows over time",
      body: `Daily flows are noisy. A single positive or negative day tells you about that day. To say anything about a pattern you need a window and a definition.

A simple approach uses the last 10 to 20 trading days from the flow series:

- Count how many days were positive and how many negative.
- Sum the net inflow over the window.
- Compare today's figure with the window's average and with its largest and smallest values.

Then describe what you found in those terms: "today's +150 million is above the 20-day average of +40 million and the largest positive day in that window; 14 of the last 20 days were positive." That is a description of a run, with its window stated. It is not a forecast.

Things to avoid: calling one day a trend; comparing a day with a different asset's flows as if that were a baseline; and reading a slowdown in inflows as outflows. A smaller positive number is still an inflow.

Also check the dates: the series excludes non-trading days, so a gap in dates is a weekend or holiday, not missing data.`,
      example:
        "Suppose the last 10 trading days of BTC ETF net inflow were: +80, +120, −40, +60, +200, +90, −10, +150, +70, +110 million. Eight of ten days were positive; the sum is +830 million; the average is +83 million. Today's +110 million is a little above average and ordinary within the run. You could describe this as a ten-day run of mostly positive flows. You could not say it will continue.",
    },
  ],
  knowledgeChecks: [
    {
      id: "kc.etf.flows.1",
      skillId: "etf.flows",
      prompt:
        "A day's aggregate BTC ETF figures read: net inflow +120 million, total value traded 2.4 billion, cumulative net inflow 14.0 billion. Which statement is correct?",
      options: [
        {
          id: "a",
          text: "2.4 billion flowed into the ETFs that day.",
          correct: false,
          explanation:
            "Value traded is share turnover between investors on the exchange. The flow is the net of creations and redemptions: 120 million.",
        },
        {
          id: "b",
          text: "Net creations exceeded redemptions by 120 million; shares worth 2.4 billion changed hands; net money in since launch is 14.0 billion before price effects.",
          correct: true,
          explanation:
            "Each field is read for what it measures. Value traded is not a flow, and cumulative net inflow ignores price.",
        },
        {
          id: "c",
          text: "Investors have made 14.0 billion in profit since launch.",
          correct: false,
          explanation:
            "Cumulative net inflow is the sum of money in minus money out. It says nothing about gains; profit would depend on price paid and price now.",
          misconceptionId: "cumulative-inflow-is-profit",
        },
        {
          id: "d",
          text: "The 120 million inflow pushed the price up that day.",
          correct: false,
          explanation:
            "A flow is a measure of ETF demand. It is small relative to total trading and is settled a day late. It cannot be read as price impact.",
          misconceptionId: "flows-equal-price-impact",
        },
      ],
    },
    {
      id: "kc.etf.aum.1",
      skillId: "etf.aum",
      prompt:
        "Total net assets fell from 50.0 billion to 48.3 billion. Reported net inflow for the day was +100 million. What happened?",
      options: [
        {
          id: "a",
          text: "Investors withdrew about 1.7 billion.",
          correct: false,
          explanation:
            "The reported flow was positive, so there was no net withdrawal. The fall in net assets must come from price.",
          misconceptionId: "aum-change-equals-flows",
        },
        {
          id: "b",
          text: "Price fell roughly 3.6%, which outweighed a small positive flow.",
          correct: true,
          explanation:
            "Change in net assets ≈ flow + price effect. −1.7 billion ≈ +0.1 billion + (−1.8 billion), and 1.8 / 50 ≈ 3.6%.",
        },
        {
          id: "c",
          text: "The data must be wrong, because net assets cannot fall when inflows are positive.",
          correct: false,
          explanation:
            "Net assets are holdings valued at today's price. They fall whenever price falls by more than flows add, which is common.",
          misconceptionId: "aum-change-equals-flows",
        },
        {
          id: "d",
          text: "Cumulative net inflow fell by 1.7 billion.",
          correct: false,
          explanation:
            "Cumulative net inflow only changes by the day's net inflow. With a +100 million day it rose by 100 million; price does not touch it.",
          misconceptionId: "cumulative-inflow-is-profit",
        },
      ],
    },
    {
      id: "kc.etf.flow-limits.1",
      skillId: "etf.flow-limits",
      prompt:
        "BTC rose 5% on a day that later showed +300 million of ETF net inflow, on a day when spot markets traded about 30 billion. What is the most defensible statement?",
      options: [
        {
          id: "a",
          text: "The inflow drove the 5% rise.",
          correct: false,
          explanation:
            "The flow was about 1% of spot volume, was spread across the session, and was not known until the next day. The data does not support a causal link.",
          misconceptionId: "flows-equal-price-impact",
        },
        {
          id: "b",
          text: "ETF demand was positive that day; the price rise was formed by the whole market and cannot be attributed to the flow.",
          correct: true,
          explanation:
            "This reads the flow as what it is, a demand measure, and keeps price formation with the market as a whole.",
        },
        {
          id: "c",
          text: "Flows are irrelevant because they are small.",
          correct: false,
          explanation:
            "Being small relative to volume limits what flows can explain about price. They still measure ETF demand, which is useful on its own terms.",
        },
        {
          id: "d",
          text: "Because the flow was known in real time, traders front-ran it and caused the rise.",
          correct: false,
          explanation:
            "Flows settle after the trading day and are published the next day. They are not known in real time.",
          misconceptionId: "flows-equal-price-impact",
        },
      ],
    },
    {
      id: "kc.etf.change-over-time.1",
      skillId: "etf.change-over-time",
      prompt:
        "The last ten trading days of net inflow were +80, +120, −40, +60, +200, +90, −10, +150, +70, +110 million. Today's figure is +110 million. Which description is sound?",
      options: [
        {
          id: "a",
          text: "Inflows are slowing, so outflows have begun.",
          correct: false,
          explanation:
            "+110 million is an inflow, slightly above the ten-day average. A smaller positive number is not an outflow.",
          misconceptionId: "one-day-flow-is-trend",
        },
        {
          id: "b",
          text: "Eight of the last ten days were positive, the sum is +830 million, and today is a little above the +83 million average.",
          correct: true,
          explanation:
            "This states the window, the count, the sum and the comparison. It describes a run without forecasting it.",
        },
        {
          id: "c",
          text: "The trend will continue because most days were positive.",
          correct: false,
          explanation:
            "A run describes the past window. It does not forecast tomorrow's flow.",
          misconceptionId: "one-day-flow-is-trend",
        },
        {
          id: "d",
          text: "The −40 million day shows investors turned bearish.",
          correct: false,
          explanation:
            "A single negative day in a mostly positive window is noise unless you have a reason to think otherwise. One day is not a change of view.",
          misconceptionId: "one-day-flow-is-trend",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "ex.etf.read-the-fields",
      skillIds: ["etf.flows", "etf.aum"],
      kind: "scenario",
      title: "Read the ETF fields",
      difficulty: 2,
      learningObjective:
        "State what the latest BTC ETF flow point measures and separate the price effect from the flow effect on total net assets.",
      evidenceRequirements: ["etf:BTC", "snapshot:BTC"],
      questions: [
        "For the latest settled point in the BTC ETF series, state the net inflow, cumulative net inflow, total net assets and total value traded, and say in one sentence what each measures.",
        "Compare the latest total net assets with the previous point. Using the net inflow and the asset's price change, roughly how much of the change is price and how much is flow?",
        "What is the ratio of net inflow to total value traded on the latest day, and what does that tell you about the share of trading that was a flow?",
      ],
      expectedReasoning: [
        "Defines each field correctly",
        "Decomposes the change in net assets into flow and price",
        "Distinguishes value traded from flow",
        "Uses the snapshot's price change as the price-effect input",
      ],
      rubric: makeRubric({
        factual: [
          "Reads the four fields from the latest settled point correctly",
          "Defines net inflow as creations minus redemptions",
          "Defines cumulative net inflow as the running sum, ignoring price",
          "Defines total net assets as holdings at today's price",
          "States that value traded is share turnover, mostly not a flow",
        ],
        evidence: [
          "Uses the latest settled point, not an unsettled row with null fields",
          "Cites the dates of the points compared",
          "Uses the snapshot's percentage change as the price input and notes its timestamp",
          "Computes the flow-to-value-traded ratio from the pack's figures",
        ],
        reasoning: [
          "Applies the decomposition: change in net assets ≈ flow + price effect",
          "Explains why the price effect usually dominates",
          "Explains why the ratio of flow to value traded is small",
          "Draws only conclusions about demand, not price impact",
        ],
        uncertainty: [
          "Notes that the decomposition is approximate because of timing and fees",
          "Notes that the snapshot's 24-hour window may not match the ETF trading day",
          "Flags the T+1 settlement lag",
          "Avoids reading any figure as a forecast",
        ],
        keyPoints: [
          "net inflow is creations minus redemptions for one trading day",
          "cumulative net inflow is the running sum of daily net inflows and ignores price",
          "total net assets is holdings valued at the current price",
          "value traded is share turnover and is mostly not a flow",
          "change in net assets is roughly flow plus price effect",
          "the price effect usually dominates the flow effect",
          "the newest row may be unsettled and show null flow fields",
        ],
        acceptableAlternatives: [
          "Using the ETF series' own implied price change instead of the snapshot, if explained",
          "Reporting the decomposition as a range rather than a point",
          "Noting that the snapshot and ETF trading day cover different hours",
        ],
        commonMisconceptionIds: [
          "aum-change-equals-flows",
          "cumulative-inflow-is-profit",
          "flows-equal-price-impact",
        ],
      }),
      hints: [
        "Four fields, four definitions. Which ones are affected by price and which are not?",
        "Net assets change for two reasons. The reported net inflow is one of them. What is left over?",
        "A full answer reads: net inflow X (creations minus redemptions); cumulative Y (sum since launch, no price); net assets Z (holdings at price); value traded W (turnover). Change in Z ≈ X + (previous Z × price return). Flow was about X/W of trading.",
      ],
    },
    {
      id: "ex.etf.flows-and-price",
      skillIds: ["etf.flow-limits", "etf.flows"],
      kind: "scenario",
      title: "Flows and price: what you cannot say",
      difficulty: 3,
      learningObjective:
        "Confront a news item that links flows to price and explain, with the data, why the link cannot be drawn.",
      evidenceRequirements: ["etf:BTC", "snapshot:BTC", "news:etf"],
      questions: [
        "Find a news item in the pack that connects ETF flows to price (or, if none does, describe the kind of sentence you would expect). What exactly does it claim?",
        "Using the latest settled net inflow and the snapshot's 24-hour volume, estimate the flow as a share of spot trading. What does that number do to the claim?",
        "Explain the settlement lag and what it means for anyone who says flows 'drove' today's price.",
        "Write the strongest sentence about flows and price that the data does support.",
      ],
      expectedReasoning: [
        "Identifies a flows-cause-price claim and restates it precisely",
        "Computes flow as a share of volume",
        "Explains T+1 settlement and its consequence for causal claims",
        "Reframes flows as a demand measure",
      ],
      rubric: makeRubric({
        factual: [
          "Restates the news claim accurately, with attribution",
          "Reads the latest settled net inflow correctly",
          "Reads the snapshot volume correctly and computes the share",
          "States that flows settle and are published after the trading day",
          "Does not assert that flows moved the price",
        ],
        evidence: [
          "Cites the news item by title and publisher",
          "Cites the flow date and the snapshot timestamp",
          "Notes that the snapshot volume is spot only and that derivatives would make the share smaller still",
          "Uses the provenance tags to note whether data is live, cached or demo",
        ],
        reasoning: [
          "Explains why a small share of trading cannot be mapped to a price change",
          "Explains why purchases spread across a session do not map to a single price move",
          "Explains why the lag means the flow was unknown while the price formed",
          "Produces a defensible demand-only statement",
        ],
        uncertainty: [
          "Acknowledges that flows may still be one of many inputs to price",
          "Notes that the volume figure covers only the provider's venues",
          "Says what data (intraday execution records) would be needed to test the claim",
          "Avoids both 'flows drove it' and 'flows are irrelevant'",
        ],
        keyPoints: [
          "a day's net flow is a small share of spot trading",
          "derivatives trading makes the share smaller still",
          "flows settle after the trading day and are published the next day",
          "the flow was unknown while the price was forming",
          "purchases behind a flow are spread across the session",
          "flows measure demand for the etf wrapper",
          "price was formed by everything that traded",
        ],
        acceptableAlternatives: [
          "Using the ETF series' own value traded as a denominator alongside spot volume, if both are explained",
          "Concluding that flows and price are 'consistent with each other' without causal language",
          "Noting that persistent flows over weeks could be a meaningful demand signal even if daily impact is unknowable",
        ],
        commonMisconceptionIds: [
          "flows-equal-price-impact",
          "correlation-is-causation",
          "headline-is-fact",
        ],
      }),
      hints: [
        "Divide the net inflow by the day's spot volume. Is the result closer to 50% or to 1%?",
        "When was the flow figure published relative to the price move it is said to explain?",
        "A full answer says: the item claims [X]; flow was about Y% of spot volume; flows settle a day late so were unknown as price formed; purchases are spread across the session; the data supports 'ETF demand was positive' and nothing about price impact.",
      ],
    },
    {
      id: "ex.etf.run-or-noise",
      skillIds: ["etf.change-over-time", "etf.flow-limits"],
      kind: "scenario",
      title: "A run or noise?",
      difficulty: 3,
      learningObjective:
        "Describe a flow series over a stated window and judge whether the latest day is ordinary within it.",
      evidenceRequirements: ["etf:BTC", "etf:ETH", "news:etf"],
      questions: [
        "For BTC, over the last 10 settled trading days: how many were positive, what is the sum, what is the average, and where does the latest day sit?",
        "Do the same for ETH. Do the two series tell the same story? What can you and can you not conclude from comparing them?",
        "A news item calls the latest day a 'turning point' or a 'trend'. Using your window, is that description supported?",
        "What would you need to see over the next five trading days to agree that a run had started or ended?",
      ],
      expectedReasoning: [
        "Uses a stated window and computes count, sum, average",
        "Places the latest day in context rather than reading it alone",
        "Compares two series without treating one as the baseline for the other",
        "Defines a forward test rather than forecasting",
      ],
      rubric: makeRubric({
        factual: [
          "Counts positive and negative days correctly over the window",
          "Computes sum and average correctly",
          "Places the latest day correctly relative to the average and the window's range",
          "Reads both series without mixing them up",
          "Does not call a smaller inflow an outflow",
        ],
        evidence: [
          "States the window dates used and excludes unsettled rows",
          "Cites the ETH figures separately from BTC",
          "Quotes the news item's wording when assessing it",
          "Notes gaps in dates as non-trading days, not missing data",
        ],
        reasoning: [
          "Explains why a single day cannot be a trend",
          "Explains what 'run' means with the window stated",
          "Explains why BTC and ETH flows are not baselines for each other",
          "Defines a concrete forward test (for example, sign and size over five days)",
        ],
        uncertainty: [
          "Says the description applies to the past window only",
          "Notes that the window choice affects the conclusion",
          "Avoids forecasting the next day",
          "Flags that the series is a day late",
        ],
        keyPoints: [
          "a window of 10 to 20 trading days is needed to describe a run",
          "count the positive and negative days and sum the flows",
          "compare the latest day with the window average and range",
          "a smaller positive number is still an inflow",
          "one day cannot be a trend",
          "btc and eth flows are separate series and not baselines for each other",
          "a forward test states sign and size over a stated number of days",
        ],
        acceptableAlternatives: [
          "Using a 15- or 20-day window with the choice stated",
          "Using the median instead of the average",
          "Concluding that the news description is partly supported, with the parts spelled out",
        ],
        commonMisconceptionIds: [
          "one-day-flow-is-trend",
          "headline-is-fact",
          "flows-equal-price-impact",
        ],
      }),
      hints: [
        "Pick the window first, write the dates, then count. Do not start from today's number.",
        "A 'turning point' needs a before and an after. Does your window show both, or just a single day that differs?",
        "A full answer gives count, sum, average and the latest day's position for each asset, judges the news wording against that, and sets a five-day test with a sign and a size.",
      ],
    },
  ],
  rubricNotes:
    "Mark 'factual' on correct field definitions and arithmetic. Mark 'reasoning' heavily on whether the learner keeps flows as a demand measure and refuses to map them to price. Any sentence of the form 'inflows pushed price' or 'AUM fell so investors sold' is a critical misconception and should cap the reasoning score. Reward explicit windows and explicit forward tests.",
  recommendedNext:
    "Continue to 'Indexes' to see how weights decide what an aggregate number means, which is the same habit of asking 'what is this number made of' applied to a basket of assets.",
};
