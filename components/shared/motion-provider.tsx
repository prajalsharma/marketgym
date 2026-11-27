"use client";

import { MotionConfig } from "framer-motion";

/** One place that tells every framer-motion animation to honour prefers-reduced-motion. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
