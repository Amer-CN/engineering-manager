---
version: alpha
name: 工程管家 (Engineering Manager)
description: >
  A professional, data-dense desktop ERP interface for construction project
  management. Built with Electron + React + TailwindCSS. The visual identity
  favors gravitas over playfulness — slate-dominated neutrals, blue primary
  accents, spring-physics motion, and crisp card-based layouts. Designed for
  Chinese-locale engineering firms managing projects, contracts, invoices,
  settlements, wages, and inventory.

colors:
  # ── Brand / Semantic ──────────────────────────────────────────
  primary-50:  "#eff6ff"
  primary-100: "#dbeafe"
  primary-200: "#bfdbfe"
  primary-300: "#93c5fd"
  primary-400: "#60a5fa"
  primary-500: "#3b82f6"
  primary-600: "#2563eb"
  primary-700: "#1d4ed8"
  primary-800: "#1e40af"
  primary-900: "#1e3a8a"

  success-50:  "#f0fdf4"
  success-100: "#dcfce7"
  success-200: "#bbf7d0"
  success-300: "#86efac"
  success-400: "#4ade80"
  success-500: "#22c55e"
  success-600: "#16a34a"
  success-700: "#15803d"
  success-800: "#166534"
  success-900: "#14532d"

  warning-50:  "#fffbeb"
  warning-100: "#fef3c7"
  warning-200: "#fde68a"
  warning-300: "#fcd34d"
  warning-400: "#fbbf24"
  warning-500: "#f59e0b"
  warning-600: "#d97706"
  warning-700: "#b45309"
  warning-800: "#92400e"
  warning-900: "#78350f"

  danger-50:  "#fef2f2"
  danger-100: "#fee2e2"
  danger-200: "#fecaca"
  danger-300: "#fca5a5"
  danger-400: "#f87171"
  danger-500: "#ef4444"
  danger-600: "#dc2626"
  danger-700: "#b91c1c"
  danger-800: "#991b1b"
  danger-900: "#7f1d1d"

  info-50:  "#f0f9ff"
  info-100: "#e0f2fe"
  info-200: "#bae6fd"
  info-300: "#7dd3fc"
  info-400: "#38bdf8"
  info-500: "#0ea5e9"
  info-600: "#0284c7"
  info-700: "#0369a1"
  info-800: "#075985"
  info-900: "#0c4a6e"

  # ── Neutrals (slate) — Light ──────────────────────────────────
  neutral-bg-primary:    "#ffffff"
  neutral-bg-secondary:  "#f8fafc"
  neutral-bg-tertiary:   "#f1f5f9"
  neutral-text-primary:  "#1e293b"
  neutral-text-secondary:"#475569"
  neutral-text-tertiary: "#94a3b8"
  neutral-border-primary:"#e2e8f0"
  neutral-border-secondary:"#cbd5e1"

  # ── Neutrals (slate) — Dark ───────────────────────────────────
  dark-bg-primary:    "#0f172a"
  dark-bg-secondary:  "#1e293b"
  dark-bg-tertiary:   "#334155"
  dark-text-primary:  "#f1f5f9"
  dark-text-secondary:"#94a3b8"
  dark-text-tertiary: "#64748b"
  dark-border-primary:"#334155"
  dark-border-secondary:"#475569"

  # ── Sidebar (light) ───────────────────────────────────────────
  sidebar-bg:          "#ffffff"
  sidebar-border:      "#e2e8f0"
  sidebar-item-hover:  "#f1f5f9"
  sidebar-item-active: "#eff6ff"
  sidebar-logo-start:  "#1e293b"
  sidebar-logo-end:    "#1e293b"

  # ── Overlay / Glass ───────────────────────────────────────────
  overlay:         "rgba(0,0,0,0.5)"
  overlay-light:   "rgba(0,0,0,0.3)"
  glass-bg:        "rgba(255,255,255,0.8)"

  # ── Domain colors ─────────────────────────────────────────────
  domain-revenue:  "#10b981"
  domain-expense:  "#ef4444"
  domain-task:     "#3b82f6"
  domain-partner:  "#8b5cf6"

typography:
  font-family:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

  display:
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"

  h1:
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"

  h2:
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.35

  h3:
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4

  body:
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5

  body-sm:
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5

  label:
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4

  caption:
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5

  overline:
    fontSize: 10px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.1em"
    textTransform: "uppercase"

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  "2xl": 32px
  "3xl": 48px
  page-padding: 24px
  card-gap: 16px
  section-gap: 24px

rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 10px
  xl: 12px
  "2xl": 16px
  "3xl": 24px
  full: 9999px

shadows:
  xs:  "0 1px 2px rgba(0,0,0,0.05)"
  sm:  "0 1px 3px rgba(0,0,0,0.08)"
  card: >
    0 1px 3px rgba(0,0,0,0.1),
    0 1px 2px rgba(0,0,0,0.06)
  card-hover: >
    0 10px 15px -3px rgba(0,0,0,0.1),
    0 4px 6px -2px rgba(0,0,0,0.05)
  soft: >
    0 2px 15px -3px rgba(0,0,0,0.07),
    0 10px 20px -2px rgba(0,0,0,0.04)
  modal: "0 25px 50px -12px rgba(0,0,0,0.25)"
  dropdown: "0 10px 15px -3px rgba(0,0,0,0.1)"
  glow:  "0 0 20px rgba(59,130,246,0.3)"
  glow-lg: "0 0 40px rgba(59,130,246,0.4)"
  button-primary: "0 4px 14px rgba(37,99,235,0.35)"

motion:
  duration-instant: 100ms
  duration-fast: 150ms
  duration-normal: 200ms
  duration-slow: 300ms
  duration-chart: 1200ms
  ease-default: "easeOut"
  spring-button: "spring stiffness=400 damping=17"
  spring-modal: "spring stiffness=300 damping=25"
  spring-sidebar-indicator: "spring stiffness=500 damping=30"
  spring-countup: "spring stiffness=40 damping=25"
  stagger-nav: 30ms
  stagger-section: 70ms

components:
  button:
    fontFamily: "{typography.font-family.fontFamily}"
    fontSize: "{typography.body.fontSize}"
    fontWeight: 500
    borderRadius: "{rounded.md}"
    transition: "all {motion.duration-normal} ease-out"
    focus-ring-color: "{colors.primary-500}"
    focus-ring-width: 2px
    focus-ring-offset: 2px
    disabled-opacity: 0.5
    primary-bg: "{colors.primary-600}"
    primary-text: "#ffffff"
    primary-hover-bg: "{colors.primary-700}"
    secondary-bg: "#ffffff"
    secondary-text: "{colors.neutral-text-primary}"
    secondary-border: "{colors.neutral-border-primary}"
    danger-bg: "{colors.danger-500}"
    danger-text: "#ffffff"
    ghost-bg: "transparent"
    ghost-text: "{colors.neutral-text-secondary}"
    outline-bg: "transparent"
    outline-text: "{colors.primary-600}"
    outline-border: "{colors.primary-300}"
    sizes:
      xs: "px-2 py-1 text-xs"
      sm: "px-3 py-1.5 text-sm"
      md: "px-4 py-2 text-base"
      lg: "px-6 py-3 text-lg"
      xl: "px-8 py-4 text-xl"
    hover-scale: 1.03
    tap-scale: 0.97

  card:
    bg: "#ffffff"
    borderRadius: "{rounded.xl}"
    border-color: "{colors.neutral-border-primary}"
    shadow: "{shadows.sm}"
    header-padding: "20px 16px"
    body-padding: "20px"
    header-divider-color: "#f1f5f9"
    footer-bg: "#f8fafc"
    glass-bg: "rgba(255,255,255,0.8)"
    glass-backdrop: "blur(16px)"
    hover-lift: -3px
    title-fontSize: "{typography.h3.fontSize}"
    title-fontWeight: 600
    title-color: "{colors.neutral-text-primary}"
    subtitle-fontSize: "{typography.body-sm.fontSize}"
    subtitle-color: "{colors.neutral-text-secondary}"

  input:
    bg: "#ffffff"
    text-color: "{colors.neutral-text-primary}"
    placeholder-color: "{colors.neutral-text-tertiary}"
    border-color: "{colors.neutral-border-primary}"
    borderRadius: "{rounded.md}"
    focus-ring-color: "{colors.primary-500}"
    focus-ring-opacity: 0.2
    transition: "all {motion.duration-normal}"
    size-md-padding: "10px 16px"
    label-fontSize: "{typography.label.fontSize}"
    label-fontWeight: 500
    label-color: "{colors.neutral-text-secondary}"
    error-color: "{colors.danger-500}"
    modern-bg: "{colors.neutral-bg-tertiary}"
    modern-borderRadius: "{rounded.xl}"

  select:
    bg: "#ffffff"
    text-color: "{colors.neutral-text-primary}"
    border-color: "{colors.neutral-border-primary}"
    borderRadius: "{rounded.md}"
    focus-ring-color: "{colors.primary-500}"
    dropdown-shadow: "{shadows.dropdown}"
    dropdown-border-radius: "{rounded.md}"
    selected-bg: "{colors.primary-50}"
    selected-text: "{colors.primary-700}"
    transition: "all {motion.duration-normal}"

  modal:
    bg: "#ffffff"
    borderRadius: "{rounded.2xl}"
    shadow: "{shadows.modal}"
    overlay-color: "rgba(0,0,0,0.5)"
    overlay-backdrop: "blur(4px)"
    header-padding: "16px 24px"
    body-padding: "16px 24px"
    footer-padding: "16px 24px"
    footer-bg: "#f8fafc"
    border-color: "{colors.neutral-border-primary}"
    animation-scale-start: 0.95
    animation-scale-end: 1

  table:
    bg: "#ffffff"
    header-bg: "#f8fafc"
    header-text-color: "{colors.neutral-text-secondary}"
    header-fontSize: "{typography.caption.fontSize}"
    header-fontWeight: 600
    header-textTransform: "uppercase"
    header-letterSpacing: "0.05em"
    border-color: "{colors.neutral-border-primary}"
    row-hover-bg: "#f8fafc"
    cell-padding-compact: "8px 12px"
    cell-padding-default: "12px 16px"
    cell-padding-spacious: "16px 20px"
    borderRadius: "{rounded.xl}"
    empty-text-color: "{colors.neutral-text-tertiary}"

  badge:
    fontWeight: 500
    borderRadius: "{rounded.full}"
    padding-sm: "4px 8px"
    padding-md: "6px 10px"
    padding-lg: "8px 12px"
    dot-animation-duration: 2s
    dot-animation-easing: "easeInOut"

  tabs:
    container-bg: "{colors.neutral-bg-tertiary}"
    container-borderRadius: "{rounded.xl}"
    container-padding: 4px
    active-bg: "#ffffff"
    active-text: "{colors.primary-600}"
    active-shadow: "{shadows.sm}"
    inactive-text: "{colors.neutral-text-tertiary}"
    tab-borderRadius: "{rounded.md}"
    tab-padding: "8px 16px"
    tab-fontSize: "{typography.body-sm.fontSize}"
    tab-fontWeight: 500

  sidebar:
    width: 256px
    bg: "#ffffff"
    border-color: "{colors.neutral-border-primary}"
    nav-item-borderRadius: "{rounded.xl}"
    nav-item-padding: "10px 12px"
    nav-item-active-bg: "#f1f5f9"
    nav-item-active-text: "{colors.neutral-text-primary}"
    nav-item-active-indicator-color: "{colors.neutral-text-primary}"
    nav-item-inactive-text: "{colors.neutral-text-secondary}"
    nav-item-hover-bg: "#f8fafc"
    logo-gradient-from: "#1e293b"
    logo-gradient-to: "#1e293b"
    logo-height: "64px"

  toast:
    bg-success: "{colors.success-500}"
    bg-error: "{colors.danger-500}"
    bg-info: "#334155"
    text-color: "#ffffff"
    borderRadius: "{rounded.xl}"
    shadow: "{shadows.modal}"
    padding: "12px 24px"
    position: "fixed top-80px center-x"

  progress-bar:
    track-bg: "{colors.neutral-bg-tertiary}"
    borderRadius: "{rounded.full}"
    animated: true
    animation-duration: 800ms
    animation-easing: "easeOut"

  dropdown-menu:
    bg: "#ffffff"
    borderRadius: "{rounded.md}"
    shadow: "{shadows.dropdown}"
    border-color: "{colors.neutral-border-primary}"
    item-padding: "8px 16px"
    item-fontSize: "{typography.body-sm.fontSize}"
    item-text: "{colors.neutral-text-primary}"
    item-hover-bg: "#f8fafc"
    item-danger-text: "{colors.danger-600}"
    item-danger-hover-bg: "#fef2f2"
    min-width: 160px

  tooltip:
    bg: "{colors.neutral-text-primary}"
    text-color: "#ffffff"
    fontSize: "{typography.caption.fontSize}"
    borderRadius: "{rounded.md}"
    padding: "6px 10px"
    shadow: "{shadows.dropdown}"
    delay: 300ms

  pagination:
    button-bg: "#ffffff"
    button-border: "{colors.neutral-border-primary}"
    button-borderRadius: "{rounded.md}"
    active-bg: "{colors.primary-600}"
    active-text: "#ffffff"
    inactive-text: "{colors.neutral-text-secondary}"

  page-container:
    max-width-default: 1400px
    max-width-wide: 1600px
    max-width-narrow: 896px
    padding: 24px
    horizontal-center: true

  hero-banner:
    bg-gradient-from: "#1e293b"
    bg-gradient-to: "#1e293b"
    text-color: "#ffffff"
    borderRadius: "{rounded.2xl}"
    padding: 24px
    accent-color: "#10b981"

  kpi-card:
    bg: "#ffffff"
    borderRadius: "{rounded.xl}"
    shadow: "{shadows.sm}"
    padding: 12px
    icon-container-size: 28px
    icon-container-borderRadius: "{rounded.md}"
    label-fontSize: "{typography.caption.fontSize}"
    label-color: "{colors.neutral-text-tertiary}"
    value-fontSize: 18px
    value-fontWeight: 700
    value-color: "{colors.neutral-text-primary}"

  login-page:
    brand-bg-gradient-from: "#1e293b"
    brand-bg-gradient-to: "#1e293b"
    brand-text: "#ffffff"
    brand-muted: "{colors.neutral-text-tertiary}"
    form-bg: "#f8fafc"
    card-bg: "#ffffff"
    card-borderRadius: "{rounded.2xl}"
    card-shadow: "{shadows.sm}"
    input-bg: "{colors.neutral-bg-tertiary}"
    input-borderRadius: "{rounded.xl}"

  loading:
    skeleton-bg: "{colors.neutral-bg-tertiary}"
    skeleton-animation: "pulse"
    spinner-border-color: "{colors.neutral-border-primary}"
    spinner-accent: "{colors.primary-600}"
    spinner-size-sm: 16px
    spinner-size-md: 24px
    spinner-size-lg: 36px

  scrollbar:
    width: 8px
    track-bg: "{colors.neutral-bg-tertiary}"
    thumb-bg: "{colors.neutral-border-secondary}"
    thumb-hover-bg: "{colors.neutral-text-tertiary}"
    thumb-borderRadius: 4px
---

# 工程管家 — Design System

## Overview

工程管家 is a construction-industry ERP desktop application built with
Electron, React 18, TypeScript, and TailwindCSS. The visual language sits at
the intersection of **enterprise gravitas** and **modern craft**: it must feel
trustworthy to a project manager reviewing six-figure settlement amounts, yet
polished enough to not feel like legacy factory-floor software.

The aesthetic is **slate-first, blue-accented, card-based**. Every page lives
inside a consistent max-width container, every data entity gets a card with a
title, and every interactive element gets spring-physics feedback from
framer-motion. The design avoids decorative flourish — no gratuitous gradients
or illustrations — and instead earns its polish through motion, spacing
precision, and a restrained palette.

The target user is a Chinese-locale engineering manager, accountant, or site
supervisor. The UI must handle high information density (tables with 10+
columns, dashboards with 6+ KPI cards) without feeling cluttered. Chinese text
renders in the same Inter/system sans-serif stack and is generally shorter than
English labels, so the UI feels slightly roomier in practice than it would in
English.

### Light & Dark

Both themes are fully supported and toggleable in Settings. The light theme is
the default and is tuned for office fluorescent lighting: high contrast on
data, softer contrast on chrome. The dark theme inverts the slate scale and
dims shadows proportionally. Components use Tailwind's `dark:` modifier
sparingly, preferring CSS custom properties defined on `:root` and `.dark` for
backgrounds, text, and borders.

## Colors

### Brand / Semantic

The **primary** scale is Tailwind Blue (center: `#3b82f6`). It appears on
primary buttons, focus rings, active tab text, links, and the login submit
button's glow. The 50-100 tints serve as badge backgrounds; 600 is the default
button fill; 700 is hover.

- **Success** (`#22c55e` emerald) — green badges, success toasts, "completed"
  status dots, revenue/income domain indicator.
- **Warning** (`#f59e0b` amber) — warning badges, "pending" states,
  late-payment alerts, overdue task flags.
- **Danger** (`#ef4444` red) — destructive buttons, error states, "over-budget"
  indicators, expense domain indicator.
- **Info** (`#0ea5e9` sky) — informational callouts, but used sparingly since
  primary blue already carries the "information" role.

### Neutrals

The entire neutral axis is **Tailwind Slate** (blue-gray). This was a
deliberate choice over pure gray — slate's cool undertone pairs better with the
blue primary than warm grays. The light mode uses slate-50 through slate-800;
dark mode inverts to slate-900 through slate-100.

Three background levels create visual hierarchy:
1. **Page background** (`#f8fafc` slate-50) — the canvas behind all cards.
2. **Card / surface** (`#ffffff`) — where content lives.
3. **Tertiary / inset** (`#f1f5f9` slate-100) — tab bars, input fills,
   skeleton loaders, table headers, footer strips.

### Domain Colors

Four colors anchor the domain-specific sections throughout the app:
- **Revenue / Income** — emerald `#10b981`
- **Expense / Outgoing** — red `#ef4444`
- **Tasks** — blue `#3b82f6`
- **Partners** — violet `#8b5cf6`

These appear as icon-container backgrounds in KPI cards, chart series colors,
and status badges.

### Sidebar

The sidebar uses the same light/dark surface tokens as cards. The logo area at
the top breaks this rule — it uses a **dark gradient** (`slate-800 → slate-700
→ slate-800`) with white text, creating a branded anchor point that remains
fixed regardless of theme. Navigation items use the tertiary background on
active state with a 2px left-edge indicator bar animated via framer-motion
`layoutId`.

### Overlays

Modal backdrops use `rgba(0,0,0,0.5)` with `backdrop-blur-sm` in light mode,
deepening to `rgba(0,0,0,0.7)` in dark mode. The blur on the overlay softens
the transition and signals modality without needing a heavier tint.

## Typography

### Font Family

The stack is `Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
Helvetica Neue, Arial, sans-serif`. Inter is the primary design font; system
fallbacks ensure that native UI feels native on each platform.

### Scale

The type scale is purposefully **compact** — no display sizes above 36px, no
decorative weights. Chinese characters render well at these sizes without
needing a separate CJK font.

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| Display | 36px / 700 | Dashboard hero greeting | Rare |
| H1 | 24px / 700 / -0.02em | Page titles, section headers |
| H2 | 20px / 600 | Card titles, modal titles |
| H3 | 18px / 600 | Sub-section headers |
| Body | 16px / 400 | Paragraph text, table cells, form inputs |
| Body-sm | 14px / 400 | Secondary info, table cells (compact) |
| Label | 14px / 500 | Form labels, input labels |
| Caption | 12px / 400 | Help text, timestamps, KPI card labels |
| Overline | 10px / 600 / 0.1em | Sidebar section headers, table column headers |

### Usage rules

- **Table headers** use Overline style (uppercase, tracking-wider) to
  distinguish from data rows.
- **Card titles** are always H3 (18px semibold) in `text-slate-800`.
- **Form labels** are Label style (14px medium) with 6px bottom margin.
- Never use more than 2 weights on one screen (typically 400 + 600).

## Spacing & Layout

### Page Layout

Every content page is wrapped in `PageContainer`, which enforces:
- `max-width: 1400px` for standard pages (lists, forms)
- `max-width: 1600px` for data-dense pages (dashboard, wide tables)
- `max-width: 896px` (4xl) for narrow form pages
- `padding: 24px` on all sides
- Horizontally centered via `mx-auto`

The sidebar is fixed at `256px` (w-64). The remaining viewport width is the
content area. No page should exceed the viewport height; nested scrolling is
handled by `overflow-y-auto` on the content area with `h-full` + `overflow-hidden`
on the App shell.

### Spacing Scale

Built on Tailwind's 4px base unit. The most commonly used values:

| Token | px | Tailwind | Use |
|-------|----|----------|-----|
| xs | 4px | p-1 / gap-1 | Icon padding, tight groups |
| sm | 8px | p-2 / gap-2 | Button inner gap, badge padding |
| md | 12px | p-3 / gap-3 | KPI card padding, form group gap |
| lg | 16px | p-4 / gap-4 | Standard card gap, section gap |
| xl | 24px | p-6 / gap-6 | Page padding, section margin |
| 2xl | 32px | p-8 | Modal body padding, hero padding |
| 3xl | 48px | p-12 | Empty state vertical padding |

### Cards Grid

Dashboard cards use a `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` responsive
grid with `gap-3` (12px). Inside each KPI card, content is stacked vertically:
icon row → label → value, with minimal padding (`p-3`).

## Elevation & Depth

The app uses a **flat + subtle shadow** approach. There are no heavy skeuomorphic
effects, no multi-layered z-stacks. Depth is conveyed through:

1. **Shadow tiers** — `sm` (cards at rest), `md` (hovered cards), `lg`
   (dropdowns), `2xl` (modals).
2. **Background layering** — page bg → card bg → inset bg. Each step darkens
   slightly.
3. **Card hover lift** — cards with `hoverable` shift `y: -3px` and swap to a
   deeper shadow, executed as a framer-motion `whileHover`.

The glass variant (`Card glass={true}`) uses `bg-white/80 backdrop-blur-lg`
for a frosted overlay effect, but this is used sparingly — primarily in quick-add
modals and settings panels.

### Dark Mode Depth

In dark mode, elevation is harder to perceive with shadows alone. The dark
theme compensates by increasing the contrast between surface levels: the page
bg is deep navy (`#0f172a`), cards are slightly lighter (`#1e293b`), and inset
areas are lighter still (`#334155`).

## Shapes & Border Radius

The app converges on **three canonical radii**, each with a clear role:

| Radius | Value | Where |
|--------|-------|-------|
| `rounded-lg` | 8px | Buttons, inputs, selects (interactive controls) |
| `rounded-xl` | 12px | Cards, tab containers, table wrappers, KPI cards |
| `rounded-2xl` | 16px | Modals, hero banners, login form card |
| `rounded-full` | 9999px | Badges, progress bar tracks, status dots, avatar |

The rule: **interactive = lg, containers = xl, overlays = 2xl, inline = full**.
Never mix rounded corners on sibling elements — either all use the same radius
or one is fully rounded.

## Motion

Motion is the defining craft element of this UI. Every interactive component
has spring-physics feedback tuned to its size and role:

### Principles
- **Spring over tween** — natural feeling, no linear or ease-in-out defaults.
- **No scale on large elements** — modals and pages fade, they never scale
  (scale triggers expensive re-paint on large surfaces).
- **CSS keyframes for ambient animation** — floating blobs on login/dashboard
  run on the GPU compositor thread, never blocking JS.
- **AnimatePresence on all enter/exit** — nothing pops in or out; every
  mount/unmount has a fade or slide transition.

### Key Motions

| Component | Trigger | Animation |
|-----------|---------|-----------|
| Button | hover / tap | scale 1.03 / 0.97, spring 400/17 |
| Card | hover | y: -3 + shadow increase, 0.2s |
| Modal | open / close | overlay fade + content spring scale 0.95→1, spring 300/25 |
| Dropdown | open / close | opacity + y: -4 + scale 0.95→1, 0.15s easeOut |
| Toast | enter / exit | spring y: -16→0 + scale 0.95→1, 0.2s |
| Sidebar nav active | tab change | layoutId spring indicator, spring 500/30 |
| CountUp | value change | useSpring stiffness 40 damping 25 |
| Page transition | route change | AnimatePresence mode="wait", opacity only, 0.2s |
| Stagger (lists) | mount | 0.03s per child (nav), 0.07s per child (dashboard) |

### Ambient CSS Animations
- `float-slow` — 12s ease-in-out infinite translate, for login background blobs.
- `float-slower` — 15s variant, offset timing.
- `pulse-glow` — 2.5s opacity + scale pulse, for decorative dots on hero banner.
- All use `will-change: transform` and `transform: translateZ(0)` GPU hints.

## Components

### Button

Six variants: `primary`, `secondary`, `danger`, `ghost`, `link`, `outline`.
Five sizes: `xs` through `xl`. All buttons share:
- `rounded-lg` (8px)
- Focus-visible ring (2px primary-500, 2px offset)
- `disabled:opacity-50 disabled:cursor-not-allowed`
- Loading state replaces children with a spinning `Loader2` icon

**Variant-specific:**
- **Primary** — filled blue-600, white text, `shadow-sm`, hover darkens to
  blue-700. This is the **one strong CTA per screen**.
- **Secondary** — white bg, slate-200 border, slate-700 text. The workhorse
  "cancel" or "secondary action" button.
- **Danger** — red-500 filled, white text. Only for irreversible actions.
- **Ghost** — transparent, slate-600 text, no border. For icon-only tools or
  row actions.
- **Link** — transparent, blue-600 text, underline on hover. For inline
  navigation.
- **Outline** — transparent, blue-600 text, blue-300 border. A softer
  alternative to primary.

**Rule:** Only one primary button should be visible per screen section. If
there are two CTAs, the secondary one uses `outline` or `secondary`.

### Card

The fundamental content container. Variants controlled by props:
- `bordered` (default true) — adds `border border-slate-100`
- `hoverable` — enables `whileHover` lift animation
- `glass` — switches to frosted glass background
- `shadow` — four levels: `none | sm | md | lg`
- `padding` — `none | sm | md | lg`

Cards have three optional zones: **header** (title + subtitle + extra actions,
with divider), **body** (children, padded), **footer** (right-aligned actions,
slate-50 background, top border).

### Modal

Rendered via `createPortal` to `document.body`. Features:
- Backdrop with `bg-black/50 backdrop-blur-sm`
- Escape key dismiss
- Scroll lock on body while open
- `closeOnOverlay` click (configurable)
- Spring animation on content panel
- Header with title + X close button, divider
- Footer with right-aligned action buttons, slate-50 bg

Sizes: `sm` (max-w-sm, ~384px) through `full` (95vw/95vh).

### Input

The `Input` component wraps a native `<input>` with:
- Three sizes: `sm | md | lg`
- Four statuses: `default | error | warning | success`
- Left/right icon slots (renders lucide icons by string name)
- Left/right section slots for custom React nodes
- Error message with animated entrance (`AnimatePresence`, fade + y slide)
- Help text below the input
- `aria-invalid` and `aria-describedby` for accessibility

The "modern" variant (`.input-modern`) uses `bg-slate-50 rounded-xl` for a
softer, inset appearance — used on the login form and settings pages.

### Select

Custom dropdown select with:
- Single and multi-select modes (checkboxes in multi mode)
- Searchable variant with auto-focused filter input
- Clearable with an X button on the trigger
- Animated dropdown panel (opacity + y: -4, 0.15s)
- Selected state: `bg-primary-50 text-primary-700`
- Hover: `bg-slate-50`
- Click-outside dismiss

### Table

Data tables with:
- Three density presets: `compact | default | spacious`
- Sticky header option with `border-separate` for proper sticky behavior
- Skeleton loading rows (5 rows of pulsing bars)
- Empty state with configurable text
- Row hover highlight
- Optional row click handler
- Column alignment (left/center/right)
- Custom cell render functions

Tables always wrap in `rounded-xl border border-slate-200` for a card-like
appearance. Headers use the Overline typography token (10px, uppercase,
tracking-wider, slate-600).

### Badge

Small inline status indicators. Nine color variants: `primary | success |
warning | danger | gray | info | purple | orange | teal`. Optional `dot`
prop adds a pulsing circle (CSS animation, 2s easeInOut, opacity 0.4→1→0.4).

Badges default to `rounded-full` (pill shape). Sizes: `sm | md | lg`.
`outlined` variant swaps the filled background for a colored border + text.

### Tabs

Horizontal pill-style tab bar. The container is `bg-slate-100 rounded-xl p-1`
with buttons inside. The active tab gets `bg-white shadow-sm text-primary-600`;
inactive tabs are `text-slate-500`. Optional badge count on each tab.

### Sidebar

The sidebar is a permanent 256px left panel. Structure:
1. **Logo** — 64px tall, dark gradient background, white HardHat icon + "工程管家"
   title + version number.
2. **Section header** — 10px overline "主菜单" label.
3. **Nav items** — staggered entrance animation (0.03s per item), rounded-xl
   buttons with left-icon + label. Active item has a slate-100 background and a
   2px left-edge indicator animated via framer-motion `layoutId`.
4. **User footer** — border-top divider, avatar circle with gradient + initial,
   display name + role, triggers a DropdownMenu with four items (User
   Management, Settings, Lock Screen, Logout).

### DropdownMenu

Portal-based popup menu with:
- `AnimatePresence` entrance (opacity + y: -4 + scale 0.95→1)
- Min width 160px
- Divider support between item groups
- Danger items in red with red hover background
- Click-outside dismiss

### Toast

Fixed-position toast at top-center (`top-20`, z-9999). Three types:
- **Success** — emerald-500 background
- **Error** — red-500 background
- **Info** — slate-700 background

Enters with spring (y: -16→0, scale 0.95→1), exits with fade+slide. White
text, rounded-xl, shadow-2xl. Auto-dismisses after a timeout set by the
`useToast` hook.

### ProgressBar

Animated horizontal bar with:
- Track: `bg-slate-100 rounded-full`
- Fill: animated width via framer-motion (`duration: 0.8s, ease: easeOut`)
- Five color variants: `primary | success | warning | danger | gradient`
- Three sizes: `sm (h-1.5) | md (h-2.5) | lg (h-4)`
- Optional percentage label

### Tooltip

Simple hover tooltip with 300ms delay. Dark background (`bg-slate-800`),
white text, downward-pointing arrow (CSS triangle via rotated square). Used
sparingly — primarily for icon-only buttons that need a text label.

### Loading States

Two loading patterns:
1. **Spinner** — `border-2 border-slate-200 border-t-primary-600 rounded-full
   animate-spin`. Sizes: 16px (sm), 24px (md), 36px (lg).
2. **Skeleton** — `bg-slate-200 rounded animate-pulse` bars matching the
   layout they replace. Used in tables (5 rows × N columns) and dashboard
   (hero banner + 6 KPI cards + 2 chart areas).

### Empty States

Centered column with: large muted icon (opacity-50), title in
`text-lg font-medium text-slate-700`, description in `text-sm text-slate-500`.
Vertical padding `py-12`.

### Pagination

Row of page buttons + prev/next arrows. Active page: `bg-primary-600
text-white`. Inactive: `bg-white border border-slate-200 text-slate-600`.
`rounded-md` buttons with hover darkening.

### Scrollbar

Custom 8px scrollbar: track = `bg-slate-100`, thumb = `bg-slate-300`,
thumb:hover = `bg-slate-400`. All `rounded` (4px). Applied globally via
`::-webkit-scrollbar` pseudo-elements.

## Hero Banner

Used on the Dashboard page. Full-width `rounded-2xl` container with:
- `bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800`
- Decorative radial gradient overlay (`emerald-400 at top-right, 10% opacity`)
- Two animated "light dot" decorations (pulsing emerald + blue circles)
- Left: large icon + greeting text + subtitle
- Right: two KPI callouts (project count + task completion rate) in a
  translucent white card (`bg-white/10 rounded-xl`)

## Login Page

Split layout (desktop) / stacked (mobile):
- **Left panel** (50% width, hidden on mobile): dark gradient background with
  dot-grid pattern + floating CSS blur blobs. Centered brand mark: HardHat icon
  in frosted glass container, "工程管家" display heading, feature list with
  check icons.
- **Right panel** (50% width, full on mobile): `bg-slate-50` background,
  centered form card. Card is `bg-white rounded-2xl shadow-card p-8`.
  Inputs use the modern inset style (`bg-slate-50 rounded-xl`).
  Submit button: full-width primary with `shadow-lg shadow-primary-500/25`
  glow, hover scale 1.02.

Error messages use a shake animation (x offset keyframes) inside a red-50
alert box.

## Visual Hierarchy Rules

1. **One primary action per screen section.** Use secondary/outline/ghost for
   everything else.
2. **Cards are the unit of content.** No bare text floating on the page
   background — wrap it in a Card or at minimum give it a card-like container.
3. **Every list page has a sticky header row.** Large tables must remain
   navigable while scrolling.
4. **Color is information, not decoration.** Semantic colors (green/amber/red)
   appear only on status badges and indicators. The neutral palette carries the
   structure.
5. **Motion signals intention.** Hover confirms interactivity. Stagger signals
   "this is a list of peers." Spring signals "this is a physical action."
   AnimatePresence signals "this element has a lifecycle."

## Do's and Don'ts

- **Do** use `rounded-xl` for all card and container elements. Consistency at
  the container level makes the UI feel cohesive.
- **Do** apply `shadow-sm` to cards at rest and `shadow-md` on hover — never
  heavier than `shadow-lg` for a hovered card.
- **Do** use `layoutId` on the sidebar active indicator — it is the single most
  polished micro-interaction in the app.
- **Don't** add `scale` animation to elements larger than 200×200px. It causes
  layout paint on every frame. Use opacity or y-offset instead.
- **Don't** add a third font weight on any single screen. 400 + 600 is sufficient.
- **Don't** use the `dark:` Tailwind modifier directly in component markup.
  Define CSS custom properties on `:root` / `.dark` and reference those.
- **Don't** exceed 1400px content width on non-dashboard pages. The sidebar
  already takes 256px; wider content creates uncomfortable line lengths for
  Chinese text.
- **Don't** mix `rounded-lg` and `rounded-xl` on sibling containers. Either
  unify them or make one `rounded-full`.
