"use client";

/**
 * The six-step loop as one connected line. The grey track and every step are
 * plain markup; the accent progress line and the step highlights are drawn on
 * top when the list scrolls into view, so nothing depends on the animation.
 */
import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/client/motion";

const LINE_S = 1.8;
const VIEWPORT = { once: true, amount: 0.35 } as const;

export function LoopSteps({ steps }: { steps: Array<{ name: string; text: string }> }) {
  const last = steps.length - 1;
  return (
    <ol className="relative mt-14 grid gap-9 lg:grid-cols-6 lg:gap-6">
      {/* track + progress: horizontal on desktop */}
      <span aria-hidden="true" className="absolute left-4 right-4 top-[19px] hidden h-px bg-line-strong lg:block" />
      <motion.span
        aria-hidden="true"
        className="absolute left-4 right-4 top-[18px] hidden h-[3px] origin-left rounded-full bg-accent lg:block"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: LINE_S, ease: EASE_OUT }}
      />
      {/* track + progress: vertical on small screens */}
      <span aria-hidden="true" className="absolute bottom-6 left-[19px] top-4 w-px bg-line-strong lg:hidden" />
      <motion.span
        aria-hidden="true"
        className="absolute bottom-6 left-[18px] top-4 w-[3px] origin-top rounded-full bg-accent lg:hidden"
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: LINE_S, ease: EASE_OUT }}
      />
      {steps.map((step, i) => {
        const at = last === 0 ? 0 : (i / last) * LINE_S * 0.62;
        return (
          <li key={step.name} className="relative flex gap-5 lg:block">
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-sunken font-mono text-sm tabular-nums text-accent">
              <motion.span
                aria-hidden="true"
                className="absolute -inset-px rounded-full border border-accent bg-accent-soft"
                initial={{ opacity: 0, scale: 0.7 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={VIEWPORT}
                transition={{ duration: 0.45, ease: EASE_OUT, delay: at }}
              />
              <span className="relative">{i + 1}</span>
            </span>
            <div className="pt-1.5 lg:mt-5 lg:pt-0">
              <h3 className="text-lg font-semibold tracking-tight">{step.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
