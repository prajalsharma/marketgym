"use client";

/** The logo's chart line, drawn once when the closing panel scrolls into view. Decorative. */
import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/client/motion";

export function CtaChart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 200" fill="none" aria-hidden="true" className={className} preserveAspectRatio="xMidYMid meet">
      <motion.path
        d="M16 176 L84 52 L160 128 L236 30 L296 84"
        stroke="#8da2ff"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 1.6, ease: EASE_OUT }}
      />
      <motion.circle
        cx="296"
        cy="84"
        r="11"
        fill="#0b1120"
        stroke="#8da2ff"
        strokeWidth="8"
        initial={{ opacity: 0, scale: 0.4 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.4, ease: EASE_OUT, delay: 1.3 }}
        style={{ transformOrigin: "296px 84px" }}
      />
    </svg>
  );
}
