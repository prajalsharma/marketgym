import type { Module } from "@/lib/types/curriculum";
import { makeRubric } from "../rubric";

export const newsModule: Module = {
  id: "news",
  sequence: 2,
  title: "Reading the news",
  summary:
    "How to take a news item apart: what is a fact, what is a claim, who said it, what event it points to, and why 'price moved on the news' is almost never something you can prove.",
  learningObjectives: [
    "Split a news item into verifiable facts, attributed claims and the writer's opinion.",
    "Identify a catalyst, state the expected outcome, and say what a surprise would look like.",
    "Recognise a narrative as a story that organises facts and test whether the facts hold it up.",
    "Rate a claim by its sourcing and keep single-source claims marked as unconfirmed.",
    "Check timing, size and mechanism before linking a headline to a price move, and name at least one alternative explanation.",
  ],
  prerequisiteModuleIds: ["markets"],
  skillIds: [
    "news.facts-vs-opinions",
    "news.catalysts",
    "news.narratives",
    "news.uncertainty",
    "news.causation",
  ],
  concepts: [
    {
      heading: "Facts, claims and opinions",
      body: `A news item is a mix of three kinds of sentence. A **fact** is something you could check against a record: a filing was made, a block was mined, a price printed. A **claim** is something a person or organisation says is true, which may or may not be checkable: "the firm expects approval next quarter." An **opinion** is the writer's or a quoted person's judgement: "this is the most important development of the year."

Headlines compress all three into a few words and usually drop the attribution. "Regulator to approve ETF" might rest on a filing (fact), an unnamed source (claim) or a columnist's guess (opinion). You cannot tell from the headline. You have to open the item.

A simple method: copy the key sentence, then ask three questions.

- Could I verify this against a document or a dataset? If yes, it is a fact.
- Is someone named as saying it? If yes, it is a claim by that person.
- Is it a judgement word (important, bullish, inevitable)? If yes, it is an opinion.

Write your summary with the attribution kept in: "The exchange said it will list X" rather than "X will be listed."`,
      example:
        "Suppose a headline reads 'Major fund set to buy 1 billion of BTC'. The body says 'a person familiar with the matter said the fund is considering' it. The fact is that a news outlet published this. The claim is from an unnamed source and the verb is 'considering', not 'set to'. There is no filing. Your note should say: 'reported, single anonymous source, intention not action, unconfirmed'.",
    },
    {
      heading: "Catalysts: events that could change expectations",
      body: `A **catalyst** is an event that could change what market participants expect. Some are scheduled: a central bank rate decision, an inflation print, a court ruling date, a token unlock, an ETF decision deadline. Some are unscheduled: an exchange outage, a hack, a surprise announcement.

A catalyst does not guarantee a price move. Prices already reflect what people expect. If an event lands exactly as expected, there may be no move at all. What moves price is the gap between the outcome and the expectation. So, for each catalyst, write three things: when it happens, what outcome is expected, and what a surprise in either direction would look like.

The macro calendar in your evidence pack lists scheduled events by date. Use it to answer "is anything scheduled in the next few days that could matter?" rather than "what will happen?".

- Scheduled catalysts: date known, outcome unknown.
- Unscheduled catalysts: neither known in advance.
- The important quantity is outcome minus expectation, not the event itself.`,
      example:
        "Suppose the macro calendar shows an inflation release tomorrow, with a consensus forecast of 3.1% and the previous reading at 3.4%. The catalyst is the release. The expectation is 3.1%. A surprise would be a print well above or below that, say 3.5% or 2.7%. A print of 3.1% would be a catalyst that changed nothing.",
    },
    {
      heading: "Narratives organise facts; they are not facts",
      body: `A **narrative** is a story people use to make sense of many facts at once: "institutions are coming", "regulation is tightening", "this is altcoin season". Narratives are useful because they compress. They are dangerous because they feel like evidence while being a frame.

The test for a narrative is to list the specific observations it rests on and check each one. "Institutions are coming" might rest on: ETF net inflows have been positive for most of the last month; a bank announced a custody product; a survey said allocators plan to add. Each of those is checkable on its own. Some may hold, some may not, and some may be weaker than the story implies (a survey of intentions is not a flow).

Also notice that the same facts can support more than one narrative. Positive ETF inflows fit "institutions are coming" and also fit "retail buying through brokerage accounts". The facts do not pick the story for you.

- Name the narrative.
- List the two or three facts it leans on.
- Check each fact and note which ones are strong.
- Ask which other story the same facts could fit.`,
      example:
        "Suppose three articles in your pack all mention 'growing institutional demand'. The observations behind them are: one week of positive ETF net inflows and one bank press release. That is thin. Your note might say: 'narrative: institutional demand. Support: positive flows over five sessions, one custody announcement. Not supported: any data on who is buying. Also fits: ordinary brokerage demand.'",
    },
    {
      heading: "Sourcing: how sure can you be?",
      body: `Not all claims deserve the same confidence. Rank by source:

- **Primary document**: a regulatory filing, a court order, an on-chain transaction, a company's own announcement on its own channel. Highest confidence, though still check the date and the exact wording.
- **Named official or executive on the record**: strong, but it is still that person's claim.
- **Reputable outlet citing unnamed sources**: a lead. It may be right. Keep it marked "reported, unconfirmed" until a document or a second independent outlet appears.
- **Social media post, repost, screenshot**: lowest confidence until traced to its origin.

Two outlets repeating the same wire story is one source, not two. Independence means the outlets got the information separately.

A news feed's metadata can help: the publisher, the publish time, the link to the original, and which assets the item mentions. A missing original link, or a title that is null, is itself a signal to go carefully.`,
      example:
        "Suppose your pack has two items saying a large exchange is under investigation. Item one cites 'people familiar with the matter'. Item two links to item one. That is one anonymous source. Your confidence note: 'single anonymous source, no filing, two outlets but not independent; treat as unconfirmed'. If item two had instead linked to a regulator's press release, your confidence would rise sharply.",
    },
    {
      heading: "The headline did not necessarily cause the move",
      body: `When a headline and a price move land close together, the natural sentence is "price fell on the news". Resist it. Three things must fit before you can even suggest a cause.

**Timing.** Which came first, to the minute? If price moved an hour before the item was published, the item did not cause it. News timestamps and price timestamps are both in your pack; use them.

**Size.** Is the move unusual for this asset? A 2% move in BTC is ordinary and happens on many days with no news at all. An ordinary move needs no explanation.

**Mechanism.** How would this news change who trades and why? If you cannot describe a path from the item to a change in orders, the link is a guess.

Then list alternatives. A macro release, a large liquidation in derivatives, a move in a related asset, or simple noise could each explain the same move. Your job is to say "consistent with" rather than "caused by", and to keep the alternatives on the page.

- Timing, size, mechanism: all three, not one.
- "Consistent with" is the strongest honest phrase.
- Always name at least one alternative explanation.`,
      example:
        "Suppose BTC is down 3% over 24 hours and the pack contains an article about a regulatory warning, published six hours ago. The move's timing within those 24 hours is unknown from a snapshot alone. A 3% move is within BTC's normal range. The mechanism is plausible but vague. Honest wording: 'the fall is consistent with the warning, but the snapshot cannot show timing, the move is within normal range, and a macro or derivatives driver would explain it equally well.'",
    },
  ],
  knowledgeChecks: [
    {
      id: "kc.news.facts-vs-opinions.1",
      skillId: "news.facts-vs-opinions",
      prompt:
        "A headline reads 'Major fund set to buy 1 billion of BTC'. The body says 'a person familiar with the matter said the fund is considering' the purchase. What is the best summary?",
      options: [
        {
          id: "a",
          text: "A major fund will buy 1 billion of BTC.",
          correct: false,
          explanation:
            "This repeats the headline as fact. The body says 'considering', attributed to an unnamed person. Nothing has been bought or committed.",
          misconceptionId: "headline-is-fact",
        },
        {
          id: "b",
          text: "An outlet reports, citing one unnamed source, that a fund is considering a purchase; unconfirmed.",
          correct: true,
          explanation:
            "This keeps the attribution, the verb ('considering') and the sourcing status. It is the only option that matches what the article actually supports.",
        },
        {
          id: "c",
          text: "Institutional demand for BTC is rising.",
          correct: false,
          explanation:
            "This turns one unconfirmed report into a narrative about a whole category of buyer. The article contains no data on demand.",
          misconceptionId: "narrative-is-evidence",
        },
        {
          id: "d",
          text: "The report is confirmed because a reputable outlet published it.",
          correct: false,
          explanation:
            "An outlet publishing a claim from an anonymous source is a lead, not a confirmation. Confirmation needs a document or an independent second source.",
          misconceptionId: "single-source-certainty",
        },
      ],
    },
    {
      id: "kc.news.catalysts.1",
      skillId: "news.catalysts",
      prompt:
        "The macro calendar shows an inflation release tomorrow. Consensus expects 3.1%; the previous reading was 3.4%. Which statement about the catalyst is correct?",
      options: [
        {
          id: "a",
          text: "The release will move crypto prices because inflation data always does.",
          correct: false,
          explanation:
            "A catalyst can change expectations, but if the outcome matches the forecast there may be no move. 'Always' is not supported.",
          misconceptionId: "catalyst-guarantees-move",
        },
        {
          id: "b",
          text: "What matters is the gap between the printed figure and the 3.1% expectation.",
          correct: true,
          explanation:
            "Prices already reflect the expected 3.1%. A surprise in either direction is what would change expectations; a print at consensus changes little.",
        },
        {
          id: "c",
          text: "A print of 3.1% would be bullish because it is below 3.4%.",
          correct: false,
          explanation:
            "The comparison that matters is with the expectation (3.1%), not the previous reading (3.4%). A print at consensus is already priced in.",
          misconceptionId: "catalyst-guarantees-move",
        },
        {
          id: "d",
          text: "Scheduled events are not catalysts because everyone knows they are coming.",
          correct: false,
          explanation:
            "The date being known does not make the outcome known. Scheduled events are catalysts precisely because the outcome is uncertain.",
        },
      ],
    },
    {
      id: "kc.news.uncertainty.1",
      skillId: "news.uncertainty",
      prompt:
        "Two news items say an exchange is under investigation. Item one cites 'people familiar with the matter'. Item two links to item one as its source. How many independent sources do you have?",
      options: [
        {
          id: "a",
          text: "Two, because two outlets published it.",
          correct: false,
          explanation:
            "Item two relies on item one. Two outlets repeating one report is one source.",
          misconceptionId: "single-source-certainty",
        },
        {
          id: "b",
          text: "One anonymous source; treat the claim as reported and unconfirmed.",
          correct: true,
          explanation:
            "Independence means the outlets obtained the information separately. Here they did not, and the original source is unnamed.",
        },
        {
          id: "c",
          text: "None, because anonymous sources never count.",
          correct: false,
          explanation:
            "An anonymous source is a lead with low confidence, not zero information. The right move is to mark it unconfirmed and look for a document.",
        },
        {
          id: "d",
          text: "It is confirmed, because an investigation would not be reported unless it were true.",
          correct: false,
          explanation:
            "Reports from unnamed sources are sometimes wrong or premature. Publication is not confirmation.",
          misconceptionId: "headline-is-fact",
        },
      ],
    },
    {
      id: "kc.news.causation.1",
      skillId: "news.causation",
      prompt:
        "BTC is down 3% over 24 hours. An article about a regulatory warning was published six hours ago. BTC's usual daily range is 2 to 4%. Which is the most defensible statement?",
      options: [
        {
          id: "a",
          text: "BTC fell because of the regulatory warning.",
          correct: false,
          explanation:
            "You do not know when within the 24 hours the fall happened, the move is within normal range, and other drivers have not been ruled out.",
          misconceptionId: "correlation-is-causation",
        },
        {
          id: "b",
          text: "The fall is consistent with the warning, but timing is unknown, the move is within normal range, and other drivers could explain it.",
          correct: true,
          explanation:
            "This is the honest form: it checks timing, size and mechanism, and keeps alternative explanations on the page.",
        },
        {
          id: "c",
          text: "The warning cannot have mattered because 3% is a normal move.",
          correct: false,
          explanation:
            "A normal-sized move does not rule out a cause; it just means no special explanation is required. You cannot conclude the warning was irrelevant.",
        },
        {
          id: "d",
          text: "The market is clearly nervous about regulation.",
          correct: false,
          explanation:
            "'Nervous' is an interpretation dressed as an observation, and 'clearly' adds confidence without adding evidence.",
          misconceptionId: "observation-is-interpretation",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "ex.news.take-apart-headline",
      skillIds: ["news.facts-vs-opinions", "news.uncertainty"],
      kind: "scenario",
      title: "Take a headline apart",
      difficulty: 2,
      learningObjective:
        "Separate facts, attributed claims and opinions in a real news item and rate the sourcing.",
      evidenceRequirements: ["news:market", "snapshot:BTC"],
      questions: [
        "Pick the news item in the pack that makes the strongest-sounding claim. Write the claim in one sentence, keeping the attribution ('X said that...').",
        "Which parts of that item are verifiable facts, which are claims by a named or unnamed party, and which are opinion?",
        "Rate the sourcing (primary document, named official, anonymous source, repost). What would raise your confidence?",
        "Does the item say anything that the BTC snapshot can confirm or contradict?",
      ],
      expectedReasoning: [
        "Preserves attribution when restating a claim",
        "Classifies sentences as fact, claim or opinion with reasons",
        "Uses publisher, publish time and source link as sourcing evidence",
        "Keeps unconfirmed claims marked as such",
      ],
      rubric: makeRubric({
        factual: [
          "Restates the chosen claim accurately, with the attribution kept",
          "Correctly identifies at least one fact, one claim and one opinion in the item",
          "Correctly classifies the source type",
          "Does not add detail that is not in the item",
          "Reads the snapshot figures correctly if used",
        ],
        evidence: [
          "Names the item (title, publisher, time) it is analysing",
          "Quotes or closely paraphrases the sentences it classifies",
          "Uses the item's metadata (publisher, source link, publish time) in the sourcing rating",
          "Checks the item against the snapshot where a comparison is possible",
        ],
        reasoning: [
          "Explains why each sentence lands in its category",
          "Explains why the source type leads to the confidence level given",
          "Explains what a second independent source or a document would change",
          "Distinguishes 'published by a reputable outlet' from 'confirmed'",
        ],
        uncertainty: [
          "Marks the claim as unconfirmed where sourcing is weak",
          "Notes what the item does not say (for example, numbers, dates, documents)",
          "Avoids repeating the headline's confidence",
          "States what would raise or lower confidence",
        ],
        keyPoints: [
          "a fact can be checked against a document or dataset",
          "a claim is attributed to a person or organisation and may not be checkable",
          "an opinion is a judgement by the writer or a quoted person",
          "a headline drops attribution and must be checked against the body",
          "a primary document ranks above an unnamed source",
          "two outlets repeating one report is one source",
          "a claim stays unconfirmed until a document or an independent second source appears",
        ],
        acceptableAlternatives: [
          "Choosing a different item than the grader expected, as long as the analysis is sound",
          "Treating an on-chain transaction or exchange announcement as a primary document",
          "Describing a research note as opinion with data, provided the data is identified as fact",
        ],
        commonMisconceptionIds: [
          "headline-is-fact",
          "single-source-certainty",
          "narrative-is-evidence",
        ],
      }),
      hints: [
        "Find the sentence in the body that the headline is based on. Is it longer or more hedged than the headline?",
        "For each sentence ask: could I check this against a record? Is someone named? Is it a judgement word?",
        "A full answer looks like: 'Outlet reports, citing [source type], that [claim]. Facts: [list]. Opinions: [list]. Sourcing: [rating]. Unconfirmed until [what]. The snapshot shows [figure], which neither confirms nor contradicts the claim.'",
      ],
    },
    {
      id: "ex.news.catalyst-map",
      skillIds: ["news.catalysts", "news.narratives"],
      kind: "scenario",
      title: "Map the catalysts and the story",
      difficulty: 2,
      learningObjective:
        "Identify upcoming catalysts from the news and macro feed, state expectations, and test the narrative the coverage is pushing.",
      evidenceRequirements: ["news:macro", "news:market", "snapshot:BTC", "snapshot:ETH"],
      questions: [
        "List the catalysts you can find in the pack. For each, say whether it is scheduled or unscheduled, when it happens, and what outcome seems to be expected.",
        "For the most important catalyst, describe what a surprise would look like in each direction.",
        "What narrative do the market news items share? List the specific facts it rests on, and say which of those facts the pack actually contains.",
        "Which other story would fit the same facts?",
      ],
      expectedReasoning: [
        "Distinguishes scheduled from unscheduled catalysts",
        "States expected outcome and surprise conditions rather than predicting",
        "Reduces a narrative to checkable observations",
        "Offers an alternative narrative consistent with the same facts",
      ],
      rubric: makeRubric({
        factual: [
          "Lists catalysts that are actually present in the pack with correct dates",
          "Correctly labels each as scheduled or unscheduled",
          "States the expectation where the pack gives one, and says 'not stated' where it does not",
          "Names the narrative accurately",
          "Does not assert outcomes as if they had happened",
        ],
        evidence: [
          "Cites the macro calendar entries and news items by title and date",
          "Ties each narrative fact to a specific item in the pack",
          "Notes which supporting facts are missing from the pack",
          "Uses snapshot figures only where they bear on the question",
        ],
        reasoning: [
          "Explains that the gap between outcome and expectation is what matters",
          "Describes a surprise in both directions, not only the direction the coverage favours",
          "Tests the narrative fact by fact rather than accepting it",
          "Constructs a plausible alternative story from the same facts",
        ],
        uncertainty: [
          "Avoids predicting the outcome of any catalyst",
          "Flags expectations that are the writer's assumption rather than a stated consensus",
          "Says how strong the narrative's support is given the facts available",
          "Keeps the possibility that no move follows a catalyst",
        ],
        keyPoints: [
          "a catalyst is an event that could change expectations",
          "scheduled catalysts have a known date and an unknown outcome",
          "the move depends on outcome minus expectation not the event alone",
          "a narrative is a story that connects facts",
          "each fact behind a narrative must be checked on its own",
          "the same facts can fit more than one narrative",
          "a print at consensus can be a catalyst that changes nothing",
        ],
        acceptableAlternatives: [
          "Treating a token unlock, ETF deadline or court date as a scheduled catalyst if it appears in the news items",
          "Saying no clear narrative exists if the items are unrelated, with reasons",
          "Using a range rather than a point for the expected outcome",
        ],
        commonMisconceptionIds: [
          "catalyst-guarantees-move",
          "narrative-is-evidence",
          "headline-is-fact",
        ],
      }),
      hints: [
        "Look for dates. Anything with a date in the future is a scheduled catalyst. Anything that already happened without warning is unscheduled.",
        "For the narrative: write the story in one sentence, then write the three facts it needs to be true. Check the pack for each.",
        "A full answer lists catalysts with dates and expectations, describes a surprise both ways, names the narrative and its supporting facts, marks which facts the pack lacks, and offers one alternative story.",
      ],
    },
    {
      id: "ex.news.did-the-headline-cause-it",
      skillIds: ["news.causation", "news.facts-vs-opinions"],
      kind: "scenario",
      title: "Did the headline cause the move?",
      difficulty: 3,
      learningObjective:
        "Apply the timing, size and mechanism test to a price move and a news item, and name alternative explanations.",
      evidenceRequirements: ["snapshot:BTC", "news:market", "news:macro"],
      questions: [
        "State BTC's 24-hour change. Is this move unusual for BTC? Say how you decided.",
        "Pick the news item most likely to be offered as the explanation. Compare its publish time with the snapshot time. What does that tell you about timing?",
        "Describe a mechanism by which that item could change who trades and why. How convincing is it?",
        "List at least two alternative explanations for the same move, and say what evidence would help you choose between them.",
        "Write the strongest honest sentence linking the move to the item.",
      ],
      expectedReasoning: [
        "Applies timing, size and mechanism as three separate checks",
        "Uses publish and snapshot timestamps as evidence",
        "Judges the size of the move against the asset's normal range",
        "Keeps alternatives on the page and uses 'consistent with' language",
      ],
      rubric: makeRubric({
        factual: [
          "States the 24-hour change correctly",
          "Correctly reads the publish time of the chosen item and the snapshot time",
          "States that a 24-hour change cannot show when within the window the move happened",
          "Describes a mechanism that is at least plausible",
          "Does not assert causation",
        ],
        evidence: [
          "Cites the snapshot figure and timestamp",
          "Cites the item's title, publisher and publish time",
          "Uses the macro feed to find at least one alternative driver",
          "Notes the provenance of each piece of evidence",
        ],
        reasoning: [
          "Separates timing, size and mechanism and reaches a view on each",
          "Explains why an ordinary-sized move needs no special explanation",
          "Generates alternatives that are specific, not generic",
          "Ends with a 'consistent with' sentence rather than a causal one",
        ],
        uncertainty: [
          "Names the missing intraday price path as the key gap",
          "Notes that the normal range used is an estimate",
          "Says what evidence would raise confidence in a causal link",
          "Avoids words such as 'clearly' or 'drove'",
        ],
        keyPoints: [
          "timing requires knowing which came first to the minute",
          "a snapshot 24-hour change does not show when the move happened",
          "a move inside the asset's normal range needs no special explanation",
          "a mechanism must describe how the news changes who trades",
          "consistent with is the strongest honest phrase",
          "a macro release or derivatives activity could explain the same move",
          "intraday price data would be needed to test timing",
        ],
        acceptableAlternatives: [
          "Choosing a different normal range for BTC if the reasoning is stated",
          "Concluding that no item in the pack plausibly explains the move",
          "Treating a move in ETH or an index as evidence of a market-wide driver",
        ],
        commonMisconceptionIds: [
          "correlation-is-causation",
          "headline-is-fact",
          "confidence-is-evidence",
          "observation-is-interpretation",
        ],
      }),
      hints: [
        "Three checks, in order: when did each happen, how big was the move, and how would the news change orders?",
        "The snapshot gives you one number for 24 hours. Can it tell you whether the move came before or after the item was published?",
        "A full answer says: the change was X%; this is [within/above] BTC's usual range; the item was published at T, and the snapshot cannot show when the move happened; mechanism: [path]; alternatives: [macro item, market-wide move]; conclusion: 'consistent with, not shown to be caused by'.",
      ],
    },
  ],
  rubricNotes:
    "Attribution is the core skill here. An answer that restates a headline as fact, or that writes 'because of the news' without passing the timing, size and mechanism test, should lose most of the 'reasoning' points even if the facts are right. Reward answers that keep 'reported' and 'unconfirmed' in the text and that offer an alternative explanation unprompted.",
  recommendedNext:
    "Go on to 'ETF flows' to apply the same discipline to a dataset that is often reported as news: daily net inflows into spot crypto ETFs.",
};
