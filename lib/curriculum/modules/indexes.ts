import type { Module } from "@/lib/types/curriculum";
import { makeRubric } from "../rubric";
import { indexNavObjective, indexNavConcept, indexNavCheck } from "./wave2-additions";

export const indexesModule: Module = {
  id: "indexes",
  sequence: 4,
  title: "Indexes",
  summary:
    "What a crypto index is made of: constituents, weights, concentration and diversification, and how to break an index return into member contributions so you never assume the whole basket moved together.",
  learningObjectives: [
    "Read an index's constituent list and explain that membership follows rules and is reviewed.",
    "Work out what a weight means for the index return and compare capitalisation-weighted with equal-weighted designs.",
    "Measure concentration as the top-N weight share and explain what it does to risk.",
    "Judge whether an index spreads risk, given how its members tend to move together.",
    "Decompose an index return into weight-times-return contributions and identify which members drove it.",
    indexNavObjective,
  ],
  prerequisiteModuleIds: ["markets"],
  skillIds: [
    "indexes.constituents",
    "indexes.weighting",
    "indexes.concentration",
    "indexes.diversification",
    "indexes.performance",
    "indexes.index-nav",
  ],
  concepts: [
    {
      heading: "An index is a rule, applied to a list",
      body: `A crypto **index** is a number that summarises the price of a basket of assets. The basket is the list of **constituents** (members), and each member has a **weight** that says how much of the index it accounts for. Weights add up to 1 (or 100%).

Who is in the basket is not arbitrary. An index provider publishes a **methodology**: rules such as "the ten largest assets by market capitalisation that also meet a liquidity threshold, excluding stablecoins". The list is reviewed on a schedule, say monthly or quarterly, and assets enter or leave when they cross the rules. So a member today may not be a member next quarter.

The index also has a **value** (a level, like 20.93) that is only meaningful relative to its own past, and a **24-hour change** and longer returns (7-day, 1-month, year-to-date) that are usually quoted as fractions or percentages.

When you read an index snapshot, start with three questions:

- What is the selection rule, and when was the list last reviewed?
- What are the weights, from largest to smallest?
- Which returns are shown, and over which windows?`,
      example:
        "Suppose an index called 'Layer 1' lists seven constituents with BTC at 31%, ETH at 24%, and five others sharing the remaining 45%. The index value is 20.93 and its 24-hour change is −0.16%. The level 20.93 means nothing on its own; the weights and the rule that produced them are where the information is.",
    },
    {
      heading: "Weights decide what moves the index",
      body: `The index return over a period is the sum, across members, of each member's weight multiplied by that member's return. That is the single formula you need:

index return ≈ Σ (weight × member return)

A member with a 40% weight that rises 5% adds 2 percentage points to the index. A member with a 2% weight that rises 50% adds 1 point. The big weight matters more than the big move.

Most crypto indexes are **capitalisation-weighted**: weight is proportional to market cap, sometimes with a cap so one asset cannot exceed, say, 40%. The alternative is **equal weight**, where every member has the same weight regardless of size. The two designs give different returns from the same members. Equal weight gives small members as much say as large ones, so it is more sensitive to the smaller, usually more volatile, names.

Unless the methodology says equal weight, assume it is not. "One of seven members" does not mean "one seventh of the index".

- Weight × return = contribution.
- Capitalisation weight: big assets dominate.
- Equal weight: small assets matter as much as big ones.`,
      example:
        "Suppose a two-member index has A at 80% and B at 20%. Over a day, A falls 1% and B rises 10%. Index return ≈ 0.8 × (−1%) + 0.2 × 10% = −0.8% + 2.0% = +1.2%. An equal-weight version would return 0.5 × (−1%) + 0.5 × 10% = +4.5%. Same members, different number.",
    },
    {
      heading: "Concentration: how much sits at the top",
      body: `**Concentration** describes how much of the index is held by its largest members. A simple measure is the **top-N weight share**: add the weights of the biggest N members. If the top two hold 70%, the index is highly concentrated even if it has twenty names.

Concentration is not a flaw; it is a property. It means the index behaves mostly like its largest members. A 20-name index with 70% in two assets will track those two assets closely, and the other eighteen will barely move the figure. The number of names tells you little. The weight distribution tells you almost everything.

Why it matters for risk: if one heavily weighted member has an asset-specific problem (a protocol bug, a delisting), the index takes most of that hit. In a less concentrated index, the same event would be diluted.

A quick reading routine:

- Sort weights descending.
- Report the top-1, top-3 and top-5 shares.
- Say which members, if they moved alone, could move the index by a full percentage point.`,
      example:
        "Suppose an index has ten members with weights 35%, 25%, 12%, 8%, 6%, 5%, 4%, 3%, 1%, 1%. The top-2 share is 60%; the top-5 share is 86%. The bottom five together hold 14%. If the largest member fell 3% and everything else was flat, the index would fall about 1.05%. If the smallest member fell 50%, the index would fall 0.5%.",
    },
    {
      heading: "Diversification depends on co-movement, not count",
      body: `**Diversification** is the reduction of risk you get from holding things that do not all move together. Holding many names helps only if their returns are at least partly independent.

Crypto assets tend to move together, especially in stress. When BTC falls sharply, most other crypto assets usually fall too, often by more. So an index of ten crypto assets diversifies away some **asset-specific** risk (one protocol failing) but little of the **market-wide** risk (the whole sector falling). It is spread, but spread across things that mostly rise and fall as a group.

Concentration makes this worse: a concentrated index gets both high exposure to one name and high exposure to the sector.

Honest language for an index: "spreads single-asset risk across N names with top-3 share X%; members tend to move together, so it does not protect against a sector-wide fall." Avoid "diversified" as a bare adjective.

- Count of names is not diversification.
- Co-movement limits diversification, and crypto co-movement is high.
- Say which risk the index spreads and which it does not.`,
      example:
        "Suppose an index of seven large-cap assets fell 8% on a day when each member fell between 6% and 11%. Seven names did not protect it, because they all moved the same way. The index did protect against the case where one member alone fell 40%: that member's weight would have limited the damage.",
    },
    {
      heading: "Decomposing an index return",
      body: `When an index moves, do not assume every member moved the same way. The index is a weighted sum, so one heavy member rising can lift the index while most members fall.

To decompose a return you need each member's weight and each member's return over the same window. Multiply them, list the contributions, and sort. Then you can say which members drove the result and which worked against it. The sum of the contributions should be close to the index return (rounding and intra-period weight drift explain small differences).

If you only have member weights and the index return, you cannot do the full decomposition. You can still bound things: if the index rose 2% and the largest member (40%) was flat, the other 60% must have contributed the full 2%, implying an average member return around 3.3% among them.

Guard against the error in both directions: "the index is up so the sector is up" and "the sector is up so every coin is up". Always check the spread of member returns.

- Contribution = weight × member return.
- Sort contributions to find the drivers.
- Report how many members rose and how many fell, not only the index figure.`,
      example:
        "Suppose an index rose 2.0% with weights A 50%, B 30%, C 20% and returns A +6%, B −2%, C −3%. Contributions: A +3.0, B −0.6, C −0.6, total +1.8% (close to 2.0% after rounding). Two of three members fell, yet the index rose. 'The sector rallied' would misdescribe this day.",
    },
    indexNavConcept,
  ],
  knowledgeChecks: [
    {
      id: "kc.indexes.weighting.1",
      skillId: "indexes.weighting",
      prompt:
        "A two-member index has A at 80% and B at 20%. Over a day, A falls 1% and B rises 10%. What is the index return, roughly?",
      options: [
        {
          id: "a",
          text: "+4.5%, the average of the two returns.",
          correct: false,
          explanation:
            "That is the equal-weight answer. This index is 80/20, so A's return counts four times as much as B's.",
          misconceptionId: "index-is-equal-weight",
        },
        {
          id: "b",
          text: "+1.2%: 0.8 × (−1%) + 0.2 × 10%.",
          correct: true,
          explanation:
            "Index return is the sum of weight times member return. −0.8% + 2.0% = +1.2%.",
        },
        {
          id: "c",
          text: "+10%, because B rose 10%.",
          correct: false,
          explanation:
            "B is only a fifth of the index. Its 10% rise contributes 2 percentage points, not 10.",
          misconceptionId: "index-return-is-every-asset",
        },
        {
          id: "d",
          text: "−1%, because A is the larger member.",
          correct: false,
          explanation:
            "A dominates, but B's contribution is not zero. 0.2 × 10% = +2% outweighs A's −0.8%.",
        },
      ],
    },
    {
      id: "kc.indexes.concentration.1",
      skillId: "indexes.concentration",
      prompt:
        "An index has ten members with weights 35, 25, 12, 8, 6, 5, 4, 3, 1, 1 (percent). Which statement is most accurate?",
      options: [
        {
          id: "a",
          text: "It is well diversified because it has ten members.",
          correct: false,
          explanation:
            "The count of names says little. The top two hold 60% and the top five hold 86%, so the index behaves mostly like its largest members.",
          misconceptionId: "concentration-is-diversification",
        },
        {
          id: "b",
          text: "Top-2 share is 60% and top-5 share is 86%; the bottom five barely move the index.",
          correct: true,
          explanation:
            "Reporting top-N shares is the right way to describe concentration. The bottom five hold 14% combined.",
        },
        {
          id: "c",
          text: "Each member contributes 10% of the index return.",
          correct: false,
          explanation:
            "Weights are given and they are not equal. Contribution is weight times return, so the 35% member matters 35 times as much as a 1% member.",
          misconceptionId: "index-is-equal-weight",
        },
        {
          id: "d",
          text: "The smallest member is the riskiest for the index.",
          correct: false,
          explanation:
            "Even a 50% fall in a 1% member moves the index 0.5%. A 3% fall in the 35% member moves it about 1.05%. Weight sets the index-level risk.",
        },
      ],
    },
    {
      id: "kc.indexes.performance.1",
      skillId: "indexes.performance",
      prompt:
        "An index rose 2% with weights A 50%, B 30%, C 20% and member returns A +6%, B −2%, C −3%. Which description of the day is correct?",
      options: [
        {
          id: "a",
          text: "The sector rallied; all members gained.",
          correct: false,
          explanation:
            "Two of three members fell. A's +6% on a 50% weight (+3 points) outweighed B and C's combined −1.2 points.",
          misconceptionId: "index-return-is-every-asset",
        },
        {
          id: "b",
          text: "A contributed about +3 points; B and C together about −1.2; two of three members fell.",
          correct: true,
          explanation:
            "Contribution = weight × return. Reporting the drivers and the count of risers and fallers is the honest description.",
        },
        {
          id: "c",
          text: "The index must be wrong, because most members fell.",
          correct: false,
          explanation:
            "A weighted sum can rise while most members fall, when a heavy member rises enough. Nothing is wrong with the figure.",
          misconceptionId: "index-is-equal-weight",
        },
        {
          id: "d",
          text: "Each member rose by about 2%.",
          correct: false,
          explanation:
            "The index return is not the return of each member. Member returns here range from −3% to +6%.",
          misconceptionId: "index-return-is-every-asset",
        },
      ],
    },
    {
      id: "kc.indexes.diversification.1",
      skillId: "indexes.diversification",
      prompt:
        "An index of seven large-cap crypto assets fell 8% on a day when every member fell between 6% and 11%. What does this show about diversification?",
      options: [
        {
          id: "a",
          text: "The index is not diversified, so it is badly built.",
          correct: false,
          explanation:
            "The index did spread single-asset risk across seven names. What it could not do is protect against a sector-wide fall, because members moved together.",
        },
        {
          id: "b",
          text: "Diversification across assets that move together reduces single-asset risk but not sector-wide risk.",
          correct: true,
          explanation:
            "This names which risk was spread and which was not. Co-movement, not the count of names, limits the benefit.",
        },
        {
          id: "c",
          text: "With seven members the index should have been protected from an 8% fall.",
          correct: false,
          explanation:
            "Seven names only help if their returns are partly independent. Crypto assets usually fall together in stress.",
          misconceptionId: "diversification-removes-risk",
        },
        {
          id: "d",
          text: "The index is diversified because it has seven constituents.",
          correct: false,
          explanation:
            "Count is not diversification. The day's returns show the members moved as a group, which is exactly what diversification cannot fix.",
          misconceptionId: "concentration-is-diversification",
        },
      ],
    },
    indexNavCheck,
  ],
  exercises: [
    {
      id: "ex.indexes.read-the-basket",
      skillIds: ["indexes.constituents", "indexes.weighting", "indexes.concentration"],
      kind: "scenario",
      title: "Read the basket",
      difficulty: 3,
      learningObjective:
        "Describe an index from its constituent list and weights: who is in it, how concentrated it is, and which members could move it by a full percentage point.",
      evidenceRequirements: ["index:all", "snapshot:BTC", "snapshot:ETH"],
      questions: [
        "Pick one index from the pack. List its constituents in weight order and report the top-1, top-3 and top-5 weight shares.",
        "Is the index capitalisation-weighted, equal-weighted, or something else? What in the data supports your answer, and what would you need to confirm it?",
        "Which members, moving alone by 3%, would move the index by at least 1 percentage point?",
        "What does the constituent list not tell you about how the index is built?",
      ],
      expectedReasoning: [
        "Sorts and sums weights correctly",
        "Infers the weighting scheme from the weight distribution and the snapshots",
        "Applies weight × return to find the members that matter",
        "Names the methodology (selection rules, review schedule) as missing",
      ],
      rubric: makeRubric({
        factual: [
          "Lists constituents and weights correctly from the index snapshot",
          "Computes top-1, top-3 and top-5 shares correctly",
          "Correctly identifies which members at 3% would move the index by 1 point (weight ≥ about 33%)",
          "Does not assume equal weight unless the weights are equal",
          "Describes the index level as meaningful only relative to its own history",
        ],
        evidence: [
          "Cites the index name and as-of time",
          "Uses the BTC and ETH snapshots (market cap) to test the capitalisation-weight hypothesis",
          "Quotes the weights as given (fractions or percentages) without rounding errors that change the ranking",
          "Notes the provenance of the index data",
        ],
        reasoning: [
          "Explains why top-N share is a better concentration measure than member count",
          "Explains the link between weight and index-level sensitivity",
          "Reasons from the ratio of BTC to ETH weights versus their market caps to a weighting hypothesis",
          "Identifies the methodology as the thing that would confirm or refute the hypothesis",
        ],
        uncertainty: [
          "Marks the weighting scheme as inferred, not confirmed",
          "Notes that weights drift between rebalances",
          "Names the missing information: selection rule, review schedule, caps",
          "Avoids calling the index diversified or concentrated without a number",
        ],
        keyPoints: [
          "constituents are chosen by a published rule and reviewed on a schedule",
          "weights add up to one and are listed descending",
          "top-n weight share measures concentration",
          "contribution equals weight multiplied by member return",
          "a member needs a weight of about a third to move the index one point on a 3% move",
          "the ratio of weights to market caps suggests the weighting scheme",
          "the methodology is not in the pack and must be treated as unknown",
        ],
        acceptableAlternatives: [
          "Reporting top-2 instead of top-3 if the index has few members",
          "Concluding 'capped capitalisation weight' if the largest weight looks capped",
          "Using a 2% or 5% hypothetical move with the threshold recomputed",
        ],
        commonMisconceptionIds: [
          "index-is-equal-weight",
          "concentration-is-diversification",
          "index-members-are-fixed",
        ],
      }),
      hints: [
        "Sort the weights from largest to smallest and add from the top. The first three numbers you write are top-1, top-3, top-5.",
        "If BTC's market cap is about three times ETH's, what ratio of weights would you expect under capitalisation weighting? Compare with the pack.",
        "A full answer gives the sorted list, the three shares, a weighting hypothesis tied to the market cap ratio, the members above the one-third threshold, and says the selection rule and review date are not in the pack.",
      ],
    },
    {
      id: "ex.indexes.who-moved-it",
      skillIds: ["indexes.performance", "indexes.weighting"],
      kind: "scenario",
      title: "Who moved the index?",
      difficulty: 3,
      learningObjective:
        "Use weights and whatever member returns are available to say which constituents drove an index's 24-hour change, and what you cannot decompose.",
      evidenceRequirements: ["index:all", "snapshot:BTC", "snapshot:ETH"],
      questions: [
        "Pick one index. State its 24-hour change. For the members whose 24-hour returns you have (from the snapshots), compute each one's contribution (weight × return).",
        "What do those contributions add up to, and what does the gap between that sum and the index change tell you about the members you cannot see?",
        "Can you say whether 'most members rose' or 'most members fell'? If not, what would you need?",
        "Write the one-sentence description of the day that the data supports, and one that it does not.",
      ],
      expectedReasoning: [
        "Computes contributions for known members",
        "Bounds the contribution of unknown members from the residual",
        "Refuses to describe the breadth of the move without member returns",
        "Writes observation and interpretation as separate sentences",
      ],
      rubric: makeRubric({
        factual: [
          "States the index 24-hour change correctly",
          "Computes contributions for BTC and ETH correctly using the index weights and snapshot returns",
          "Computes the residual correctly",
          "Infers the average return of the unseen members from the residual and their combined weight",
          "Does not claim every member moved the same way",
        ],
        evidence: [
          "Cites the index, its weights and its as-of time",
          "Cites the snapshot returns and their timestamps",
          "Notes that the index window and the snapshot windows may not line up exactly",
          "Uses only members present in both the index and the snapshots for the computation",
        ],
        reasoning: [
          "Explains the contribution formula and applies it",
          "Explains how the residual bounds the unseen members",
          "Explains why breadth (how many rose or fell) cannot be read from the index figure",
          "Keeps the supported sentence to observations and the unsupported one clearly labelled",
        ],
        uncertainty: [
          "Flags window mismatch between sources as a reason the sum may not match",
          "Says that weights may have drifted since the last rebalance",
          "Names member-level returns as the missing data for a full decomposition",
          "Avoids 'the sector rallied' or 'the sector sold off' language",
        ],
        keyPoints: [
          "contribution equals weight multiplied by member return",
          "sum the known contributions and compare with the index change",
          "the residual is the combined contribution of unseen members",
          "the residual divided by the unseen weight gives their average return",
          "breadth cannot be read from the index figure alone",
          "the index and snapshot windows may differ",
          "member-level returns are needed for a full decomposition",
        ],
        acceptableAlternatives: [
          "Expressing contributions in percentage points or in index points, if consistent",
          "Choosing a different index from the pack",
          "Stating a range for the unseen members' average return given window mismatch",
        ],
        commonMisconceptionIds: [
          "index-return-is-every-asset",
          "index-is-equal-weight",
          "observation-is-interpretation",
        ],
      }),
      hints: [
        "You know two members' returns and all the weights. Multiply, add, and compare with the index change.",
        "Whatever is left over came from the members you cannot see. Divide it by their combined weight to get their average move.",
        "A full answer gives BTC and ETH contributions, the residual, the implied average return of the rest, says breadth is unknown without member returns, and writes a supported sentence like 'the index fell X%, with BTC contributing Y points' and flags 'the sector fell' as unsupported.",
      ],
    },
    {
      id: "ex.indexes.is-it-diversified",
      skillIds: ["indexes.diversification", "indexes.concentration"],
      kind: "scenario",
      title: "Is it diversified?",
      difficulty: 3,
      learningObjective:
        "Judge an index's diversification from its weights and the observed co-movement of its members, and say which risk it spreads and which it does not.",
      evidenceRequirements: ["index:all", "snapshot:BTC", "snapshot:ETH", "news:market"],
      questions: [
        "Compare two indexes from the pack (or one index with an imagined equal-weight version of itself). Which is more concentrated, by top-3 share?",
        "Using the BTC and ETH 24-hour changes and the index 24-hour changes, what can you say about whether members moved together today? What can you not say from one day?",
        "For the more concentrated index, name one asset-specific event that would hurt it badly and one sector-wide event that neither index would be protected from.",
        "Write a one-sentence honest description of each index's diversification that includes a number.",
      ],
      expectedReasoning: [
        "Measures concentration numerically before comparing",
        "Uses co-movement, not count, as the basis for diversification claims",
        "Separates asset-specific from market-wide risk",
        "Qualifies any co-movement claim made from a single day",
      ],
      rubric: makeRubric({
        factual: [
          "Computes top-3 shares correctly for both indexes",
          "Reads the 24-hour changes correctly for BTC, ETH and each index",
          "States that diversification depends on co-movement rather than member count",
          "Distinguishes asset-specific from sector-wide risk correctly",
          "Does not describe either index as 'safe' because it is diversified",
        ],
        evidence: [
          "Cites the weights and as-of times of both indexes",
          "Uses the snapshot changes as evidence of same-day co-movement",
          "Uses a news item, if relevant, as an example of an asset-specific or sector-wide event",
          "Notes which members' returns are not in the pack",
        ],
        reasoning: [
          "Explains why top-3 share, not count, measures concentration",
          "Explains how one day of same-sign moves is weak evidence of co-movement, and what longer data would show",
          "Reasons from weights to the damage an asset-specific event would do",
          "Produces descriptions that name the risk spread and the risk not spread",
        ],
        uncertainty: [
          "Marks the co-movement claim as based on one day and therefore weak",
          "Says that historical correlation data is missing",
          "Avoids implying that diversification protects against a sector fall",
          "Keeps the event examples hypothetical",
        ],
        keyPoints: [
          "top-3 weight share is a concentration measure",
          "diversification depends on how members move together",
          "crypto assets tend to fall together in stress",
          "an index spreads single-asset risk but not sector-wide risk",
          "one day of same-sign moves is weak evidence of co-movement",
          "a heavy member with a specific problem hurts a concentrated index most",
          "historical correlation data is needed to judge co-movement properly",
        ],
        acceptableAlternatives: [
          "Using top-2 or top-5 share with the choice stated",
          "Constructing the equal-weight comparison if only one index is in the pack",
          "Using the index's 7-day or 1-month returns alongside the 24-hour change if available",
        ],
        commonMisconceptionIds: [
          "concentration-is-diversification",
          "diversification-removes-risk",
          "index-is-equal-weight",
        ],
      }),
      hints: [
        "Numbers first: top-3 share for each. Then ask whether the members moved the same way today.",
        "Think of two kinds of bad day: one coin has a problem, or the whole sector falls. Which one does spreading across coins help with?",
        "A full answer compares top-3 shares, uses today's changes as weak evidence of co-movement, gives one asset-specific and one sector-wide event, and writes sentences like 'spreads single-asset risk across N names with top-3 share X%; members move together, so a sector fall would hit it in full'.",
      ],
    },
  ],
  rubricNotes:
    "Arithmetic matters here: contributions, top-N shares and residuals should be correct to rounding. Reasoning points depend on the learner refusing two errors: treating members as equal-weighted without evidence, and reading the index return as the return of each member. Reward answers that name the methodology as missing and that say which risk an index spreads and which it does not.",
  recommendedNext:
    "Next is 'The order book', where you will look inside a single venue at the resting orders that produce the prices you have been reading.",
};
