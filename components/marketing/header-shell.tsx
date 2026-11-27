"use client";

/** Sticky glass bar: gains a soft shadow once the page scrolls, with a thin reading-progress line. */
import { useState } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export function HeaderShell({ children }: { children: React.ReactNode }) {
  const { scrollY, scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 8));
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });

  return (
    <header
      className={cn(
        "surface-sticky sticky top-0 z-(--z-sticky) transition-shadow duration-300",
        scrolled && "shadow-md",
      )}
    >
      {children}
      <motion.span
        aria-hidden="true"
        className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-accent"
        style={{ scaleX: progress }}
      />
    </header>
  );
}
