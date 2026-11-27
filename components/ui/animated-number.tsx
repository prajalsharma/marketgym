"use client";

/**
 * Rolling-digit number. Adapted from EasyUI's animated-number
 * (github.com/Surajmaurya1/easyui, src/components/ui/AnimatedNumber.tsx):
 * restyled to MarketGym tokens, takes our own formatter, reduced-motion safe,
 * and screen readers get the final value only.
 *
 * Honesty rule: the digits only ever travel from the previous real value (or
 * from 0 on first mount when `countUp` is set) to the new real value.
 */
import * as React from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export interface AnimatedNumberProps {
  value: number;
  /** Turns the number into display text (client callers only). Default: grouped integer. */
  format?: (n: number) => string;
  /** Plain text around the number; use these from server components, which cannot pass a format function. */
  prefix?: string;
  suffix?: string;
  /** Roll up from zero on first mount. Off: the first render is the value itself. */
  countUp?: boolean;
  className?: string;
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString("en-US");

function Digit({ digit, countUp, instant }: { digit: number; countUp: boolean; instant: boolean }) {
  const s = useSpring(digit, { stiffness: 150, damping: 22, mass: 0.7 });
  const y = useTransform(s, (v) => `${-v * 10}%`);
  React.useLayoutEffect(() => {
    if (countUp && !instant) s.jump(0);
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    if (instant) s.jump(digit);
    else s.set(digit);
  }, [s, digit, instant]);
  return (
    <span className="relative inline-block h-[1.15em] w-[0.62em] overflow-hidden text-center leading-[1.15em]">
      <motion.span style={{ y }} className="absolute inset-x-0 top-0 flex flex-col">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className="block h-[1.15em]">
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

export function AnimatedNumber({
  value,
  format = defaultFormat,
  prefix = "",
  suffix = "",
  countUp = false,
  className,
}: AnimatedNumberProps) {
  // Same markup on server and client; reduced motion just jumps the digits.
  const reduce = useReducedMotion() ?? false;
  const text = `${prefix}${format(value)}${suffix}`;
  if (!Number.isFinite(value)) {
    return <span className={cn("tabular", className)}>{text}</span>;
  }
  const chars = text.split("");
  // Key digits by their position from the right so 99 -> 100 keeps the ones column stable.
  return (
    <span className={cn("tabular inline-block whitespace-nowrap align-bottom", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline-flex items-start">
        {chars.map((ch, i) => {
          const fromRight = chars.length - i;
          return /\d/.test(ch) ? (
            <Digit key={`d${fromRight}`} digit={Number(ch)} countUp={countUp} instant={reduce} />
          ) : (
            <span key={`c${fromRight}${ch}`} className="inline-block h-[1.15em] leading-[1.15em] whitespace-pre">
              {ch}
            </span>
          );
        })}
      </span>
    </span>
  );
}
