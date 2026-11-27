import type { Module } from "@/lib/types/curriculum";
import { makeRubric } from "../rubric";

export const wealthModule: Module = {
  id: "wealth",
  sequence: 7,
  title: "Funds, yield and incentives",
  summary:
    "How to read a board of funds: tokenised ETFs, vaults and an index fund; NAV against traded price; fees and fee drag; what an APY or a past return can and cannot tell you; dollar-cost averaging; diversification across funds that move together; and how trading rewards inflate volume and colour what you see.",
  learningObjectives: [
    "Tell apart a tokenised ETF on an order book, an escrow vault, a yield vault and an index fund, and say what drives each one's price and risk.",
    "Compare NAV with traded price, including when each was last updated and whether the underlying market is open.",
    "Work out fee drag and read APY, ROI and simulated DCA returns as descriptions of the past, not promises.",
    "Measure concentration across a set of funds and judge diversification by co-movement, not by count.",
    "Explain how points multipliers and volume-based reward boxes inflate trading volume, and why a public win feed is a biased sample.",
  ],
  prerequisiteModuleIds: ["etf", "indexes"],
  skillIds: [
    "wealth.fund-types",
    "wealth.nav-vs-price",
    "wealth.fees",
    "wealth.yield-apy",
    "wealth.dca",
    "wealth.diversification",
    "wealth.incentives",
  ],
  concepts: [
    {
      heading: "Four kinds of fund on one board",
      body: `A wealth board can list very different products side by side, and the same columns mean different things for each. Before you read any number, find out what kind of fund you are looking at.

- A **tokenised ETF on the order book** is a token that tracks a traditional exchange-traded fund, such as one following a US share index. It trades on a central limit order book against a stablecoin, so its price comes from bids and asks. Its underlying shares only trade during market hours.
- An **escrow vault** holds deposits for a stated strategy and reports a net asset value per share. Subscriptions and redemptions follow the vault's own windows and rules.
- A **yield vault**, such as a bridged USDC vault, lends a stablecoin out and passes on the interest. Its share value creeps up slowly; its risks are about the lending venue, not price swings.
- An **index fund**, such as the ANT Believers Index, holds a weighted basket of crypto assets and publishes a NAV that moves with them, around the clock.

Each type carries its own risks. Grouping them under one word, "funds", hides that.`,
      example:
        "Suppose a board shows four rows: a tokenised share-index ETF up 1.5% today, a USDC yield vault whose share value rose 0.01%, an escrow vault up 11%, and a crypto index up 2.4%. The ETF move reflects share prices, the vault move reflects a day of interest, the escrow move reflects its own strategy, and the index move reflects its crypto members. Four numbers, four different stories.",
    },
    {
      heading: "NAV and traded price are two different numbers",
      body: `**Net asset value (NAV)** per share is what the fund's holdings are worth, divided by the number of shares, calculated at a stated time. The **traded price** is what a buyer and seller last agreed on a market. They are linked but not the same.

When the price is above NAV the fund trades at a **premium**; below NAV it trades at a **discount**. Premium or discount = (price − NAV) ÷ NAV. Small gaps are normal. Large or persistent gaps say something about demand, redemption rules or stale data.

Always check the **timestamps**. A NAV struck an hour ago and a price from a minute ago can differ simply because the underlying assets moved in between. A tokenised ETF has a further twist: when its home stock market is closed, the token can still trade, but the shares it tracks are not moving, so the quoted price may be someone's guess about the next open rather than a measured value.

Reading routine:

- Note NAV, price and both times.
- Compute the premium or discount.
- Ask whether the underlying market was open at both times.`,
      example:
        "Suppose an index fund shows NAV 9.60 at 09:00 and a traded price of 9.70 at 09:45. The premium is (9.70 − 9.60) ÷ 9.60 ≈ 1.0%. Before calling that a premium, check whether the index members rose between 09:00 and 09:45; if they rose 1%, the gap is just timing.",
    },
    {
      heading: "Fees and fee drag",
      body: `Funds charge fees, and fees compound against you. A **management fee** is a yearly percentage of what you hold, taken whether the fund rises or falls. A **performance fee** is a share of gains above some mark, taken only when the fund does well.

The effect of a fee over time is called **fee drag**. A 1% yearly fee does not cost 1% once; it costs 1% every year on a growing (or shrinking) balance. Over long periods the gap between a low-fee and a high-fee version of the same holdings becomes large.

Two traps to avoid:

- **Small numbers feel harmless.** A difference of 0.5% a year looks tiny next to a 10% daily move, but daily moves come and go while fees are certain and repeat.
- **Unknown is not zero.** If a board or fund page leaves the fee blank, you do not know the fee. Treat it as missing information, not as free.

When you compare funds, put fees next to returns and say over which period the comparison holds.`,
      example:
        "Suppose two funds both earn 6% a year before fees for ten years on a hypothetical 1,000. Fund A charges 0.2% a year, fund B 2%. A ends near 1,000 × 1.058^10 ≈ 1,757; B near 1,000 × 1.04^10 ≈ 1,480. The same holdings, a gap of about 277, all from fees.",
    },
    {
      heading: "APY, ROI and what a 7-day APY cannot tell you",
      body: `**ROI** (return on investment) is how much something actually gained or lost over a stated past period: 1 month, 1 year, since launch. **APY** (annual percentage yield) takes a return over some window and scales it up to a year, with compounding.

That scaling is where people go wrong. A **7-day APY** takes one week and pretends it repeats 52 times. For a stablecoin yield vault earning steady interest, that can be a fair summary. For anything whose price swings, it is meaningless: a share-index ETF that rose 5% in a week would show an APY in the hundreds of percent, and a board might show 7-day APYs in the thousands for ordinary ETFs. Nobody earns that.

For a yield vault, ask **where the yield comes from**. Usually it is interest paid by borrowers on a lending venue. A label such as "net excluding rewards" means fees are taken out and token rewards are not counted. The risks are a smart-contract bug, borrowers failing or a venue running short of cash to withdraw, and rates simply falling. **An APY is a description of the recent past, never a promise.**`,
      example:
        "Suppose a USDC vault shows 7-day APY 4.4% and 1-month APY 5.2%, while an ETF row shows a 7-day APY of 1,500%. The vault figures describe interest that varies a little week to week. The ETF figure is one week's price move scaled up to a year; it says nothing about what a year will bring.",
    },
    {
      heading: "Dollar-cost averaging and simulated returns",
      body: `**Dollar-cost averaging (DCA)** means investing the same amount at regular intervals, say every week, instead of all at once (a **lump sum**). Because each contribution buys more units when the price is low and fewer when it is high, the average cost per unit ends up below the simple average price over the period.

Neither approach always wins. If the price rises steadily, a lump sum put in at the start does better, because more money was exposed to the rise for longer. If the price falls and then recovers, DCA often does better. Which one wins depends entirely on the path the price took.

A board may show a **DCA simulation**: the return a hypothetical weekly equal-contribution plan would have had over a range such as one year. Read it carefully:

- Check the **window it actually covers**. The last data point may be months before today, even when the label says "1Y".
- It is **one path**. A different start date gives a different number.
- **Past simulated returns do not predict** future returns.`,
      example:
        "Suppose a price goes 100, 80, 100 over three weeks and you invest 100 each week. You buy 1, 1.25 and 1 units: 3.25 units for 300, worth 325 at the end, +8.3%. A 300 lump sum at the start buys 3 units worth 300, 0%. If the path were 100, 120, 100, DCA would lose and the lump sum would break even.",
    },
    {
      heading: "Diversification across funds",
      body: `Owning several funds is not the same as being diversified. What matters, as with index members, is **how the holdings move together** and **how the weight is spread**.

Three share-index ETFs that are all heavy in large US technology companies will rise and fall almost together. Holding all three spreads you across three tickers but not across three risks. A fund that holds mostly short-term bills, a stablecoin yield vault and a crypto index behave very differently from each other; mixing them spreads risk far more, though each brings its own.

Measure concentration with numbers:

- **Largest weight.** If one fund is more than 50% of the portfolio, the portfolio mostly behaves like that fund.
- **HHI** (Herfindahl-Hirschman index): square each weight in percent and add them up. 10,000 means everything is in one fund.
- **Effective number of holdings** = 10,000 ÷ HHI. Four equal weights give 4; weights of 70, 10, 10, 10 give about 1.9.

Also look at **themes and hours**: if every fund tracks the same theme, or every fund depends on one stock market being open, a single event hits all of them at once.`,
      example:
        "Suppose a practice portfolio is 40% in a share-index ETF, 30% in a technology ETF, 20% in a semiconductor ETF and 10% in a USDC vault. HHI = 1,600 + 900 + 400 + 100 = 3,000, so effective holdings ≈ 3.3. Yet 90% of the weight sits in three funds that largely move together, all trading on US market hours.",
    },
    {
      heading: "Trading incentives and what they do to the numbers",
      body: `Exchanges often pay traders to trade. Two common forms:

- **Points multipliers.** Trading volume on chosen markets earns points at, say, 1.2 times the normal rate. Traders move activity to those markets to earn more.
- **Volume-based reward boxes.** Every so many dollars of trading volume earns a box with a random reward. Volume from taking liquidity (a **taker**) may count in full, while volume from resting orders (a **maker**) counts at a lower weight, say 20%.

Both raise volume for reasons other than wanting to own the asset. Some traders buy and sell back and forth just to reach the next box. So on a boosted market, **high volume is not evidence of demand**. It may be mostly reward-seeking, and it can vanish when the campaign ends.

Watch the public **win feed** too. If it only lists wins above a threshold, say 50 dollars, it shows you the lucky tail, not the typical box: a textbook case of **survivorship bias**. If the drop probabilities are **not published**, you cannot work out the expected value of a box at all. Say so rather than guessing.`,
      example:
        "Suppose a campaign gives one box per 10,000 dollars of counted volume, with maker volume counted at 20%. A maker would need 50,000 dollars of resting-order fills for one box. If the feed shows ten wins of 100 to 1,000 dollars today, that tells you nothing about how many boxes paid 1 dollar.",
    },
  ],
  knowledgeChecks: [
    {
      id: "kc.wealth.fund-types.1",
      skillId: "wealth.fund-types",
      prompt:
        "A board lists a tokenised share-index ETF, a USDC yield vault and a crypto index fund. Which statement is most accurate?",
      options: [
        {
          id: "a",
          text: "They are all funds, so they carry the same kind of risk.",
          correct: false,
          explanation:
            "The ETF moves with share prices and market hours, the vault depends on a lending venue, and the index moves with crypto prices around the clock. Different products, different risks.",
          misconceptionId: "fund-types-same-risk",
        },
        {
          id: "b",
          text: "Each is driven by something different: share prices, lending interest, and a basket of crypto assets.",
          correct: true,
          explanation:
            "Naming what drives each fund is the first step before comparing any of their numbers.",
        },
        {
          id: "c",
          text: "The yield vault is risk-free because its share value barely moves.",
          correct: false,
          explanation:
            "A steady share value hides different risks: a contract bug, borrowers failing, or the venue running short of cash for withdrawals.",
          misconceptionId: "apy-is-guaranteed",
        },
        {
          id: "d",
          text: "The index fund is diversified because it is called an index.",
          correct: false,
          explanation:
            "Being an index says nothing about how its members move. Crypto members tend to move together, and weights may be concentrated.",
          misconceptionId: "concentration-is-diversification",
        },
      ],
    },
    {
      id: "kc.wealth.nav-vs-price.1",
      skillId: "wealth.nav-vs-price",
      prompt:
        "An index fund shows NAV 9.60 struck at 09:00 and a traded price of 9.70 at 09:45. What is the best reading?",
      options: [
        {
          id: "a",
          text: "NAV and price are the same thing, so one of the figures is wrong.",
          correct: false,
          explanation:
            "NAV is the value of the holdings per share at one time; price is the last agreed trade. They can differ without either being wrong.",
          misconceptionId: "nav-equals-price",
        },
        {
          id: "b",
          text: "The fund trades at a premium of about 1.0%, but part or all of it may be timing, since the two figures are 45 minutes apart.",
          correct: true,
          explanation:
            "(9.70 − 9.60) ÷ 9.60 ≈ 1.0%. Checking whether the members moved between 09:00 and 09:45 comes before calling it a premium.",
        },
        {
          id: "c",
          text: "The price above NAV shows buyers are confident the fund will rise.",
          correct: false,
          explanation:
            "A premium is a gap between two numbers, not a forecast. It may come from timing, redemption rules or thin trading.",
          misconceptionId: "observation-is-interpretation",
        },
        {
          id: "d",
          text: "The fund is undervalued by 10 cents.",
          correct: false,
          explanation:
            "Price is above NAV here, so if anything it trades at a premium. And neither number is a statement of what the fund is 'really' worth.",
          misconceptionId: "nav-equals-price",
        },
      ],
    },
    {
      id: "kc.wealth.fees.1",
      skillId: "wealth.fees",
      prompt:
        "Two funds with the same holdings earn 6% a year before fees for ten years on 1,000. Fund A charges 0.2% a year and fund B 2%. Which is closest to the truth?",
      options: [
        {
          id: "a",
          text: "The difference is about 18, because 1.8% of 1,000 is 18.",
          correct: false,
          explanation:
            "Fees are taken every year on a growing balance. A ends near 1,757 and B near 1,480, a gap of about 277.",
          misconceptionId: "fees-dont-matter",
        },
        {
          id: "b",
          text: "A ends near 1,757 and B near 1,480, so fees cost B about 277 over ten years.",
          correct: true,
          explanation:
            "1,000 × 1.058^10 ≈ 1,757 and 1,000 × 1.04^10 ≈ 1,480. That compounding gap is fee drag.",
        },
        {
          id: "c",
          text: "There is no real difference, because a 2% fee is tiny next to daily price moves.",
          correct: false,
          explanation:
            "Daily moves come and go; fees are certain and repeat every year. Over ten years they add up to a large gap.",
          misconceptionId: "fees-dont-matter",
        },
        {
          id: "d",
          text: "If a third fund leaves the fee blank, it is the cheapest of the three.",
          correct: false,
          explanation:
            "A blank fee is unknown, not zero. Treat it as missing information.",
          misconceptionId: "missing-data-is-neutral",
        },
      ],
    },
    {
      id: "kc.wealth.yield-apy.1",
      skillId: "wealth.yield-apy",
      prompt:
        "A board shows a USDC vault with 7-day APY 4.4% and a share-index ETF with 7-day APY 1,500%. What is the best reading?",
      options: [
        {
          id: "a",
          text: "The ETF will return about 1,500% over the next year.",
          correct: false,
          explanation:
            "That figure takes one week's price move and scales it to a year. It is not a forecast and nobody earns it.",
          misconceptionId: "short-window-apy-is-annual",
        },
        {
          id: "b",
          text: "The vault is guaranteed to pay 4.4% for the next year.",
          correct: false,
          explanation:
            "An APY describes the recent past. Lending rates change, and the vault carries contract and liquidity risks.",
          misconceptionId: "apy-is-guaranteed",
        },
        {
          id: "c",
          text: "The vault figure summarises recent interest; the ETF figure is one week's price move scaled up and says little about a year.",
          correct: true,
          explanation:
            "A short-window APY is a fair summary of steady interest but meaningless for something whose price swings.",
        },
        {
          id: "d",
          text: "The ETF is the better yield product because its APY is higher.",
          correct: false,
          explanation:
            "The two figures measure different things. The ETF's number is not yield at all; it is a scaled-up price move.",
          misconceptionId: "short-window-apy-is-annual",
        },
      ],
    },
    {
      id: "kc.wealth.dca.1",
      skillId: "wealth.dca",
      prompt:
        "A weekly DCA simulation for a fund shows +7.6% over its window. Which statement is most accurate?",
      options: [
        {
          id: "a",
          text: "A weekly plan started now will return about 7.6%.",
          correct: false,
          explanation:
            "The simulation is one past path from one start date. Past simulated returns do not predict future ones.",
          misconceptionId: "past-return-predicts",
        },
        {
          id: "b",
          text: "DCA beats a lump sum, so the lump sum would have done worse.",
          correct: false,
          explanation:
            "Which approach wins depends on the price path. If the price rose steadily, the lump sum would have done better.",
          misconceptionId: "dca-always-wins",
        },
        {
          id: "c",
          text: "It describes one hypothetical weekly plan over a stated window; check which dates it actually covers before comparing it with anything.",
          correct: true,
          explanation:
            "The last data point may be months before today, and a different start date would give a different number.",
        },
        {
          id: "d",
          text: "The fund is safe because DCA smooths out risk.",
          correct: false,
          explanation:
            "DCA spreads the timing of purchases. It does not remove the fund's own risk; the plan can still end in a loss.",
          misconceptionId: "diversification-removes-risk",
        },
      ],
    },
    {
      id: "kc.wealth.diversification.1",
      skillId: "wealth.diversification",
      prompt:
        "A practice portfolio is 40% share-index ETF, 30% technology ETF, 20% semiconductor ETF and 10% USDC vault. Which description is best?",
      options: [
        {
          id: "a",
          text: "Four funds, so it is well diversified.",
          correct: false,
          explanation:
            "Count is not diversification. Three of the four funds are heavy in the same companies and largely move together.",
          misconceptionId: "more-funds-is-diversified",
        },
        {
          id: "b",
          text: "HHI 3,000, about 3.3 effective holdings, but 90% sits in three ETFs that largely move together on US market hours.",
          correct: true,
          explanation:
            "1,600 + 900 + 400 + 100 = 3,000; 10,000 ÷ 3,000 ≈ 3.3. Naming the shared theme and shared hours completes the picture.",
        },
        {
          id: "c",
          text: "The USDC vault removes the portfolio's risk.",
          correct: false,
          explanation:
            "A 10% weight in a low-volatility vault dampens swings a little; it removes neither the ETFs' risk nor the vault's own.",
          misconceptionId: "diversification-removes-risk",
        },
        {
          id: "d",
          text: "It is concentrated because the largest weight is over 50%.",
          correct: false,
          explanation:
            "The largest weight is 40%, under 50%. The concentration problem here is the shared theme, not a single fund.",
        },
      ],
    },
    {
      id: "kc.wealth.incentives.1",
      skillId: "wealth.incentives",
      prompt:
        "A market has a 1.2x points multiplier and counts towards reward boxes. Its volume doubled this week, and the public feed lists many wins of 100 dollars or more. What can you conclude?",
      options: [
        {
          id: "a",
          text: "Demand for the asset has doubled.",
          correct: false,
          explanation:
            "Incentives pay people to trade. Some of the extra volume may be reward-seeking churn that disappears when the campaign ends.",
          misconceptionId: "incentive-volume-is-demand",
        },
        {
          id: "b",
          text: "A typical box pays about 100 dollars.",
          correct: false,
          explanation:
            "If the feed only lists wins above a threshold, it shows the lucky tail. Small rewards are left out.",
          misconceptionId: "feed-shows-typical-reward",
        },
        {
          id: "c",
          text: "Volume rose, but incentives make it weak evidence of demand; the feed is filtered, and without published odds the value of a box is unknown.",
          correct: true,
          explanation:
            "This separates what was observed from what it means and names the missing information.",
        },
        {
          id: "d",
          text: "Rising volume shows buyers are taking control.",
          correct: false,
          explanation:
            "Every trade has a buyer and a seller. Volume measures activity, and here part of it is paid for.",
          misconceptionId: "volume-implies-direction",
        },
      ],
    },
  ],
  exercises: [
    {
      id: "ex.wealth.portfolio-review",
      skillIds: ["wealth.diversification", "wealth.fees", "wealth.dca", "wealth.fund-types"],
      kind: "scenario",
      title: "Review your practice portfolio",
      difficulty: 4,
      learningObjective:
        "Explain the choices in a paper portfolio using its computed analysis: concentration, fees, market hours and the DCA simulation, and say what would make you change it.",
      evidenceRequirements: ["wealth:board", "wealth:dca:vVOO:1Y", "wealth:dca:vQQQ:1Y"],
      questions: [
        "Why did you choose these funds and these weights? Name each fund's type and what drives it.",
        "What concentration, fee and market-hours risks does the analysis show? Quote the numbers: largest weight, HHI or effective holdings, market-hours share and the weighted fee.",
        "What does the DCA simulation tell you about these funds, and what does it not tell you?",
        "What would make you change the portfolio? Name a specific observation, not a feeling.",
      ],
      expectedReasoning: [
        "Ties each fund to its type and what drives it",
        "Quotes the computed concentration, hours and fee figures correctly",
        "Treats the DCA simulation as one past path over a stated window",
        "Treats missing fees or returns as unknown, not zero",
        "States a concrete change trigger",
      ],
      rubric: makeRubric({
        factual: [
          "Describes each chosen fund's type correctly: tokenised ETF, escrow vault, yield vault or index fund",
          "Quotes the largest weight, HHI or effective holdings as given in the analysis",
          "Quotes the market-hours share and weighted fee correctly, or says the fee is unknown when the analysis says so",
          "Describes the DCA figures as simulated past returns, not expected returns",
          "Does not call the portfolio diversified on the basis of fund count alone",
        ],
        evidence: [
          "Cites fund ids and figures from the board as listed",
          "Cites the DCA simulation returns and the dates they cover",
          "Refers to the analysis flags by name",
          "Notes the as-of time or provenance of the data",
        ],
        reasoning: [
          "Explains why the weights were chosen in terms of risk, not expected gains",
          "Links correlated or same-theme funds to weaker diversification",
          "Explains why market-hours exposure matters for prices outside trading hours",
          "Connects the change trigger to something observable in future data",
        ],
        uncertainty: [
          "Says past and simulated returns do not predict future returns",
          "Treats unknown fees or missing returns as gaps, not as zero",
          "Notes the DCA window may not match today or the stated range",
          "Avoids certainty about how the portfolio will perform",
        ],
        keyPoints: [
          "the effective number of holdings comes from the hhi",
          "the largest weight shows how much one fund dominates",
          "the market-hours share shows how much depends on a stock market being open",
          "fees unknown is not the same as fees of zero",
          "past simulated returns do not predict future returns",
          "correlated funds are not diversification",
          "a stated change trigger that can be observed",
        ],
        acceptableAlternatives: [
          "Using the top-2 weight share instead of HHI, if the numbers are quoted correctly",
          "Defending a concentrated portfolio as a deliberate learning choice, if the risk is named",
          "Naming a rebalancing rule as the change trigger",
        ],
        commonMisconceptionIds: [
          "more-funds-is-diversified",
          "past-return-predicts",
          "fees-dont-matter",
          "missing-data-is-neutral",
          "dca-always-wins",
        ],
      }),
      hints: [
        "Start with the analysis numbers in the scenario description: largest weight, effective holdings, market-hours share, fee.",
        "For each fund, ask what drives it and whether it tends to move with your other funds. Then ask what the DCA simulation covers and what it leaves out.",
        "A full answer names each fund's type, quotes the concentration, hours and fee figures, says the DCA results are one past path that does not predict, treats unknown fees as unknown, and gives a concrete trigger such as 'if one fund passes 50% of the weight, I would rebalance the paper portfolio'.",
      ],
    },
    {
      id: "ex.wealth.nav-vs-price",
      skillIds: ["wealth.nav-vs-price", "wealth.fund-types"],
      kind: "scenario",
      title: "NAV or price?",
      difficulty: 3,
      learningObjective:
        "Compare an index fund's NAV with its traded price, account for the times each was taken, and say what the gap can and cannot tell you.",
      evidenceRequirements: ["wealth:board", "wealth:fund:antb", "wealth:price:antb:1M"],
      questions: [
        "For the ANT Believers Index, state the NAV, the quoted price and the time of each. Compute the premium or discount.",
        "What kind of fund is it, and how does that affect whether NAV and price should be close?",
        "Using the 1-month price history, describe how the fund moved, and whether today's gap is unusual given that history. What can you not tell?",
        "Pick one tokenised ETF on the board. Why might its quoted price differ from the value of the shares it tracks right now?",
      ],
      expectedReasoning: [
        "Reads NAV, price and timestamps correctly",
        "Computes the premium or discount with the right formula",
        "Separates timing gaps from real premiums",
        "Links market hours to stale or estimated prices for tokenised ETFs",
      ],
      rubric: makeRubric({
        factual: [
          "Quotes NAV and price correctly from the pack",
          "Computes premium or discount as price minus NAV divided by NAV",
          "Identifies the fund as an index fund holding crypto assets",
          "Explains that NAV is the value of holdings per share and price is the last agreed trade",
          "Notes that a tokenised ETF's underlying shares do not trade outside market hours",
        ],
        evidence: [
          "Cites the NAV and price timestamps",
          "Cites the 1-month price history with dates",
          "Cites a tokenised ETF row and its market status",
          "Notes the provenance of each figure",
        ],
        reasoning: [
          "Explains how a time gap between NAV and price can create an apparent premium",
          "Uses the price history to judge whether today is unusual",
          "Keeps the gap as an observation rather than a forecast",
          "Explains why a closed underlying market makes a token price an estimate",
        ],
        uncertainty: [
          "Says the history does not include past NAV gaps, if that is so",
          "Avoids reading a premium as confidence or a discount as a bargain",
          "Names missing information such as redemption rules",
          "Qualifies conclusions drawn from one month",
        ],
        keyPoints: [
          "nav is the value of the holdings per share at a stated time",
          "the traded price is the last agreed trade",
          "premium or discount equals price minus nav divided by nav",
          "different timestamps can explain a gap",
          "a closed stock market means the token price is an estimate",
          "one month of history is a short sample",
        ],
        acceptableAlternatives: [
          "Expressing the gap in price units as well as percent",
          "Concluding the gap is too small to interpret, with the reason given",
          "Choosing a different tokenised ETF for the last question",
        ],
        commonMisconceptionIds: [
          "nav-equals-price",
          "stale-price-is-current",
          "observation-is-interpretation",
        ],
      }),
      hints: [
        "Write down NAV, price and the time of each before computing anything.",
        "If the two times differ, could the members have moved in between? For the ETF, check whether its home market is open.",
        "A full answer gives the premium or discount with the formula, says whether timing could explain it, places it against the 1-month history, and explains that a closed market makes a tokenised ETF price an estimate.",
      ],
    },
    {
      id: "ex.wealth.yield-apy",
      skillIds: ["wealth.yield-apy"],
      kind: "scenario",
      title: "What does this APY mean?",
      difficulty: 3,
      learningObjective:
        "Read APY and ROI figures for a yield vault and for tokenised ETFs, explain why a short-window APY can mislead, and say where vault yield comes from and what can go wrong.",
      evidenceRequirements: ["wealth:board", "wealth:fund:Morpho-Earn"],
      questions: [
        "State the USDC vault's 7-day and 1-month APY and its yield basis. What does 'net excluding rewards' mean?",
        "Find a tokenised ETF row with a 7-day APY. Compare it with that ETF's 1-year ROI. Why are they so different?",
        "Where does the vault's yield come from, and what are three ways it could fall or be lost?",
        "Write one sentence describing the vault's yield that the data supports and one it does not.",
      ],
      expectedReasoning: [
        "Separates APY (scaled-up) from ROI (actual past period)",
        "Explains annualising a single week",
        "Names the source of vault yield and its risks",
        "Avoids describing any APY as guaranteed",
      ],
      rubric: makeRubric({
        factual: [
          "Quotes the vault APY figures correctly",
          "Explains that net excluding rewards means after fees and without token rewards",
          "Explains that a 7-day APY scales one week up to a year",
          "Identifies lending interest as the source of the vault yield",
          "Names contract, borrower or liquidity, and rate-change risks",
        ],
        evidence: [
          "Cites the vault row and its timestamps",
          "Cites an ETF's 7-day APY and 1-year ROI from the board",
          "Notes the yield basis field",
          "Notes the provenance of the board",
        ],
        reasoning: [
          "Explains why a short window is fair for steady interest but not for price moves",
          "Uses the ETF comparison to show the scaling problem",
          "Links each risk to how the yield could change",
          "Keeps the supported sentence to what was observed",
        ],
        uncertainty: [
          "Says an APY is a description of the past, not a promise",
          "Notes that rates can change week to week",
          "Names information not in the pack, such as the vault's lending exposure",
          "Avoids certainty about next year's yield",
        ],
        keyPoints: [
          "apy scales a short window up to a year",
          "roi is the actual return over a past period",
          "a 7-day apy for a price-moving fund is not a yield",
          "vault yield comes from interest paid by borrowers",
          "net excluding rewards means after fees and without token rewards",
          "an apy is not a promise",
        ],
        acceptableAlternatives: [
          "Using the 24-hour APY alongside the 7-day figure",
          "Naming a different trio of risks, if each is a real risk of a lending vault",
          "Choosing any ETF row for the comparison",
        ],
        commonMisconceptionIds: [
          "apy-is-guaranteed",
          "short-window-apy-is-annual",
          "past-return-predicts",
        ],
      }),
      hints: [
        "Look at the vault's APY columns and its yield basis label first.",
        "An APY takes a short window and repeats it for a year. What happens if that window was a week when a share price jumped?",
        "A full answer quotes the vault APYs and basis, contrasts an ETF's huge 7-day APY with its 1-year ROI, names borrower interest as the source of vault yield with contract, liquidity and rate risks, and calls every APY a description of the past.",
      ],
    },
    {
      id: "ex.wealth.dca",
      skillIds: ["wealth.dca"],
      kind: "scenario",
      title: "Read a DCA simulation",
      difficulty: 3,
      learningObjective:
        "Read two weekly DCA simulations, check the window they really cover, compare them with the price path, and explain why they do not predict anything.",
      evidenceRequirements: ["wealth:dca:vVOO:1Y", "wealth:dca:vQQQ:1Y", "wealth:price:vQQQ:3M"],
      questions: [
        "State the total simulated return for each fund and the first and last dates in each series. Does the window match the '1Y' label and today's date?",
        "Which simulation ended higher, and where along the way did each one dip or peak?",
        "Using the 3-month price history, would a lump sum at the start of that period have done better or worse than weekly buying? What does that depend on?",
        "Why do these results not tell you what a weekly plan started today would return?",
      ],
      expectedReasoning: [
        "Reads the simulation totals and dates correctly",
        "Notices any gap between the last point and today",
        "Explains that DCA versus lump sum depends on the path",
        "Refuses to use past simulated returns as a forecast",
      ],
      rubric: makeRubric({
        factual: [
          "Quotes each simulation's total return correctly as a percentage",
          "Reads the first and last dates of each series correctly",
          "Explains that DCA buys more units at lower prices",
          "States that neither DCA nor lump sum always wins",
          "Does not present the simulation as a plan's expected return",
        ],
        evidence: [
          "Cites both simulations by fund id",
          "Cites specific points such as the lowest return and its date",
          "Uses the 3-month price history for the lump-sum comparison",
          "Notes provenance and the date the data was fetched",
        ],
        reasoning: [
          "Compares the two paths, not just the end points",
          "Links the lump-sum comparison to rising or falling prices in the period",
          "Explains how a different start date would change the result",
          "Keeps observation and interpretation separate",
        ],
        uncertainty: [
          "States past simulated returns do not predict future returns",
          "Flags any mismatch between the label and the dates covered",
          "Notes that one path is a sample of one",
          "Avoids saying which approach will do better next",
        ],
        keyPoints: [
          "the simulation is one weekly equal-contribution path",
          "check the dates the simulation actually covers",
          "dca buys more units when the price is lower",
          "whether dca beats a lump sum depends on the price path",
          "a different start date gives a different result",
          "past simulated returns do not predict future returns",
        ],
        acceptableAlternatives: [
          "Comparing peak-to-end rather than start-to-end",
          "Concluding the lump-sum comparison cannot be done exactly from the data given",
          "Expressing returns as fractions if converted correctly",
        ],
        commonMisconceptionIds: [
          "past-return-predicts",
          "dca-always-wins",
          "missing-data-is-neutral",
        ],
      }),
      hints: [
        "Start with the dates: when does each series begin and end, and how far is the last point from today?",
        "Did the price mostly rise, mostly fall, or dip and recover in the window? That decides whether spreading purchases helped.",
        "A full answer gives both totals and their dates, flags any window gap, ties DCA versus lump sum to the path, and says the simulation is one past path that does not predict a plan started now.",
      ],
    },
    {
      id: "ex.wealth.incentives",
      skillIds: ["wealth.incentives"],
      kind: "scenario",
      title: "Paid-for volume",
      difficulty: 4,
      learningObjective:
        "Read a venue's public incentive rules and reward feed, explain how they inflate volume, and say what is missing to judge a reward's value.",
      evidenceRequirements: ["rewards:incentives", "rewards:feed", "orderbook:perps:ANT-USD"],
      questions: [
        "Which markets carry a points multiplier, and how much volume earns one reward box? How are taker and maker volume weighted?",
        "Is ANT-USD perpetual boosted? Why does that make its volume weak evidence of demand for ANT?",
        "What does the public reward feed show, what filter applies to it, and why is it a biased sample?",
        "What would you need to know to work out the expected value of one box? Is it in the data?",
      ],
      expectedReasoning: [
        "Reads multipliers, volume per box and weights correctly",
        "Links incentives to volume that is not organic demand",
        "Identifies the feed filter as survivorship bias",
        "Names unpublished probabilities as the missing piece",
      ],
      rubric: makeRubric({
        factual: [
          "Lists the boosted markets and multiplier correctly",
          "States the volume per box and the taker and maker weights correctly",
          "Works out how much maker volume one box needs at the stated weight",
          "Explains that rewards pay people to trade, raising volume",
          "States that drop probabilities are not published",
        ],
        evidence: [
          "Cites the incentive figures and the season or week dates",
          "Cites feed items with levels and reward amounts",
          "Cites the feed's filter note",
          "Refers to the ANT-USD perpetual book as the boosted market",
        ],
        reasoning: [
          "Explains why paid-for volume can vanish when a campaign ends",
          "Explains why a feed of large wins hides the typical result",
          "Connects the missing probabilities to an unknown expected value",
          "Keeps observation and interpretation separate",
        ],
        uncertainty: [
          "Says how much of the volume is reward-driven is unknown",
          "Refuses to estimate a typical reward from the feed",
          "Notes the rules can change between seasons",
          "Avoids any suggestion to trade for rewards",
        ],
        keyPoints: [
          "points multipliers reward volume on chosen markets",
          "one box per fixed amount of counted volume",
          "maker volume counts at a lower weight than taker volume",
          "incentive volume is not the same as demand",
          "the feed only lists large wins so it is survivorship biased",
          "drop probabilities are not published",
          "the expected value of a box cannot be computed",
        ],
        acceptableAlternatives: [
          "Expressing the maker requirement as a multiple of the taker requirement",
          "Using reward bands to give a range rather than an expected value, if the range is labelled as such",
          "Discussing week pool points as a separate incentive",
        ],
        commonMisconceptionIds: [
          "incentive-volume-is-demand",
          "feed-shows-typical-reward",
          "volume-implies-direction",
          "missing-data-is-neutral",
        ],
      }),
      hints: [
        "Start with the rules: list the multipliers, the volume per box, and the taker and maker weights.",
        "If traders are paid per unit of volume, what happens to volume on that market, and what happens when the payment stops? Then ask which wins the feed leaves out.",
        "A full answer lists the boosted markets and box rules, works out the maker volume per box, says ANT-USD volume is partly paid for, calls the feed survivorship-biased because of its filter, and says the expected value of a box is unknown because probabilities are not published.",
      ],
    },
  ],
  rubricNotes:
    "Reward answers that name what kind of fund each number comes from before interpreting it, and that quote the board, simulation and incentive figures with their times. Penalise treating an APY, ROI or simulated DCA return as a forecast, treating fund count as diversification, treating a blank fee as zero, and reading incentive-driven volume or a filtered win feed as typical. Arithmetic (premium, fee drag, HHI, maker volume per box) should be right to rounding.",
  recommendedNext:
    "This is the last module on the path. Build or revise a practice portfolio and have its rationale graded, then revisit 'Indexes' for weighting and concentration, and 'Reasoning' to sharpen how you state uncertainty and invalidation.",
};
