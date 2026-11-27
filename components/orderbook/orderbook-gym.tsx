"use client";

import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, RefreshCw, X } from "lucide-react";
import type { OrderBookSnapshot } from "@/lib/types/market";
import type { OrderBookExercise } from "@/lib/types/learning";
import type { MarketOrderBookResponse, OrderBookExerciseSubmitResponse } from "@/lib/types/api";
import { Badge, Button, ErrorState, Input, Label, RadioCard, RadioGroup, Skeleton } from "@/components/ui";
import { OrderBookLadder } from "./ladder";
import { SegmentedTabs } from "@/components/ui/animated-tabs";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { HintLadder } from "@/components/shared/hint-ladder";
import { apiGet, apiPost, describeError } from "@/lib/client/api";
import { formatCompact, formatPercent, formatQuantity, humanise } from "@/lib/client/format";
import { EASE_OUT, TIMING, spring } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

const DEFAULT_MARKET = "vBTC_vUSDC";
const LIMIT = 20;
const TOP_LEVELS = 10;

/** Markets the learner can browse. Perps are read-only teaching material, never traded. */
export const GYM_MARKETS: Array<{ id: string; label: string; short: string }> = [
  { id: "vBTC_vUSDC", label: "BTC/USDC spot", short: "BTC" },
  { id: "vETH_vUSDC", label: "ETH/USDC spot", short: "ETH" },
  { id: "vANT_vUSDC", label: "ANT/USDC spot", short: "ANT" },
  { id: "perps:ANT-USD", label: "ANT-USD perpetual", short: "ANT perp" },
];

/** Tab names: the two ANT books need telling apart, so those spell out the venue type. */
const TAB_LABELS: Record<string, string> = {
  vBTC_vUSDC: "BTC",
  vETH_vUSDC: "ETH",
  vANT_vUSDC: "ANT spot",
  "perps:ANT-USD": "ANT-USD perpetual",
};

function marketLabel(id: string): string {
  return GYM_MARKETS.find((m) => m.id === id)?.label ?? id;
}

interface Props {
  exercises: OrderBookExercise[];
  initialExerciseId?: string;
}

type Books = Record<string, OrderBookSnapshot>;

/** Live ladders (read-only) + one exercise. Refresh re-fetches books and clears answers after confirming. */
export function OrderBookGym({ exercises, initialExerciseId }: Props) {
  const [exerciseId, setExerciseId] = useState<string>(
    exercises.find((e) => e.id === initialExerciseId)?.id ?? exercises[0]?.id ?? "",
  );
  const exercise = exercises.find((e) => e.id === exerciseId) ?? null;
  const markets = exercise && exercise.markets.length > 0 ? exercise.markets : [DEFAULT_MARKET];
  /** "exercise" shows the exercise's own book(s); a market id shows that book for browsing */
  const [view, setView] = useState<string>("exercise");
  const shownMarkets = view === "exercise" ? markets : [view];
  const sideBySide = view === "exercise" && (exercise?.kind === "spot-vs-perps" || markets.length > 1);
  const viewId = useId();

  const [books, setBooks] = useState<Books>({});
  /** which market set the books belong to; loading is derived from this, not set in an effect */
  const [booksFor, setBooksFor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hints, setHints] = useState(0);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderBookExerciseSubmitResponse | null>(null);
  const selectId = useId();

  // Always fetch the exercise books (grading needs them) plus whatever is being browsed.
  const marketsKey = [...new Set([...markets, ...shownMarkets])].join(",");
  const loading = refreshing || booksFor !== marketsKey;

  useEffect(() => {
    let cancelled = false;
    const wanted = marketsKey.split(",");
    Promise.all(
      wanted.map(
        async (m) =>
          [m, await apiGet<MarketOrderBookResponse>(`/api/market/orderbook?market=${encodeURIComponent(m)}&limit=${LIMIT}`)] as const,
      ),
    )
      .then((entries) => {
        if (cancelled) return;
        setBooks(Object.fromEntries(entries));
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(e);
      })
      .finally(() => {
        if (cancelled) return;
        setBooksFor(marketsKey);
        setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [marketsKey, tick]);

  function fetchBooks() {
    setRefreshing(true);
    setTick((t) => t + 1);
  }

  function resetAnswers() {
    setAnswers({});
    setHints(0);
    setResult(null);
    setSubmitError(null);
  }

  function refresh() {
    const dirty = Object.keys(answers).length > 0 || result !== null;
    if (dirty && !window.confirm("Refreshing the book clears your answers for this exercise. Continue?")) return;
    resetAnswers();
    fetchBooks();
  }

  function pick(id: string) {
    setExerciseId(id);
    setView("exercise");
    resetAnswers();
  }

  const primaryBook = books[markets[0]] ?? null;
  const allAnswered = exercise ? exercise.questions.every((q) => (answers[q.id] ?? "").toString().trim() !== "") : false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!exercise || !primaryBook || !allAnswered || pending) return;
    setPending(true);
    setSubmitError(null);
    const typed: Record<string, string | number> = {};
    for (const q of exercise.questions) {
      const raw = answers[q.id] ?? "";
      typed[q.id] = q.kind === "number" ? Number(raw) : raw;
    }
    try {
      const res = await apiPost<OrderBookExerciseSubmitResponse>("/api/orderbook-gym/submit", {
        exerciseId: exercise.id,
        market: markets[0],
        answers: typed,
        snapshotTimestamp: primaryBook.timestamp,
      });
      setResult(res);
    } catch (err) {
      setSubmitError(describeError(err));
    } finally {
      setPending(false);
    }
  }

  const reduce = useReducedMotion() ?? false;
  const answeredCount = exercise
    ? exercise.questions.filter((q) => (answers[q.id] ?? "").toString().trim() !== "").length
    : 0;
  const questionCount = exercise?.questions.length ?? 0;
  const correctCount = result ? result.results.filter((r) => r.correct).length : 0;
  const rise = reduce ? false : { opacity: 0, y: 10 };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start">
      <section aria-labelledby="book-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h2 id="book-heading" className="text-lg font-semibold tracking-tight">
              Order book{shownMarkets.length > 1 ? "s" : ""}
            </h2>
            <div className="flex flex-wrap items-center gap-2.5">
              <span id={viewId} className="text-xs text-muted">
                Market
              </span>
              <SegmentedTabs
                label="Market to show"
                size="md"
                value={view}
                onValueChange={setView}
                items={[
                  { value: "exercise", label: "This exercise" },
                  ...GYM_MARKETS.map((m) => ({ value: m.id, label: TAB_LABELS[m.id] ?? m.short })),
                ]}
              />
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
        <AnimatePresence initial={false}>
          {view !== "exercise" && !markets.includes(view) ? (
            <motion.p
              key="browse-note"
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={spring.gentle}
              className="overflow-hidden text-xs text-muted"
            >
              Browsing {marketLabel(view)}. This exercise is checked against {markets.map(marketLabel).join(" and ")}.
            </motion.p>
          ) : null}
        </AnimatePresence>
        {loading && Object.keys(books).length === 0 ? (
          <div className="space-y-3 rounded-lg border border-evidence-line bg-evidence p-4" aria-busy="true">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-14" />
            <Skeleton className="h-[24rem]" />
          </div>
        ) : loadError ? (
          <ErrorState title="Could not load the order book" description={describeError(loadError)} retry={fetchBooks} />
        ) : (
          <div
            className={cn(
              "grid gap-4 transition-opacity duration-(--duration-base)",
              sideBySide && "md:grid-cols-2",
              loading && "opacity-70",
            )}
          >
            {shownMarkets.map((m, i) =>
              books[m] ? (
                <motion.div
                  key={m}
                  initial={rise}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: TIMING.pageRise, ease: EASE_OUT, delay: reduce ? 0 : i * TIMING.stagger }}
                  className="min-w-0 space-y-3 rounded-lg border border-evidence-line bg-evidence p-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] shadow-sm sm:p-4"
                >
                  {sideBySide ? (
                    <p className="flex items-center justify-between gap-2 border-b border-evidence-line pb-2 text-sm font-semibold">
                      {marketLabel(m)}
                      <span className="font-mono text-xs font-normal text-muted">
                        {i + 1}/{shownMarkets.length}
                      </span>
                    </p>
                  ) : null}
                  <OrderBookLadder
                    book={books[m]}
                    levels={sideBySide ? TOP_LEVELS : undefined}
                    compact={sideBySide}
                    className="max-h-[40rem]"
                  />
                  {sideBySide ? <BookSummary book={books[m]} /> : null}
                </motion.div>
              ) : null,
            )}
          </div>
        )}
        <p className="text-xs text-muted">Read-only. MarketGym never places orders.</p>
      </section>

      <section
        aria-labelledby="exercise-heading"
        className="rounded-lg border border-learner-line bg-learner p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] shadow-sm sm:p-6"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="exercise-heading" className="text-lg font-semibold tracking-tight">
            Exercise
          </h2>
          {exercise && questionCount > 0 ? (
            <span className="text-xs tabular-nums text-muted">
              {answeredCount} of {questionCount} answered
            </span>
          ) : null}
        </div>
        {exercise && questionCount > 0 ? (
          <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-sm bg-learner-soft">
            <motion.div
              className="h-full origin-left rounded-sm bg-accent"
              initial={false}
              animate={{ scaleX: answeredCount / questionCount }}
              transition={reduce ? { duration: 0 } : spring.gentle}
            />
          </div>
        ) : null}
        {exercises.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No exercises are available right now.</p>
        ) : (
          <>
            <div className="mt-4">
              <Label htmlFor={selectId}>Choose an exercise</Label>
              <select
                id={selectId}
                value={exerciseId}
                onChange={(e) => pick(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-line-strong bg-bg px-3 text-sm font-medium outline-none transition-colors duration-(--duration-fast) hover:border-accent focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
              </select>
            </div>
            {exercise ? (
              <motion.form
                key={exercise.id}
                onSubmit={submit}
                initial={rise}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: TIMING.pageRise, ease: EASE_OUT }}
                className="mt-5 space-y-5"
              >
                <div className="flex flex-wrap gap-1.5">
                  {exercise.skillIds.map((s) => (
                    <Badge key={s} tone="info">
                      {humanise(s)}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm leading-relaxed">{exercise.instructions}</p>
                <ol className="space-y-3">
                  {exercise.questions.map((q, i) => {
                    const r = result?.results.find((x) => x.questionId === q.id);
                    return (
                      <li
                        key={q.id}
                        className={cn(
                          "space-y-3 rounded-lg border bg-surface p-3.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-colors duration-(--duration-base) sm:p-4",
                          r ? (r.correct ? "border-success" : "border-danger") : "border-line",
                        )}
                      >
                        <p className="flex gap-2.5 text-sm font-medium leading-snug">
                          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent-soft font-mono text-xs text-accent">
                            {i + 1}
                          </span>
                          <span className="pt-0.5">{q.prompt}</span>
                        </p>
                        {q.kind === "number" ? (
                          <div className="flex items-center gap-2.5">
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="any"
                              value={answers[q.id] ?? ""}
                              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                              disabled={pending || result !== null}
                              aria-label={q.prompt}
                              className="h-11 max-w-56 bg-bg font-mono text-base tabular-nums sm:text-base"
                            />
                            {q.unit ? (
                              <span className="rounded-md border border-line bg-surface-sunken px-2 py-1 font-mono text-xs text-muted">
                                {q.unit}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <RadioGroup
                            value={answers[q.id] ?? ""}
                            onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                            disabled={pending || result !== null}
                            aria-label={q.prompt}
                            className="grid gap-1.5"
                          >
                            {(q.options ?? []).map((o) => (
                              <RadioCard key={o.id} value={o.id} title={o.text} />
                            ))}
                          </RadioGroup>
                        )}
                        <AnimatePresence initial={false}>
                          {r ? (
                            <motion.div
                              key="result"
                              initial={reduce ? false : { opacity: 0, height: 0, y: -4 }}
                              animate={{ opacity: 1, height: "auto", y: 0 }}
                              exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                              transition={{ ...spring.gentle, delay: reduce ? 0 : i * TIMING.stagger * 2 }}
                              className="overflow-hidden"
                            >
                              <div
                                className={cn(
                                  "flex gap-2.5 rounded-md border p-3 text-sm",
                                  r.correct ? "border-success bg-success-soft" : "border-danger bg-danger-soft",
                                )}
                              >
                                <motion.span
                                  initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ ...spring.snappy, delay: reduce ? 0 : 0.12 + i * TIMING.stagger * 2 }}
                                  className={cn(
                                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                                    r.correct ? "bg-success text-bg" : "bg-danger text-bg",
                                  )}
                                >
                                  {r.correct ? (
                                    <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                                  ) : (
                                    <X className="size-3.5" strokeWidth={3} aria-hidden="true" />
                                  )}
                                </motion.span>
                                <div className="min-w-0">
                                  <p className="font-medium">{r.correct ? "Correct" : `Expected ${r.expected}`}</p>
                                  <p className="mt-1 leading-relaxed">{r.explanation}</p>
                                </div>
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ol>

                {result ? (
                  <div className="eval-reveal space-y-3 rounded-lg border border-line-strong bg-surface-raised p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] shadow-sm">
                    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                      <p className="text-sm">
                        Score{" "}
                        <AnimatedNumber
                          value={Math.round(result.score)}
                          countUp
                          className="mx-1 font-mono text-3xl font-semibold tracking-tight text-accent"
                        />{" "}
                        / 100
                      </p>
                      <p className="text-xs tabular-nums text-muted">
                        {correctCount} of {result.results.length} right
                        {hints > 0 ? ` · ${hints} hint${hints === 1 ? "" : "s"} used` : ""}
                      </p>
                    </div>
                    <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-sm bg-surface-sunken">
                      <motion.div
                        className="h-full origin-left rounded-sm bg-accent"
                        initial={reduce ? false : { scaleX: 0 }}
                        animate={{ scaleX: Math.min(1, Math.max(0, result.score / 100)) }}
                        transition={reduce ? { duration: 0 } : { duration: TIMING.countUp, ease: EASE_OUT }}
                      />
                    </div>
                    {result.masteryUpdates.length > 0 ? (
                      <p className="text-xs text-muted">
                        Mastery updated: {result.masteryUpdates.map((m) => `${humanise(m.skillId)} ${Math.round(m.masteryScore)}`).join(", ")}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button type="button" variant="secondary" size="sm" onClick={resetAnswers}>
                        Try again on this snapshot
                      </Button>
                      <Button type="button" size="sm" onClick={refresh}>
                        New snapshot
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <HintLadder hints={exercise.hints} revealed={hints} onReveal={() => setHints((n) => Math.min(3, n + 1))} disabled={pending} />
                    {submitError ? (
                      <p role="alert" className="hint-reveal rounded-md border border-danger bg-danger-soft p-3 text-sm">
                        {submitError}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-3 border-t border-learner-line pt-4">
                      <Button type="submit" size="lg" disabled={!allAnswered || pending || !primaryBook}>
                        {pending ? "Checking…" : "Check answers"}
                      </Button>
                      {!allAnswered ? <span className="text-xs text-muted">Answer every question first.</span> : null}
                    </div>
                  </>
                )}
              </motion.form>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

/** Spread % and top-10 depth for one book, from the snapshot's own levels. */
function BookSummary({ book }: { book: OrderBookSnapshot }) {
  const bids = book.bids.slice(0, TOP_LEVELS);
  const asks = book.asks.slice(0, TOP_LEVELS);
  const bidQty = bids.reduce((s, l) => s + l.quantity, 0);
  const askQty = asks.reduce((s, l) => s + l.quantity, 0);
  const bidUsd = bids.reduce((s, l) => s + l.quantity * l.price, 0);
  const askUsd = asks.reduce((s, l) => s + l.quantity * l.price, 0);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border border-line bg-surface px-3 py-2.5 text-xs">
      <dt className="text-muted">Spread</dt>
      <dd className="tabular text-right font-mono">{formatPercent(book.spreadPercentage, { signed: false, digits: 3 })}</dd>
      <dt className="text-muted">Top {TOP_LEVELS} bids</dt>
      <dd className="tabular text-right font-mono text-bid">
        {formatQuantity(bidQty, book.lotSize)} {book.baseAsset}{" "}
        <span className="text-muted">({formatCompact(bidUsd, { currency: true })})</span>
      </dd>
      <dt className="text-muted">Top {TOP_LEVELS} asks</dt>
      <dd className="tabular text-right font-mono text-ask">
        {formatQuantity(askQty, book.lotSize)} {book.baseAsset}{" "}
        <span className="text-muted">({formatCompact(askUsd, { currency: true })})</span>
      </dd>
    </dl>
  );
}
