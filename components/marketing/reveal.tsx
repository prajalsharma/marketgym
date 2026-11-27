"use client";

/**
 * Scroll entrance that cannot hide content. The server (and a page whose JS
 * never runs) renders the children fully visible. After mount, only blocks
 * still below the fold are moved to their start state, then they rise in once
 * when they scroll into view.
 */
import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/client/motion";

export function Reveal({
  children,
  className,
  delay = 0,
  distance = 22,
}: {
  children: React.ReactNode;
  className?: string;
  /** seconds */
  delay?: number;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const armed = useRef(false);
  const reduce = useReducedMotion();
  const opacity = useMotionValue(1);
  const y = useMotionValue(0);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });

  useEffect(() => {
    if (reduce || armed.current) return;
    const el = ref.current;
    if (!el) return;
    if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
      armed.current = true;
      opacity.set(0);
      y.set(distance);
    }
  }, [reduce, opacity, y, distance]);

  useEffect(() => {
    if (!inView || !armed.current) return;
    const a = animate(opacity, 1, { duration: 0.55, ease: EASE_OUT, delay });
    const b = animate(y, 0, { duration: 0.7, ease: EASE_OUT, delay });
    return () => {
      a.stop();
      b.stop();
    };
  }, [inView, opacity, y, delay]);

  return (
    <motion.div ref={ref} className={className} style={{ opacity, y }}>
      {children}
    </motion.div>
  );
}
