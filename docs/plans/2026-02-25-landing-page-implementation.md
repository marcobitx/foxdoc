# FoxDoc Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sukurti `landing/` Astro projektą — premium minimalist `foxdoc.io` svetainę su landing page, pricing, features, use-cases, docs, forum ir about puslapiais.

**Architecture:** Atskira Astro 5 aplikacija `landing/` direktorijoje tame pačiame repo. Du atskiri Vercel projektai — `frontend/` → `app.foxdoc.io`, `landing/` → `foxdoc.io`. Dizainas: dark premium minimal, žalia akcento spalva, Playfair Display + Inter tipografija, scroll-triggered animacijos.

**Tech Stack:** Astro 5, Tailwind CSS v4, Framer Motion (React islands), Lucide React, bun

**Mobile-First taisyklė:** Visas Tailwind kodas rašomas mobile-first. Baziniai stiliai = mobilūs. `md:` / `lg:` = didesni ekranai. Niekada neaplankyti su `max-width` media queries. Prieš kiekvieną commitą patikrinti 375px, 390px, 768px, 1280px plotuose.

**Design doc:** `docs/plans/2026-02-25-landing-page-design.md`
**Business model:** `docs/plans/2026-02-25-business-model-design.md`

---

### Task 1: Initialize landing/ Astro project

**Files:**
- Create: `landing/` (naujas Astro projektas)

**Step 1: Inicializuoti projektą**

```bash
cd /c/Users/nj/projects/foxdoc
bun create astro@latest landing -- --template minimal --typescript strict --no-git --no-install
cd landing
bun install
```

**Step 2: Įdiegti dependencies**

```bash
cd landing
bunx astro add tailwind react
bun add framer-motion lucide-react
bun add -d @tailwindcss/typography
```

**Step 3: Nukopijuoti logo iš aplikacijos**

```bash
cp frontend/public/favicon.svg landing/public/favicon.svg
cp frontend/public/favicon.ico landing/public/favicon.ico
```

Tas pats logotipas abiejuose projektuose — vizualinis identiteto nuoseklumas.

**Step 4: Patikrinti kad veikia**

```bash
bun run dev
```
Expected: Astro dev server ant `http://localhost:4322` (arba laisvo porto)

**Step 4: Commit**

```bash
git add landing/
git commit -m "feat: initialize landing Astro project"
```

---

### Task 2: Konfigūruoti dizaino sistemą (CSS tokens + fonts)

**Files:**
- Create: `landing/src/styles/global.css`
- Modify: `landing/astro.config.mjs`
- Modify: `landing/tailwind.config.mjs`

**Step 1: Sukurti global.css su dizaino tokenais**

Spalvų hierarchija: **Primary → Accent → Semantic → Neutrals** (pagal `design_app.md`)

```css
/* landing/src/styles/global.css */
/* Šriftai suderinti su aplikacija (frontend/src/layouts/Layout.astro) */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=JetBrains+Mono:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* ── PRIMARY — veiksmo spalva (CTA, aktyvios nuorodos) ── */
  --primary:        #00ca88;
  --primary-hover:  #00b578;
  --primary-subtle: rgba(0, 202, 136, 0.10);
  --primary-glow:   rgba(0, 202, 136, 0.25);

  /* ── ACCENT — dekoratyvinė spalva (gradientai, fonas) ── */
  --accent:         #7c3aed;
  --accent-subtle:  rgba(124, 58, 237, 0.10);

  /* ── SEMANTIC — prasmingos spalvos ── */
  --success:        #22c55e;
  --error:          #ef4444;
  --warning:        #f59e0b;
  --info:           #3b82f6;

  /* ── NEUTRALS — fonas ir paviršiai ── */
  --neutral-900:    #0d0f14;   /* puslapio fonas */
  --neutral-800:    #141720;   /* kortelių fonas */
  --neutral-700:    #1a1f2e;   /* hover, elevated */
  --neutral-600:    #252d3d;   /* aktyvūs hover */
  --neutral-400:    rgba(255, 255, 255, 0.08);  /* rėmeliai */
  --neutral-300:    rgba(255, 255, 255, 0.12);  /* aktyvūs rėmeliai */

  /* ── TEKSTO hierarchija ── */
  --text-100:       #ffffff;   /* antraštės, skaičiai */
  --text-200:       #e2e8f0;   /* pagrindinis tekstas */
  --text-300:       #a0aec0;   /* antriniai aprašymai */
  --text-400:       #4a5568;   /* neaktyvūs, disabled */

  /* ── ELEVATION ── */
  --shadow-1:       0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-2:       0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-3:       0 8px 32px rgba(0, 0, 0, 0.6);
  --shadow-glow:    0 0 24px var(--primary-glow);

  /* ── SPACING skalė ── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html {
  background-color: var(--neutral-900);
  color: var(--text-200);
  scroll-behavior: smooth;
}

body {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  line-height: 1.7;
}

h1, h2, h3, h4 {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  color: var(--text-100);
}

/* Fluid typography — clamp(min, preferred, max) */
h1 { font-size: clamp(2rem, 5vw, 3.75rem); line-height: 1.15; }
h2 { font-size: clamp(1.75rem, 4vw, 3rem);  line-height: 1.2;  }
h3 { font-size: clamp(1.25rem, 2.5vw, 1.5rem); }

/* Primary CTA — tik vienas per puslapį */
.btn-primary {
  background: var(--primary);
  color: var(--neutral-900);
  font-weight: 600;
  padding: var(--space-3) var(--space-6);
  border-radius: 8px;
  transition: box-shadow 0.3s ease, background 0.2s ease;
}
.btn-primary:hover {
  background: var(--primary-hover);
  box-shadow: var(--shadow-glow);
}

/* Secondary CTA */
.btn-secondary {
  border: 1px solid var(--neutral-300);
  color: var(--text-100);
  font-weight: 600;
  padding: var(--space-3) var(--space-6);
  border-radius: 8px;
  transition: background 0.2s ease;
}
.btn-secondary:hover {
  background: var(--neutral-700);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Step 2: Konfigūruoti Tailwind su spalvų hierarchija**

```js
// landing/tailwind.config.mjs
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Primary — veiksmo spalva
        primary: {
          DEFAULT: '#00ca88',
          hover:   '#00b578',
          subtle:  'rgba(0,202,136,0.10)',
        },
        // Accent — dekoratyvinė
        accent: {
          DEFAULT: '#7c3aed',
          subtle:  'rgba(124,58,237,0.10)',
        },
        // Semantic
        success: '#22c55e',
        error:   '#ef4444',
        warning: '#f59e0b',
        info:    '#3b82f6',
        // Neutrals
        neutral: {
          900: '#0d0f14',
          800: '#141720',
          700: '#1a1f2e',
          600: '#252d3d',
        },
        // Text
        text: {
          100: '#ffffff',
          200: '#e2e8f0',
          300: '#a0aec0',
          400: '#4a5568',
        },
      },
      fontFamily: {
        // Suderinta su aplikacija (frontend/src/layouts/Layout.astro)
        heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans:    ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 24px rgba(0,202,136,0.25)',
        'glow-sm':      '0 0 12px rgba(0,202,136,0.15)',
        'elevated':     '0 4px 16px rgba(0,0,0,0.4)',
        'modal':        '0 8px 32px rgba(0,0,0,0.6)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}
```

**Step 3: Patikrinti build**

```bash
cd landing && bun run build
```
Expected: build sėkmingas, nėra klaidų

**Step 4: Commit**

```bash
git add landing/src/styles/ landing/tailwind.config.mjs landing/astro.config.mjs
git commit -m "feat(landing): add design system tokens and typography"
```

---

### Task 3: Layout komponentas (Navigation + Footer)

**Files:**
- Create: `landing/src/layouts/Layout.astro`
- Create: `landing/src/components/Nav.astro`
- Create: `landing/src/components/Footer.astro`

**Step 1: Sukurti Nav.astro**

```astro
---
// landing/src/components/Nav.astro
// Sticky glassmorphism navigation with CTA button
---
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4"
     style="backdrop-filter: blur(20px); background: rgba(13,15,20,0.8); border-bottom: 1px solid rgba(255,255,255,0.06);">
  <div class="max-w-6xl mx-auto flex items-center justify-between">
    <a href="/" class="flex items-center gap-2">
      <!-- Logo: tas pats SVG kaip frontend/public/favicon.svg -->
      <img src="/favicon.svg" alt="foxDoc logo" width="28" height="28" />
      <!-- Pavadinimas: mažoji "fox" + didžioji "Doc" — visada šis formatas -->
      <span class="font-heading text-xl font-bold text-white">fox<span class="text-primary">Doc</span></span>
    </a>

    <div class="hidden md:flex items-center gap-8">
      <a href="/features" class="text-sm text-text-secondary hover:text-white transition-colors">Funkcijos</a>
      <a href="/pricing" class="text-sm text-text-secondary hover:text-white transition-colors">Kainodara</a>
      <a href="/docs" class="text-sm text-text-secondary hover:text-white transition-colors">Dokumentacija</a>
      <a href="/forum" class="text-sm text-text-secondary hover:text-white transition-colors">Forumas</a>
    </div>

    <div class="flex items-center gap-3">
      <a href="https://app.foxdoc.io" class="hidden md:block text-sm text-text-secondary hover:text-white transition-colors">
        Prisijungti
      </a>
      <a href="https://app.foxdoc.io"
         class="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 text-bg-base bg-accent hover:shadow-[0_0_20px_rgba(0,202,136,0.4)]">
        Išbandyti nemokamai
      </a>
    </div>
  </div>
</nav>
```

**Step 1b: Sukurti MobileNav.astro (hamburger drawer)**

```astro
---
// landing/src/components/MobileNav.astro
// Mobile hamburger menu with slide-in drawer
---
<div class="md:hidden">
  <button id="menu-btn" class="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-bg-elevated transition-colors" aria-label="Atidaryti meniu">
    <svg id="icon-open" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <svg id="icon-close" width="20" height="20" viewBox="0 0 20 20" fill="none" class="hidden">
      <path d="M5 5l10 10M15 5L5 15" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  </button>
</div>

<!-- Drawer overlay -->
<div id="drawer-overlay" class="fixed inset-0 bg-black/60 z-40 hidden md:hidden" aria-hidden="true"></div>

<!-- Drawer -->
<div id="drawer" class="fixed top-0 right-0 bottom-0 w-72 bg-bg-surface border-l border-[rgba(255,255,255,0.08)] z-50 translate-x-full transition-transform duration-300 ease-in-out md:hidden flex flex-col p-6">
  <div class="flex justify-between items-center mb-8">
    <span class="font-serif text-xl font-bold">Fox<span class="text-accent">Doc</span></span>
    <button id="close-btn" class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-bg-elevated">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M4 4l10 10M14 4L4 14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>

  <nav class="flex flex-col gap-1 flex-1">
    <a href="/features" class="py-3 px-4 rounded-lg text-text-secondary hover:text-white hover:bg-bg-elevated transition-colors text-lg">Funkcijos</a>
    <a href="/pricing" class="py-3 px-4 rounded-lg text-text-secondary hover:text-white hover:bg-bg-elevated transition-colors text-lg">Kainodara</a>
    <a href="/use-cases" class="py-3 px-4 rounded-lg text-text-secondary hover:text-white hover:bg-bg-elevated transition-colors text-lg">Naudojimo atvejai</a>
    <a href="/docs" class="py-3 px-4 rounded-lg text-text-secondary hover:text-white hover:bg-bg-elevated transition-colors text-lg">Dokumentacija</a>
    <a href="/forum" class="py-3 px-4 rounded-lg text-text-secondary hover:text-white hover:bg-bg-elevated transition-colors text-lg">Forumas</a>
    <a href="/about" class="py-3 px-4 rounded-lg text-text-secondary hover:text-white hover:bg-bg-elevated transition-colors text-lg">Apie mus</a>
  </nav>

  <div class="space-y-3 mt-6">
    <a href="https://app.foxdoc.io/login" class="block w-full py-3 text-center border border-[rgba(255,255,255,0.12)] rounded-lg text-white hover:bg-bg-elevated transition-colors">
      Prisijungti
    </a>
    <a href="https://app.foxdoc.io" class="block w-full py-3 text-center font-semibold rounded-lg bg-accent text-bg-base">
      Išbandyti nemokamai
    </a>
  </div>
</div>

<script>
const btn = document.getElementById('menu-btn');
const closeBtn = document.getElementById('close-btn');
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('drawer-overlay');
const iconOpen = document.getElementById('icon-open');
const iconClose = document.getElementById('icon-close');

function openMenu() {
  drawer?.classList.remove('translate-x-full');
  overlay?.classList.remove('hidden');
  iconOpen?.classList.add('hidden');
  iconClose?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  drawer?.classList.add('translate-x-full');
  overlay?.classList.add('hidden');
  iconOpen?.classList.remove('hidden');
  iconClose?.classList.add('hidden');
  document.body.style.overflow = '';
}

btn?.addEventListener('click', openMenu);
closeBtn?.addEventListener('click', closeMenu);
overlay?.addEventListener('click', closeMenu);
</script>
```

Atnaujinti `Nav.astro` — importuoti `MobileNav` ir pridėti **sticky mobile CTA** juostą:

```astro
<!-- Po </nav> bloko, prieš uždarymą -->
<MobileNav />

<!-- Sticky mobile CTA (tik mobiliuose) -->
<div class="fixed bottom-0 left-0 right-0 p-4 md:hidden z-40"
     style="background: rgba(13,15,20,0.95); backdrop-filter: blur(16px); border-top: 1px solid rgba(255,255,255,0.08);">
  <a href="https://app.foxdoc.io"
     class="block w-full py-3 text-center font-semibold rounded-lg bg-accent text-bg-base">
    Išbandyti nemokamai
  </a>
</div>
```

**Step 2: Sukurti Footer.astro**

```astro
---
// landing/src/components/Footer.astro
// Site footer with navigation links and copyright
---
<footer class="border-t border-[rgba(255,255,255,0.08)] mt-24 py-12 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
      <div>
        <span class="font-serif text-lg font-bold">Fox<span class="text-accent">Doc</span></span>
        <p class="mt-2 text-sm text-text-secondary">Lietuvos viešųjų pirkimų AI analitikas.</p>
      </div>
      <div>
        <p class="text-sm font-semibold mb-3">Produktas</p>
        <div class="flex flex-col gap-2">
          <a href="/features" class="text-sm text-text-secondary hover:text-white transition-colors">Funkcijos</a>
          <a href="/pricing" class="text-sm text-text-secondary hover:text-white transition-colors">Kainodara</a>
          <a href="/use-cases" class="text-sm text-text-secondary hover:text-white transition-colors">Naudojimo atvejai</a>
        </div>
      </div>
      <div>
        <p class="text-sm font-semibold mb-3">Pagalba</p>
        <div class="flex flex-col gap-2">
          <a href="/docs" class="text-sm text-text-secondary hover:text-white transition-colors">Dokumentacija</a>
          <a href="/forum" class="text-sm text-text-secondary hover:text-white transition-colors">Forumas</a>
          <a href="/about" class="text-sm text-text-secondary hover:text-white transition-colors">Apie mus</a>
        </div>
      </div>
      <div>
        <p class="text-sm font-semibold mb-3">Teisinis</p>
        <div class="flex flex-col gap-2">
          <a href="/privacy" class="text-sm text-text-secondary hover:text-white transition-colors">Privatumo politika</a>
          <a href="/terms" class="text-sm text-text-secondary hover:text-white transition-colors">Naudojimo sąlygos</a>
        </div>
      </div>
    </div>
    <div class="border-t border-[rgba(255,255,255,0.08)] pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <p class="text-sm text-text-secondary">© 2026 FoxDoc. Visos teisės saugomos.</p>
      <p class="text-sm text-text-secondary">Sukurta Lietuvoje 🇱🇹</p>
    </div>
  </div>
</footer>
```

**Step 3: Sukurti Layout.astro**

```astro
---
// landing/src/layouts/Layout.astro
// Root layout wrapping all pages
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
}

const { title, description = 'Viešųjų pirkimų dokumentai analizuojami per 3 minutes su AI' } = Astro.props;
---
<!doctype html>
<html lang="lt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <title>{title} | FoxDoc</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body class="bg-bg-base text-white">
    <Nav />
    <main class="pt-20">
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

**Step 4: Patikrinti**

```bash
cd landing && bun run dev
```
Expected: puslapis rodomas su navigacija ir footer'iu

**Step 5: Commit**

```bash
git add landing/src/layouts/ landing/src/components/Nav.astro landing/src/components/Footer.astro
git commit -m "feat(landing): add layout, navigation and footer components"
```

---

### Task 4: Hero sekcija

**Files:**
- Create: `landing/src/components/sections/Hero.astro`
- Modify: `landing/src/pages/index.astro`

**Step 1: Sukurti Hero.astro**

```astro
---
// landing/src/components/sections/Hero.astro
// Main hero section with headline, CTA and animated product mockup
---
<section class="relative min-h-screen flex items-center px-6 overflow-hidden">
  <!-- Background gradient + dot grid -->
  <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#7c3aed22_0%,_transparent_60%)]"></div>
  <div class="absolute inset-0" style="background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 32px 32px;"></div>

  <div class="relative max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center py-24">
    <!-- Left: Text -->
    <div class="space-y-6">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono text-accent border border-accent/20 bg-accent/5">
        <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
        Naujausia versija — Claude Sonnet 4
      </div>

      <h1 class="font-serif text-5xl md:text-6xl font-bold leading-tight">
        Viešųjų pirkimų<br />
        <span class="text-accent">dokumentai</span> —<br />
        analizuojami per<br />
        <span class="text-accent">3 minutes</span>
      </h1>

      <p class="text-lg text-text-secondary leading-relaxed max-w-lg">
        FoxDoc naudoja AI kad automatiškai ištrauktų esminius duomenis iš bet kokio pirkimo dokumentų paketo. Sutaupykite <strong class="text-white">4–6 valandas</strong> per analizę.
      </p>

      <div class="flex flex-col sm:flex-row gap-4">
        <a href="https://app.foxdoc.io"
           class="px-6 py-3 font-semibold rounded-lg text-bg-base bg-accent hover:shadow-[0_0_30px_rgba(0,202,136,0.5)] transition-all duration-300 text-center">
          Išbandyti nemokamai
        </a>
        <a href="#how-it-works"
           class="px-6 py-3 font-semibold rounded-lg border border-[rgba(255,255,255,0.12)] text-white hover:bg-bg-elevated transition-all duration-300 text-center">
          Kaip veikia →
        </a>
      </div>

      <p class="text-sm text-text-secondary">3 kreditai nemokamai · Nereikia kredito kortelės</p>
    </div>

    <!-- Right: Product mockup -->
    <div class="relative">
      <div class="rounded-2xl p-6 border border-[rgba(255,255,255,0.1)]"
           style="background: rgba(255,255,255,0.04); backdrop-filter: blur(12px);">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-3 h-3 rounded-full bg-red-500/60"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-500/60"></div>
          <div class="w-3 h-3 rounded-full bg-green-500/60"></div>
          <span class="ml-2 text-xs font-mono text-text-secondary">ataskaita.pdf — FoxDoc</span>
        </div>
        <div class="space-y-3">
          <div class="h-4 bg-bg-elevated rounded w-3/4"></div>
          <div class="h-4 bg-bg-elevated rounded w-full"></div>
          <div class="h-4 bg-bg-elevated rounded w-5/6"></div>
          <div class="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <p class="text-xs font-mono text-accent">QA balas: 94/100 ✓</p>
          </div>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <div class="p-2 rounded bg-bg-elevated">
              <p class="text-xs text-text-secondary">CPV kodas</p>
              <p class="text-sm font-mono text-white">72200000-7</p>
            </div>
            <div class="p-2 rounded bg-bg-elevated">
              <p class="text-xs text-text-secondary">Vertė</p>
              <p class="text-sm font-mono text-white">€124,500</p>
            </div>
          </div>
        </div>
      </div>
      <!-- Glow behind mockup -->
      <div class="absolute -inset-4 bg-accent/5 rounded-3xl blur-2xl -z-10"></div>
    </div>
  </div>
</section>
```

**Step 2: Sukurti index.astro su Hero**

```astro
---
// landing/src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import Hero from '../components/sections/Hero.astro';
---
<Layout title="AI Viešųjų Pirkimų Analitikas">
  <Hero />
</Layout>
```

**Step 3: Patikrinti vizualiai**

```bash
cd landing && bun run dev
```
Atidaryti `http://localhost:4322` ir patikrinti hero sekcija

**Step 4: Commit**

```bash
git add landing/src/components/sections/Hero.astro landing/src/pages/index.astro
git commit -m "feat(landing): add hero section with product mockup"
```

---

### Task 5: Partnerių logotipai (marquee)

**Files:**
- Create: `landing/src/components/sections/Partners.astro`

**Step 1: Sukurti Partners.astro**

```astro
---
// landing/src/components/sections/Partners.astro
// Infinite scrolling partners/clients logo marquee
const partners = [
  { name: 'Vilniaus miesto savivaldybė', abbr: 'VMS' },
  { name: 'UAB Procurement Partners', abbr: 'PP' },
  { name: 'Viešųjų pirkimų tarnyba', abbr: 'VPT' },
  { name: 'Centrinė perkančioji organizacija', abbr: 'CPO' },
  { name: 'Audit & Legal Group', abbr: 'ALG' },
  { name: 'Baltic Procurement Solutions', abbr: 'BPS' },
];
---
<section class="py-16 px-6 border-y border-[rgba(255,255,255,0.06)]">
  <p class="text-center text-sm text-text-secondary mb-8">
    Pasitiki viešųjų pirkimų specialistai visoje Lietuvoje
  </p>
  <div class="relative overflow-hidden">
    <div class="flex gap-16 animate-marquee whitespace-nowrap">
      {[...partners, ...partners].map(p => (
        <div class="inline-flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity duration-300 cursor-default">
          <div class="w-8 h-8 rounded bg-bg-elevated flex items-center justify-center text-xs font-mono text-accent">
            {p.abbr.slice(0,2)}
          </div>
          <span class="text-sm font-medium text-text-secondary">{p.name}</span>
        </div>
      ))}
    </div>
  </div>
</section>

<style>
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-marquee {
  animation: marquee 30s linear infinite;
}
.animate-marquee:hover {
  animation-play-state: paused;
}
</style>
```

**Step 2: Pridėti į index.astro**

```astro
import Partners from '../components/sections/Partners.astro';
// Po <Hero />
<Partners />
```

**Step 3: Commit**

```bash
git add landing/src/components/sections/Partners.astro landing/src/pages/index.astro
git commit -m "feat(landing): add partners marquee section"
```

---

### Task 6: "Kaip veikia" sekcija

**Files:**
- Create: `landing/src/components/sections/HowItWorks.astro`

**Step 1: Sukurti HowItWorks.astro**

```astro
---
// landing/src/components/sections/HowItWorks.astro
// 3-step process explanation with scroll-triggered animations
const steps = [
  {
    number: '01',
    icon: '📁',
    title: 'Įkelkite dokumentus',
    description: 'Įkelkite PDF, DOCX, XLSX failus arba ZIP archyvą su visu pirkimo paketu. Palaikome iki 50+ dokumentų vienu metu.',
  },
  {
    number: '02',
    icon: '🤖',
    title: 'AI analizuoja',
    description: 'Dirbtinis intelektas automatiškai ištraukia CPV kodus, vertes, terminus, techninius reikalavimus ir kitus esminius duomenis.',
  },
  {
    number: '03',
    icon: '📊',
    title: 'Gaukite ataskaitą',
    description: 'Per 3 minutes gaunate struktūrizuotą ataskaitą su QA balu. Eksportuokite į PDF/DOCX arba klauskite papildomų klausimų.',
  },
];
---
<section id="how-it-works" class="py-24 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-16">
      <p class="text-accent text-sm font-mono mb-3">// kaip veikia</p>
      <h2 class="font-serif text-4xl md:text-5xl font-bold">3 žingsniai iki išsamios ataskaitos</h2>
    </div>

    <div class="grid md:grid-cols-3 gap-8">
      {steps.map((step, i) => (
        <div class="relative p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-bg-surface group hover:border-accent/30 hover:bg-bg-elevated transition-all duration-300 scroll-reveal"
             style={`animation-delay: ${i * 0.1}s`}>
          <div class="font-mono text-5xl font-bold text-accent/10 mb-4 group-hover:text-accent/20 transition-colors">
            {step.number}
          </div>
          <div class="text-3xl mb-3">{step.icon}</div>
          <h3 class="text-xl font-semibold mb-2">{step.title}</h3>
          <p class="text-text-secondary leading-relaxed">{step.description}</p>
          <!-- Glow on hover -->
          <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
               style="box-shadow: inset 0 0 30px rgba(0,202,136,0.05);"></div>
        </div>
      ))}
    </div>
  </div>
</section>

<style>
.scroll-reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.scroll-reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
</style>

<script>
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.1 });
document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
</script>
```

**Step 2: Pridėti į index.astro**

**Step 3: Commit**

```bash
git add landing/src/components/sections/HowItWorks.astro
git commit -m "feat(landing): add how it works section with scroll animations"
```

---

### Task 7: Use Cases bento grid

**Files:**
- Create: `landing/src/components/sections/UseCases.astro`

**Step 1: Sukurti UseCases.astro**

```astro
---
// landing/src/components/sections/UseCases.astro
// Use cases bento grid - 3 audience types with glow hover
const cases = [
  {
    icon: '🏛️',
    audience: 'Perkančios organizacijos',
    title: 'Greitai įvertinkite gautus pasiūlymus',
    description: 'Automatiškai palyginkite tiekėjų pasiūlymus pagal techninius reikalavimus, kainas ir terminus. Sumažinkite peržiūros laiką nuo dienų iki valandų.',
    tags: ['Pasiūlymų vertinimas', 'Atitikties tikrinimas', 'Ataskaitos'],
    href: '/use-cases#perkanciosios',
  },
  {
    icon: '📦',
    audience: 'Tiekėjai ir rangovai',
    title: 'Supraskite pirkimo sąlygas akimirksniu',
    description: 'Prieš teikdami pasiūlymą, per 3 minutes sužinokite visus techninius reikalavimus, terminus ir rizikos faktorius.',
    tags: ['Pirkimo analizė', 'Rizikos vertinimas', 'CPV kodai'],
    href: '/use-cases#tiekejai',
  },
  {
    icon: '🔍',
    audience: 'Auditoriai ir konsultantai',
    title: 'Tikrinkite pirkimų atitiktį reikalavimams',
    description: 'Sistemingai analizuokite pirkimų dokumentų paketus dėl procedūrinių klaidų ir neatitikčių teisės aktų reikalavimams.',
    tags: ['Auditas', 'Atitiktis', 'Dokumentacijos analizė'],
    href: '/use-cases#auditoriai',
  },
];
---
<section class="py-24 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-16">
      <p class="text-accent text-sm font-mono mb-3">// naudojimo atvejai</p>
      <h2 class="font-serif text-4xl md:text-5xl font-bold">Kas naudoja FoxDoc?</h2>
    </div>

    <div class="grid md:grid-cols-3 gap-6">
      {cases.map((c) => (
        <a href={c.href}
           class="group p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-bg-surface hover:border-accent/30 hover:bg-bg-elevated transition-all duration-300 flex flex-col">
          <div class="text-4xl mb-4">{c.icon}</div>
          <p class="text-xs font-mono text-accent mb-2">{c.audience}</p>
          <h3 class="text-xl font-semibold mb-3 group-hover:text-accent transition-colors">{c.title}</h3>
          <p class="text-text-secondary text-sm leading-relaxed flex-1">{c.description}</p>
          <div class="flex flex-wrap gap-2 mt-4">
            {c.tags.map(tag => (
              <span class="px-2 py-1 text-xs rounded-md bg-bg-elevated text-text-secondary border border-[rgba(255,255,255,0.06)]">
                {tag}
              </span>
            ))}
          </div>
          <p class="mt-4 text-sm text-accent opacity-0 group-hover:opacity-100 transition-opacity">Sužinoti daugiau →</p>
        </a>
      ))}
    </div>
  </div>
</section>
```

**Step 2: Pridėti į index.astro, commit**

```bash
git add landing/src/components/sections/UseCases.astro
git commit -m "feat(landing): add use cases bento grid section"
```

---

### Task 8: Atsiliepimai sekcija

**Files:**
- Create: `landing/src/components/sections/Testimonials.astro`

**Step 1: Sukurti Testimonials.astro**

```astro
---
// landing/src/components/sections/Testimonials.astro
// Customer testimonials with avatars and star ratings
const testimonials = [
  {
    name: 'Rūta Kazlauskienė',
    role: 'Viešųjų pirkimų specialistė',
    org: 'Vilniaus miesto savivaldybė',
    avatar: 'RK',
    text: 'FoxDoc sutaupė mums daugiau nei 3 valandas per kiekvieną didesnį pirkimą. Ataskaita yra tiksli ir visada randa tai, ką praleistume rankinės peržiūros metu.',
    stars: 5,
  },
  {
    name: 'Tomas Petraitis',
    role: 'Direktorius',
    org: 'UAB Baltic Procurement Solutions',
    avatar: 'TP',
    text: 'Kaip konsultantas dirbu su dešimtimis pirkimų paketu per mėnesį. FoxDoc tapo neatsiejama mano darbo dalimi — kokybės balas ypač vertingas.',
    stars: 5,
  },
  {
    name: 'Ieva Stankevičiūtė',
    role: 'Tiekimo vadybininkė',
    org: 'UAB TechnoGroup',
    avatar: 'IS',
    text: 'Prieš FoxDoc praleidavome dieną analizuodami pirkimo dokumentus. Dabar tai atlieka AI per minutes. Rekomenduoju visiems tiekėjams.',
    stars: 5,
  },
];
---
<section class="py-24 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-16">
      <p class="text-accent text-sm font-mono mb-3">// atsiliepimai</p>
      <h2 class="font-serif text-4xl md:text-5xl font-bold">Ką sako mūsų vartotojai</h2>
    </div>

    <div class="grid md:grid-cols-3 gap-6">
      {testimonials.map((t) => (
        <div class="p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-bg-surface hover:border-accent/20 transition-all duration-300">
          <div class="flex gap-1 mb-4">
            {Array(t.stars).fill(0).map(() => <span class="text-accent text-lg">★</span>)}
          </div>
          <p class="text-text-secondary leading-relaxed mb-6 italic">"{t.text}"</p>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-semibold text-accent">
              {t.avatar}
            </div>
            <div>
              <p class="font-semibold text-sm">{t.name}</p>
              <p class="text-xs text-text-secondary">{t.role}, {t.org}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

**Step 2: Pridėti į index.astro, commit**

```bash
git add landing/src/components/sections/Testimonials.astro
git commit -m "feat(landing): add testimonials section"
```

---

### Task 9: Kainodara (preview) su toggle

**Files:**
- Create: `landing/src/components/sections/PricingPreview.tsx` (React dėl toggle interaktyvumo)

**Step 1: Sukurti PricingPreview.tsx**

```tsx
// landing/src/components/sections/PricingPreview.tsx
// Pricing preview with monthly/annual toggle - React island for interactivity
import { useState } from 'react';

const plans = [
  { name: 'Free', monthly: 0, annual: 0, credits: '3 (vienkartiniai)', users: 1, highlight: false, cta: 'Pradėti' },
  { name: 'Starter', monthly: 19, annual: 16, credits: '20/mėn', users: 1, highlight: false, cta: 'Pradėti' },
  { name: 'Pro', monthly: 59, annual: 49, credits: '75/mėn', users: 3, highlight: true, cta: 'Išbandyti Pro' },
  { name: 'Team', monthly: 149, annual: 124, credits: '200/mėn', users: 10, highlight: false, cta: 'Pradėti' },
];

export default function PricingPreview() {
  const [annual, setAnnual] = useState(false);

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#00ca88] text-sm font-mono mb-3">// kainodara</p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold">Skaidri kainodara, nėra staigmenų</h2>
          <p className="text-[#a0aec0] mt-4">Kreditais pagrįsta sistema — mokate tik už tai, ką naudojate</p>

          <div className="inline-flex items-center gap-3 mt-6 p-1 rounded-lg bg-[#141720] border border-[rgba(255,255,255,0.08)]">
            <button onClick={() => setAnnual(false)}
              className={`px-4 py-2 text-sm rounded-md transition-all ${!annual ? 'bg-[#1a1f2e] text-white' : 'text-[#a0aec0]'}`}>
              Mėnesinis
            </button>
            <button onClick={() => setAnnual(true)}
              className={`px-4 py-2 text-sm rounded-md transition-all flex items-center gap-2 ${annual ? 'bg-[#1a1f2e] text-white' : 'text-[#a0aec0]'}`}>
              Metinis
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#00ca88]/20 text-[#00ca88]">-17%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {plans.map(plan => (
            <div key={plan.name}
              className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col
                ${plan.highlight
                  ? 'border-[#00ca88]/40 bg-[#00ca88]/5 shadow-[0_0_30px_rgba(0,202,136,0.1)]'
                  : 'border-[rgba(255,255,255,0.08)] bg-[#141720] hover:border-[rgba(255,255,255,0.15)]'}`}>
              {plan.highlight && (
                <p className="text-xs font-mono text-[#00ca88] mb-3">★ Populiariausias</p>
              )}
              <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold">
                  €{annual ? plan.annual : plan.monthly}
                </span>
                {plan.monthly > 0 && <span className="text-[#a0aec0] text-sm">/mėn</span>}
              </div>
              <div className="space-y-2 text-sm text-[#a0aec0] flex-1">
                <p>✓ {plan.credits} kreditų</p>
                <p>✓ {plan.users} {plan.users === 1 ? 'vartotojas' : 'vartotojai'}</p>
              </div>
              <a href={`https://app.foxdoc.io?plan=${plan.name.toLowerCase()}`}
                className={`mt-6 py-2.5 rounded-lg text-sm font-semibold text-center transition-all duration-300
                  ${plan.highlight
                    ? 'bg-[#00ca88] text-[#0d0f14] hover:shadow-[0_0_20px_rgba(0,202,136,0.4)]'
                    : 'border border-[rgba(255,255,255,0.12)] text-white hover:bg-[#1a1f2e]'}`}>
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <a href="/pricing" className="text-[#00ca88] text-sm hover:underline">
            Peržiūrėti visas kainas ir funkcijas →
          </a>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Pridėti į index.astro kaip React island**

```astro
import PricingPreview from '../components/sections/PricingPreview';
// ...
<PricingPreview client:load />
```

**Step 3: Commit**

```bash
git add landing/src/components/sections/PricingPreview.tsx
git commit -m "feat(landing): add pricing preview with monthly/annual toggle"
```

---

### Task 10: DUK akordeonas

**Files:**
- Create: `landing/src/components/sections/FAQ.astro`

**Step 1: Sukurti FAQ.astro**

```astro
---
// landing/src/components/sections/FAQ.astro
// FAQ accordion section with smooth expand/collapse animations
const faqs = [
  { q: 'Kaip veikia kreditų sistema?', a: 'Kiekviena analizė sunaudoja 1–5 kreditus priklausomai nuo dokumentų kiekio. 1–15 dokumentų = 1 kreditas, 16–50 dokumentų = 3 kreditai, 50+ dokumentų = 5 kreditai. Sistema praneša kreditų kainą prieš pradedant analizę.' },
  { q: 'Kokius dokumentų formatus palaiko FoxDoc?', a: 'Palaikome PDF, DOCX, XLSX failus ir ZIP archyvus su bet kokiu dokumentų deriniu. ZIP archyvai automatiškai išsklepiami ir visi viduje esantys dokumentai analizuojami.' },
  { q: 'Ar saugūs mano dokumentai?', a: 'Taip. Dokumentai perduodami per šifruotą HTTPS ryšį ir saugomi tik analizės metu. Po analizės failai automatiškai ištrinami iš serverio. Niekada nesidalijame Jūsų dokumentais su trečiosiomis šalimis.' },
  { q: 'Ar galiu naudoti nemokamai?', a: 'Taip! Nemokamas planas suteikia 3 kreditus vienkartinai — pakanka pilnai ataskaitai gauti. Nereikia kredito kortelės. Po kreditų panaudojimo galite rinktis mokamą planą.' },
  { q: 'Kiek laiko užtrunka analizė?', a: 'Paprastai 1–5 minutes priklausomai nuo dokumentų kiekio ir dydžio. Standartinis 10–15 dokumentų paketas analizuojamas per ~3 minutes.' },
  { q: 'Ar veikia su ZIP archyvais?', a: 'Taip, tai viena pagrindinių FoxDoc funkcijų. Galite įkelti visą pirkimo dokumentų paketą kaip ZIP — sistema automatiškai išsklepia ir analizuoja visus dokumentus.' },
  { q: 'Ar galiu eksportuoti ataskaitą?', a: 'Taip. Starter ir aukštesni planai leidžia eksportuoti ataskaitą PDF formatu. Pro ir aukštesni planai papildomai palaiko DOCX eksportą.' },
];
---
<section class="py-24 px-6">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-16">
      <p class="text-accent text-sm font-mono mb-3">// duk</p>
      <h2 class="font-serif text-4xl md:text-5xl font-bold">Dažni klausimai</h2>
    </div>

    <div class="space-y-3" id="faq-list">
      {faqs.map((faq, i) => (
        <div class="faq-item rounded-xl border border-[rgba(255,255,255,0.08)] bg-bg-surface overflow-hidden">
          <button class="faq-btn w-full flex items-center justify-between px-6 py-4 text-left hover:bg-bg-elevated transition-colors duration-200"
                  data-index={i}>
            <span class="font-medium">{faq.q}</span>
            <span class="faq-icon text-accent text-xl transition-transform duration-300">+</span>
          </button>
          <div class="faq-content max-h-0 overflow-hidden transition-all duration-300">
            <p class="px-6 pb-4 text-text-secondary leading-relaxed">{faq.a}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>

<script>
document.querySelectorAll('.faq-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const content = item?.querySelector('.faq-content') as HTMLElement;
    const icon = btn.querySelector('.faq-icon');
    const isOpen = content?.style.maxHeight !== '0px' && content?.style.maxHeight !== '';

    // Close all
    document.querySelectorAll('.faq-content').forEach((c: Element) => {
      (c as HTMLElement).style.maxHeight = '0px';
    });
    document.querySelectorAll('.faq-icon').forEach(i => {
      i.textContent = '+';
      (i as HTMLElement).style.transform = 'rotate(0deg)';
    });

    // Open clicked if was closed
    if (!isOpen && content && icon) {
      content.style.maxHeight = content.scrollHeight + 'px';
      icon.textContent = '−';
    }
  });
});
</script>
```

**Step 2: Pridėti į index.astro, commit**

```bash
git add landing/src/components/sections/FAQ.astro
git commit -m "feat(landing): add FAQ accordion section"
```

---

### Task 11: Finalinis CTA + index.astro surinkimas

**Files:**
- Create: `landing/src/components/sections/FinalCTA.astro`
- Modify: `landing/src/pages/index.astro`

**Step 1: Sukurti FinalCTA.astro**

```astro
---
// landing/src/components/sections/FinalCTA.astro
// Final conversion section with gradient background
---
<section class="py-24 px-6 mx-6 mb-6 rounded-3xl"
         style="background: linear-gradient(135deg, #7c3aed22, #00ca8822); border: 1px solid rgba(0,202,136,0.2);">
  <div class="max-w-2xl mx-auto text-center">
    <h2 class="font-serif text-4xl md:text-5xl font-bold mb-4">
      Pradėkite taupyti laiką šiandien
    </h2>
    <p class="text-text-secondary text-lg mb-8">
      3 kreditai nemokamai. Nereikia kredito kortelės. Pirmą ataskaitą gausite per 3 minutes.
    </p>
    <a href="https://app.foxdoc.io"
       class="inline-block px-8 py-4 font-semibold rounded-lg text-bg-base bg-accent hover:shadow-[0_0_40px_rgba(0,202,136,0.5)] transition-all duration-300 text-lg">
      Išbandyti nemokamai →
    </a>
    <p class="mt-4 text-sm text-text-secondary">
      Jau turi paskyrą? <a href="https://app.foxdoc.io/login" class="text-accent hover:underline">Prisijungti</a>
    </p>
  </div>
</section>
```

**Step 2: Surinkti pilną index.astro**

```astro
---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/sections/Hero.astro';
import Partners from '../components/sections/Partners.astro';
import HowItWorks from '../components/sections/HowItWorks.astro';
import UseCases from '../components/sections/UseCases.astro';
import Testimonials from '../components/sections/Testimonials.astro';
import PricingPreview from '../components/sections/PricingPreview';
import FAQ from '../components/sections/FAQ.astro';
import FinalCTA from '../components/sections/FinalCTA.astro';
---
<Layout title="AI Viešųjų Pirkimų Analitikas">
  <Hero />
  <Partners />
  <HowItWorks />
  <UseCases />
  <Testimonials />
  <PricingPreview client:load />
  <FAQ />
  <FinalCTA />
</Layout>
```

**Step 3: Pilnas patikrinimas**

```bash
cd landing && bun run build && bun run preview
```
Expected: build sėkmingas, puslapis rodomas pilnai

**Step 4: Commit**

```bash
git add landing/src/components/sections/FinalCTA.astro landing/src/pages/index.astro
git commit -m "feat(landing): complete landing page assembly"
```

---

### Task 12: /pricing puslapis

**Files:**
- Create: `landing/src/pages/pricing.astro`
- Create: `landing/src/components/sections/PricingFull.tsx`

**Step 1: Sukurti pilną kainų puslapį su visomis eilutėmis**

PricingFull.tsx — pilna lentelė su visomis plan funkcijomis (✓/✗), add-on kreditų paketai, metinis/mėnesinis toggle.

Šaltinis: `docs/plans/2026-02-25-business-model-design.md`

**Step 2: pricing.astro**

```astro
---
import Layout from '../layouts/Layout.astro';
import PricingFull from '../components/sections/PricingFull';
---
<Layout title="Kainodara">
  <PricingFull client:load />
</Layout>
```

**Step 3: Commit**

```bash
git commit -m "feat(landing): add full pricing page"
```

---

### Task 13: /features, /use-cases, /about puslapiai

**Files:**
- Create: `landing/src/pages/features.astro`
- Create: `landing/src/pages/use-cases.astro`
- Create: `landing/src/pages/about.astro`

Kiekvienam puslapiui — Layout wrapper + sekcijų komponentai su detaliu turiniu pagal dizaino dokumentą.

**Commit po kiekvieno puslapio.**

---

### Task 14: /docs puslapis (bazinė struktūra)

**Files:**
- Create: `landing/src/pages/docs/index.astro`
- Create: `landing/src/pages/docs/getting-started.astro`
- Create: `landing/src/pages/docs/credits.astro`
- Create: `landing/src/layouts/DocsLayout.astro`

DocsLayout.astro — sidebar su navigacija + turinys šalia.

```bash
git commit -m "feat(landing): add docs section with sidebar layout"
```

---

### Task 15: /forum puslapis (bazinė struktūra)

**Files:**
- Create: `landing/src/pages/forum/index.astro`
- Create: `landing/src/pages/forum/[category].astro`

Forum puslapis — statinė struktūra su kategorijomis. Realus funkcionalumas (komentarai, balsavimas) — atskiras uždavinys Convex integracijai.

```bash
git commit -m "feat(landing): add forum page basic structure"
```

---

### Task 16: Vercel konfigūracija

**Files:**
- Create: `landing/vercel.json`
- Create: `landing/.vercelignore`

**Step 1: Sukurti vercel.json**

```json
{
  "buildCommand": "bun run build",
  "outputDirectory": "dist",
  "installCommand": "bun install",
  "framework": "astro"
}
```

**Step 2: Vercel dashboard konfigūracija (rankinė)**

1. Eiti į vercel.com → "Add New Project"
2. Import `foxdoc` GitHub repo
3. **Root Directory:** `landing`
4. **Build Command:** `bun run build`
5. **Output Directory:** `dist`
6. Pridėti ENV: `PUBLIC_APP_URL=https://app.foxdoc.io`
7. Domains → Pridėti `foxdoc.io`

**Step 3: Ignored Build Step konfigūracija**

Vercel → Project Settings → Git → Ignored Build Step:
```bash
git diff HEAD^ HEAD --quiet -- landing/
```

**Step 4: Commit**

```bash
git add landing/vercel.json
git commit -m "feat(landing): add Vercel configuration"
```

---

### Task 17: Galutinis patikrinimas

**Step 1: Build patikrinimas**

```bash
cd landing && bun run build
```
Expected: `dist/` katalogas sukurtas, nėra TypeScript klaidų

**Step 2: Preview patikrinimas**

```bash
cd landing && bun run preview
```
Patikrinti visus puslapius:
- `/` — landing page pilnas
- `/pricing` — kainodara
- `/features` — funkcijos
- `/use-cases` — naudojimo atvejai
- `/docs` — dokumentacija
- `/forum` — forumas
- `/about` — apie mus

**Step 3: Mobile responsiveness**

Chrome DevTools → Toggle device toolbar → patikrinti mobilioje versijoje

**Step 4: Galutinis commit**

```bash
git add .
git commit -m "feat(landing): complete foxdoc.io landing site"
```
