"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, ChevronRight, CornerDownLeft, Lightbulb, SendHorizontal, Target } from "lucide-react";
import type { CoachMessage, CoachSession } from "@/lib/types/learning";
import type { KnowledgeCheck as KnowledgeCheckType, Module, Skill } from "@/lib/types/curriculum";
import type { EvidencePack } from "@/lib/types/market";
import type { CoachHintResponse, CoachRespondResponse, CoachSessionResponse } from "@/lib/types/api";
import { Badge, Button, DataSourceTag, ErrorState, Skeleton, Textarea } from "@/components/ui";
import { LessonText } from "@/components/learn/lesson-text";
import { KnowledgeCheck } from "@/components/learn/knowledge-check";
import { apiPost, describeError } from "@/lib/client/api";
import { formatTime } from "@/lib/client/format";
import { EASE_OUT, TIMING, spring } from "@/lib/client/motion";
import { cn } from "@/lib/utils";

const PANEL = "rounded-lg border border-line bg-surface shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]";

interface Props {
  skill: Skill;
  module: Module;
  /** evidence items the coach may cite; from the scenario the mission points at, or empty */
  evidence: EvidencePack | null;
  /** checks for this skill (and module) so inline check ids can render */
  checks: KnowledgeCheckType[];
}

/**
 * Not a chat clone: objective rail (left/top) with lesson content and sources;
 * transcript with citations and inline knowledge checks; hint ladder in the composer.
 */
export function CoachWorkspace({ skill, module, evidence, checks }: Props) {
  const [session, setSession] = useState<CoachSession | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<"respond" | "hint" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const composerId = useId();
  const endRef = useRef<HTMLDivElement | null>(null);

  // Session creation runs in an effect; state is only set from the promise callbacks.
  useEffect(() => {
    let cancelled = false;
    apiPost<CoachSessionResponse>("/api/coach/session", { skillId: skill.id })
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [skill.id, attempt]);

  function start() {
    setLoading(true);
    setLoadError(null);
    setAttempt((n) => n + 1);
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [session?.messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!session || pending || !draft.trim()) return;
    const message = draft.trim();
    setPending("respond");
    setActionError(null);
    try {
      const next = await apiPost<CoachRespondResponse>("/api/coach/respond", { sessionId: session.id, message });
      setSession(next);
      setDraft("");
    } catch (err) {
      setActionError(describeError(err));
    } finally {
      setPending(null);
    }
  }

  async function hint() {
    if (!session || pending) return;
    setPending("hint");
    setActionError(null);
    try {
      const next = await apiPost<CoachHintResponse>("/api/coach/hint", { sessionId: session.id });
      setSession(next);
    } catch (err) {
      setActionError(describeError(err));
    } finally {
      setPending(null);
    }
  }

  const checkById = new Map(checks.map((c) => [c.id, c]));
  const citationLabel = buildCitationLabels(evidence, module);
  const hintsRevealed = session?.hintsRevealed ?? 0;
  const reduce = useReducedMotion();
  const sources = evidence ? listSources(evidence) : [];
  const completed = session?.status === "completed";
  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: TIMING.pageRise, ease: EASE_OUT, delay: i * TIMING.stagger },
        };

  return (
    <div className="grid gap-6 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4 lg:sticky lg:top-8">
        <motion.section {...rise(0)} className={cn(PANEL, "bg-surface-raised p-5 shadow-sm")}>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="grid size-7 place-items-center rounded-md bg-accent-soft text-accent">
              <Target className="size-4" aria-hidden="true" />
            </span>
            Objective
          </div>
          <p className="mt-3 text-pretty text-lg font-semibold leading-snug text-fg">{session?.objective ?? skill.description}</p>
          <p className="mt-2 text-sm text-muted">
            {module.title} · {skill.name}
          </p>
          {session ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Badge tone={session.mode === "offline" ? "warning" : "info"}>
                {session.mode === "offline" ? "Offline mode" : "AI coach"}
              </Badge>
              <Badge tone="neutral">
                Hints {hintsRevealed}/3
              </Badge>
            </div>
          ) : null}
        </motion.section>

        <motion.section {...rise(1)} className={PANEL}>
          <h2 className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-semibold text-fg">
            <BookOpen className="size-4 text-muted" aria-hidden="true" />
            Lesson notes
          </h2>
          <div className="divide-y divide-line">
            {module.concepts.map((c, i) => (
              <details key={i} className="group px-4 py-2.5 transition-colors open:bg-surface-raised hover:bg-surface-raised">
                <summary className="flex cursor-pointer list-none items-start gap-2.5 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <span className="tabular mt-px w-4 shrink-0 font-mono text-xs leading-5 text-subtle">{i + 1}</span>
                  <span className="flex-1 leading-5 group-open:font-medium">{c.heading}</span>
                  <ChevronRight
                    className="mt-0.5 size-4 shrink-0 text-subtle transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </summary>
                <LessonText text={c.body} className="animate-fade-in mt-2 pb-1 pl-[1.625rem] text-muted" />
              </details>
            ))}
          </div>
        </motion.section>

        {evidence && countItems(evidence) > 0 ? (
          <motion.section {...rise(2)} className="rounded-lg border border-evidence-line bg-evidence shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
            <h2 className="px-4 pt-4 pb-2 text-sm font-semibold text-evidence-fg">Sources the coach can cite</h2>
            <ul className="divide-y divide-evidence-line">
              {sources.map((s, i) => (
                <li key={s.key} className="flex gap-2.5 px-4 py-2.5 text-sm">
                  <span className="tabular mt-px w-4 shrink-0 font-mono text-xs leading-5 text-evidence-fg">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="leading-snug">{s.label}</p>
                    {s.tag}
                  </div>
                </li>
              ))}
            </ul>
          </motion.section>
        ) : null}
      </aside>

      <motion.section
        {...rise(1)}
        aria-label="Conversation"
        className={cn(PANEL, "flex min-h-[64vh] flex-col shadow-sm")}
      >
        {session?.mode === "offline" ? (
          <p className="rounded-t-lg border-b border-line bg-warning-soft px-5 py-2.5 text-xs leading-relaxed">
            The coach is running in offline mode: scripted lesson, no AI model configured.
          </p>
        ) : null}

        <div className="flex-1 space-y-4 px-4 py-5 sm:px-6">
          {loading ? (
            <div className="space-y-4" aria-busy="true">
              <Skeleton lines={3} className="max-w-md" />
              <Skeleton lines={2} className="ml-auto max-w-sm" />
            </div>
          ) : loadError ? (
            <ErrorState title="Could not start the coach" description={describeError(loadError)} retry={start} />
          ) : session ? (
            <ol className="space-y-6">
              {session.messages.map((m) => (
                <Turn key={m.id} message={m} check={m.knowledgeCheckId ? checkById.get(m.knowledgeCheckId) : undefined} citationLabel={citationLabel} />
              ))}
              {pending === "respond" ? (
                <li className="coach-turn flex items-center gap-3 text-sm text-muted" aria-live="polite">
                  <CoachMark />
                  <span className="typing-dots inline-flex items-center gap-1 rounded-lg rounded-tl-sm border border-line bg-surface-raised px-3.5 py-3" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  The coach is reading your answer
                </li>
              ) : null}
            </ol>
          ) : null}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="surface-glass sticky bottom-0 space-y-2.5 rounded-b-lg border-t border-line p-3 sm:p-4">
          <AnimatePresence initial={false}>
            {actionError ? (
              <motion.p
                key="action-error"
                role="alert"
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="rounded-md border border-danger bg-danger-soft p-2.5 text-sm"
              >
                {actionError}
              </motion.p>
            ) : null}
          </AnimatePresence>
          <label htmlFor={composerId} className="sr-only">
            Your reply
          </label>
          <div
            className={cn(
              "rounded-lg border border-line-strong bg-surface-sunken transition-[border-color,box-shadow] duration-200",
              "focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/30",
            )}
          >
            <Textarea
              id={composerId}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder={session?.status === "completed" ? "This session is complete." : "Answer the coach, or ask a question about the evidence."}
              disabled={!session || pending !== null || session.status === "completed"}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send(e);
              }}
              className="min-h-20 resize-none border-0 bg-transparent px-3.5 pt-3 focus-visible:ring-0"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={hint}
                  disabled={!session || pending !== null || hintsRevealed >= 3}
                  className="active:scale-[0.98]"
                >
                  <Lightbulb className="size-4" aria-hidden="true" />
                  {hintsRevealed >= 3 ? "No more hints" : pending === "hint" ? "Getting hint…" : `Ask for a hint (${hintsRevealed + 1}/3)`}
                </Button>
                <HintSteps revealed={hintsRevealed} />
              </div>
              <div className="flex items-center gap-3">
                {!completed ? (
                  <span className="hidden items-center gap-1 text-xs text-subtle sm:inline-flex" aria-hidden="true">
                    <CornerDownLeft className="size-3" />
                    Ctrl or ⌘ + Enter
                  </span>
                ) : null}
                <Button
                  type="submit"
                  size="sm"
                  disabled={!session || pending !== null || !draft.trim() || session.status === "completed"}
                  className="h-9 px-4 shadow-sm active:scale-[0.98]"
                >
                  {pending === "respond" ? "Sending…" : "Send"}
                  <SendHorizontal className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </form>
      </motion.section>
    </div>
  );
}

/** The logo mark: navy square, periwinkle chart line. Logo colours are fixed in both themes. */
function CoachMark() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#0b1120] shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]" aria-hidden="true">
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="#8da2ff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 11.5 6 7.5l2.5 2.5L14 4.5" />
      </svg>
    </span>
  );
}

/** Three rungs that fill as hints are used. Decorative: the button label carries the count. */
function HintSteps({ revealed }: { revealed: number }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className="relative h-1.5 w-6 overflow-hidden rounded-sm bg-surface-overlay">
          <motion.span
            className="absolute inset-0 origin-left rounded-sm bg-accent"
            initial={false}
            animate={{ scaleX: i < revealed ? 1 : 0 }}
            transition={spring.gentle}
          />
        </span>
      ))}
    </span>
  );
}

function Turn({
  message,
  check,
  citationLabel,
}: {
  message: CoachMessage;
  check?: KnowledgeCheckType;
  citationLabel: (id: string) => string;
}) {
  const isCoach = message.role === "coach";
  const reduce = useReducedMotion();
  const enter = reduce
    ? {}
    : {
        initial: { opacity: 0, x: isCoach ? -10 : 10 },
        animate: { opacity: 1, x: 0 },
        transition: spring.gentle,
      };
  const citations = message.citations ?? [];
  return (
    <li className={cn("coach-turn flex flex-col gap-3", isCoach ? "items-start" : "items-end")}>
      {isCoach ? (
        <motion.div {...enter} className="flex w-full max-w-[44rem] gap-3">
          <CoachMark />
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 flex items-baseline gap-2 text-sm">
              <span className="font-semibold text-fg">Coach</span>
              <span className="tabular text-xs text-subtle">{formatTime(message.createdAt)}</span>
            </p>
            <div className="rounded-lg rounded-tl-sm border border-line bg-surface-raised px-4 py-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
              <LessonText text={message.content} />
              {citations.length > 0 ? (
                <div className="mt-3 border-t border-line pt-2.5 text-xs text-muted">
                  <p className="mb-1.5">
                    <span>Sources:</span>
                  </p>
                  <ol className="flex flex-wrap gap-1.5">
                    {citations.map((c, i) => (
                      <li
                        key={c}
                        className="inline-flex items-center gap-1.5 rounded-md border border-evidence-line bg-evidence py-0.5 pr-2 pl-1 text-evidence-fg"
                      >
                        <span className="tabular grid size-4 place-items-center rounded-sm bg-evidence-soft font-mono text-[0.6875rem]">{i + 1}</span>
                        {citationLabel(c)}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div {...enter} className="flex max-w-[min(36rem,88%)] flex-col items-end">
          <p className="mb-1.5 flex items-baseline gap-2 text-sm">
            <span className="tabular text-xs text-subtle">{formatTime(message.createdAt)}</span>
            <span className="font-semibold text-learner-fg">You</span>
          </p>
          <div className="rounded-lg rounded-tr-sm border border-learner-line bg-learner px-4 py-3">
            <LessonText text={message.content} />
          </div>
        </motion.div>
      )}
      {check ? (
        <motion.div {...enter} className="w-full max-w-[44rem] pl-11">
          <KnowledgeCheck check={check} className="w-full rounded-lg border-line-strong bg-surface shadow-sm" />
        </motion.div>
      ) : null}
      {message.knowledgeCheckId && !check ? (
        <p className="pl-11 text-xs text-muted">The coach attached a check that is not in this module.</p>
      ) : null}
    </li>
  );
}

/** Flattens the evidence pack into one numbered reference list for the rail. */
function listSources(evidence: EvidencePack): { key: string; label: ReactNode; tag: ReactNode }[] {
  return [
    ...evidence.snapshots.map((s) => ({
      key: `snapshot:${s.asset}`,
      label: (
        <>
          {s.name} price snapshot <span className="font-mono text-xs text-muted">[{s.asset}]</span>
        </>
      ),
      tag: <DataSourceTag provenance={s.provenance} compact className="mt-1" />,
    })),
    ...evidence.news.map((n) => ({
      key: `news:${n.id}`,
      label: n.title,
      tag: <DataSourceTag provenance={n.provenance} compact className="mt-1" />,
    })),
    ...evidence.etfFlows.map((f) => ({
      key: `etf:${f.asset}`,
      label: `${f.asset} ETF flows`,
      tag: <DataSourceTag provenance={f.provenance} compact className="mt-1" />,
    })),
    ...evidence.indexes.map((x) => ({
      key: `index:${x.id}`,
      label: x.name,
      tag: <DataSourceTag provenance={x.provenance} compact className="mt-1" />,
    })),
    ...evidence.orderBooks.map((b) => ({
      key: `orderbook:${b.market}`,
      label: `${b.displayName} order book`,
      tag: <DataSourceTag provenance={b.provenance} compact className="mt-1" />,
    })),
  ];
}

function countItems(p: EvidencePack): number {
  return p.snapshots.length + p.news.length + p.etfFlows.length + p.indexes.length + p.orderBooks.length;
}

function buildCitationLabels(evidence: EvidencePack | null, module: Module): (id: string) => string {
  const map = new Map<string, string>();
  map.set(module.id, module.title);
  if (evidence) {
    for (const s of evidence.snapshots) {
      map.set(s.asset, `${s.asset} snapshot`);
      map.set(`snapshot:${s.asset}`, `${s.asset} snapshot`);
    }
    for (const n of evidence.news) {
      const label = n.title.length > 48 ? `${n.title.slice(0, 46)}…` : n.title;
      map.set(n.id, label);
      map.set(`news:${n.id}`, label);
    }
    for (const f of evidence.etfFlows) {
      map.set(`etf:${f.asset}`, `${f.asset} ETF flows`);
      map.set(f.asset === "BTC" ? "etf-btc" : "etf-eth", `${f.asset} ETF flows`);
    }
    for (const x of evidence.indexes) {
      map.set(x.id, x.name);
      map.set(`index:${x.id}`, x.name);
    }
    for (const b of evidence.orderBooks) {
      map.set(b.market, `${b.displayName} book`);
      map.set(`orderbook:${b.market}`, `${b.displayName} book`);
    }
  }
  return (id) => map.get(id) ?? map.get(id.replace(/^[a-z]+:/, "")) ?? id;
}
