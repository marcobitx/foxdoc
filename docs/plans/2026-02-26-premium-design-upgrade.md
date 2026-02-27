# foxDoc Landing Page Premium Design Upgrade

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade all landing pages to premium quality — distinct section background tones for scroll rhythm, smaller minimal buttons, and unique card layouts that create maximum contrast and clarity.

**Architecture:** Three-layer approach: (1) global design tokens for section backgrounds, (2) component-level layout redesigns for HowItWorks/UseCases/Testimonials, (3) consistent application across all sub-pages. No animation effects — pure color contrast and layout clarity.

**Tech Stack:** Astro 5, React (PricingFull.tsx/PricingPreview.tsx), inline CSS (no Tailwind classes for layout specifics), `bun run build` for verification.

---

## Background Color System

The section backgrounds must alternate to create visual rhythm when scrolling. Darker = more important/focused. Lighter = supporting content.

| Token name | Hex | Purpose |
|---|---|---|
| `bg-deep` | `#0d0a08` | Highest focus: Pricing, Partners |
| `bg-base` | `#1a1512` | Default: Hero, FAQ, Testimonials |
| `bg-warm` | `#1e1a16` | Supporting: HowItWorks, sub-page sections |
| `bg-surface` | `#231c18` | Cards, elevated elements (unchanged) |

**Scroll rhythm for index page:**
Hero (`#1a1512`) → Partners (`#0d0a08`) → HowItWorks (`#1e1a16`) → UseCases (`#0d0a08`) → Testimonials (`#1a1512`) → Pricing (`#0d0a08`) → FAQ (`#1e1a16`) → CTA (`#0d0a08` + amber overlay)

**Button changes:**
- `btn-primary`: `py-2 px-5 text-sm` (was `py-3 px-6`) — drop `min-height: 44px`
- `btn-secondary`: same reduction
- All inline button styles across sub-pages: same reduction

---

## Task 1: Update global.css — background tokens + button sizes

**Files:**
- Modify: `landing/src/styles/global.css`

**Context:** global.css uses `@theme {}` block (Tailwind CSS v4). Buttons currently use `.btn-primary` / `.btn-secondary` classes. All pages inherit these classes. Changing the classes here will propagate everywhere that uses `class="btn-primary"`.

**Step 1: Add background tokens to `@theme {}`**

In `landing/src/styles/global.css`, inside the `@theme {}` block (after `--color-accent-subtle`), add:

```css
  /* ── SECTION BACKGROUNDS ── */
  --bg-deep:    #0d0a08;
  --bg-base:    #1a1512;
  --bg-warm:    #1e1a16;
  --bg-surface: #231c18;
```

**Step 2: Reduce button sizes**

Replace the `.btn-primary` block:

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f59e0b;
  color: #1a1512;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  transition: box-shadow 0.2s ease, background 0.2s ease;
  text-decoration: none;
}
.btn-primary:hover {
  background: #d97706;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
}
```

Replace the `.btn-secondary` block:

```css
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(168, 162, 158, 0.25);
  color: #ede5df;
  font-weight: 500;
  font-size: 0.875rem;
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
  text-decoration: none;
}
.btn-secondary:hover {
  background: rgba(168,162,158,0.08);
  border-color: rgba(168,162,158,0.4);
}
```

**Step 3: Build verification**

```bash
cd landing && /c/Users/nj/.bun/bin/bun run build 2>&1 | tail -5
```
Expected: `14 page(s) built` with no errors.

**Step 4: Commit**

```bash
git add landing/src/styles/global.css
git commit -m "design: reduce button size, add section bg tokens"
```

---

## Task 2: Apply section backgrounds to index page sections

**Files:**
- Modify: `landing/src/components/sections/Partners.astro`
- Modify: `landing/src/components/sections/HowItWorks.astro`
- Modify: `landing/src/components/sections/UseCases.astro`
- Modify: `landing/src/components/sections/Testimonials.astro`
- Modify: `landing/src/components/sections/FAQ.astro`
- Modify: `landing/src/components/sections/FinalCTA.astro`
- Modify: `landing/src/components/sections/PricingPreview.tsx`

**Context:** Each section currently has `<section class="py-16 sm:py-24 px-4 sm:px-6">` with no background color — they all inherit `#1a1512` from `html {}`. Add `style="background: #xxx;"` to each section's outer element.

**Current scroll rhythm:** All same `#1a1512`.
**Target scroll rhythm:** different per section (see table in header).

### Partners.astro

The `<section>` opening tag — add style attribute:

```astro
<section class="py-10 sm:py-14 px-4 sm:px-6" style="background: #0d0a08;">
```

Note: also reduce vertical padding (py-10 instead of py-16) — partners/logos section should be compact.

### HowItWorks.astro

```astro
<section id="how-it-works" class="py-16 sm:py-24 px-4 sm:px-6" style="background: #1e1a16;">
```

### UseCases.astro

```astro
<section class="py-16 sm:py-24 px-4 sm:px-6" style="background: #0d0a08;">
```

### Testimonials.astro

```astro
<section class="py-16 sm:py-24 px-4 sm:px-6" style="background: #1a1512;">
```

### FAQ.astro

Read `landing/src/components/sections/FAQ.astro` first to find the outer `<section>` tag. Add:

```astro
<section class="..." style="background: #1e1a16;">
```

### FinalCTA.astro

Read `landing/src/components/sections/FinalCTA.astro` first. The outer section should have:

```astro
<section class="..." style="background: #0d0a08;">
```

The inner gradient container stays as-is (already has amber gradient overlay).

### PricingPreview.tsx (React)

Read `landing/src/components/sections/PricingPreview.tsx`. Find the outermost `<section>` or `<div>` wrapper. Change its background to `#0d0a08`. Example:

```tsx
<section style={{ background: '#0d0a08', padding: '5rem 1.5rem' }}>
```

**Step: Build verification**

```bash
cd landing && /c/Users/nj/.bun/bin/bun run build 2>&1 | tail -5
```
Expected: `14 page(s) built`.

**Step: Commit**

```bash
git add landing/src/components/sections/
git commit -m "design: apply section background rhythm to index page"
```

---

## Task 3: Redesign HowItWorks — numbered list style

**Files:**
- Modify: `landing/src/components/sections/HowItWorks.astro`

**Context:** Currently 3 identical `#231c18` bordered cards. Goal: replace with a clean numbered layout — no card boxes, just step number + title + description. Steps connected visually by a horizontal line (desktop) or left border line (mobile).

**New layout:**

```astro
---
// src/components/sections/HowItWorks.astro
// 3-step process — numbered list with amber accent, no card boxes
const steps = [
  {
    num: '01',
    title: 'Įkelkite dokumentus',
    desc: 'Įkelkite PDF, DOCX, XLSX failus arba ZIP archyvą su visu pirkimo paketu. Palaikome iki 50+ dokumentų vienu metu.',
  },
  {
    num: '02',
    title: 'AI analizuoja',
    desc: 'Dirbtinis intelektas automatiškai ištraukia CPV kodus, vertes, terminus, techninius reikalavimus ir kitus esminius duomenis.',
  },
  {
    num: '03',
    title: 'Gaukite ataskaitą',
    desc: 'Per 3 minutes gaunate struktūrizuotą ataskaitą su QA balu. Eksportuokite į PDF/DOCX arba klauskite papildomų klausimų.',
  },
];
---
<section id="how-it-works" class="py-16 sm:py-24 px-4 sm:px-6" style="background: #1e1a16;">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-12 sm:mb-16">
      <p class="text-xs sm:text-sm font-mono mb-3" style="color: #f59e0b;">// kaip veikia</p>
      <h2 class="font-heading font-bold" style="color: #fdf9f7;">3 žingsniai iki išsamios ataskaitos</h2>
    </div>

    <!-- Desktop: horizontal row; Mobile: vertical stack -->
    <div class="flex flex-col md:flex-row md:divide-x" style="border-color: rgba(168,162,158,0.12);">
      {steps.map((step, i) => (
        <div class="scroll-reveal flex-1 flex flex-col px-0 md:px-10 py-8 md:py-0 first:pl-0 last:pr-0"
             style={`transition-delay: ${i * 100}ms; ${i > 0 ? 'border-top: 1px solid rgba(168,162,158,0.12);' : ''}`}>
          <!-- Number -->
          <div class="font-mono font-bold mb-5" style="font-size: 3rem; line-height: 1; color: rgba(245, 158, 11, 0.25);">{step.num}</div>
          <!-- Amber divider line -->
          <div class="w-8 h-0.5 mb-5" style="background: #f59e0b;"></div>
          <h3 class="font-heading font-semibold mb-3" style="font-size: 1.125rem; color: #fdf9f7;">{step.title}</h3>
          <p class="text-sm leading-relaxed" style="color: #b5a99f;">{step.desc}</p>
        </div>
      ))}
    </div>
  </div>
</section>

<script>
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
</script>
```

Note: on mobile, `md:divide-x` won't apply, so add `border-top` conditionally via `style`. The `first:pl-0 last:pr-0` Tailwind classes handle horizontal padding on desktop.

**Step: Build + verify**

```bash
cd landing && /c/Users/nj/.bun/bin/bun run build 2>&1 | tail -5
```

**Step: Commit**

```bash
git add landing/src/components/sections/HowItWorks.astro
git commit -m "design: redesign HowItWorks as numbered list (no card boxes)"
```

---

## Task 4: Redesign UseCases — asymmetric bento layout

**Files:**
- Modify: `landing/src/components/sections/UseCases.astro`

**Context:** Currently 3 equal `md:grid-cols-3` cards. Goal: asymmetric bento — on desktop: first card takes left 55%, the other two stack on the right 45%. This creates visual hierarchy (first audience = most important).

**New layout:**

```astro
---
// src/components/sections/UseCases.astro
// Bento grid — asymmetric: 1 large card left + 2 smaller stacked right
const cases = [
  {
    icon: '🏛️',
    tag: 'Perkančios organizacijos',
    title: 'Greitai įvertinkite gautus pasiūlymus',
    desc: 'Automatiškai palyginkite tiekėjų pasiūlymus pagal techninius reikalavimus, kainas ir terminus. Sumažinkite peržiūros laiką nuo dienų iki valandų.',
    tags: ['Pasiūlymų vertinimas', 'Atitikties tikrinimas', 'Ataskaitos'],
    href: '/use-cases#perkanciosios',
    large: true,
  },
  {
    icon: '📦',
    tag: 'Tiekėjai ir rangovai',
    title: 'Supraskite pirkimo sąlygas akimirksniu',
    desc: 'Prieš teikdami pasiūlymą, per 3 minutes sužinokite visus techninius reikalavimus, terminus ir rizikos faktorius.',
    tags: ['Pirkimo analizė', 'Rizikos vertinimas', 'CPV kodai'],
    href: '/use-cases#tiekejai',
    large: false,
  },
  {
    icon: '🔍',
    tag: 'Auditoriai ir konsultantai',
    title: 'Tikrinkite pirkimų atitiktį reikalavimams',
    desc: 'Sistemingai analizuokite pirkimų dokumentų paketus dėl procedūrinių klaidų ir neatitikčių teisės aktų reikalavimams.',
    tags: ['Auditas', 'Atitiktis', 'Dokumentacijos analizė'],
    href: '/use-cases#auditoriai',
    large: false,
  },
];
---
<section class="py-16 sm:py-24 px-4 sm:px-6" style="background: #0d0a08;">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-12 sm:mb-16">
      <p class="text-xs sm:text-sm font-mono mb-3" style="color: #f59e0b;">// naudojimo atvejai</p>
      <h2 class="font-heading font-bold" style="color: #fdf9f7;">Kas naudoja foxDoc?</h2>
    </div>

    <!-- Asymmetric bento: [large | small+small] -->
    <div class="flex flex-col md:grid gap-4" style="grid-template-columns: 1fr 0.75fr;">
      <!-- Large card (first audience) -->
      <a href={cases[0].href}
         class="scroll-reveal group flex flex-col p-7 rounded-2xl border transition-colors duration-200"
         style="border-color: rgba(168,162,158,0.12); background: #1a1512; text-decoration: none; min-height: 320px;"
         onmouseover="this.style.borderColor='rgba(245,158,11,0.2)'"
         onmouseout="this.style.borderColor='rgba(168,162,158,0.12)'">
        <span class="text-4xl mb-5">{cases[0].icon}</span>
        <p class="text-xs font-mono mb-2" style="color: #f59e0b;">{cases[0].tag}</p>
        <h3 class="font-heading font-semibold mb-4" style="font-size: 1.25rem; color: #fdf9f7; line-height: 1.35;">{cases[0].title}</h3>
        <p class="text-sm leading-relaxed flex-1" style="color: #b5a99f;">{cases[0].desc}</p>
        <div class="flex flex-wrap gap-2 mt-5">
          {cases[0].tags.map(t => (
            <span class="px-2 py-1 text-xs rounded" style="background: rgba(168,162,158,0.08); color: #b5a99f; border: 1px solid rgba(168,162,158,0.12);">{t}</span>
          ))}
        </div>
        <p class="mt-5 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity" style="color: #f59e0b;">Sužinoti daugiau →</p>
      </a>

      <!-- Right column: two smaller cards stacked -->
      <div class="flex flex-col gap-4">
        {cases.slice(1).map((c, i) => (
          <a href={c.href}
             class="scroll-reveal group flex flex-col p-5 rounded-2xl border transition-colors duration-200 flex-1"
             style={`border-color: rgba(168,162,158,0.12); background: #1a1512; text-decoration: none; transition-delay: ${(i+1) * 80}ms;`}
             onmouseover="this.style.borderColor='rgba(245,158,11,0.2)'"
             onmouseout="this.style.borderColor='rgba(168,162,158,0.12)'">
            <span class="text-2xl mb-3">{c.icon}</span>
            <p class="text-xs font-mono mb-1" style="color: #f59e0b;">{c.tag}</p>
            <h3 class="font-heading font-semibold mb-2" style="font-size: 1rem; color: #fdf9f7; line-height: 1.35;">{c.title}</h3>
            <p class="text-sm leading-relaxed flex-1" style="color: #b5a99f; font-size: 0.8125rem;">{c.desc}</p>
            <p class="mt-3 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style="color: #f59e0b;">Sužinoti daugiau →</p>
          </a>
        ))}
      </div>
    </div>
  </div>
</section>

<script>
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
</script>
```

**Step: Build + verify**

```bash
cd landing && /c/Users/nj/.bun/bin/bun run build 2>&1 | tail -5
```

**Step: Commit**

```bash
git add landing/src/components/sections/UseCases.astro
git commit -m "design: redesign UseCases as asymmetric bento (1 large + 2 small)"
```

---

## Task 5: Redesign Testimonials — featured quote layout

**Files:**
- Modify: `landing/src/components/sections/Testimonials.astro`

**Context:** Currently 3 equal cards. Goal: first testimonial is featured (full width, large quote, large quotation mark), next two are smaller below. This creates hierarchy and makes the most impactful testimonial shine.

**New layout:**

```astro
---
// src/components/sections/Testimonials.astro
// Featured testimonial (full width) + 2 smaller below
const testimonials = [
  {
    name: 'Rūta Kazlauskienė',
    role: 'Viešųjų pirkimų specialistė',
    org: 'Vilniaus miesto savivaldybė',
    initials: 'RK',
    text: 'foxDoc sutaupė mums daugiau nei 3 valandas per kiekvieną didesnį pirkimą. Ataskaita tiksli ir visada randa tai, ką praleistume rankinės peržiūros metu.',
    stars: 5,
    featured: true,
  },
  {
    name: 'Tomas Petraitis',
    role: 'Direktorius',
    org: 'UAB Baltic Procurement Solutions',
    initials: 'TP',
    text: 'Kaip konsultantas dirbu su dešimtimis pirkimų paketų per mėnesį. foxDoc tapo neatsiejama darbo dalimi — QA kokybės balas ypač vertingas.',
    stars: 5,
    featured: false,
  },
  {
    name: 'Ieva Stankevičiūtė',
    role: 'Tiekimo vadybininkė',
    org: 'UAB TechnoGroup',
    initials: 'IS',
    text: 'Prieš foxDoc praleidavome dieną analizuodami pirkimo dokumentus. Dabar tai atlieka AI per 3 minutes. Rekomenduoju visiems tiekėjams.',
    stars: 5,
    featured: false,
  },
];
const featured = testimonials[0];
const supporting = testimonials.slice(1);
---
<section class="py-16 sm:py-24 px-4 sm:px-6" style="background: #1a1512;">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-12 sm:mb-16">
      <p class="text-xs sm:text-sm font-mono mb-3" style="color: #f59e0b;">// atsiliepimai</p>
      <h2 class="font-heading font-bold" style="color: #fdf9f7;">Ką sako mūsų vartotojai</h2>
    </div>

    <!-- Featured testimonial -->
    <div class="scroll-reveal mb-4 p-8 sm:p-10 rounded-2xl border" style="border-color: rgba(168,162,158,0.15); background: #231c18;">
      <div class="flex gap-0.5 mb-5">
        {Array.from({length: featured.stars}).map(() => (
          <span style="color: #f59e0b; font-size: 1rem;">★</span>
        ))}
      </div>
      <!-- Large quotation mark -->
      <p class="font-heading font-bold mb-5 leading-snug"
         style="font-size: clamp(1.1rem, 2.5vw, 1.5rem); color: #fdf9f7; max-width: 48rem;">
        "{featured.text}"
      </p>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
             style="background: rgba(245,158,11,0.15); color: #f59e0b;">{featured.initials}</div>
        <div>
          <p class="text-sm font-semibold" style="color: #fdf9f7;">{featured.name}</p>
          <p class="text-xs" style="color: #6d5f55;">{featured.role}, {featured.org}</p>
        </div>
      </div>
    </div>

    <!-- Two supporting testimonials -->
    <div class="flex flex-col sm:grid sm:grid-cols-2 gap-4">
      {supporting.map((t, i) => (
        <div class="scroll-reveal p-5 sm:p-6 rounded-2xl border" style={`border-color: rgba(168,162,158,0.12); background: #1e1a16; transition-delay: ${(i+1)*80}ms;`}>
          <div class="flex gap-0.5 mb-3">
            {Array.from({length: t.stars}).map(() => (
              <span style="color: rgba(245,158,11,0.6); font-size: 0.75rem;">★</span>
            ))}
          </div>
          <p class="text-sm leading-relaxed italic mb-4" style="color: #b5a99f;">"{t.text}"</p>
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                 style="background: rgba(245,158,11,0.1); color: #f59e0b;">{t.initials}</div>
            <div>
              <p class="text-xs font-semibold" style="color: #ede5df;">{t.name}</p>
              <p style="font-size: 0.7rem; color: #6d5f55;">{t.role}, {t.org}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>

<script>
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
</script>
```

**Step: Build + verify**

```bash
cd landing && /c/Users/nj/.bun/bin/bun run build 2>&1 | tail -5
```

**Step: Commit**

```bash
git add landing/src/components/sections/Testimonials.astro
git commit -m "design: redesign Testimonials as featured quote + 2 supporting"
```

---

## Task 6: Apply background colors to sub-pages

**Files:**
- Modify: `landing/src/pages/features.astro`
- Modify: `landing/src/pages/use-cases.astro`
- Modify: `landing/src/pages/about.astro`
- Modify: `landing/src/pages/pricing.astro`

**Context:** Sub-pages currently have all sections/divs with the same background. The goal is visual hierarchy: header section on dark bg, content sections on lighter bg, alternating where applicable.

**features.astro:**
- Outer wrapper div: `style="background: #1a1512;"` (it already has `max-width` wrapper, this needs to be on the full-width section)
- Actually: wrap the header in a `<div style="background: #0d0a08; padding: ...">`  and the grid in `<div style="background: #1e1a16; padding: ...">` and the CTA in `<div style="background: #0d0a08; padding: ...">`. Read the file first to see the actual structure.

**General approach for all sub-pages:**
1. Read the file to understand current structure
2. Apply:
   - Page header/hero area: `#0d0a08` (focused, dark)
   - Content grid area: `#1e1a16` (warm, readable)
   - CTA section: `#0d0a08` + amber gradient overlay

**For features.astro specifically:**

Replace the outer div that wraps everything:
```astro
<Layout title="Funkcijos — foxDoc">
  <!-- Header: dark focus -->
  <div style="background: #0d0a08; padding: 5rem 1.5rem 3rem;">
    <div style="max-width: 72rem; margin: 0 auto; text-align: center;">
      <!-- header content (tagline, h1, p) — copy from current -->
    </div>
  </div>
  <!-- Feature grid: warm -->
  <div style="background: #1e1a16; padding: 3rem 1.5rem 5rem;">
    <div style="max-width: 72rem; margin: 0 auto;">
      <!-- features grid — copy from current -->
    </div>
  </div>
  <!-- CTA: dark focus -->
  <div style="background: #0d0a08; padding: 3rem 1.5rem 5rem;">
    <div style="max-width: 72rem; margin: 0 auto;">
      <!-- CTA block — copy from current -->
    </div>
  </div>
</Layout>
```

Apply same pattern to `use-cases.astro`, `about.astro`.

For `pricing.astro`: it uses `<PricingFull client:load />` — the bg is handled inside the component.

**Button inline styles:** Wherever sub-pages have inline button styles (not using `.btn-primary` class), reduce padding. Find by reading each file and looking for `padding: 0.875rem 2rem` or similar. Replace with `padding: 0.5rem 1.25rem; font-size: 0.875rem;`.

**Step: Build + verify**

```bash
cd landing && /c/Users/nj/.bun/bin/bun run build 2>&1 | tail -5
```

**Step: Commit**

```bash
git add landing/src/pages/
git commit -m "design: apply section bg system to sub-pages, reduce inline button sizes"
```

---

## Task 7: Update PricingFull.tsx and PricingPreview.tsx backgrounds

**Files:**
- Modify: `landing/src/components/sections/PricingFull.tsx`
- Modify: `landing/src/components/sections/PricingPreview.tsx`

**Context:** These React components have their own inline styles. Need to:
1. Set section background to `#0d0a08`
2. Reduce button padding inside the components (find `padding: '0.875rem 2rem'` etc.)

**Read files first**, then:

In `PricingFull.tsx`:
- Find the outermost div/section style and set `background: '#0d0a08'`
- Find all button inline styles — reduce to `padding: '0.5rem 1.25rem', fontSize: '0.875rem'`
- Remove `minHeight: '44px'` from buttons

In `PricingPreview.tsx`:
- Same: outermost wrapper background `#0d0a08`
- Reduce button sizes

**Step: Build + verify**

```bash
cd landing && /c/Users/nj/.bun/bin/bun run build 2>&1 | tail -5
```

**Step: Commit**

```bash
git add landing/src/components/sections/PricingFull.tsx landing/src/components/sections/PricingPreview.tsx
git commit -m "design: pricing components dark bg + smaller buttons"
```

---

## Task 8: Update docs and forum pages backgrounds

**Files:**
- Modify: `landing/src/layouts/DocsLayout.astro`
- Modify: `landing/src/pages/forum/index.astro`
- Modify: `landing/src/pages/forum/[category].astro`

**Context:** DocsLayout has its own sidebar layout. The sidebar should be `#130f0c` (slightly darker than content area). Content area stays `#1a1512`. Forum pages: header `#0d0a08`, content `#1e1a16`.

**DocsLayout.astro:**

Read the file first. Find the sidebar div and set `background: #130f0c`. The main content area stays at `#1a1512`. This creates contrast between sidebar and content.

**forum/index.astro:**
- Categories list section → wrap in `background: #1e1a16`
- Newsletter CTA → `background: #0d0a08`
- Reduce button styles in the forum coming-soon button

**forum/[category].astro:**
- Outer div → `background: #1e1a16`
- Coming-soon card → `background: #231c18` (already is)

**Step: Build + verify**

```bash
cd landing && /c/Users/nj/.bun/bin/bun run build 2>&1 | tail -5
```

**Step: Commit**

```bash
git add landing/src/layouts/DocsLayout.astro landing/src/pages/forum/
git commit -m "design: apply bg system to docs layout and forum pages"
```

---

## Task 9: Final verification — screenshots at key viewports

**Context:** After all changes, run responsive screenshot tests to verify the visual improvements.

**Step: Run screenshot script**

```bash
cd /c/Users/nj/projects/foxdoc/.worktrees/feat-landing

# Start dev server in background
/c/Users/nj/.bun/bin/bun run --cwd landing dev &
sleep 5

# Run screenshot script
python3 - <<'EOF'
import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

pages_to_test = ['/', '/pricing', '/features', '/use-cases']
viewports = [
  {'name': 'mobile',   'width': 375,  'height': 812},
  {'name': 'desktop',  'width': 1440, 'height': 900},
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for vp in viewports:
        for path in pages_to_test:
            page = browser.new_page(viewport={'width': vp['width'], 'height': vp['height']})
            page.goto(f'http://localhost:4321{path}')
            page.wait_for_load_state('networkidle')
            fname = f"/tmp/upgrade_{vp['name']}_{path.strip('/') or 'home'}.png"
            page.screenshot(path=fname, full_page=True)
            print(f"OK: {vp['name']} {path} -> {fname}")
            page.close()
    browser.close()
EOF

# Kill dev server
kill %1
```

**Step: Visually review screenshots** (Read tool to view each PNG)

Look for:
- Clear section background changes when scrolling
- Smaller, more elegant buttons
- Asymmetric UseCases layout
- Numbered HowItWorks (no boxes)
- Featured Testimonials layout

**Step: Final build**

```bash
cd landing && /c/Users/nj/.bun/bin/bun run build 2>&1 | tail -5
```

Expected: `14 page(s) built`, no errors.

**Step: Commit**

```bash
git add -A
git commit -m "design: premium upgrade complete — bg rhythm, minimal buttons, unique card layouts"
```

---

## Summary

| Task | Files Changed | Key Change |
|------|--------------|------------|
| 1 | global.css | bg tokens + smaller buttons |
| 2 | 6 section components | bg colors per section |
| 3 | HowItWorks.astro | numbered list (no boxes) |
| 4 | UseCases.astro | asymmetric bento grid |
| 5 | Testimonials.astro | featured + supporting layout |
| 6 | 4 sub-pages | section bg system |
| 7 | PricingFull/Preview.tsx | dark bg + smaller buttons |
| 8 | DocsLayout + forum | bg hierarchy |
| 9 | — | screenshots + final build |
