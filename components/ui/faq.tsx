"use client";

/**
 * Question list with one answer open at a time. Structure, aria wiring and the
 * rotating chevron follow EasyUI's faq (github.com/Surajmaurya1/easyui,
 * src/components/ui/FAQ.tsx, "unified" variant); search and category pills
 * dropped, restyled to MarketGym tokens, and the open/close uses a
 * grid-template-rows transition instead of animating height.
 */
import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

export function Faq({ items, className }: { items: FaqItem[]; className?: string }) {
  const [open, setOpen] = React.useState<string | null>(items[0]?.id ?? null);
  const base = React.useId();
  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((it) => {
        const isOpen = open === it.id;
        const headerId = `${base}-h-${it.id}`;
        const panelId = `${base}-p-${it.id}`;
        return (
          <div key={it.id}>
            <h3>
              <button
                type="button"
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : it.id)}
                className="group flex w-full items-center justify-between gap-4 py-4 text-left text-base font-medium text-fg"
              >
                <span className="transition-colors group-hover:text-accent">{it.question}</span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-subtle transition-transform duration-300 ease-out",
                    isOpen && "rotate-180 text-fg",
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden" inert={!isOpen}>
                <div className="max-w-prose pb-5 text-sm leading-relaxed text-muted sm:text-base">{it.answer}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
