"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/marketing/wordmark";
import { EASE_OUT, TIMING } from "@/lib/client/motion";

/** The logo's chart line, redrawn large. Same proportions as the mark. */
const LINE = "M20 236 L112 76 L226 176 L340 56 L432 122";
const GRID_Y = [56, 116, 176, 236];

/**
 * Brand side of the sign-in screen. Always the logo's navy with the periwinkle
 * line, in both themes, so it reads as the mark opened up to full size.
 */
export function BrandPanel() {
  const reduce = useReducedMotion();
  const rise = (i: number) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: TIMING.pageRise, ease: EASE_OUT, delay: 0.08 + i * TIMING.stagger * 1.6 },
        };

  return (
    <aside className="relative flex flex-col overflow-hidden bg-[#0b1120] px-5 py-6 text-white sm:px-8 lg:min-h-dvh lg:px-12 lg:py-10">
      <Link
        href="/"
        aria-label="MarketGym home"
        className="inline-flex w-fit items-center gap-2.5 rounded-sm text-base font-semibold tracking-tight text-white"
      >
        <LogoMark size={28} className="rounded-[6px] ring-1 ring-white/15" />
        MarketGym
      </Link>

      <div className="mt-6 flex flex-1 flex-col lg:mt-0 lg:justify-center">
        <motion.p
          {...rise(0)}
          className="max-w-md text-2xl font-semibold leading-tight tracking-tight text-balance sm:text-3xl lg:text-4xl"
        >
          Learn to read a market before you put money in one.
        </motion.p>
        <motion.p {...rise(1)} className="mt-3 max-w-sm text-sm leading-relaxed text-white/65 lg:text-base">
          Short missions on real market data, with a coach that explains every answer.
        </motion.p>

        <div className="mt-10 hidden max-w-lg lg:block" aria-hidden="true">
          <svg viewBox="0 0 452 272" className="h-auto w-full" fill="none">
            {GRID_Y.map((y) => (
              <line key={y} x1="0" x2="452" y1={y} y2={y} stroke="#8da2ff" strokeOpacity="0.12" strokeWidth="1" />
            ))}
            <motion.path
              d={LINE}
              stroke="#8da2ff"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ pathLength: { duration: 1.5, ease: EASE_OUT, delay: 0.25 }, opacity: { duration: 0.2, delay: 0.25 } }}
            />
            <motion.circle
              cx="432"
              cy="122"
              r="8"
              fill="#0b1120"
              stroke="#8da2ff"
              strokeWidth="4"
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 22, delay: 1.35 }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
          </svg>
        </div>
      </div>

      <motion.ul
        {...rise(2)}
        className="mt-8 hidden divide-y divide-white/10 border-t border-white/10 text-sm text-white/70 lg:block"
      >
        <li className="py-3">A seven-question diagnostic sets your starting point.</li>
        <li className="py-3">MarketGym never trades or holds funds.</li>
      </motion.ul>
    </aside>
  );
}
