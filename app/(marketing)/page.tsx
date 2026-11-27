import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui";
import { ProvenanceLegend } from "@/components/marketing/provenance-legend";
import { Faq } from "@/components/ui/faq";
import { ScenarioLab } from "@/components/scenario/scenario-lab";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { Reveal } from "@/components/marketing/reveal";
import { LoopSteps } from "@/components/marketing/loop-steps";
import { CtaChart } from "@/components/marketing/cta-chart";
import {
  SAMPLE_EVALUATION,
  SAMPLE_MISCONCEPTIONS,
  SAMPLE_SCENARIO,
  SAMPLE_SKILL_NAMES,
} from "@/components/marketing/sample-scenario";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/client/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: `${SITE_NAME}: learn to read crypto markets from real evidence`,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: `${SITE_NAME}: learn to read crypto markets from real evidence`,
    description: SITE_DESCRIPTION,
    type: "website",
    url: "/",
    siteName: SITE_NAME,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

/** The learning loop. A real sequence, so it is numbered. */
const LOOP = [
  { name: "Diagnose", text: "Seven questions find what you already know." },
  { name: "Learn", text: "A short lesson on one skill at a time." },
  { name: "Practise", text: "A scenario built from live data. You write the analysis." },
  { name: "Evaluate", text: "Graded on facts, evidence, reasoning and uncertainty." },
  { name: "Improve", text: "The coach names what you missed and sets the next task." },
  { name: "Retain", text: "The skill comes back a day, three days and a week later." },
];

type Feed = { product: string; data: string; where: string };

/** Two providers, eight feeds. Grouped by provider because that is how the data arrives. */
const INTEGRATIONS: Array<{ source: string; summary: string; feeds: Feed[] }> = [
  {
    source: "SoSoValue",
    summary: "The market picture behind every lesson and scenario.",
    feeds: [
      { product: "Market data", data: "Prices, volume and market cap", where: "Lessons, Scenario lab" },
      { product: "ETF flows", data: "Daily net flows for spot ETFs", where: "Lessons, Scenario lab" },
      { product: "SSI indexes", data: "Index baskets and how they move", where: "Lessons, Scenario lab" },
      { product: "News", data: "Current crypto headlines", where: "Lessons, Scenario lab" },
    ],
  },
  {
    source: "SoDEX",
    summary: "Live books, funds and reward rules to practise on.",
    feeds: [
      { product: "Spot", data: "Live order books for BTC, ETH and ANT", where: "Order book gym" },
      { product: "Perps", data: "The ANT-USD perpetual book, next to ANT spot", where: "Order book gym" },
      {
        product: "Wealth",
        data: "Tokenised ETFs, fund vaults and the ANT Believers Index",
        where: "Wealth lab, practice portfolio",
      },
      { product: "Rewards", data: "Points, multipliers and reward box rules", where: "Rewards lessons" },
    ],
  },
];

/** Facts already stated elsewhere on this page, pulled up beside the hero. */
const HERO_FACTS: Array<[string, string]> = [
  ["7", "questions in the diagnostic"],
  ["4", "things every answer is graded on"],
  ["0", "orders, wallets or deposits"],
];

const NEVER = ["No order button", "No wallet", "No deposits", "No signals"];

const SECTION = "mx-auto max-w-[var(--content-max)] px-4 py-24 sm:px-6 lg:py-32";
const H2 = "text-2xl font-semibold tracking-tight text-balance";
const LEAD = "mt-4 max-w-prose text-lg text-muted";

const COMPARE: Array<[string, string]> = [
  ["Explains concepts with old screenshots", "Puts today's data in front of you, with its source attached"],
  ["Checks you with multiple choice", "Asks for a written analysis and grades the reasoning"],
  ["Marks an answer wrong", "Names the idea behind the wrong turn and corrects it"],
  ["Ends when the video ends", "Brings the skill back until you can show it, unaided"],
];

const FAQS = [
  {
    id: "trade",
    question: "Can MarketGym trade or touch my money?",
    answer:
      "No. There is no order button, no wallet connection and no deposit anywhere in the product. It reads public market data and grades what you write about it.",
  },
  {
    id: "data",
    question: "Is the data real?",
    answer:
      "Yes. Scenarios, order books and funds come from SoSoValue and SoDEX. Each number carries a tag that says where it came from, how old it is, and whether it is live, cached or demo data.",
  },
  {
    id: "grading",
    question: "How is my answer graded?",
    answer:
      "Against a rubric you can see: facts, use of evidence, reasoning and how you handle uncertainty. An AI grader and fixed rules work together; if the AI is unavailable, the result says it was graded by rules only.",
  },
  {
    id: "advice",
    question: "Will it tell me what to buy?",
    answer:
      "No. MarketGym teaches you to explain what the data does and does not support. It never gives signals, price targets or investment advice.",
  },
  {
    id: "time",
    question: "How long does a session take?",
    answer: "The diagnostic takes a few minutes. After that, a lesson plus one scenario fits in about fifteen.",
  },
];



export default function LandingPage() {
  return (
    <>
      {/* Hero: value on the left, the real product on the right. */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--line-strong)_1px,transparent_1px)] [background-size:28px_28px] opacity-60 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_0%,black,transparent)]"
        />
        <div className="relative mx-auto grid max-w-[var(--content-max)] items-center gap-14 px-4 pb-24 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[minmax(0,11fr)_minmax(0,12fr)] lg:gap-14 lg:pb-32 lg:pt-24">
          <div className="stagger-in max-w-2xl">
            <h1
              style={{ "--i": 0 } as React.CSSProperties}
              className="text-[clamp(2.5rem,1.55rem+3.6vw,4rem)] font-semibold leading-[1.03] tracking-[-0.035em] text-balance"
            >
              Learn to read crypto markets by <span className="text-accent">doing the analysis</span>
            </h1>
            <p style={{ "--i": 1 } as React.CSSProperties} className="mt-6 max-w-xl text-lg text-muted sm:text-[1.3125rem] sm:leading-8">
              Real SoSoValue and SoDEX data, your written answer, and a grade you can check line by line.
            </p>
            <div style={{ "--i": 2 } as React.CSSProperties} className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button asChild size="lg" className="group h-12 px-6 transition-transform active:scale-[0.98]">
                <Link href="/signup">
                  Start free
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </Button>
              <Link href="#preview" className="text-base text-muted underline-offset-4 transition-colors hover:text-fg hover:underline">
                Try a graded sample
              </Link>
            </div>
            <dl
              style={{ "--i": 3 } as React.CSSProperties}
              className="mt-12 grid max-w-xl grid-cols-3 gap-6 border-t border-line pt-6"
            >
              {HERO_FACTS.map(([figure, label]) => (
                <div key={label} className="flex flex-col-reverse gap-1">
                  <dt className="text-sm leading-snug text-muted">{label}</dt>
                  <dd className="font-mono text-xl font-semibold tabular-nums text-fg">{figure}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="lg:pl-4 lg:pr-8">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* The loop: a real sequence, shown as one connected line. */}
      <section id="how-it-works" className="scroll-mt-16 border-b border-line bg-surface-sunken">
        <div className={SECTION}>
          <Reveal>
            <h2 className={H2}>One loop per skill</h2>
            <p className={LEAD}>Nothing counts as mastered until it survives a review a week later.</p>
          </Reveal>
          <LoopSteps steps={LOOP} />
        </div>
      </section>

      {/* Where the data comes from: two providers, eight feeds. */}
      <section id="data" className="scroll-mt-16">
        <div className={SECTION}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
            <Reveal>
              <h2 className={H2}>Built on SoSoValue and SoDEX</h2>
              <p className={LEAD}>
                Every figure shows its source and age. Live, cached and demo data never look alike.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <ProvenanceLegend />
            </Reveal>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {INTEGRATIONS.map((group, gi) => (
              <Reveal key={group.source} delay={gi * 0.1} className="h-full">
                <div className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-line-strong">
                  <div className="flex items-baseline justify-between gap-4 border-b border-line bg-surface-raised px-5 py-5 sm:px-6">
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight">{group.source}</h3>
                      <p className="mt-1 text-sm text-muted">{group.summary}</p>
                    </div>
                    <p className="shrink-0 font-mono text-sm tabular-nums text-accent">{group.feeds.length} feeds</p>
                  </div>
                  <table className="w-full flex-1 text-left text-sm">
                    <caption className="sr-only">
                      {group.source}: what it provides and where MarketGym uses it
                    </caption>
                    <thead className="sr-only">
                      <tr>
                        <th scope="col">Feed</th>
                        <th scope="col">What you get</th>
                        <th scope="col">Where you use it</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.feeds.map((f) => (
                        <tr
                          key={f.product}
                          className="border-b border-line align-top transition-colors duration-200 last:border-b-0 hover:bg-surface-raised"
                        >
                          <th scope="row" className="w-[9.5rem] py-4 pl-5 pr-4 text-base font-semibold sm:pl-6">
                            {f.product}
                          </th>
                          <td className="py-4 pr-5 sm:pr-6">
                            <span className="block text-fg">{f.data}</span>
                            <span className="mt-1 block text-xs text-muted">{f.where}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Practice versus watching, plus the honest note about what it never does. */}
      <section className="border-y border-line bg-surface-sunken">
        <div className={`${SECTION} grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16`}>
          <Reveal>
            <h2 className={H2}>Practice, not a video course</h2>
            <dl className="mt-10 divide-y divide-line border-y border-line">
              <div aria-hidden="true" className="hidden grid-cols-2 gap-6 py-3 text-sm text-muted sm:grid">
                <span>A typical course</span>
                <span className="font-medium text-accent">MarketGym</span>
              </div>
              {COMPARE.map(([course, gym]) => (
                <div key={course} className="grid gap-1 py-4 text-base sm:grid-cols-2 sm:gap-6">
                  <dt className="text-muted">{course}</dt>
                  <dd className="font-medium text-fg">{gym}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal delay={0.1} className="self-center">
            <div className="rounded-xl border border-line-strong bg-surface p-7 shadow-md sm:p-8">
              <h2 className="text-xl font-semibold tracking-tight">It never trades</h2>
              <p className="mt-3 text-base leading-relaxed text-muted">
                No order button, no wallet, no deposits, no signals. MarketGym only reads public market data and grades
                what you write about it.
              </p>
              <ul aria-hidden="true" className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-6 text-sm text-fg">
                {NEVER.map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                      <X className="size-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* The real Scenario lab with the sample pack. */}
      <section id="preview" className="scroll-mt-16">
        <div className={SECTION}>
          <Reveal className="max-w-prose">
            <h2 className={H2}>Try a scenario</h2>
            <p className={LEAD}>
              This is the real Scenario lab with a sample evidence pack. Write twenty characters or more to see a
              graded result. Real scenarios use live data and grade your own words.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-12">
            <div className="rounded-xl border border-line-strong bg-surface-sunken p-1.5 shadow-md">
              <div className="rounded-lg bg-bg p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] sm:p-6">
                <ScenarioLab
                  scenario={SAMPLE_SCENARIO}
                  misconceptions={SAMPLE_MISCONCEPTIONS}
                  skillNames={SAMPLE_SKILL_NAMES}
                  preview={{ evaluation: SAMPLE_EVALUATION, ctaHref: "/signup" }}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-surface-sunken">
        <div className={`${SECTION} grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16`}>
          <Reveal>
            <h2 className={H2}>Questions</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <Faq items={FAQS} />
          </Reveal>
        </div>
      </section>

      {/* Closing call to action on the logo's own navy and periwinkle. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[var(--content-max)] px-4 py-20 sm:px-6 lg:py-28">
          <Reveal>
            <div className="relative grid items-center gap-10 overflow-hidden rounded-2xl border border-[#8da2ff]/25 bg-[#0b1120] px-6 py-14 shadow-md sm:px-12 sm:py-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:px-16 lg:py-20">
              <div className="flex flex-col items-start gap-6">
                <h2 className="text-[clamp(2.25rem,1.6rem+2.6vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-balance text-white">
                  Start with the diagnostic
                </h2>
                <p className="max-w-prose text-lg text-white/70">
                  A few minutes, seven questions, and you get your first module. Nothing to install and no card.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Button
                    asChild
                    size="lg"
                    className="group h-12 bg-[#8da2ff] px-6 text-[#0b1120] transition-transform hover:bg-[#a9b8ff] active:scale-[0.98]"
                  >
                    <Link href="/signup">
                      Start free
                      <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Link href="/login" className="text-base text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline">
                    Log in
                  </Link>
                </div>
              </div>
              <CtaChart className="mx-auto hidden w-full max-w-sm lg:block" />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
