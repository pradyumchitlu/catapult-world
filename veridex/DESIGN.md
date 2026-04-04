# Veridex Design Language

## Overview

Veridex uses a **light glass morphism** design inspired by editorial typography. The aesthetic is clean, airy, and trust-evoking — frosted glass cards on a shifting aurora gradient background, with a serif/sans font pairing.

## Fonts

- **Fraunces** (serif) — Headlines, logo, stat numbers, blockquotes. Weights: 400, 700.
- **Inter** (sans) — Body text, labels, buttons, UI elements. Weights: 400, 500, 600.

Loaded via `next/font/google` in `frontend/src/app/layout.tsx` as CSS variables `--font-fraunces` and `--font-inter`.

## Color Palette

### Primary Blue
| Token | Hex | Usage |
|-------|-----|-------|
| `blue-800` | `#1E40AF` | — |
| `blue-700` / `accent` | `#1D4ED8` | Section labels, accent text |
| `blue-600` / `primary` | `#2563EB` | Buttons, links, active states, logo gradient start |
| `blue-500` | `#3B82F6` | Logo gradient end, lighter accents |
| `blue-400` | `#60A5FA` | Hover states |
| `blue-100` | `#DBEAFE` | — |
| `blue-50` | `#EFF6FF` | — |

### Text (Slate tones)
| Token | Hex | Usage |
|-------|-----|-------|
| `textPrimary` | `#1E293B` | Headings, primary body text |
| `textSecondary` | `#475569` | Body paragraphs, descriptions |
| `textTertiary` | `#64748B` | Nav links, secondary UI text |
| `textMuted` | `#94A3B8` | Timestamps, captions, helper text |

### Status Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#10B981` | Verified states, positive indicators |
| `cyan` | `#0EA5E9` | Staking amounts, secondary data |
| `warning` | `#F59E0B` | Star ratings, caution states |
| `rose` | `#F43F5E` | Errors, slashing warnings, danger cards |

### Key rgba Values
| Value | Usage |
|-------|-------|
| `rgba(37,99,235,0.07)` | Glass card box-shadow |
| `rgba(37,99,235,0.12)` | Separators |
| `rgba(37,99,235,0.2)` | Dot separators, input borders |
| `rgba(37,99,235,0.35)` | Secondary button border |
| `rgba(255,255,255,0.72)` | Glass card background |
| `rgba(255,255,255,0.85)` | Glass card border |

## Glass Morphism Cards

The core visual element. All content sections use frosted glass cards.

```css
background-color: rgba(255,255,255,0.72);
backdrop-filter: blur(20px);
border: 1px solid rgba(255,255,255,0.85);
box-shadow: 0 4px 24px rgba(37,99,235,0.07), inset 0 1px 0 rgba(255,255,255,0.9);
border-radius: 20px;
padding: 48px;          /* .glass-card */
padding: 32px;          /* .card or .glass-card-compact */
```

## Background

Aurora gradient that slowly shifts:

```css
background: linear-gradient(-45deg, #ffffff, #eff6ff, #f5f3ff, #faf5ff);
background-size: 400% 400%;
animation: aurora-shift 10s ease infinite;
```

## Typography Scale

| Style | Font | Size | Weight | Spacing |
|-------|------|------|--------|---------|
| `headingLg` | Fraunces | 64px | 700 | -0.02em |
| `headingMd` | Fraunces | 28px | 700 | -0.01em |
| `headingSm` | Inter | 16px | 600 | normal |
| `bodyText` | Inter | 16px | 400 | normal |
| `textSecondary` | Inter | 16px | 400 | normal |
| `textMuted` | Inter | 12px | 400 | normal |
| `sectionLabel` | Inter | 11px | 500 | 0.15em (uppercase) |
| `statNumber` | Fraunces | 32px | 700 | -0.02em |

Headlines and stat numbers use the `gradientText` style (blue gradient with `background-clip: text`).

## Buttons

**Primary** — Blue background, white text, 12px radius, 13px/28px padding.
**Secondary** — White/transparent background, blue text, blue border, 12px radius.

Both use CSS classes `.btn-primary` and `.btn-secondary` defined in `globals.css`.

## Inputs

Semi-transparent white background, blue border on focus, 8px radius.

```css
background-color: rgba(255,255,255,0.5);
border: 1px solid rgba(37,99,235,0.2);
border-radius: 8px;
```

Uses `.input` class from `globals.css`.

## Animations

| Class | Effect | Duration |
|-------|--------|----------|
| `.fade-up` | Fade in + slide up 20px | 0.5s |
| `.fade-up-1` through `.fade-up-5` | Staggered delays (0.1s–0.45s) | — |
| `.glow-pulse` | Pulsing box-shadow | 4s infinite |
| `aurora-shift` | Background position shift | 10s infinite |

All animations respect `prefers-reduced-motion`.

## Layout

- Max content width: **680px**, centered
- Main padding: **64px** vertical, **24px** horizontal
- Glass card spacing: **64px** between sections
- Separator margin: **28px** top and bottom
- Navbar: fixed, **72px** height, glass blur

## Navbar Pattern

Frosted glass bar with dot-separated nav links. Active link gets blue text + bottom border. Logo is italic Fraunces with blue gradient.

## Section Pattern

Each content section follows this structure:
1. **Section label** — uppercase, small, blue-700
2. **Content** — headings, body text, interactive elements
3. **Separator** — thin blue-tinted line between items

---

## Files to Reference

### Design System (read these first)
| File | What it defines |
|------|----------------|
| `frontend/src/lib/styles.ts` | All shared style tokens (glass cards, gradients, typography, colors) |
| `frontend/src/app/globals.css` | CSS classes (`.card`, `.btn-primary`, `.btn-secondary`, `.input`, animations) |
| `frontend/tailwind.config.js` | Tailwind color palette, font families |
| `frontend/src/app/layout.tsx` | Root layout, font loading, aurora background |

### Reference Components
| File | What it demonstrates |
|------|---------------------|
| `frontend/src/app/page.tsx` | Landing page — hero, glass sections, protocol flow, capabilities, blockquote, CTA, footer |
| `frontend/src/components/Navbar.tsx` | Glass nav bar, dot separators, active states, logo |

### Component Library
| File | Purpose |
|------|---------|
| `frontend/src/components/TrustScoreCard.tsx` | Score ring/gauge display |
| `frontend/src/components/ScoreBreakdown.tsx` | Radar chart (recharts) |
| `frontend/src/components/ContextualScoreCard.tsx` | Fit score with met/partial/missing |
| `frontend/src/components/WorkerCard.tsx` | Worker card for browse grid |
| `frontend/src/components/ReviewCard.tsx` | Single review display |
| `frontend/src/components/ReviewForm.tsx` | Star rating, text, stake slider |
| `frontend/src/components/ChatPanel.tsx` | AI chat interface |
| `frontend/src/components/StakeButton.tsx` | Stake modal |
| `frontend/src/components/LoadingSpinner.tsx` | Shared loading state |

### Types
| File | Purpose |
|------|---------|
| `frontend/src/types/index.ts` | All TypeScript interfaces (User, WorkerProfile, Review, Stake, etc.) |

---

## Quick Rules

1. **No dark backgrounds.** Everything is light/white with glass blur.
2. **Use shared tokens** from `@/lib/styles` — don't hardcode colors inline.
3. **Fraunces for display, Inter for UI.** Never use Fraunces for buttons or labels.
4. **Blue gradient for emphasis.** Headlines, logo, stat numbers get `gradientText`.
5. **Section labels are uppercase.** 11px, Inter, blue-700, 0.15em letter-spacing.
6. **Separators between list items.** Thin blue-tinted line, 28px margin.
7. **Respect `prefers-reduced-motion`.** All animations have a media query fallback.
