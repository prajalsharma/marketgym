import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { ScenarioLab } from "@/components/scenario/scenario-lab";
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

const LOOP = [
  { name: "Diagnose", text: "Seven questions find what you already know, so you start where it matters." },
  { name: "Learn", text: "Short lessons on one skill at a time: price, volume, flows, order books, reasoning." },
  { name: "Practise", text: "A scenario built from live data. You write the analysis; nothing is multiple choice." },
  { name: "Evaluate", text: "Your answer is graded on facts, evidence, reasoning and how you handle uncertainty." },
  { name: "Improve", text: "The coach shows what you missed and which idea got in the way, then sets the next task." },
  { name: "Retain", text: "Skills come back for review a day, three days and a week later. Mastery needs all of it." },
];

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto max-w-[var(--content-max)] px-4 pb-16 pt-14 sm:px-6 sm:pt-24">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Read the market. Argue from evidence. Get graded.
          </h1>
          <p className="mt-5 max-w-prose text-lg text-muted">
            MarketGym is a practice gym for crypto market analysis. A coach works out what you know, gives you real
            data, asks for your reasoning in writing, and scores it against a rubric you can see.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Start free
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Link href="#preview" className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
              See a graded sample first
            </Link>
          </div>
        </div>
        <dl className="mt-14 grid max-w-3xl gap-x-10 gap-y-6 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-medium">Who it is for</dt>
            <dd className="mt-1 text-muted">
              People who read crypto news and want to tell a fact from a take. Aspiring analysts who need a method, not
              more opinions. Anyone who has looked at an order book and guessed.
            </dd>
          </div>
          <div>
            <dt className="font-medium">What you work with</dt>
            <dd className="mt-1 text-muted">
              Prices, volumes, ETF flows and indexes from SoSoValue. Live order books from SoDEX. Every number shows
              where it came from and how fresh it is.
            </dd>
          </div>
          <div>
            <dt className="font-medium">What it is not</dt>
            <dd className="mt-1 text-muted">
              Not a trading app, not signals, not advice. You never place an order. You learn to explain what the data
              does and does not support.
            </dd>
          </div>
        </dl>
      </section>

      <section id="how-it-works" className="border-t border-line bg-surface-sunken">
        <div className="mx-auto max-w-[var(--content-max)] px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-xl font-semibold tracking-tight">How the coach works</h2>
          <p className="mt-2 max-w-prose text-muted">
            One loop, repeated per skill. The order matters: you are not graded on something you have not practised,
            and nothing counts as mastered until it survives a review.
          </p>
          <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {LOOP.map((step, i) => (
              <li key={step.name} className="flex gap-4">
                <span className="mt-0.5 font-mono text-sm tabular-nums text-accent" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold">{step.name}</h3>
                  <p className="mt-1 text-sm text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[var(--content-max)] px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-xl font-semibold tracking-tight">Why practising beats watching</h2>
        <p className="mt-2 max-w-prose text-muted">
          A course tells you what a spread is. MarketGym shows you a live book and asks for the spread. Most of what
          separates a careful analyst from a confident one is habits, and habits only form by doing.
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div className="rounded-lg border border-line p-5">
            <h3 className="text-sm font-medium text-muted">A typical course</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>Explains concepts with stale screenshots.</li>
              <li>Checks understanding with multiple choice.</li>
              <li>Treats a headline as a fact and a chart as an argument.</li>
              <li>Finishes when the video ends.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-learner-line bg-learner p-5">
            <h3 className="text-sm font-medium text-learner-fg">MarketGym</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>Puts today&apos;s data in front of you with its source attached.</li>
              <li>Asks for a written analysis and grades the reasoning, not just the answer.</li>
              <li>Names the misconception behind a wrong turn and corrects it.</li>
              <li>Brings the skill back later. Mastery is demonstrated, not watched.</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="preview" className="border-t border-line">
        <div className="mx-auto max-w-[var(--content-max)] px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-prose">
            <h2 className="text-xl font-semibold tracking-tight">What a scenario looks like</h2>
            <p className="mt-2 text-muted">
              This is the real Scenario lab with a sample evidence pack, marked as sample throughout. Write an answer
              of twenty characters or more and you will see a graded result like the one the coach produces. Real
              scenarios use live data and grade your actual words.
            </p>
          </div>
          <div className="mt-10 rounded-lg border border-line bg-bg p-4 sm:p-6">
            <ScenarioLab
              scenario={SAMPLE_SCENARIO}
              misconceptions={SAMPLE_MISCONCEPTIONS}
              skillNames={SAMPLE_SKILL_NAMES}
              preview={{ evaluation: SAMPLE_EVALUATION, ctaHref: "/signup" }}
            />
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface-sunken">
        <div className="mx-auto flex max-w-[var(--content-max)] flex-col items-start gap-5 px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-xl font-semibold tracking-tight text-balance">Start with a seven-question diagnostic</h2>
          <p className="max-w-prose text-muted">
            It takes a few minutes and sets your first module. No card, no trading account, nothing to install.
          </p>
          <Button asChild size="lg">
            <Link href="/signup">
              Create a free account
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
