# MarketGym design system

Premium research workspace meets modern learning platform. Dark by default, one accent, 1px borders, six type sizes, two shadows. Everything in `components/ui/*` is built from the tokens in `app/globals.css`; feature code uses the token classes and never raw hex.

Owner: UX agent. Consumers: frontend. Changes to token names go through `docs/CONTRACTS.md`.

## 1. Principles

1. The tool disappears into the task. Familiar controls, consistent vocabulary, nothing invented for flavour.
2. One accent. Indigo marks actions, selection and focus. It is never decoration.
3. Evidence and the learner's work are visually different places. Evidence is cool teal; the learner's area is accent-tinted.
4. Freshness is never ambiguous. Live is green, cached is amber, demo is violet with the words "Demo data" and a dashed border.
5. Lists over card grids, words over colour alone, sentence case everywhere.

## 2. Tokens

Defined as CSS variables on `:root` (dark) and `[data-theme="light"]`, mapped into Tailwind v4 through `@theme inline`. Use the Tailwind class; reach for `var(--x)` only in inline styles (charts, widths).

### Surfaces and lines

| Class | Token | Dark | Light | Use |
|---|---|---|---|---|
| `bg-bg` | `--bg` | `#0b1120` | `#f5f6f9` | Page |
| `bg-surface` | `--surface` | `#111a2c` | `#ffffff` | Panels, cards |
| `bg-surface-raised` | `--surface-raised` | `#172238` | `#ffffff` | Hover rows, tags, skeletons |
| `bg-surface-overlay` | `--surface-overlay` | `#1b2740` | `#ffffff` | Dialogs, menus, tooltips |
| `bg-surface-sunken` | `--surface-sunken` | `#0d1526` | `#eef0f5` | Inputs, code, progress tracks |
| `border-line` | `--line` | `#223050` | `#e2e6ee` | Default 1px border |
| `border-line-strong` | `--line-strong` | `#30415f` | `#c9d0dd` | Inputs, dividers that must read |

### Ink

| Class | Token | Dark | Light | Contrast on surface |
|---|---|---|---|---|
| `text-fg` | `--fg` | `#e7ecf6` | `#141a2b` | 14.7 / 17.3 |
| `text-muted` | `--fg-muted` | `#a3afc6` | `#4b5670` | 7.9 / 7.3 |
| `text-subtle` | `--fg-subtle` | `#8491ab` | `#626d88` | 5.5 / 5.2 |
| `text-inverse` | `--fg-inverse` | `#0b1120` | `#ffffff` | text on filled accent/danger |

All three ink levels pass WCAG AA for body text in both themes. Do not add a fourth.

### Accent and semantic

| Class | Token | Dark | Light | Use |
|---|---|---|---|---|
| `bg-accent` `text-accent` | `--accent` | `#8da2ff` | `#3b55d6` | Primary button, active tab, links, focus ring |
| `bg-accent-strong` | `--accent-strong` | `#a9b8ff` | `#2f46bd` | Primary hover |
| `text-accent-fg` | `--accent-fg` | `#0b1120` | `#ffffff` | Text on accent |
| `bg-accent-soft` | `--accent-soft` | 14% accent | 10% accent | Selected row, info badge |
| `text-success` `bg-success-soft` | `--success` | `#3ecf7a` | `#15803d` | Passed, mastered, bids |
| `text-warning` `bg-warning-soft` | `--warning` | `#f2b544` | `#9a6a12` | Needs attention, review due |
| `text-danger` `bg-danger-soft` | `--danger` | `#f47c7c` | `#c93838` | Errors, asks, destructive |
| `text-info` | `--info` | = accent | = accent | Informational badge |

### Freshness (data provenance)

| Class | Token | Meaning |
|---|---|---|
| `bg-fresh-live` | `--fresh-live` (= success) | Fetched for this request |
| `bg-fresh-cached` | `--fresh-cached` (= warning) | From cache, possibly stale |
| `bg-fresh-demo` `bg-fresh-demo-soft` | `--fresh-demo` (`#b8a4e3` / `#6e4fc0`) | Fixture; never real-time |

These three are reserved. Never use violet for anything else in the product.

### Evidence vs learner

| Class | Token | Dark | Light |
|---|---|---|---|
| `bg-evidence` `border-evidence-line` `text-evidence-fg` | `--evidence*` | `#0e1c24` / `#1f3b48` / `#7ccfe2` | `#eef7fa` / `#bfdfe8` / `#0e667c` |
| `bg-learner` `border-learner-line` `text-learner-fg` | `--learner*` | `#141a33` / `#2d3769` / `#aab9ff` | `#eef0fc` / `#c9d0f5` / `#3243b5` |

`Card tone="evidence"` and `Card tone="learner"` apply these. The scenario lab is the only place both appear side by side; everywhere else evidence tint is used on its own for market-data panels.

### Order book

`text-bid`/`bg-bid-soft` (green) and `text-ask`/`bg-ask-soft` (red). Depth bars use the soft fills; prices use the ink colours.

### Charts

Six categorical slots in fixed order, validated for colour-vision deficiency in both themes (dataviz validator, adjacent pairs, all pass). Assign in order, never cycle; a seventh series folds into "Other".

| Var | Dark | Light |
|---|---|---|
| `--chart-1` | `#3987e5` | `#2a78d6` |
| `--chart-2` | `#d95926` | `#eb6834` |
| `--chart-3` | `#199e70` | `#1baf7a` |
| `--chart-4` | `#c98500` | `#eda100` |
| `--chart-5` | `#d55181` | `#e87ba4` |
| `--chart-6` | `#9085e9` | `#6250d6` |

Light slots 3, 4 and 5 sit under 3:1 on white, so light-theme charts with those series need direct labels or a table view (the validator's relief rule).

Sequential (one hue, blue) `--chart-seq-1..7`: low to high magnitude. Dark ramp goes dark to light; light ramp goes light to dark, so "near zero" always recedes toward the surface. `--chart-grid`, `--chart-axis`, `--chart-neutral` for scaffolding. Chart text uses ink tokens, never the series colour. Recharts usage: `stroke="var(--chart-1)"`.

### Type scale (six sizes, nothing else)

| Class | Size | Line height | Use |
|---|---|---|---|
| `text-xs` | 12px | 16px | Tags, hints, axis labels |
| `text-sm` | 14px | 20px | UI labels, dense tables, secondary copy |
| `text-base` | 16px | 24px | Body, inputs, lesson prose |
| `text-lg` | 20px | 28px | Section titles, stat values, dialog titles |
| `text-xl` | 26px | 32px | Page titles |
| `text-2xl` | clamp(34px, 1.6rem + 2vw, 48px) | 1.1 | Landing hero only |

Weights: 400 body, 500 labels/buttons, 600 headings. No 700 in UI. Letter-spacing floor `-0.015em` on headings. Numbers in tables, stats and ladders get the `tabular` class.

Fonts: Geist Sans (`--font-geist-sans`) for everything, Geist Mono (`--font-geist-mono`) for Kbd, code and provenance timestamps. One family; product UI doesn't need a display face.

### Spacing, radius, shadow, motion

- Spacing: Tailwind 4px grid. Panels pad 16/20px; page sections gap 24/32px; phone gutter 16px (`gutter` utility steps to 24/32px).
- Radius: `rounded-sm` 6px (tags, inputs, kbd), `rounded-md` 8px (buttons, menus), `rounded-lg` 10px (cards, dialogs). `rounded-full` only for dots and progress tracks.
- Shadow: `shadow-sm` (raised cards) and `shadow-md` (overlays). Nothing else; dark mode relies on borders.
- Motion: `--duration-fast` 120ms (hover/colour), `--duration-base` 180ms (fade, tabs), `--duration-slow` 260ms (progress width, dialog rise). Easing `--ease-out` (quint-like). Global reduced-motion rule zeroes everything.
- Z-index: `--z-dropdown` 30, `--z-sticky` 40, `--z-backdrop` 50, `--z-modal` 60, `--z-toast` 70, `--z-tooltip` 80. Use `z-(--z-modal)`.

### Utilities

`gutter`, `content-max` (72rem), `surface-sticky` (the one sanctioned translucent surface, for sticky bars), `scrollbar-thin`, `tabular`, `.prose-lesson` for markdown-lite lesson/coach text (68ch, quiet headings, flat lists), `animate-fade-in`, `animate-rise-in`, `animate-skeleton`.

## 3. Components

All exported from `components/ui/index.ts`.

| Component | Notes |
|---|---|
| `Button` | `variant` primary/secondary/ghost/danger, `size` sm/md/lg, `asChild`, `loading` (spinner, keeps label). One primary per view. |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | `tone` default/raised/evidence/learner/sunken, `padding` none/sm/md. Never nest cards. |
| `Badge` | `tone` neutral/success/warning/danger/info. Flat 6px tag, sentence case. Not a pill, never pulses. |
| `StatusDot` | Dot plus required word. `tone` includes live/cached/demo. Use for status, not Badge. |
| `Tabs*` | Underline tabs on a 1px line. |
| `Dialog*` | Centred on desktop, bottom sheet on phones (`sheetOnMobile`). Use sparingly; prefer inline. |
| `Tooltip*` | Wrap the app shell in `TooltipProvider` once. |
| `Progress` | CSS-only, `value` 0..100, `tone`, `label` (aria), `showValue`, `size`. |
| `Input`, `Textarea`, `Label` | `invalid` sets aria-invalid + danger border. Labels always visible; `optional` marks optional fields. |
| `Select*` | Radix select, popper positioned, width matches trigger. |
| `RadioGroup`, `RadioGroupItem`, `RadioCard` | `RadioCard` is a full-row option for onboarding and multiple choice. |
| `Collapsible*`, `CollapsibleRow` | `CollapsibleRow` is the chevron trigger used by the hint drawer. |
| `Skeleton` | CSS-only; `lines` for text blocks. Reserve final dimensions. |
| `EmptyState` | title, description, action, icon. Dashed border. |
| `ErrorState` | title, description, `retry`, `detail`. `role="alert"`. |
| `DataSourceTag` | `provenance`, `compact`. Provider, kind word with dot, relative time (`<time title=ISO>`), note. Demo variant is dashed violet. |
| `MasteryIndicator` | `status`, `score`, `hideLabel`, `size`. 0/1/2/3 segments + word + check on mastered. |
| `Stat` | label, value, hint, `tone`, `size`. Tabular value. |
| `PageHeader` | title, description, actions, meta, `as` h1/h2. No eyebrow. |
| `Kbd` | Keyboard key. |
| `ThemeToggle` | Client; toggles `data-theme` and persists to `localStorage("mg-theme")`. Export `themeInitScript` for `<head>`. |

### States every interactive component ships with

default, hover, focus-visible (2px accent outline, 2px offset), active, disabled (50% opacity, no pointer), loading (Button), invalid (Input/Textarea).

## 4. Do and don't

Do
- Sentence case for every label, button, heading and tag.
- Dot-and-word for status; words carry the meaning, colour reinforces.
- Lists and tables for repeated items; cards only when a region needs a boundary.
- One primary button per view; secondary and ghost for the rest.
- Show provenance (`DataSourceTag`) on every piece of market data, no exceptions.
- Reserve the final size of loading content with `Skeleton`.
- Use `text-muted` for secondary copy; keep `text-subtle` for hints and timestamps.

Don't (rejected on sight)
- Uppercase tracked eyebrow labels above sections.
- Pulsing "LIVE" pills, "VERIFIED" badges, shields, checkmark-in-circle trust icons.
- Blurred radial glow blobs, gradient accent lines, gradient text, decorative gradients.
- Grids of identical icon + heading + text cards.
- Pill-shaped buttons, inputs or tags. Radius stops at 10px.
- Ad-hoc font sizes (`text-[15px]`), more than one accent, raw hex in components.
- Heavy shadows (`0 48px 100px`), stacked glass panels, side-stripe borders.
- Decorative charts (sparkline wallpaper, charts with no axis or question).
- Spinners in the middle of content; modals as the first idea.
- Colour as the only signal for state or freshness.

## 5. Accessibility baseline

- WCAG AA contrast verified numerically for every ink/surface pair above.
- All interactive elements are Radix or native and keyboard operable; focus ring is global.
- `prefers-reduced-motion` collapses all animation and transitions.
- Hit targets at least 32px tall in dense UI, 44px on phone-primary actions.
- Icon-only buttons carry `aria-label`. Decorative icons carry `aria-hidden`.
- Phone gutter 16px, no horizontal scroll, dialogs become bottom sheets.

## 6. Brand assets (`public/`)

Mark: an "M" drawn as one price path that ends higher than it starts, with the current point ringed. One colour (accent on navy). Files: `favicon.svg`, `favicon.ico` (16/32/48 PNG-in-ICO), `apple-touch-icon.png` (180, square), `icon-192.png`, `icon-512.png` (maskable, mark within the central 80%), `og-default.png` (1200x630). Regenerate with the generator script if the palette changes; never hand-edit the PNGs.
