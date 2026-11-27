"use client";

/**
 * ⌘K / Ctrl+K navigation. Layout and keyboard model adapted from EasyUI's
 * command-menu (github.com/Surajmaurya1/easyui, src/components/ui/CommandMenu.tsx);
 * rebuilt on Radix Dialog so focus is trapped and restored, items are
 * MarketGym's own pages, and the input is a proper combobox for screen readers.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { CornerDownLeft, Moon, Search } from "lucide-react";
import { Kbd, applyTheme, readTheme } from "@/components/ui";
import { spring } from "@/lib/client/motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";

interface Command {
  id: string;
  title: string;
  group: "Go to" | "Actions";
  keywords: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

const KEYWORDS: Record<string, string> = {
  "/app": "home dashboard overview next",
  "/app/learn": "lessons modules curriculum skills",
  "/app/coach": "ai tutor chat explain",
  "/app/scenario-lab": "scenario evidence practise grade",
  "/app/orderbook-gym": "order book spread depth bids asks sodex perps",
  "/app/wealth": "funds etf vault index sodex wealth rewards",
  "/app/portfolio": "paper portfolio weights funds",
  "/app/progress": "mastery skills history reviews",
};

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [index, setIndex] = React.useState(0);
  const listId = React.useId();

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mg:command-menu", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mg:command-menu", onOpenEvent);
    };
  }, []);

  const commands = React.useMemo<Command[]>(
    () => [
      ...NAV_ITEMS.map((n) => ({
        id: n.href,
        title: n.label,
        group: "Go to" as const,
        keywords: KEYWORDS[n.href] ?? "",
        icon: n.icon,
        run: () => router.push(n.href),
      })),
      {
        id: "theme",
        title: "Switch light or dark theme",
        group: "Actions" as const,
        keywords: "theme dark light mode appearance",
        icon: Moon,
        run: () => applyTheme(readTheme() === "light" ? "dark" : "light"),
      },
    ],
    [router],
  );

  const q = query.trim().toLowerCase();
  const results = q
    ? commands.filter((c) => c.title.toLowerCase().includes(q) || c.keywords.includes(q))
    : commands;
  const safeIndex = Math.min(index, Math.max(0, results.length - 1));

  function choose(c: Command | undefined) {
    if (!c) return;
    setOpen(false);
    c.run();
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (results.length ? (Math.min(i, results.length - 1) + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (results.length ? (Math.min(i, results.length - 1) - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[safeIndex]);
    }
  }

  const groups = (["Go to", "Actions"] as const)
    .map((g) => ({ g, items: results.filter((r) => r.group === g) }))
    .filter((x) => x.items.length > 0);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setQuery("");
          setIndex(0);
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-backdrop) bg-black/50 animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-4 top-[12dvh] z-(--z-modal) mx-auto max-w-lg outline-none"
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={spring.snappy}
            className="surface-glass overflow-hidden rounded-lg border border-line-strong"
          >
            <DialogPrimitive.Title className="sr-only">Jump to a page</DialogPrimitive.Title>
            <div className="flex items-center gap-2.5 border-b border-line px-4">
              <Search className="size-4 shrink-0 text-subtle" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIndex(0);
                }}
                onKeyDown={onInputKey}
                placeholder="Jump to a page or action"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={results[safeIndex] ? `${listId}-${results[safeIndex].id}` : undefined}
                aria-label="Search pages and actions"
                className="h-12 w-full bg-transparent text-base text-fg outline-none placeholder:text-subtle"
              />
              <Kbd>Esc</Kbd>
            </div>
            <div id={listId} role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-1.5 scrollbar-thin">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">Nothing matches &ldquo;{query}&rdquo;.</p>
              ) : (
                groups.map(({ g, items }) => (
                  <div key={g} role="group" aria-label={g} className="py-1">
                    <p className="px-2.5 pb-1 pt-1.5 text-xs text-subtle" aria-hidden="true">
                      {g}
                    </p>
                    {items.map((c) => {
                      const i = results.indexOf(c);
                      const selected = i === safeIndex;
                      const Icon = c.icon;
                      return (
                        <div
                          key={c.id}
                          id={`${listId}-${c.id}`}
                          role="option"
                          aria-selected={selected}
                          onPointerMove={() => setIndex(i)}
                          onClick={() => choose(c)}
                          className={cn(
                            "relative flex h-10 cursor-pointer items-center gap-3 rounded-md px-2.5 text-sm",
                            selected ? "text-fg" : "text-muted",
                          )}
                        >
                          {selected ? (
                            <motion.span
                              layoutId="cmd-active"
                              transition={spring.morph}
                              className="absolute inset-0 rounded-md bg-accent-soft"
                              aria-hidden="true"
                            />
                          ) : null}
                          <Icon className={cn("relative size-4 shrink-0", selected ? "text-accent" : "text-subtle")} />
                          <span className="relative flex-1 truncate">{c.title}</span>
                          {selected ? <CornerDownLeft className="relative size-3.5 text-subtle" aria-hidden="true" /> : null}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-xs text-subtle">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> move
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>↵</Kbd> open
              </span>
            </div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const noopSubscribe = () => () => {};

/** Button that opens the menu (sidebar and phone header). */
export function CommandMenuTrigger({ compact = false }: { compact?: boolean }) {
  // Platform is only knowable in the browser; the server renders the Mac glyph.
  const mac = React.useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => true,
  );
  const open = () => window.dispatchEvent(new Event("mg:command-menu"));
  if (compact) {
    return (
      <button
        type="button"
        onClick={open}
        aria-label="Jump to a page"
        className="inline-flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-raised hover:text-fg"
      >
        <Search className="size-4" aria-hidden="true" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={open}
      className="flex h-9 w-full items-center gap-2.5 rounded-md border border-line bg-surface px-2.5 text-sm text-subtle transition-colors duration-(--duration-fast) hover:border-line-strong hover:text-muted"
    >
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 text-left">Jump to</span>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        <Kbd>{mac ? "⌘" : "Ctrl"}</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}
