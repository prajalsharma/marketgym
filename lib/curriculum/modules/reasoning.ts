import type { Module } from "@/lib/types/curriculum";
import { makeRubric } from "../rubric";

export const reasoningModule: Module = {
  id: "reasoning",
  sequence: 6,
  title: "Reasoning like an analyst",
  summary:
    "Turn evidence into a written analysis: a testable thesis, a short list of evidence that bears on it, observations kept apart from interpretations, a list of what is missing, a calibrated confidence, and a written condition that would prove you wrong.",
  learningObjectives: [
    "Write a one-sentence thesis that is specific, bounded in time and testable.",
    "Select the two or three pieces of evidence that bear on the thesis and give reasons for leaving the rest out.",
    "Label every sentence of an analysis as an observation or an interpretation.",
    "List what the evidence pack lacks and say which conclusions each gap weakens.",
    "State a confidence level tied to the evidence, and write an invalidation condition with a number and a time window.",
  ],
  prerequisiteModuleIds: ["news", "etf"],
  skillIds: [
    "reasoning.thesis",
    "reasoning.evidence-selection",
    "reasoning.observation-vs-interpretation",
    "reasoning.missing-info",
    "reasoning.uncertainty",
    "reasoning.invalidation",
  ],
  concepts: [
    {
      heading: "A thesis is a sentence that can be wrong",
      body: `A **thesis** is a single claim about the market that you are prepared to defend with evidence. A useful thesis has three properties:

- **Specific**: it names an asset or a quantity and a direction or a relationship. "BTC ETF demand is positive" is specific. "Things look good" is not.
- **Bounded in time**: it says over what window it applies. "Over the last ten trading days" or "for the next week".
- **Testable**: there is some observation that would show it to be false.

A thesis is not a prediction of price. It can be a claim about demand, about a relationship between two data series, about what a news item does or does not show, or about the quality of a market. The habit is the same: say one thing, say when, and say how you would know if you were wrong.

Write the thesis first, before the evidence, then check whether the evidence supports it. If you write the evidence first, you will tend to write a thesis that fits whatever you found, and it will sound convincing without being tested.`,
      example:
        "Weak: 'ETF flows are bullish.' Better: 'Over the last ten settled trading days, net BTC ETF inflows have been positive on at least seven days and the ten-day sum is above the prior ten-day sum; this suggests steady ETF demand, with no claim about price.' The second sentence can be checked line by line and can be false.",
    },
    {
      heading: "Choose evidence; do not collect it",
      body: `An evidence pack contains more than any one thesis needs. The skill is to pick the two or three items that **bear on the claim**, and to say why the rest do not.

Evidence bears on a claim when it would look different if the claim were false. If your thesis is about ETF demand, the flow series bears on it directly. The order book on one venue does not: it would look much the same whether ETF demand were positive or negative. Including it adds length, not support.

For each item you keep, write one line: what it shows, and why that matters to the thesis. For each item you leave out, be ready to say in a few words why it does not bear on the claim. This keeps you honest in both directions: you cannot pad the argument, and you cannot quietly drop evidence that cuts against you.

- Keep what would look different if the thesis were false.
- Drop what would look the same either way.
- Name at least one item that cuts against the thesis, if the pack has one.`,
      example:
        "Suppose the thesis is about steady ETF demand. Keep: the flow series (direct), the ETF news item (it may describe a cause of flows). Drop: the order book (one venue, unrelated to creations and redemptions), the index snapshot (a basket return says nothing about ETF demand). Against: if ETH flows were negative over the same window, that cuts against a story of broad demand and must be mentioned.",
    },
    {
      heading: "Observation and interpretation in separate sentences",
      body: `An **observation** is something the data shows: "24-hour volume was 12 billion, about 50% above the 30-day average." An **interpretation** is what you make of it: "I read this as a repricing with wide participation."

Analysts get into trouble when the two are written in the same voice. "Buyers stepped in" sounds like an observation but is an interpretation; no dataset shows buyers stepping in, because every trade has a buyer and a seller. "The market is nervous", "whales are accumulating", "sellers are exhausted" are all interpretations wearing the clothes of facts.

The fix is mechanical. Write observations with the number, the source and the time. Write interpretations in a sentence that begins with a marker: "I infer", "this is consistent with", "one reading is". A reader can then check every observation and argue with every interpretation. That is what makes an analysis useful to someone other than its author.

- Observation: number, source, time.
- Interpretation: a marked sentence, with the observation it rests on.
- Never let an interpretation stand alone as if it were seen.`,
      example:
        "Mixed: 'Strong inflows show institutions are back.' Separated: 'Observation: ten-day net BTC ETF inflow was +830 million, with eight positive days (provider, settled through yesterday). Interpretation: this is consistent with steady ETF demand; the data does not say who the buyers are, so \"institutions\" is a guess I cannot support from the pack.'",
    },
    {
      heading: "Say what is missing",
      body: `Every evidence pack is partial. A snapshot covers spot but not derivatives. A news feed covers what was published, not what happened. An order book covers one venue at one block. Flow data is a day late. An index snapshot gives weights but not member returns.

Before you conclude, write a short list of what you would want and do not have, and next to each item say which conclusion it weakens. This is not a disclaimer to tack on the end. It changes what you can claim. If you cannot see intraday prices, you cannot say which came first, the headline or the move. If you cannot see member returns, you cannot say how broad an index move was.

A good missing-information list is specific: not "more data would help" but "intraday BTC prices around 14:00 UTC, to test whether the move preceded the article". Specific gaps point at specific limits of the analysis, and they tell the reader exactly what evidence would move you.

- List the gaps.
- Link each gap to the conclusion it weakens.
- Make each gap specific enough that someone could go and fill it.`,
      example:
        "Suppose your thesis links a price fall to a regulatory item. Gaps: (1) intraday price path, which weakens any timing claim; (2) derivatives liquidation data, which weakens the claim that the article was the main driver; (3) a second source for the article, which weakens the factual basis. Each gap maps to a part of the argument that must be hedged.",
    },
    {
      heading: "Calibrated confidence and a written invalidation",
      body: `**Confidence** should follow evidence, not tone. Strong words ("clearly", "definitely") add nothing a reader can check. Instead, give a level (low, medium, high, or a rough percentage) and say what it rests on. Confidence rises with primary sources, with multiple independent lines of evidence, and with a mechanism you can describe. It falls with single sources, short windows, missing data and moves that are within normal range.

**Invalidation** is the observation that would make you drop the thesis. Write it in advance, with a number and a time window: "If net BTC ETF flows are negative on four of the next five trading days, I will drop the steady-demand thesis." A thesis with no invalidation cannot be wrong, which means it cannot be right either; any outcome can be read as confirming it.

Together, confidence and invalidation make an analysis honest and useful. The reader knows how much weight to put on it and exactly what would change your mind.

- Confidence: a level, plus what it rests on, plus what would move it.
- Invalidation: a specific observation, a number, a window.
- No "whatever happens, this confirms it".`,
      example:
        "'Confidence: medium. It rests on ten days of settled flow data from one provider and one news item; it would rise with a second provider's series or a longer window, and fall if ETH flows diverge. Invalidation: negative net BTC ETF flow on four of the next five trading days, or a single day below −500 million.'",
    },
  ],
  knowledgeChecks: [
    {
      id: "kc.reasoning.thesis.1",
      skillId: "reasoning.thesis",
      prompt: "Which of these is the best-formed thesis?",
      options: [
        {
          id: "a",
          text: "Crypto is looking strong.",
          correct: false,
          explanation:
            "No asset, no quantity, no window, and nothing that could show it false. It cannot be tested.",
        },
        {
          id: "b",
          text: "Over the last ten settled trading days, net BTC ETF inflows were positive on at least seven days; this suggests steady ETF demand, with no claim about price.",
          correct: true,
          explanation:
            "Specific (BTC ETF net inflow), bounded (ten settled days), testable (count the days), and it says what it does not claim.",
        },
        {
          id: "c",
          text: "BTC will rise because ETF inflows are strong.",
          correct: false,
          explanation:
            "It is a price prediction built on a flows-to-price link the data cannot support, and it has no window.",
          misconceptionId: "flows-equal-price-impact",
        },
        {
          id: "d",
          text: "Whatever happens this week, demand is clearly building.",
          correct: false,
          explanation:
            "'Whatever happens' means no outcome could show it false, and 'clearly' is confidence without evidence.",
          misconceptionId: "thesis-without-invalidation",
        },
      ],
    },
    {
      id: "kc.reasoning.observation-vs-interpretation.1",
      skillId: "reasoning.observation-vs-interpretation",
      prompt: "Which sentence is an observation rather than an interpretation?",
      options: [
        {
          id: "a",
          text: "Buyers stepped in at 58,000.",
          correct: false,
          explanation:
            "No dataset shows 'buyers stepping in'. Every trade has a buyer and a seller. This is an interpretation of a price bounce.",
          misconceptionId: "observation-is-interpretation",
        },
        {
          id: "b",
          text: "24-hour volume was 12 billion, about 50% above the 30-day average, per the provider snapshot at 09:00 UTC.",
          correct: true,
          explanation:
            "Number, comparison, source and time. Anyone can check it, and it makes no claim about why.",
        },
        {
          id: "c",
          text: "The market is nervous ahead of the data release.",
          correct: false,
          explanation:
            "'Nervous' is a state of mind attributed to a market. It is an interpretation, and should be marked as one.",
          misconceptionId: "observation-is-interpretation",
        },
        {
          id: "d",
          text: "Whales are accumulating, which is why the bid is deep.",
          correct: false,
          explanation:
            "Who placed the bids is not in the book, and 'which is why' asserts a cause. Two interpretations in one sentence.",
          misconceptionId: "imbalance-predicts-price",
        },
      ],
    },
    {
      id: "kc.reasoning.uncertainty.1",
      skillId: "reasoning.uncertainty",
      prompt:
        "An analysis rests on ten days of flow data from one provider and one news item citing an anonymous source. Which confidence statement is best?",
      options: [
        {
          id: "a",
          text: "High confidence; the picture is clear and everyone agrees.",
          correct: false,
          explanation:
            "'Clear' and 'everyone agrees' are tone, not evidence. One provider and one anonymous source do not support high confidence.",
          misconceptionId: "confidence-is-evidence",
        },
        {
          id: "b",
          text: "Medium confidence; it rests on one provider's ten-day series and one unconfirmed item, and would rise with a second series or a primary source.",
          correct: true,
          explanation:
            "A level, what it rests on, and what would move it. This is calibrated to the evidence.",
        },
        {
          id: "c",
          text: "No confidence can be given because the future is uncertain.",
          correct: false,
          explanation:
            "Uncertainty about the future does not stop you rating the evidence you have. Refusing to give a level is not calibration.",
        },
        {
          id: "d",
          text: "High confidence, because two outlets published the news item.",
          correct: false,
          explanation:
            "If both outlets rely on the same anonymous source, that is one source. Repetition does not raise confidence.",
          misconceptionId: "single-source-certainty",
        },
      ],
    },
    {
      id: "kc.reasoning.invalidation.1",
      skillId: "reasoning.invalidation",
      prompt:
        "The thesis is 'ETF demand for BTC is steady'. Which is a proper invalidation condition?",
      options: [
        {
          id: "a",
          text: "If price falls, that confirms sellers are exhausted; if it rises, demand is proven.",
          correct: false,
          explanation:
            "Both outcomes are read as confirmation. A thesis that nothing could falsify is not an analysis.",
          misconceptionId: "thesis-without-invalidation",
        },
        {
          id: "b",
          text: "Negative net BTC ETF flow on four of the next five trading days, or any single day below −500 million.",
          correct: true,
          explanation:
            "A specific observation, with a number and a window, in the same data series the thesis is about.",
        },
        {
          id: "c",
          text: "If I change my mind.",
          correct: false,
          explanation:
            "An invalidation must be an observation in the world, not a feeling. Otherwise it cannot be set in advance.",
          misconceptionId: "thesis-without-invalidation",
        },
        {
          id: "d",
          text: "If BTC falls 10% this week.",
          correct: false,
          explanation:
            "A price fall is not evidence about ETF demand; flows could stay positive through a fall. The condition must test the thesis, not something else.",
          misconceptionId: "flows-equal-price-impact",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "ex.reasoning.thesis-and-evidence",
      skillIds: ["reasoning.thesis", "reasoning.evidence-selection", "reasoning.observation-vs-interpretation"],
      kind: "scenario",
      title: "Write a thesis and choose your evidence",
      difficulty: 4,
      learningObjective:
        "State a testable thesis about ETF demand, select the evidence that bears on it, and keep observations and interpretations apart.",
      evidenceRequirements: ["etf:BTC", "etf:ETH", "news:etf", "snapshot:BTC", "index:all"],
      questions: [
        "Write a one-sentence thesis about ETF demand for BTC over the last ten settled trading days. It must name a quantity, a window and something that could show it false.",
        "From the pack, pick the two or three items that bear on the thesis. For each, say what it shows and why it matters. Name at least one item you are leaving out and why.",
        "Write your observations as separate sentences with number, source and time. Then write your interpretations as marked sentences.",
        "Does anything in the pack cut against your thesis? Say so.",
      ],
      expectedReasoning: [
        "Produces a specific, bounded, testable thesis",
        "Selects evidence by whether it would look different if the thesis were false",
        "Separates observation and interpretation in form, not only in word",
        "Reports evidence that cuts against the thesis",
      ],
      rubric: makeRubric({
        factual: [
          "The thesis names a quantity, a window and a falsifying observation",
          "Observations quote figures from the pack correctly",
          "The ETF fields are described correctly (net inflow, cumulative, net assets)",
          "The thesis makes no claim about price impact",
          "Items left out are described correctly as not bearing on ETF demand",
        ],
        evidence: [
          "Keeps the BTC flow series as the primary evidence",
          "Uses the ETH series or the ETF news item as a second line, with a reason",
          "Explicitly drops at least one item (for example the index snapshot) with a reason",
          "Cites dates, provider and settlement status",
        ],
        reasoning: [
          "Explains the 'would it look different if false' test for each kept item",
          "Writes interpretations as marked sentences resting on named observations",
          "Reports contrary evidence rather than omitting it",
          "Keeps 'who is buying' out of the claims unless the pack supports it",
        ],
        uncertainty: [
          "Notes the T+1 lag and the single-provider source",
          "Avoids words such as 'clearly' and 'definitely'",
          "States that the thesis is about demand for the ETF wrapper only",
          "Says what would strengthen the evidence base",
        ],
        keyPoints: [
          "a thesis must be specific bounded in time and testable",
          "evidence bears on a claim if it would look different were the claim false",
          "the btc flow series is the direct evidence for an etf demand thesis",
          "the order book and index snapshot do not bear on etf demand",
          "observations carry a number a source and a time",
          "interpretations are marked as the analyst's reading",
          "contrary evidence must be reported not dropped",
        ],
        acceptableAlternatives: [
          "A thesis about ETH ETF demand instead of BTC, if the pack supports it",
          "A thesis that demand is weak or mixed, if the flow series supports it",
          "Keeping the BTC snapshot as context for net assets, with a reason",
        ],
        commonMisconceptionIds: [
          "more-evidence-is-stronger",
          "observation-is-interpretation",
          "flows-equal-price-impact",
          "narrative-is-evidence",
        ],
      }),
      hints: [
        "Write the thesis before you look at the evidence in detail. Then ask of each item: would this look different if my thesis were false?",
        "For every sentence you write, ask: is this a number from the pack, or is this what I think the number means? Put them in separate sentences.",
        "A full answer has a thesis with a count and a window, two or three kept items each with a reason, one dropped item with a reason, observation sentences with sources and times, marked interpretation sentences, and a line about any contrary data such as ETH flows.",
      ],
    },
    {
      id: "ex.reasoning.gaps-and-confidence",
      skillIds: ["reasoning.missing-info", "reasoning.uncertainty", "reasoning.evidence-selection"],
      kind: "scenario",
      title: "What is missing, and how sure are you?",
      difficulty: 5,
      learningObjective:
        "Analyse a possible news-to-price link, list the specific gaps in the evidence, map each gap to the conclusion it weakens, and state a calibrated confidence.",
      evidenceRequirements: ["snapshot:BTC", "snapshot:ETH", "news:market", "news:macro", "orderbook:vBTC_vUSDC"],
      questions: [
        "State the strongest claim you could make linking a news item in the pack to BTC's 24-hour change. Write it in 'consistent with' form.",
        "List at least three specific pieces of information the pack does not contain, and for each say which part of your claim it weakens.",
        "Give a confidence level for the claim. Say exactly what it rests on and what would raise or lower it.",
        "Which item in the pack is least relevant to this question, and why might a weaker analysis have included it anyway?",
      ],
      expectedReasoning: [
        "Frames the claim as consistent-with, not causal",
        "Produces specific, fillable gaps",
        "Maps each gap to a conclusion",
        "Calibrates confidence to sources, windows and mechanism",
      ],
      rubric: makeRubric({
        factual: [
          "Reads the 24-hour change and the item's publish time correctly",
          "States correctly that a snapshot cannot show intraday timing",
          "States correctly that the snapshot covers spot and not derivatives",
          "Identifies the order book as one venue at one block",
          "Does not assert causation",
        ],
        evidence: [
          "Cites the news item, its publisher and its source type",
          "Cites the snapshot timestamp and the book's block time",
          "Uses the ETH snapshot to check whether the move was market-wide",
          "Uses the macro feed to look for a competing driver",
        ],
        reasoning: [
          "Each gap is specific enough that someone could go and fill it",
          "Each gap is tied to the conclusion it weakens",
          "Confidence is justified by source quality, window length and mechanism, not by tone",
          "Explains why the least relevant item is tempting to include",
        ],
        uncertainty: [
          "Gives a level and what would move it",
          "Keeps alternatives (macro, market-wide, noise) on the page",
          "Avoids 'clearly', 'definitely' and similar words",
          "Notes that the move may be within normal range and need no explanation",
        ],
        keyPoints: [
          "consistent with is the strongest honest form for a news-to-price link",
          "intraday prices are needed to test timing",
          "derivatives data is needed to test the main driver",
          "a second independent source is needed to firm up the news fact",
          "a gap weakens a specific conclusion not the analysis in general",
          "confidence rests on source quality window length and mechanism",
          "a move within normal range needs no special explanation",
        ],
        acceptableAlternatives: [
          "Concluding that no item in the pack plausibly links to the move",
          "Treating the ETH move as evidence for a market-wide driver",
          "Using the order book as weak evidence of current liquidity rather than dropping it entirely",
        ],
        commonMisconceptionIds: [
          "missing-data-is-neutral",
          "confidence-is-evidence",
          "correlation-is-causation",
          "more-evidence-is-stronger",
        ],
      }),
      hints: [
        "Write the claim first. Then, for each part of it (timing, size, mechanism, the fact itself), ask what data you would need to check that part.",
        "A gap is only useful if it points at a conclusion. 'We lack intraday prices' matters because it stops you saying which came first.",
        "A full answer has a 'consistent with' claim, three specific gaps each tied to a conclusion, a confidence level with its basis and movers, and a note that the order book (one venue, one block) is the least relevant item here.",
      ],
    },
    {
      id: "ex.reasoning.full-brief",
      skillIds: [
        "reasoning.thesis",
        "reasoning.invalidation",
        "reasoning.uncertainty",
        "reasoning.observation-vs-interpretation",
        "reasoning.missing-info",
      ],
      kind: "scenario",
      title: "The full brief",
      difficulty: 5,
      learningObjective:
        "Produce a complete short analysis from the whole pack: thesis, evidence, observations and interpretations, gaps, confidence, and a written invalidation.",
      evidenceRequirements: ["snapshot:BTC", "snapshot:ETH", "news:market", "news:etf", "etf:BTC", "index:all", "orderbook:vBTC_vUSDC"],
      questions: [
        "Write a thesis about the current state of the BTC market (demand, liquidity or the news-to-price relationship) that is specific, bounded in time and testable.",
        "Present the evidence in two labelled blocks: observations (number, source, time) and interpretations (marked).",
        "List the gaps in the pack and the conclusions each gap weakens.",
        "State your confidence and what it rests on.",
        "Write an invalidation condition with a number and a time window in the same data series as your thesis.",
        "What would improve this analysis most, if you could add one dataset?",
      ],
      expectedReasoning: [
        "Produces a thesis that is specific, bounded and testable",
        "Keeps observation and interpretation in separate labelled blocks",
        "Lists gaps mapped to conclusions",
        "Writes an invalidation that tests the thesis in its own data series",
      ],
      rubric: makeRubric({
        factual: [
          "The thesis is specific, bounded and testable",
          "Observations quote the pack's figures correctly across at least three data types",
          "The ETF, index and order book fields used are described correctly",
          "No figure is presented as a value judgement or a price forecast",
          "The invalidation is in the same data series as the thesis",
        ],
        evidence: [
          "Uses only the items that bear on the thesis and names those left out",
          "Cites source, time and provenance for each observation",
          "Reports any item that cuts against the thesis",
          "Uses the ETH snapshot or index as a check on whether a move was market-wide, where relevant",
        ],
        reasoning: [
          "Interpretations are marked and each rests on a named observation",
          "The argument moves from observations to thesis without a causal leap",
          "Gaps are specific and tied to conclusions",
          "The single most valuable missing dataset is chosen with a reason",
        ],
        uncertainty: [
          "Confidence is a level with its basis and what would move it",
          "The invalidation has a number and a window",
          "Alternatives are kept on the page",
          "No 'whatever happens' or 'clearly' language",
        ],
        keyPoints: [
          "a thesis must be specific bounded in time and testable",
          "observations are separated from interpretations in labelled blocks",
          "evidence is chosen by whether it bears on the thesis",
          "each gap weakens a named conclusion",
          "confidence is a level tied to sources windows and mechanism",
          "an invalidation names a number and a time window in the thesis's own data",
          "contrary evidence is reported rather than dropped",
        ],
        acceptableAlternatives: [
          "A thesis about liquidity on the venue, with invalidation in spread or depth terms",
          "A thesis that the news-to-price link cannot be established, with invalidation as the arrival of specific evidence",
          "A thesis about ETF demand, with invalidation in flow terms",
        ],
        commonMisconceptionIds: [
          "thesis-without-invalidation",
          "confidence-is-evidence",
          "observation-is-interpretation",
          "correlation-is-causation",
          "flows-equal-price-impact",
          "imbalance-predicts-price",
        ],
      }),
      hints: [
        "Pick one thing to claim. Demand, liquidity, or the news link. Not all three.",
        "Your invalidation must be measurable in the same data your thesis is about. A flows thesis needs a flows invalidation, not a price one.",
        "A full brief has: one thesis sentence; an observations block with sources and times; a marked interpretations block; a gap list with the conclusion each weakens; 'confidence: level, basis, movers'; 'invalidation: number, window, series'; and one named dataset that would help most.",
      ],
    },
  ],
  rubricNotes:
    "This module grades form as much as content. A learner can get the facts right and still fail the reasoning dimension by mixing observations with interpretations, padding with irrelevant evidence, or writing a thesis nothing could falsify. Cap the uncertainty score for any answer with no invalidation condition or with confidence expressed through tone. Reward answers that report contrary evidence unprompted.",
  recommendedNext:
    "You have finished the foundations track. Return to any module where your mastery is below target, or use the Order Book Gym and live scenarios to keep the habits sharp with fresh data.",
};
