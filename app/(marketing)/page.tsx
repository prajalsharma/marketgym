import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { ProvenanceLegend } from "@/components/marketing/provenance-legend";
import { Faq } from "@/components/ui/faq";
import { ScenarioLab } from "@/components/scenario/scenario-lab";
import { HeroPreview } from "@/components/marketing/hero-preview";
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

const SOURCES: Array<{ source: string; product: string; data: string; where: string }> = [
  {
    source: "SoSoValue",
    product: "Market data",
    data: "Prices, volume, market cap, spot ETF flows, indexes and news",
    where: "Lessons, Scenario lab",
  },
  {
    source: "SoDEX",
    product: "Spot",
    data: "Live order books for BTC, ETH and ANT",
    where: "Order book gym",
  },
  {
    source: "SoDEX",
    product: "Perps",
    data: "The ANT-USD perpetual book, next to ANT spot",
    where: "Order book gym",
  },
  {
    source: "SoDEX",
    product: "Wealth",
    data: "Tokenised ETFs, fund vaults and the ANT Believers Index",
    where: "Wealth lab, practice portfolio",
  },
  {
    source: "SoDEX",
    product: "Rewards",
    data: "Points, multipliers and reward box rules",
    where: "Rewards lessons",
  },
];

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
      <section className="mx-auto grid max-w-[var(--content-max)] items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:pb-28 lg:pt-20">
        <div className="stagger-in max-w-xl">
          <h1 style={{ "--i": 0 } as React.CSSProperties} className="text-2xl font-semibold tracking-tight text-balance">
            Learn to read crypto markets by doing the analysis
          </h1>
          <p style={{ "--i": 1 } as React.CSSProperties} className="mt-5 text-lg text-muted">
            Real SoSoValue and SoDEX data, your written answer, and a grade you can check line by line.
          </p>
          <div style={{ "--i": 2 } as React.CSSProperties} className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button asChild size="lg" className="group">
              <Link href="/signup">
                Start free
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </Button>
            <Link href="#preview" className="text-sm text-muted underline-offset-4 transition-colors hover:text-fg hover:underline">
              Try a graded sample
            </Link>
          </div>
        </div>
        <div className="lg:pl-8">
          <HeroPreview />
        </div>
      </section>

      {/* The loop: a real sequence, shown as one connected line. */}
      <section id="how-it-works" className="border-t border-line bg-surface-sunken">
        <div className="mx-auto max-w-[var(--content-max)] px-4 py-20 sm:px-6 lg:py-24">
          <h2 className="text-xl font-semibold tracking-tight">One loop per skill</h2>
          <p className="mt-2 max-w-prose text-muted">
            Nothing counts as mastered until it survives a review a week later.
          </p>
          <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-6 lg:gap-6">
            <span aria-hidden="true" className="absolute left-0 right-0 top-[15px] hidden h-px bg-line-strong lg:block" />
            {LOOP.map((step, i) => (
              <li key={step.name} className="relative flex gap-4 lg:block">
                <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-sunken font-mono text-sm tabular-nums text-accent">
                  {i + 1}
                </span>
                <div className="lg:mt-5">
                  <h3 className="text-base font-semibold">{step.name}</h3>
                  <p className="mt-1 text-sm text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Where the data comes from: a table, because it is tabular. */}
      <section className="mx-auto max-w-[var(--content-max)] px-4 py-20 sm:px-6 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Built on SoSoValue and SoDEX</h2>
            <p className="mt-2 text-muted">
              Every figure shows its source and age. Live, cached and demo data never look alike.
            </p>
            <ProvenanceLegend className="mt-6" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Data sources, what they provide and where MarketGym uses them</caption>
              <thead>
                <tr className="border-b border-line-strong text-xs text-muted">
                  <th scope="col" className="py-2 pr-4 font-medium">Source</th>
                  <th scope="col" className="py-2 pr-4 font-medium">What you get</th>
                  <th scope="col" className="hidden py-2 font-medium sm:table-cell">Where you use it</th>
                </tr>
              </thead>
              <tbody>
                {SOURCES.map((s) => (
                  <tr key={`${s.source}-${s.product}`} className="border-b border-line align-top last:border-b-0">
                    <th scope="row" className="whitespace-nowrap py-4 pr-4 font-medium">
                      {s.source} <span className="font-normal text-muted">{s.product}</span>
                    </th>
                    <td className="py-4 pr-4">
                      {s.data}
                      <span className="mt-1 block text-xs text-muted sm:hidden">{s.where}</span>
                    </td>
                    <td className="hidden py-4 text-muted sm:table-cell">{s.where}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Practice versus watching, plus the honest note about what it never does. */}
      <section className="border-y border-line bg-surface-sunken">
        <div className="mx-auto grid max-w-[var(--content-max)] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:py-24">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Practice, not a video course</h2>
            <dl className="mt-8 divide-y divide-line border-y border-line">
              <div aria-hidden="true" className="hidden grid-cols-2 gap-6 py-2 text-xs text-muted sm:grid">
                <span>A typical course</span>
                <span>MarketGym</span>
              </div>
              {COMPARE.map(([course, gym]) => (
                <div key={course} className="grid gap-1 py-3.5 text-sm sm:grid-cols-2 sm:gap-6">
                  <dt className="text-muted">{course}</dt>
                  <dd className="text-fg">{gym}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="self-center rounded-lg border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold">It never trades</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              No order button, no wallet, no deposits, no signals. MarketGym only reads public market data and grades
              what you write about it.
            </p>
          </div>
        </div>
      </section>

      {/* The real Scenario lab with the sample pack. */}
      <section id="preview" className="scroll-mt-16">
        <div className="mx-auto max-w-[var(--content-max)] px-4 py-20 sm:px-6 lg:py-24">
          <div className="max-w-prose">
            <h2 className="text-xl font-semibold tracking-tight">Try a scenario</h2>
            <p className="mt-2 text-muted">
              This is the real Scenario lab with a sample evidence pack. Write twenty characters or more to see a
              graded result. Real scenarios use live data and grade your own words.
            </p>
          </div>
          <div className="mt-10 rounded-lg border border-line bg-surface-sunken p-1.5 shadow-md">
            <div className="rounded-md bg-bg p-4 sm:p-6">
              <ScenarioLab
                scenario={SAMPLE_SCENARIO}
                misconceptions={SAMPLE_MISCONCEPTIONS}
                skillNames={SAMPLE_SKILL_NAMES}
                preview={{ evaluation: SAMPLE_EVALUATION, ctaHref: "/signup" }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-[var(--content-max)] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16 lg:py-24">
          <h2 className="text-xl font-semibold tracking-tight">Questions</h2>
          <Faq items={FAQS} />
        </div>
      </section>

      <section className="border-t border-line bg-surface-sunken">
        <div className="mx-auto flex max-w-[var(--content-max)] flex-col items-start gap-5 px-4 py-20 sm:px-6 lg:py-24">
          <h2 className="text-xl font-semibold tracking-tight text-balance">Start with the diagnostic</h2>
          <p className="max-w-prose text-muted">
            A few minutes, seven questions, and you get your first module. Nothing to install and no card.
          </p>
          <Button asChild size="lg" className="group">
            <Link href="/signup">
              Start free
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
