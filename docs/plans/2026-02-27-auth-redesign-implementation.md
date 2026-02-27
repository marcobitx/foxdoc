# Auth Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the foxDoc auth page with a split-screen layout (55/45), fox illustration, product mockup, clear color hierarchy, and modern 2026 SaaS aesthetics.

**Architecture:** The auth page (`auth.astro`) becomes a split-screen layout. Left panel is a pure Astro component (`AuthShowcase`) with fox SVG + CSS product mockup + trust badges. Right panel contains the existing `AuthForm` React island with updated color classes. No auth logic changes — only visual.

**Tech Stack:** Astro (SSG), React (island for auth form), Tailwind CSS v4, inline SVG

---

### Task 1: Create Fox SVG Illustration Component

**Files:**
- Create: `landing/src/components/FoxIllustration.astro`

**Context:** This is a pure Astro component (no React needed — it's static SVG). The fox should be an abstract geometric silhouette made of amber/orange gradient lines, glowing on the dark `#0d0a08` background. Keep it simple — ~15-20 SVG path elements max. Include a subtle CSS glow pulse animation (3s cycle).

**Step 1: Create the SVG illustration component**

```astro
---
// landing/src/components/FoxIllustration.astro
// Abstract geometric fox SVG with amber gradient and glow animation
// Used on auth showcase panel
// Related: AuthShowcase.astro, auth.astro
---

<div class="fox-illustration">
  <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" class="fox-svg">
    <defs>
      <linearGradient id="fox-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f59e0b" />
        <stop offset="50%" stop-color="#ea580c" />
        <stop offset="100%" stop-color="#f59e0b" />
      </linearGradient>
      <linearGradient id="fox-grad-light" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgba(245,158,11,0.6)" />
        <stop offset="100%" stop-color="rgba(234,88,12,0.3)" />
      </linearGradient>
      <filter id="fox-glow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <!-- Ears -->
    <path d="M60 70 L40 20 L80 55 Z" stroke="url(#fox-grad)" stroke-width="1.5" fill="none" filter="url(#fox-glow)" />
    <path d="M140 70 L160 20 L120 55 Z" stroke="url(#fox-grad)" stroke-width="1.5" fill="none" filter="url(#fox-glow)" />

    <!-- Head outline -->
    <path d="M60 70 Q60 50 80 55 L100 48 L120 55 Q140 50 140 70 Q145 95 130 110 L100 125 L70 110 Q55 95 60 70"
      stroke="url(#fox-grad)" stroke-width="1.5" fill="none" filter="url(#fox-glow)" />

    <!-- Inner ear lines -->
    <path d="M52 35 L72 60" stroke="url(#fox-grad-light)" stroke-width="0.8" />
    <path d="M148 35 L128 60" stroke="url(#fox-grad-light)" stroke-width="0.8" />

    <!-- Eyes -->
    <circle cx="82" cy="82" r="4" fill="#f59e0b" opacity="0.9" />
    <circle cx="118" cy="82" r="4" fill="#f59e0b" opacity="0.9" />
    <circle cx="83" cy="81" r="1.5" fill="#0d0a08" />
    <circle cx="119" cy="81" r="1.5" fill="#0d0a08" />

    <!-- Nose -->
    <path d="M96 98 L100 104 L104 98 Z" fill="#ea580c" opacity="0.8" />

    <!-- Whiskers -->
    <line x1="70" y1="96" x2="40" y2="90" stroke="url(#fox-grad-light)" stroke-width="0.6" />
    <line x1="70" y1="100" x2="38" y2="102" stroke="url(#fox-grad-light)" stroke-width="0.6" />
    <line x1="130" y1="96" x2="160" y2="90" stroke="url(#fox-grad-light)" stroke-width="0.6" />
    <line x1="130" y1="100" x2="162" y2="102" stroke="url(#fox-grad-light)" stroke-width="0.6" />

    <!-- Cheek markings -->
    <path d="M65 85 Q72 95 70 105" stroke="url(#fox-grad-light)" stroke-width="0.8" fill="none" />
    <path d="M135 85 Q128 95 130 105" stroke="url(#fox-grad-light)" stroke-width="0.8" fill="none" />

    <!-- Chin/mouth line -->
    <path d="M90 108 L100 104 L110 108" stroke="url(#fox-grad-light)" stroke-width="0.8" fill="none" />
  </svg>
</div>

<style>
  .fox-illustration {
    display: flex;
    justify-content: center;
    padding: 1rem 0;
  }
  .fox-svg {
    width: 160px;
    height: 144px;
    animation: foxGlow 3s ease-in-out infinite;
  }
  @keyframes foxGlow {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.2)); }
    50% { filter: drop-shadow(0 0 20px rgba(245, 158, 11, 0.4)); }
  }
  @media (prefers-reduced-motion: reduce) {
    .fox-svg { animation: none; }
  }
</style>
```

**Step 2: Verify the component renders**

Run: `cd landing && bun run dev`

Open browser at `http://localhost:4321/auth` — you won't see it yet (not imported), but verify no build errors.

**Step 3: Commit**

```bash
git add landing/src/components/FoxIllustration.astro
git commit -m "feat(auth): add geometric fox SVG illustration component"
```

---

### Task 2: Create Product Mockup Component

**Files:**
- Create: `landing/src/components/ProductMockup.astro`

**Context:** A CSS-only mini dashboard mockup showing a foxDoc analysis result. No real data — just visual. Uses the design system colors. Shows a card with a percentage ring, document count, and mini bar chart. All built with divs and Tailwind — no images.

**Step 1: Create the product mockup component**

```astro
---
// landing/src/components/ProductMockup.astro
// CSS-only product mockup showing foxDoc analysis results preview
// Decorative element for auth showcase panel — no real data
// Related: AuthShowcase.astro, auth.astro
---

<div class="mockup-container">
  <div class="mockup-card">
    <!-- Top bar -->
    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
      <div style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></div>
      <div style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></div>
      <div style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e;"></div>
      <span style="margin-left: auto; font-size: 0.625rem; color: #6d5f55; font-family: 'JetBrains Mono', monospace;">foxDoc — Analizė</span>
    </div>

    <!-- Analysis result row -->
    <div style="display: flex; gap: 0.75rem; align-items: center;">
      <!-- Score ring -->
      <div style="position: relative; width: 48px; height: 48px; flex-shrink: 0;">
        <svg viewBox="0 0 48 48" style="width: 48px; height: 48px; transform: rotate(-90deg);">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#2a2320" stroke-width="3" />
          <circle cx="24" cy="24" r="20" fill="none" stroke="#f59e0b" stroke-width="3"
            stroke-dasharray="113" stroke-dashoffset="22" stroke-linecap="round" />
        </svg>
        <span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.625rem; font-weight: 700; color: #f59e0b; font-family: 'JetBrains Mono', monospace;">82%</span>
      </div>

      <!-- Stats -->
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 0.75rem; font-weight: 600; color: #ede5df; margin-bottom: 0.25rem;">Pirkimo dokumentai</div>
        <div style="font-size: 0.625rem; color: #6d5f55;">12 dokumentų • 3 tiekėjai</div>
      </div>
    </div>

    <!-- Mini bar chart -->
    <div style="display: flex; align-items: flex-end; gap: 3px; margin-top: 0.75rem; height: 32px;">
      <div style="flex: 1; height: 60%; background: rgba(245,158,11,0.3); border-radius: 2px 2px 0 0;"></div>
      <div style="flex: 1; height: 85%; background: rgba(245,158,11,0.5); border-radius: 2px 2px 0 0;"></div>
      <div style="flex: 1; height: 45%; background: rgba(245,158,11,0.3); border-radius: 2px 2px 0 0;"></div>
      <div style="flex: 1; height: 100%; background: #f59e0b; border-radius: 2px 2px 0 0;"></div>
      <div style="flex: 1; height: 70%; background: rgba(245,158,11,0.4); border-radius: 2px 2px 0 0;"></div>
      <div style="flex: 1; height: 50%; background: rgba(245,158,11,0.3); border-radius: 2px 2px 0 0;"></div>
      <div style="flex: 1; height: 90%; background: rgba(245,158,11,0.6); border-radius: 2px 2px 0 0;"></div>
    </div>

    <!-- Labels under chart -->
    <div style="display: flex; justify-content: space-between; margin-top: 0.25rem;">
      <span style="font-size: 0.5rem; color: #6d5f55;">Kaina</span>
      <span style="font-size: 0.5rem; color: #6d5f55;">Kokybė</span>
    </div>
  </div>
</div>

<style>
  .mockup-container {
    display: flex;
    justify-content: center;
    padding: 0.5rem 1rem;
  }
  .mockup-card {
    width: 100%;
    max-width: 280px;
    background: #1a1512;
    border: 1px solid #2e2520;
    border-radius: 0.75rem;
    padding: 1rem;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  }
</style>
```

**Step 2: Verify no build errors**

Run: `cd landing && bun run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add landing/src/components/ProductMockup.astro
git commit -m "feat(auth): add CSS-only product mockup component"
```

---

### Task 3: Create Showcase Panel Component

**Files:**
- Create: `landing/src/components/AuthShowcase.astro`

**Context:** This is the left panel of the split-screen auth layout. It's a pure Astro component that imports FoxIllustration and ProductMockup. Background is `#0d0a08` with dot grid pattern and amber radial glow. Contains: logo, hero text, fox SVG, product mockup, and trust badges.

**Step 1: Create the showcase panel component**

```astro
---
// landing/src/components/AuthShowcase.astro
// Left panel of split-screen auth layout — product showcase with visuals
// Displays branding, fox illustration, product mockup, and trust badges
// Related: auth.astro, FoxIllustration.astro, ProductMockup.astro

import FoxIllustration from './FoxIllustration.astro';
import ProductMockup from './ProductMockup.astro';
---

<div class="showcase-panel">
  <!-- Dot grid + amber glow overlays -->
  <div class="showcase-bg"></div>
  <div class="showcase-glow"></div>

  <div class="showcase-content">
    <!-- Logo -->
    <a href="/" style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; margin-bottom: 2rem;">
      <img src="/favicon.svg" alt="foxDoc" width="28" height="28" />
      <span style="font-family: 'Space Grotesk', sans-serif; font-size: 1.125rem; font-weight: 700; color: white;">
        fox<span style="color: #f59e0b;">Doc</span>
      </span>
    </a>

    <!-- Hero text -->
    <h1 class="showcase-heading">
      Analizuokite viešųjų pirkimų dokumentus per kelias minutes
    </h1>
    <p class="showcase-subtext">
      AI dokumentų analizė, kuri taupo laiką ir pinigus
    </p>

    <!-- Fox illustration -->
    <FoxIllustration />

    <!-- Product mockup -->
    <ProductMockup />

    <!-- Trust badges -->
    <div class="trust-badges">
      <div class="trust-badge">
        <svg class="trust-icon" viewBox="0 0 16 16" fill="none"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM4 8l2.5 2.5L12 5" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>500+ organizacijų</span>
      </div>
      <div class="trust-badge">
        <svg class="trust-icon" viewBox="0 0 16 16" fill="none"><path d="M3 3h10v9H3V3z M6 1v4 M10 1v4 M3 7h10" stroke="#f59e0b" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>10,000+ dokumentų</span>
      </div>
      <div class="trust-badge">
        <svg class="trust-icon" viewBox="0 0 16 16" fill="none"><path d="M8 2v4l2.5 1.5 M8 14a6 6 0 100-12 6 6 0 000 12z" stroke="#f59e0b" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>99.9% uptime</span>
      </div>
    </div>
  </div>
</div>

<style>
  .showcase-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 100vh;
    background: #0d0a08;
    overflow: hidden;
  }

  .showcase-bg {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
  }

  .showcase-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 30% 40%, rgba(245,158,11,0.10), transparent 60%);
    pointer-events: none;
  }

  .showcase-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    padding: 3rem 2.5rem;
    max-width: 520px;
    margin: 0 auto;
  }

  .showcase-heading {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: clamp(1.5rem, 2.5vw, 2rem);
    font-weight: 700;
    color: #fdf9f7;
    line-height: 1.2;
    margin: 0 0 0.75rem 0;
  }

  .showcase-subtext {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 0.875rem;
    color: #b5a99f;
    margin: 0 0 1.5rem 0;
    line-height: 1.5;
  }

  .trust-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .trust-badge {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.6875rem;
    color: #6d5f55;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  }

  .trust-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
</style>
```

**Step 2: Verify no build errors**

Run: `cd landing && bun run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add landing/src/components/AuthShowcase.astro
git commit -m "feat(auth): add showcase panel with fox illustration and mockup"
```

---

### Task 4: Rewrite auth.astro with Split-Screen Layout

**Files:**
- Modify: `landing/src/pages/auth.astro` (complete rewrite)

**Context:** Replace the current centered layout with a split-screen. Left side imports `AuthShowcase` (Astro component, rendered at build time). Right side contains `AuthForm` (React island, `client:only="react"`). On mobile (<1024px), show a compact banner above the form.

**Step 1: Rewrite auth.astro**

```astro
---
// landing/src/pages/auth.astro
// Split-screen auth page — showcase panel (left) + auth form (right)
// Authenticates users and redirects to app.foxdoc.io via relay code
// Related: AuthShowcase.astro, AuthForm.tsx, LandingConvexProvider.tsx

import AuthForm from '../components/AuthForm';
import AuthShowcase from '../components/AuthShowcase.astro';
import '../styles/global.css';
---
<!doctype html>
<html lang="lt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Prisijunkite prie foxDoc — AI viešųjų pirkimų dokumentų analizė" />
    <title>Prisijungti | foxDoc</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body style="margin: 0; overflow-x: hidden;">
    <div class="auth-layout">
      <!-- Left: Showcase (hidden on mobile, visible on lg+) -->
      <div class="auth-showcase">
        <AuthShowcase />
      </div>

      <!-- Right: Auth form panel -->
      <div class="auth-form-panel">
        <!-- Mobile-only compact banner -->
        <div class="mobile-banner">
          <a href="/" style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none;">
            <img src="/favicon.svg" alt="foxDoc" width="24" height="24" />
            <span style="font-family: 'Space Grotesk', sans-serif; font-size: 1rem; font-weight: 700; color: white;">
              fox<span style="color: #f59e0b;">Doc</span>
            </span>
          </a>
          <p style="color: #b5a99f; font-size: 0.75rem; margin: 0.25rem 0 0 0;">AI dokumentų analizė</p>
        </div>

        <!-- Auth card -->
        <div class="auth-card-wrapper">
          <div class="auth-card">
            <h1 class="auth-heading">Sveiki sugrįžę</h1>
            <p class="auth-subtext">Prisijunkite arba susikurkite paskyrą</p>
            <AuthForm client:only="react" />
          </div>
        </div>
      </div>
    </div>

    <style>
      .auth-layout {
        display: flex;
        min-height: 100vh;
      }

      /* Showcase panel — desktop only */
      .auth-showcase {
        display: none;
        width: 55%;
        flex-shrink: 0;
      }

      /* Auth form panel */
      .auth-form-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: #1a1512;
        padding: 2rem 1.5rem;
        min-height: 100vh;
      }

      /* Mobile banner */
      .mobile-banner {
        text-align: center;
        padding-bottom: 1.5rem;
      }

      /* Card wrapper for centering */
      .auth-card-wrapper {
        width: 100%;
        max-width: 26rem;
      }

      /* Auth card with clear elevation */
      .auth-card {
        background: #231c18;
        border: 1px solid rgba(245, 158, 11, 0.08);
        border-radius: 1rem;
        padding: 2rem;
        box-shadow: 0 0 60px rgba(245, 158, 11, 0.04);
        animation: cardFadeIn 0.4s ease-out;
      }

      @keyframes cardFadeIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .auth-heading {
        font-family: 'Space Grotesk', system-ui, sans-serif;
        font-size: 1.5rem;
        font-weight: 700;
        color: white;
        margin: 0 0 0.5rem 0;
        text-align: center;
      }

      .auth-subtext {
        color: #d6d3d1;
        font-size: 0.875rem;
        margin: 0 0 1.5rem 0;
        text-align: center;
      }

      /* Desktop: show showcase, hide mobile banner */
      @media (min-width: 1024px) {
        .auth-showcase {
          display: block;
        }
        .mobile-banner {
          display: none;
        }
        .auth-form-panel {
          padding: 3rem 2.5rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .auth-card { animation: none; }
      }
    </style>
  </body>
</html>
```

**Step 2: Verify the page renders**

Run: `cd landing && bun run dev`

Open `http://localhost:4321/auth` in browser. Verify:
- Desktop: split-screen with showcase left, form right
- Mobile (resize < 1024px): compact banner + form card
- Card has clear background separation from panel

**Step 3: Commit**

```bash
git add landing/src/pages/auth.astro
git commit -m "feat(auth): rewrite auth page with split-screen layout"
```

---

### Task 5: Update AuthForm Color Classes

**Files:**
- Modify: `landing/src/components/AuthForm.tsx`

**Context:** Update all Tailwind color classes in AuthForm.tsx to match the design doc color hierarchy. The key changes: tab container `bg-[#2a2320]`, active tab `bg-[#3e332d]`, inputs `bg-[#2a2320] border-[#3e332d]`, divider line `bg-[#3e332d]`, submit button hover glow. **Do NOT change any auth logic** — only CSS classes.

**Step 1: Update the form color classes**

Replace the tab container (line ~148):
```tsx
// OLD:
<div className="flex mb-6 bg-neutral-800/50 rounded-lg p-1">
// NEW:
<div className="flex mb-6 bg-[#2a2320] rounded-lg p-1">
```

Replace active tab classes (lines ~152-153, ~161-162):
```tsx
// OLD:
? "bg-neutral-700 text-white shadow-sm"
// NEW:
? "bg-[#3e332d] text-white shadow-sm"
```

Replace divider lines (lines ~186, 188):
```tsx
// OLD:
<div className="flex-1 h-px bg-neutral-700"></div>
// NEW:
<div className="flex-1 h-px bg-[#3e332d]"></div>
```

Replace all input field classes (lines ~200, ~212, ~224):
```tsx
// OLD:
className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
// NEW:
className="w-full px-4 py-3 bg-[#2a2320] border border-[#3e332d] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
```

Replace submit button (line ~237):
```tsx
// OLD:
className="w-full py-3 px-4 rounded-lg bg-amber-500 text-neutral-900 font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
// NEW:
className="w-full py-3 px-4 rounded-lg bg-amber-500 text-neutral-900 font-semibold hover:bg-amber-400 transition-all disabled:opacity-50 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
```

Replace the "already authenticated" secondary button (line ~100):
```tsx
// OLD:
className="w-full py-3 px-4 rounded-lg bg-neutral-800 text-neutral-300 font-medium hover:bg-neutral-700 border border-neutral-700 transition-colors"
// NEW:
className="w-full py-3 px-4 rounded-lg bg-[#2a2320] text-neutral-300 font-medium hover:bg-[#3e332d] border border-[#3e332d] transition-colors"
```

**Step 2: Verify the form renders correctly**

Run: `cd landing && bun run dev`

Open `http://localhost:4321/auth` — verify:
- Inputs have visible darker background than the card
- Tab container has a distinct shade
- Submit button glows amber on hover
- Divider lines are visible
- All auth functionality still works (Google + email form submits)

**Step 3: Commit**

```bash
git add landing/src/components/AuthForm.tsx
git commit -m "fix(auth): update form colors for clear depth hierarchy"
```

---

### Task 6: Build, Test, and Deploy

**Files:** None — testing and deployment only.

**Step 1: Run production build**

```bash
cd landing && bun run build
```

Expected: Build succeeds, 15 pages built, no errors.

**Step 2: Visual test with Chrome DevTools**

Use `take_screenshot` on `http://localhost:4321/auth` to verify:
- Split-screen visible on desktop
- Fox illustration renders with glow
- Product mockup renders with chart
- Trust badges visible
- Auth card has clear separation from panel
- All text is readable (good contrast)

Resize to mobile width (< 1024px) and verify:
- Showcase panel hidden
- Mobile banner with logo visible
- Auth card full width

**Step 3: Deploy to production**

```bash
cd /c/Users/nj/projects/foxdoc
git push origin main
npx vercel --prod
```

Expected: Deploy succeeds, `https://foxdoc.io/auth` shows new split-screen layout.

**Step 4: Final verification on production**

Navigate to `https://foxdoc.io/auth` and take screenshot to confirm:
- New layout live
- All functionality works

**Step 5: Commit any final fixes if needed**
