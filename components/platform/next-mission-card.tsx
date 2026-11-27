"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { NextMission } from "@/lib/types/learning";
import { Button } from "@/components/ui";
import { MISSION_KIND_LABEL } from "@/lib/client/labels";
import { humanise } from "@/lib/client/format";
import { EASE_OUT, spring } from "@/lib/client/motion";

interface Props {
  mission: NextMission;
  skillName?: string;
  heading?: string;
}

/** The one thing to do next. Title, the engine's reason, one button. */
export function NextMissionCard({ mission, skillName, heading = "Up next" }: Props) {
  const reduce = useReducedMotion() ?? false;
  return (
    <section
      aria-labelledby="next-mission-heading"
      className="@container relative overflow-hidden rounded-xl border border-accent/35 bg-surface-raised shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_1px_2px_rgb(0_0_0/0.06)]"
    >
      <div className="grid items-center gap-6 p-5 @2xl:grid-cols-[minmax(0,1fr)_auto] @2xl:p-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="next-mission-heading" className="text-sm font-semibold text-accent">
              {heading}
            </h2>
            <p className="text-sm text-muted">
              {MISSION_KIND_LABEL[mission.kind]}
              <span aria-hidden="true" className="px-1.5 text-subtle">
                ·
              </span>
              {skillName ?? humanise(mission.skillId)}
            </p>
          </div>
          <p className="mt-3 text-xl font-semibold leading-tight tracking-tight text-balance text-fg @2xl:text-3xl">
            {mission.title}
          </p>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted @2xl:text-base">{mission.reason}</p>
          <motion.div
            className="mt-5 inline-block"
            whileHover={reduce ? undefined : { y: -2 }}
            whileTap={reduce ? undefined : { scale: 0.98 }}
            transition={spring.snappy}
          >
            <Button asChild size="lg" className="group min-w-32">
              <Link href={mission.href}>
                Start
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Decorative: the chart line from the logo. Not data. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 240 120"
          fill="none"
          className="hidden h-28 w-56 shrink-0 text-accent @2xl:block"
        >
          <path d="M0 119.5H240M0 79.5H240M0 39.5H240" className="stroke-line" strokeWidth="1" />
          <motion.path
            d="M4 100 L52 78 L92 90 L138 46 L176 60 L228 16"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.25 }}
          />
          <motion.circle
            cx="228"
            cy="16"
            r="5"
            fill="currentColor"
            initial={reduce ? false : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring.gentle, delay: reduce ? 0 : 1.15 }}
          />
        </svg>
      </div>
    </section>
  );
}
