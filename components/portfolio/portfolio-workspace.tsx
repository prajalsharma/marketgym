"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  PortfolioResponse,
  PortfolioReviewResponse,
  PortfolioUpsertRequest,
  WealthBoardResponse,
} from "@/lib/types/api";
import type { PaperPortfolio } from "@/lib/types/wealth";
import {
  Button,
  EmptyState,
  Input,
  Label,
  RadioCard,
  RadioGroup,
  Textarea,
} from "@/components/ui";
import { EvaluationPanel, type MisconceptionLookup } from "@/components/scenario/evaluation-panel";
import { apiPost, apiPut, describeError } from "@/lib/client/api";
import { formatDateTime, formatPercent, formatUsd } from "@/lib/client/format";
import { UNUSUAL_NOTE, fundName, headlineReturn, isUnusualPct, quoteFor } from "@/lib/client/wealth";
import { cn } from "@/lib/utils";
import { AnalysisPanel } from "./analysis-panel";
import { DonutChart, chartSlot } from "@/components/ui/donut-chart";
import { AnimatedNumber } from "@/components/ui/animated-number";

const MAX_HOLDINGS = 8;
const RATIONALE_MIN = 40;
const RATIONALE_MAX = 4000;
const NAME_MAX = 80;

const QUESTIONS = [
  "Why these funds, and why these weights?",
  "How do fees and trading hours affect this mix?",
  "What can past returns and the weekly-buying simulation not tell you?",
  "What would make you change the plan?",
];

interface Row {
  fundId: string;
  weight: string;
}

interface Draft {
  id: string | null;
  name: string;
  rows: Row[];
  strategy: PaperPortfolio["strategy"];
  rationale: string;
}

interface Props {
  board: WealthBoardResponse;
  initialPortfolios: PortfolioResponse[];
  /** ?add=<fundId> from the Wealth lab */
  addFundId?: string;
  /** ?id=<portfolioId> to open a saved portfolio */
  openId?: string;
  misconceptions?: MisconceptionLookup;
  skillNames?: Record<string, string>;
}

function emptyDraft(addFundId?: string): Draft {
  return {
    id: null,
    name: "",
    rows: addFundId ? [{ fundId: addFundId, weight: "100" }] : [],
    strategy: "lump-sum",
    rationale: "",
  };
}

function draftFrom(p: PaperPortfolio): Draft {
  return {
    id: p.id,
    name: p.name,
    rows: p.holdings.map((h) => ({ fundId: h.fundId, weight: String(h.weightPct) })),
    strategy: p.strategy,
    rationale: p.rationale,
  };
}

function toRequest(d: Draft): PortfolioUpsertRequest {
  return {
    name: d.name.trim(),
    holdings: d.rows.map((r) => ({ fundId: r.fundId, weightPct: Number(r.weight) })),
    strategy: d.strategy,
    rationale: d.rationale.trim(),
  };
}

function sameRequest(a: PortfolioUpsertRequest, b: PortfolioUpsertRequest): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isWholeWeight(s: string): boolean {
  if (!/^\d+$/.test(s.trim())) return false;
  const n = Number(s);
  return n >= 1 && n <= 100;
}

/** Practice portfolio builder: pick funds, set whole-number weights, explain why, save, get analysed and graded. */
export function PortfolioWorkspace({ board, initialPortfolios, addFundId, openId, misconceptions, skillNames }: Props) {
  const knownIds = useMemo(() => new Set(board.funds.map((f) => f.fundId)), [board.funds]);
  const [portfolios, setPortfolios] = useState<PortfolioResponse[]>(initialPortfolios);
  const [current, setCurrent] = useState<PortfolioResponse | null>(
    () => initialPortfolios.find((p) => p.portfolio.id === openId) ?? null,
  );
  const [draft, setDraft] = useState<Draft>(() =>
    current ? draftFrom(current.portfolio) : emptyDraft(addFundId && knownIds.has(addFundId) ? addFundId : undefined),
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [review, setReview] = useState<PortfolioReviewResponse | null>(null);
  const evalRef = useRef<HTMLHeadingElement | null>(null);
  const nameId = useId();
  const rationaleId = useId();
  const questionsId = useId();

  const total = draft.rows.reduce((s, r) => s + (isWholeWeight(r.weight) ? Number(r.weight) : 0), 0);
  const rationaleLen = draft.rationale.trim().length;
  const errors = {
    name: draft.name.trim().length === 0 ? "Give the portfolio a name." : draft.name.trim().length > NAME_MAX ? `Keep the name under ${NAME_MAX} characters.` : null,
    holdings: draft.rows.length === 0 ? "Add at least one fund." : null,
    weights: draft.rows.some((r) => !isWholeWeight(r.weight))
      ? "Each weight must be a whole number from 1 to 100."
      : total !== 100
        ? `Weights add up to ${total}. They need to add up to 100.`
        : null,
    rationale:
      rationaleLen < RATIONALE_MIN
        ? `Write at least ${RATIONALE_MIN} characters (${rationaleLen} so far).`
        : rationaleLen > RATIONALE_MAX
          ? `Keep it under ${RATIONALE_MAX} characters.`
          : null,
  };
  const valid = !errors.name && !errors.holdings && !errors.weights && !errors.rationale;
  const dirty = !current || !sameRequest(toRequest(draft), toRequest(draftFrom(current.portfolio)));

  function update(patch: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setReview(null);
  }

  function toggleFund(fundId: string) {
    const has = draft.rows.some((r) => r.fundId === fundId);
    if (has) update({ rows: draft.rows.filter((r) => r.fundId !== fundId) });
    else if (draft.rows.length < MAX_HOLDINGS) update({ rows: [...draft.rows, { fundId, weight: "" }] });
  }

  function setWeight(fundId: string, weight: string) {
    update({ rows: draft.rows.map((r) => (r.fundId === fundId ? { ...r, weight } : r)) });
  }

  function splitEvenly() {
    const n = draft.rows.length;
    if (n === 0) return;
    const base = Math.floor(100 / n);
    const extra = 100 - base * n;
    update({ rows: draft.rows.map((r, i) => ({ ...r, weight: String(base + (i < extra ? 1 : 0)) })) });
  }

  function startNew() {
    setCurrent(null);
    setDraft(emptyDraft());
    setReview(null);
    setSaveError(null);
    setReviewError(null);
    setShowErrors(false);
  }

  function open(p: PortfolioResponse) {
    setCurrent(p);
    setDraft(draftFrom(p.portfolio));
    setReview(null);
    setSaveError(null);
    setReviewError(null);
    setShowErrors(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!valid) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const body = toRequest(draft);
      const res = draft.id
        ? await apiPut<PortfolioResponse>(`/api/portfolio/${encodeURIComponent(draft.id)}`, body)
        : await apiPost<PortfolioResponse>("/api/portfolio", body);
      setCurrent(res);
      setDraft(draftFrom(res.portfolio));
      setPortfolios((list) => [res, ...list.filter((p) => p.portfolio.id !== res.portfolio.id)]);
      setShowErrors(false);
    } catch (err) {
      setSaveError(describeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function submitReview() {
    if (!current || dirty || reviewing) return;
    setReviewing(true);
    setReviewError(null);
    try {
      const res = await apiPost<PortfolioReviewResponse>(
        `/api/portfolio/${encodeURIComponent(current.portfolio.id)}/review`,
        {},
      );
      setReview(res);
      const updated = { portfolio: res.portfolio, analysis: res.analysis };
      setCurrent(updated);
      setPortfolios((list) => list.map((p) => (p.portfolio.id === updated.portfolio.id ? updated : p)));
      requestAnimationFrame(() => {
        evalRef.current?.focus();
        evalRef.current?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        });
      });
    } catch (err) {
      setReviewError(describeError(err));
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:items-start">
      <div className="min-w-0 space-y-6">
        <form onSubmit={save} noValidate className="space-y-6 rounded-lg border border-learner-line bg-learner p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-learner-fg">{draft.id ? "Edit portfolio" : "New portfolio"}</h2>
            {draft.id ? (
              <Button type="button" variant="ghost" size="sm" onClick={startNew}>
                <Plus className="size-4" aria-hidden="true" />
                Start a new one
              </Button>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              id={nameId}
              value={draft.name}
              maxLength={NAME_MAX}
              onChange={(e) => update({ name: e.target.value })}
              invalid={showErrors && Boolean(errors.name)}
              aria-describedby={showErrors && errors.name ? `${nameId}-err` : undefined}
              placeholder="For example: steady index core"
              className="bg-bg"
            />
            {showErrors && errors.name ? (
              <p id={`${nameId}-err`} className="text-sm text-danger">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FundPicker board={board} selected={draft.rows.map((r) => r.fundId)} onToggle={toggleFund} />
            <Holdings
              board={board}
              rows={draft.rows}
              total={total}
              error={showErrors || (draft.rows.length > 0 && draft.rows.every((r) => r.weight !== "")) ? (errors.holdings ?? errors.weights) : null}
              onWeight={setWeight}
              onRemove={toggleFund}
              onSplit={splitEvenly}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">How would you buy it?</legend>
            <RadioGroup
              value={draft.strategy}
              onValueChange={(v) => update({ strategy: v as PaperPortfolio["strategy"] })}
              className="grid gap-2 sm:grid-cols-2"
            >
              <RadioCard value="lump-sum" title="All at once" description="Put the whole amount in on day one." />
              <RadioCard value="weekly-dca" title="Weekly buying" description="Split it into equal weekly buys." />
            </RadioGroup>
          </fieldset>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="space-y-1.5">
              <Label htmlFor={rationaleId}>Your reasoning</Label>
              <Textarea
                id={rationaleId}
                rows={9}
                value={draft.rationale}
                maxLength={RATIONALE_MAX}
                onChange={(e) => update({ rationale: e.target.value })}
                invalid={showErrors && Boolean(errors.rationale)}
                aria-describedby={questionsId}
                placeholder="Answer the questions alongside. Name the numbers you used."
                className="bg-bg"
              />
              <p className={cn("text-xs", showErrors && errors.rationale ? "text-danger" : "text-subtle")}>
                {showErrors && errors.rationale ? errors.rationale : `${rationaleLen} of ${RATIONALE_MAX} characters, at least ${RATIONALE_MIN}.`}
              </p>
            </div>
            <div id={questionsId} className="rounded-md border border-line bg-surface p-4">
              <p className="text-sm font-medium">Answer these in your reasoning</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted">
                {QUESTIONS.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            </div>
          </div>

          {saveError ? (
            <p role="alert" className="rounded-md border border-danger bg-danger-soft p-3 text-sm">
              {saveError}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="submit" variant={current && !dirty ? "secondary" : "primary"} loading={saving} disabled={saving || (current !== null && !dirty)}>
              {saving ? "Saving…" : current && !dirty ? "Saved" : draft.id ? "Save changes" : "Save portfolio"}
            </Button>
            <Button
              type="button"
              variant={current && !dirty ? "primary" : "secondary"}
              onClick={submitReview}
              loading={reviewing}
              disabled={!current || dirty || reviewing}
            >
              {reviewing ? "Grading…" : "Submit for review"}
            </Button>
            {!current || dirty ? (
              <p className="text-xs text-subtle">Save first, then submit your reasoning for review.</p>
            ) : null}
          </div>
          {reviewError ? (
            <p role="alert" className="rounded-md border border-danger bg-danger-soft p-3 text-sm">
              {reviewError}
            </p>
          ) : null}
        </form>

        {current ? (
          <AnalysisPanel analysis={current.analysis} />
        ) : (
          <EmptyState
            title="Analysis appears after you save"
            description="Concentration, fees, market-hours share and weighted returns are worked out from SoDEX data when you save."
          />
        )}

        {review ? (
          <section aria-labelledby="review-heading" className="space-y-4 rounded-lg border border-line bg-surface p-4 sm:p-5">
            <h2 id="review-heading" ref={evalRef} tabIndex={-1} className="text-lg font-semibold outline-none">
              Your evaluation
            </h2>
            <EvaluationPanel
              evaluation={review.evaluation}
              hintsUsed={0}
              nextMission={review.nextMission}
              misconceptions={misconceptions}
              skillNames={skillNames}
            />
          </section>
        ) : null}
      </div>

      <aside aria-labelledby="saved-heading" className="space-y-3 lg:sticky lg:top-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="saved-heading" className="text-base font-semibold">
            Saved portfolios
          </h2>
          {portfolios.length > 0 ? <span className="text-xs text-muted">{portfolios.length}</span> : null}
        </div>
        {portfolios.length === 0 ? (
          <EmptyState title="Nothing saved yet" description="Portfolios you save appear here so you can reopen and improve them." />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {portfolios.map((p) => {
              const active = current?.portfolio.id === p.portfolio.id;
              return (
                <li key={p.portfolio.id}>
                  <button
                    type="button"
                    onClick={() => open(p)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "block w-full px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-raised",
                      active && "bg-accent-soft",
                    )}
                  >
                    <span className="block truncate text-sm font-medium">{p.portfolio.name}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {p.portfolio.holdings.length} fund{p.portfolio.holdings.length === 1 ? "" : "s"} ·{" "}
                      {p.portfolio.strategy === "weekly-dca" ? "weekly buying" : "all at once"} · {formatDateTime(p.portfolio.updatedAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </div>
  );
}

function FundPicker({
  board,
  selected,
  onToggle,
}: {
  board: WealthBoardResponse;
  selected: string[];
  onToggle: (fundId: string) => void;
}) {
  const full = selected.length >= MAX_HOLDINGS;
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-medium">
        Pick funds <span className="font-normal text-muted">({selected.length} of {MAX_HOLDINGS})</span>
      </legend>
      {board.funds.length === 0 ? (
        <p className="text-sm text-muted">The fund board is empty right now.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-md border border-line bg-surface scrollbar-thin">
          {board.funds.map((f) => {
            const on = selected.includes(f.fundId);
            const q = quoteFor(board.quotes, f.fundId);
            const ret = headlineReturn(q);
            const id = `pick-${f.fundId}`;
            return (
              <li key={f.fundId}>
                <label
                  htmlFor={id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-surface-raised",
                    !on && full && "cursor-not-allowed opacity-50",
                  )}
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={on}
                    disabled={!on && full}
                    onChange={() => onToggle(f.fundId)}
                    className="mt-0.5 size-4 accent-[var(--accent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{f.name}</span>
                    <span className="block text-xs text-muted">
                      {f.kindLabel} · {formatUsd(q?.price)} · {ret.label}{" "}
                      {isUnusualPct(ret.value) ? (
                        <>
                          {formatPercent(ret.value)} <span className="text-warning">({UNUSUAL_NOTE.toLowerCase()})</span>
                        </>
                      ) : (
                        formatPercent(ret.value)
                      )}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {full ? <p className="text-xs text-subtle">Eight funds is the limit. Remove one to add another.</p> : null}
    </fieldset>
  );
}

function Holdings({
  board,
  rows,
  total,
  error,
  onWeight,
  onRemove,
  onSplit,
}: {
  board: WealthBoardResponse;
  rows: Row[];
  total: number;
  error: string | null;
  onWeight: (fundId: string, weight: string) => void;
  onRemove: (fundId: string) => void;
  onSplit: () => void;
}) {
  const totalId = useId();
  return (
    <fieldset className="min-w-0 space-y-2" aria-describedby={totalId}>
      <legend className="text-sm font-medium">Weights (whole numbers, total 100)</legend>
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-strong p-4 text-sm text-muted">
          Tick funds on the left to add them here.
        </p>
      ) : (
        <>
          <DonutChart
            size={140}
            thickness={12}
            showLegend={false}
            label={`Weights: ${rows.map((r) => `${fundName(board.funds, r.fundId)} ${isWholeWeight(r.weight) ? r.weight : 0}%`).join(", ")}. Total ${total} of 100.`}
            centerLabel="Total"
            centerValue={
              <span className={cn(total === 100 ? "text-success" : total > 100 ? "text-danger" : "text-fg")}>
                <AnimatedNumber value={total} suffix="%" />
              </span>
            }
            formatValue={(n) => `${n}%`}
            data={[
              ...rows.map((r, i) => ({
                label: fundName(board.funds, r.fundId),
                value: isWholeWeight(r.weight) ? Number(r.weight) : 0,
                color: chartSlot(i),
              })),
              // unallocated share drawn as a quiet neutral arc so the ring reads as "of 100"
              ...(total < 100 ? [{ label: "Not allocated", value: 100 - total, color: "var(--line-strong)" }] : []),
            ]}
            className="py-1"
          />
          <ul className="space-y-2">
            {rows.map((r, i) => {
              const name = fundName(board.funds, r.fundId);
              const bad = r.weight !== "" && !isWholeWeight(r.weight);
              return (
                <li key={r.fundId} className="animate-rise-in flex items-center gap-2">
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: chartSlot(i) }} />
                  <label htmlFor={`w-${r.fundId}`} className="min-w-0 flex-1 truncate text-sm">
                    {name}
                  </label>
                  <Input
                    id={`w-${r.fundId}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    step={1}
                    value={r.weight}
                    onChange={(e) => onWeight(r.fundId, e.target.value)}
                    invalid={bad}
                    className="tabular w-20 bg-bg text-right"
                  />
                  <span className="text-sm text-muted" aria-hidden="true">
                    %
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(r.fundId)} aria-label={`Remove ${name}`}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
        <p id={totalId} className="text-sm" aria-live="polite">
          Total{" "}
          <span className={cn("tabular font-mono", total === 100 ? "text-success" : "text-warning")}>{total}</span> of 100
        </p>
        {rows.length > 1 ? (
          <Button type="button" variant="ghost" size="sm" onClick={onSplit}>
            Split evenly
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </fieldset>
  );
}
