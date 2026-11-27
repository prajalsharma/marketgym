"use client";

import { useEffect, useId, useState } from "react";
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start">
      <section aria-labelledby="book-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <h2 id="book-heading" className="text-base font-semibold">
              Order book{shownMarkets.length > 1 ? "s" : ""}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span id={viewId} className="text-xs text-muted">
                Market
              </span>
              <SegmentedTabs
                label="Market to show"
                value={view}
                onValueChange={setView}
                items={[
                  { value: "exercise", label: "This exercise" },
                  ...GYM_MARKETS.map((m) => ({ value: m.id, label: m.short })),
                ]}
              />
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
        {view !== "exercise" && !markets.includes(view) ? (
          <p className="text-xs text-muted">
            Browsing {marketLabel(view)}. This exercise is checked against {markets.map(marketLabel).join(" and ")}.
          </p>
        ) : null}
        {loading && Object.keys(books).length === 0 ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-[26rem]" />
          </div>
        ) : loadError ? (
          <ErrorState title="Could not load the order book" description={describeError(loadError)} retry={fetchBooks} />
        ) : (
          <div className={cn("grid gap-4", sideBySide && "md:grid-cols-2")}>
            {shownMarkets.map((m) =>
              books[m] ? (
                <div key={m} className="min-w-0 space-y-3 rounded-lg border border-evidence-line bg-evidence p-3">
                  {sideBySide ? <p className="text-sm font-medium">{marketLabel(m)}</p> : null}
                  <OrderBookLadder
                    book={books[m]}
                    levels={sideBySide ? TOP_LEVELS : undefined}
                    compact={sideBySide}
                    className="max-h-[32rem]"
                  />
                  {sideBySide ? <BookSummary book={books[m]} /> : null}
                </div>
              ) : null,
            )}
          </div>
        )}
        <p className="text-xs text-muted">Read-only. MarketGym never places orders.</p>
      </section>

      <section aria-labelledby="exercise-heading" className="rounded-lg border border-learner-line bg-learner p-4 sm:p-5">
        <h2 id="exercise-heading" className="text-base font-semibold">
          Exercise
        </h2>
        {exercises.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No exercises are available right now.</p>
        ) : (
          <>
            <div className="mt-3">
              <Label htmlFor={selectId}>Choose an exercise</Label>
              <select
                id={selectId}
                value={exerciseId}
                onChange={(e) => pick(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-line bg-bg px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
              </select>
            </div>
            {exercise ? (
              <form onSubmit={submit} className="mt-4 space-y-5">
                <div className="flex flex-wrap gap-1.5">
                  {exercise.skillIds.map((s) => (
                    <Badge key={s} tone="info">
                      {humanise(s)}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm leading-relaxed">{exercise.instructions}</p>
                <ol className="space-y-4">
                  {exercise.questions.map((q, i) => {
                    const r = result?.results.find((x) => x.questionId === q.id);
                    return (
                      <li key={q.id} className="space-y-2">
                        <p className="text-sm font-medium">
                          <span className="mr-2 font-mono text-xs text-muted">{i + 1}</span>
                          {q.prompt}
                        </p>
                        {q.kind === "number" ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="any"
                              value={answers[q.id] ?? ""}
                              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                              disabled={pending || result !== null}
                              aria-label={q.prompt}
                              className="max-w-48 bg-bg"
                            />
                            {q.unit ? <span className="text-xs text-muted">{q.unit}</span> : null}
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
                        {r ? (
                          <div className={cn("hint-reveal rounded-md border p-3 text-sm", r.correct ? "border-success bg-success-soft" : "border-danger bg-danger-soft")}>
                            <p className="flex items-center gap-1.5 font-medium">
                              {r.correct ? <Check className="size-4 text-success" aria-hidden="true" /> : <X className="size-4 text-danger" aria-hidden="true" />}
                              {r.correct ? "Correct" : `Expected ${r.expected}`}
                            </p>
                            <p className="mt-1 leading-relaxed">{r.explanation}</p>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>

                {result ? (
                  <div className="eval-reveal space-y-2 rounded-md border border-line bg-surface p-4">
                    <p className="text-sm">
                      Score <AnimatedNumber value={Math.round(result.score)} countUp className="font-mono text-lg" /> / 100
                      {hints > 0 ? <span className="text-muted"> · {hints} hint{hints === 1 ? "" : "s"} used</span> : null}
                    </p>
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
                      <p role="alert" className="rounded-md border border-danger bg-danger-soft p-3 text-sm">
                        {submitError}
                      </p>
                    ) : null}
                    <Button type="submit" size="lg" disabled={!allAnswered || pending || !primaryBook}>
                      {pending ? "Checking…" : "Check answers"}
                    </Button>
                  </>
                )}
              </form>
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
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-evidence-line pt-2 text-xs">
      <dt className="text-muted">Spread</dt>
      <dd className="tabular text-right font-mono">{formatPercent(book.spreadPercentage, { signed: false, digits: 3 })}</dd>
      <dt className="text-muted">Top {TOP_LEVELS} bids</dt>
      <dd className="tabular text-right font-mono">
        {formatQuantity(bidQty, book.lotSize)} {book.baseAsset}{" "}
        <span className="text-muted">({formatCompact(bidUsd, { currency: true })})</span>
      </dd>
      <dt className="text-muted">Top {TOP_LEVELS} asks</dt>
      <dd className="tabular text-right font-mono">
        {formatQuantity(askQty, book.lotSize)} {book.baseAsset}{" "}
        <span className="text-muted">({formatCompact(askUsd, { currency: true })})</span>
      </dd>
    </dl>
  );
}
