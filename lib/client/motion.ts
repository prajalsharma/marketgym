import type { Transition } from "framer-motion";

/**
 * Motion tokens. Springs adapted from EasyUI's motion tokens
 * (github.com/Surajmaurya1/easyui, src/lib/motion-tokens.ts), trimmed to the
 * ones MarketGym uses. Near-critical damping: no bounce, no overshoot.
 */
export const spring = {
  /** tabs, accordions, dialog fades: ~400ms, no overshoot */
  gentle: { type: "spring", stiffness: 170, damping: 26, mass: 0.9 } as Transition,
  /** shared-layout indicators (active nav row, tab background) */
  morph: { type: "spring", stiffness: 220, damping: 32, mass: 1 } as Transition,
  /** quick feedback (hover, press) */
  snappy: { type: "spring", stiffness: 380, damping: 30, mass: 0.5 } as Transition,
} as const;

/** ease-out-quint-like curve shared with the CSS token --ease-out */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Named delays for page choreography (seconds). */
export const TIMING = {
  stagger: 0.055,
  pageRise: 0.42,
  barFill: 0.7,
  countUp: 0.9,
} as const;
