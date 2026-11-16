"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Lightbulb, SendHorizontal } from "lucide-react";
import type { CoachMessage, CoachSession } from "@/lib/types/learning";
import type { KnowledgeCheck as KnowledgeCheckType, Module, Skill } from "@/lib/types/curriculum";
import type { EvidencePack } from "@/lib/types/market";
import type { CoachHintResponse, CoachRespondResponse, CoachSessionResponse } from "@/lib/types/api";
import { Badge, Button, DataSourceTag, ErrorState, Skeleton, Textarea } from "@/components/ui";
import { LessonText } from "@/components/learn/lesson-text";
import { KnowledgeCheck } from "@/components/learn/knowledge-check";
import { apiPost, describeError } from "@/lib/client/api";
import { formatTime } from "@/lib/client/format";
import { cn } from "@/lib/utils";

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

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4 lg:sticky lg:top-8">
        <section className="rounded-lg border border-line bg-surface p-4">
          <p className="text-xs text-muted">Objective</p>
          <p className="mt-1 text-sm font-medium leading-snug">{session?.objective ?? skill.description}</p>
          <p className="mt-2 text-xs text-muted">
            {module.title} · {skill.name}
          </p>
          {session ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={session.mode === "offline" ? "warning" : "info"}>
                {session.mode === "offline" ? "Offline mode" : "AI coach"}
              </Badge>
              <Badge tone="neutral">
                Hints {hintsRevealed}/3
              </Badge>
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-line bg-surface">
          <h2 className="px-4 pt-3 text-xs font-medium text-muted">Lesson notes</h2>
          <div className="divide-y divide-line">
            {module.concepts.map((c, i) => (
              <details key={i} className="group px-4 py-2">
                <summary className="cursor-pointer list-none rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {c.heading}
                </summary>
                <LessonText text={c.body} className="mt-2 text-muted" />
              </details>
            ))}
          </div>
        </section>

        {evidence && countItems(evidence) > 0 ? (
          <section className="rounded-lg border border-evidence-line bg-evidence">
            <h2 className="px-4 pt-3 text-xs font-medium text-evidence-fg">Sources the coach can cite</h2>
            <ul className="divide-y divide-evidence-line">
              {evidence.snapshots.map((s) => (
                <li key={s.asset} className="px-4 py-2 text-sm">
                  <p>
                    {s.name} price snapshot <span className="font-mono text-xs text-muted">[{s.asset}]</span>
                  </p>
                  <DataSourceTag provenance={s.provenance} compact className="mt-1" />
                </li>
              ))}
              {evidence.news.map((n) => (
                <li key={n.id} className="px-4 py-2 text-sm">
                  <p className="leading-snug">{n.title}</p>
                  <DataSourceTag provenance={n.provenance} compact className="mt-1" />
                </li>
              ))}
              {evidence.etfFlows.map((f) => (
                <li key={f.asset} className="px-4 py-2 text-sm">
                  <p>{f.asset} ETF flows</p>
                  <DataSourceTag provenance={f.provenance} compact className="mt-1" />
                </li>
              ))}
              {evidence.indexes.map((x) => (
                <li key={x.id} className="px-4 py-2 text-sm">
                  <p>{x.name}</p>
                  <DataSourceTag provenance={x.provenance} compact className="mt-1" />
                </li>
              ))}
              {evidence.orderBooks.map((b) => (
                <li key={b.market} className="px-4 py-2 text-sm">
                  <p>{b.displayName} order book</p>
                  <DataSourceTag provenance={b.provenance} compact className="mt-1" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </aside>

      <section aria-label="Conversation" className="flex min-h-[60vh] flex-col rounded-lg border border-line bg-surface">
        {session?.mode === "offline" ? (
          <p className="border-b border-line bg-warning-soft px-4 py-2 text-xs">
            The coach is running in offline mode: scripted lesson, no AI model configured.
          </p>
        ) : null}

        <div className="flex-1 space-y-4 p-4">
          {loading ? (
            <div className="space-y-4" aria-busy="true">
              <Skeleton lines={3} className="max-w-md" />
              <Skeleton lines={2} className="ml-auto max-w-sm" />
            </div>
          ) : loadError ? (
            <ErrorState title="Could not start the coach" description={describeError(loadError)} retry={start} />
          ) : session ? (
            <ol className="space-y-4">
              {session.messages.map((m) => (
                <Turn key={m.id} message={m} check={m.knowledgeCheckId ? checkById.get(m.knowledgeCheckId) : undefined} citationLabel={citationLabel} />
              ))}
              {pending === "respond" ? (
                <li className="coach-turn max-w-prose text-sm text-muted" aria-live="polite">
                  The coach is thinking…
                </li>
              ) : null}
            </ol>
          ) : null}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="space-y-2 border-t border-line p-3">
          {actionError ? (
            <p role="alert" className="rounded-md border border-danger bg-danger-soft p-2 text-sm">
              {actionError}
            </p>
          ) : null}
          <label htmlFor={composerId} className="sr-only">
            Your reply
          </label>
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
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={hint} disabled={!session || pending !== null || hintsRevealed >= 3}>
              <Lightbulb className="size-4" aria-hidden="true" />
              {hintsRevealed >= 3 ? "No more hints" : pending === "hint" ? "Getting hint…" : `Ask for a hint (${hintsRevealed + 1}/3)`}
            </Button>
            <Button type="submit" size="sm" disabled={!session || pending !== null || !draft.trim() || session.status === "completed"}>
              {pending === "respond" ? "Sending…" : "Send"}
              <SendHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </form>
      </section>
    </div>
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
  return (
    <li className={cn("coach-turn flex flex-col gap-2", isCoach ? "items-start" : "items-end")}>
      <div
        className={cn(
          "max-w-prose rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
          isCoach ? "border border-line bg-bg" : "border border-learner-line bg-learner",
        )}
      >
        <p className="mb-1 text-xs text-muted">
          {isCoach ? "Coach" : "You"} · {formatTime(message.createdAt)}
        </p>
        <LessonText text={message.content} />
        {message.citations && message.citations.length > 0 ? (
          <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted">
            <span>Sources:</span>
            {message.citations.map((c) => (
              <span key={c} className="rounded-sm border border-evidence-line bg-evidence px-1.5 text-evidence-fg">
                {citationLabel(c)}
              </span>
            ))}
          </p>
        ) : null}
      </div>
      {check ? <KnowledgeCheck check={check} className="w-full max-w-prose bg-surface" /> : null}
      {message.knowledgeCheckId && !check ? (
        <p className="text-xs text-muted">The coach attached a check that is not in this module.</p>
      ) : null}
    </li>
  );
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
