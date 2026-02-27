# Auth Page Redesign — Design Document

**Date:** 2026-02-27
**Goal:** Redesign foxDoc auth pages (login, signup, already-authenticated) with a modern split-screen layout, clear color hierarchy, and interactive visual elements following 2026 SaaS trends.

**Problem:** Current auth page has near-identical background and card colors, no visual focus, poor contrast, and minimal visual interest.

---

## Layout: Split-Screen (55/45)

```
Desktop (≥1024px):
┌─────────────────────────────────┬────────────────────────┐
│       SHOWCASE PANEL (55%)      │    AUTH PANEL (45%)     │
│       bg: #0d0a08               │    bg: #1a1512          │
│                                 │                         │
│  foxDoc logo                    │  ┌── Card (#231c18) ──┐ │
│  Hero heading                   │  │ "Sveiki sugrįžę"   │ │
│  Sub-text                       │  │ [Tabs]              │ │
│                                 │  │ [Google btn]        │ │
│  ┌── Fox SVG illustration ──┐  │  │ ── ARBA ──          │ │
│  └──────────────────────────┘  │  │ [Email]             │ │
│                                 │  │ [Password]          │ │
│  ┌── Product mockup (CSS) ──┐  │  │ [Submit]            │ │
│  └──────────────────────────┘  │  │ Footer links        │ │
│                                 │  └─────────────────────┘ │
│  Trust badges (3x)             │                         │
└─────────────────────────────────┴────────────────────────┘

Mobile (<1024px):
┌────────────────────────────────┐
│ Compact banner (logo + tagline)│
│ bg: #0d0a08, py-6             │
├────────────────────────────────┤
│ Auth form (full width)         │
│ bg: #1a1512                    │
│ Card: #231c18, rounded-xl      │
└────────────────────────────────┘
```

---

## Color Hierarchy (3 depth levels)

| Layer | Purpose | Color | Notes |
|-------|---------|-------|-------|
| **Base** | Showcase panel bg | `#0d0a08` | Deepest, almost black with warm tint |
| **Elevated** | Auth panel bg | `#1a1512` | Visibly lighter than base |
| **Card** | Auth form card | `#231c18` | Clear separation from panel |
| **Input** | Form fields | `#2a2320` | Darker than card = inset effect |
| **Border** | Card/input borders | `#3e332d` | Visible but subtle |
| **Accent border** | Card outer | `rgba(245,158,11,0.08)` | Warm amber hint |

### Text Hierarchy

| Level | Color | Usage |
|-------|-------|-------|
| Primary | `white` / `#fdf9f7` | Headings, input values |
| Secondary | `neutral-200` (#e5e5e5) | Labels, descriptions |
| Tertiary | `neutral-400` (#a3a3a3) | Dividers, footer text |
| Placeholder | `neutral-500` (#737373) | Input placeholders |
| Accent | `amber-500` (#f59e0b) | Links, active states |

---

## Showcase Panel (Left, 55%)

### Content (top to bottom)

1. **foxDoc logo** — amber gradient text, 32px icon
2. **Hero heading** — `Space Grotesk`, ~2rem, bold, white
   - "Analizuokite viešųjų pirkimų dokumentus per kelias minutes"
3. **Sub-text** — `Plus Jakarta Sans`, 0.875rem, `neutral-300`
   - "AI dokumentų analizė, kuri taupo laiką ir pinigus"
4. **Fox SVG illustration** — Abstract fox silhouette from amber/orange gradient lines, glowing on dark background. Simple geometric SVG, not complex 3D.
5. **Product mockup** — CSS-created mini dashboard fragment showing analysis results card with percentage score, document count, and mini chart. Amber accents on dark card.
6. **Trust badges** — 3 horizontal badges:
   - "500+ organizacijų" | "10,000+ dokumentų" | "99.9% uptime"
   - `text-xs`, `neutral-400`, amber icon each

### Background Effects

- Dot grid: `radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)` at `32px 32px`
- Amber glow: `radial-gradient(ellipse at 30% 40%, rgba(245,158,11,0.12), transparent 60%)`
- Optional: subtle animated border highlight on mockup

---

## Auth Panel (Right, 45%)

### Card Design

- Background: `#231c18`
- Border: `1px solid rgba(245,158,11,0.08)`
- Border radius: `1rem`
- Padding: `2rem`
- Box shadow: `0 0 60px rgba(245,158,11,0.04)` (subtle amber glow)

### Form Elements

**Tabs (Prisijungti / Registruotis):**
- Container: `bg-[#2a2320]`, `rounded-lg`, `p-1`
- Active: `bg-[#3e332d]`, `text-white`, `shadow-sm`
- Inactive: `text-neutral-200`, `hover:text-white`

**Google button:**
- White bg, black text, Google icon
- `rounded-lg`, `py-3`, `font-medium`
- Hover: subtle shadow increase

**Divider "ARBA":**
- Line: `bg-[#3e332d]`
- Text: `text-neutral-400`, `uppercase`, `tracking-wider`

**Input fields:**
- Background: `bg-[#2a2320]`
- Border: `border-[#3e332d]`, focus → `border-amber-500`
- Labels: `text-neutral-200`, `font-medium`
- Placeholder: `text-neutral-500`
- Text: `text-white`

**Submit button:**
- `bg-amber-500`, `hover:bg-amber-400`
- `text-neutral-900`, `font-semibold`
- Hover glow: `box-shadow: 0 0 20px rgba(245,158,11,0.3)`

**Footer links:**
- "Pamiršote slaptažodį?" — `text-amber-500/80`, `hover:text-amber-400`
- "Neturite paskyros?" — `text-neutral-300` + amber link

### States

**Already authenticated:**
- Same card, shows "Jūs jau prisijungęs." message
- Primary button: "Eiti į aplikaciją" (amber)
- Secondary button: "Atsijungti ir prisijungti kitu" (outline)

**Redirecting:**
- Centered spinner/text: "Nukreipiama į aplikaciją..."

**Error:**
- `bg-red-500/10`, `text-red-400`, `rounded-lg`

---

## Micro-Animations

- Input focus: border transition `0.2s` to amber
- Submit hover: amber glow pulse
- Tab switch: smooth background transition
- Page load: form card fades in with slight translateY
- Fox illustration: subtle CSS glow pulse (2-3s cycle)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `landing/src/pages/auth.astro` | **Rewrite** — new split-screen layout |
| `landing/src/components/AuthForm.tsx` | **Modify** — update all color classes |
| `landing/src/components/AuthShowcase.tsx` | **Create** — showcase panel component |
| `landing/src/components/FoxIllustration.tsx` | **Create** — SVG fox illustration |
| `landing/src/components/ProductMockup.tsx` | **Create** — CSS product mockup |

---

## Tech Stack

- Astro page (SSG) with React islands
- Tailwind CSS v4 for styling
- Inline SVG for fox illustration
- CSS-only product mockup (no images needed)
- All existing auth logic preserved (Convex, relay, Google OAuth)
