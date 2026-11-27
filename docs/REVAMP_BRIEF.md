# UI revamp brief (shared by all revamp agents)

Deadline is under an hour. Work fast, stay in your files, do not break behaviour.

## Goal
Make your screen look and feel like a premium, modern fintech product that matches the logo: dark navy square (#0b1120) with a periwinkle chart line (#8da2ff). Bolder, richer, more motion than now, while staying readable.

## Hard rules
- Edit ONLY the files listed as yours. Never edit lib/** (except reading), app/api/**, app/layout.tsx, app/globals.css, components/ui/**, or another agent's folder.
- Do NOT change data fetching, props contracts between components, API calls, form logic, validation, ids, aria attributes, text used as button names, or `data-*` attributes. Visual and motion changes only.
- Every number still comes from props/API. Keep every `DataSourceTag`.
- Do NOT run dev servers, browsers, Playwright or `pnpm build` (10 agents share one Mac). Verify only with: `./node_modules/.bin/tsc --noEmit` (your files must be error-free) and `./node_modules/.bin/eslint <your files>`.
- Do not git commit. Do not add dependencies (framer-motion, lucide-react, recharts, Radix are installed).
- Keep light theme working: use tokens, never hard-code dark colours except the logo colours.

## Look
- Tokens (Tailwind classes): bg-bg, bg-surface, bg-surface-raised, bg-surface-overlay, bg-surface-sunken, border-line, border-line-strong, text-fg, text-muted, text-subtle, text-accent, bg-accent, bg-accent-soft, text-accent-fg, success/warning/danger (+ -soft), bg-evidence/border-evidence-line/text-evidence-fg, bg-learner/border-learner-line/text-learner-fg, bid/ask.
- Existing utilities you may use: `surface-glass` (blurred translucent panel), `stagger-in` (children arrive in order), `animate-rise-in`, `animate-fade-in`, `tabular`, `gutter`, `content-max`.
- Hierarchy: one clear focal element per screen; large confident headings (text-2xl/3xl on pages, bigger on landing); generous spacing; hairline borders; rounded-lg (never pill-everything).
- Depth: layered surfaces, subtle inner highlight (`shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]`), soft shadow on raised panels. Restrained glass on sticky bars and overlays only.
- Accent: periwinkle only, used sparingly for the primary action, active state and key data.
- Motion (framer-motion + `spring`, `EASE_OUT`, `TIMING` from `@/lib/client/motion`): entrance stagger, hover lift (translateY -2px) on interactive rows/cards, press scale 0.98 on buttons, `layout` animations for expanding content, `AnimatePresence` for things that appear/disappear, number count-ups via the existing `AnimatedNumber` in components/ui. Always respect reduced motion (`useReducedMotion`).
- Banned (owner rejects on sight): tiny uppercase tracked eyebrow labels, pulsing LIVE pills, VERIFIED badges, blurred glow blobs, gradient accent lines, grids of identical icon cards, heavy drop shadows, slogan pairs. Sentence case. Plain short copy.

## Report (≤8 lines)
Files changed, what changed visually, tsc/eslint result, anything risky.
