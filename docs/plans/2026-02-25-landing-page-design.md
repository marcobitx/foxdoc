# FoxDoc Landing Page — Design Document
**Date:** 2026-02-25
**Status:** Approved
**Scope:** `landing/` — nauja Astro aplikacija `foxdoc.io` domenui

---

## 1. Deployment Architecture

### Du atskiri Vercel projektai, vienas GitHub repo

```
foxdoc/ (GitHub repo)
├── backend/       → Railway (nepakinta)
├── frontend/      → app.foxdoc.io  (esamas Vercel projektas)
└── landing/       → foxdoc.io      (naujas Vercel projektas)
```

### Vercel "Ignored Build Step" konfigūracija

**`frontend` projektas** — nebuildin'ti kai kinta tik `landing/`:
```bash
git diff HEAD^ HEAD --quiet -- frontend/
```

**`landing` projektas** — nebuildin'ti kai kinta tik `frontend/`:
```bash
git diff HEAD^ HEAD --quiet -- landing/
```

| Keiti | frontend deploys? | landing deploys? |
|-------|-------------------|-----------------|
| `frontend/` failus | ✅ | ❌ |
| `landing/` failus | ❌ | ✅ |
| `backend/` failus | ❌ | ❌ |

---

## 2. Tech Stack

- **Framework:** Astro 5 (multi-page, static + SSR)
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion (React islands) + CSS scroll-triggered
- **Icons:** Lucide React
- **Fonts:** Playfair Display (antraštės) + Inter (tekstas) + JetBrains Mono (akcentai)
- **Package manager:** bun

---

## 3. Svetainės struktūra

| Puslapis | URL | Aprašymas |
|----------|-----|-----------|
| Landing | `/` | Pagrindinis puslapis |
| Kainodara | `/pricing` | Pilna kainų lentelė + kreditų sistema |
| Funkcijos | `/features` | Detalus funkcijų aprašymas |
| Use Cases | `/use-cases` | Atvejai pagal vartotojo tipą |
| Dokumentacija | `/docs` | Getting started, kreditai, dok. tipai |
| Forumas | `/forum` | Diskusijų board + kategorijos |
| Apie | `/about` | Komanda, misija, kontaktai |

---

## 4. Dizaino sistema

> Dizaino principų šaltinis: `C:\Users\nj\Downloads\design_app.md`
> Interaktyvus: https://design-fundamentals-eight.vercel.app/

### Spalvų paletė — hierarchija

Kiekviena spalva turi **vieną aiškią paskirtį**. Jokių "panašių, bet skirtingų" atspalvių.

#### Primary — pagrindinė veiksmo spalva

| Token | HEX | Naudojimas |
|-------|-----|-----------|
| `--primary` | `#00ca88` | CTA mygtukai, aktyvios nuorodos, svarbiausias akcentas |
| `--primary-hover` | `#00b578` | Primary hover būsena |
| `--primary-subtle` | `rgba(0,202,136,0.10)` | Švelnūs foniniai akcentai, badges |
| `--primary-glow` | `rgba(0,202,136,0.25)` | Box-shadow glow hover efektas |

**Taisyklė:** Primary spalva naudojama TIK vienam svarbiausiam elementui per ekraną — CTA mygtukui. Jei viskas žalia, niekas nėra svarbu.

#### Accent — antrinė dekoratyvinė spalva

| Token | HEX | Naudojimas |
|-------|-----|-----------|
| `--accent` | `#7c3aed` | Gradientai, hero fonas, dekoratyviniai elementai |
| `--accent-subtle` | `rgba(124,58,237,0.10)` | Subtilūs foniniai efektai |

**Taisyklė:** Accent naudojamas TIK dekoratyviai (gradientai, fonas). Niekada — mygtukams ar interaktyviems elementams.

#### Semantic — prasmingos spalvos

| Token | HEX | Reikšmė | Naudojimas |
|-------|-----|---------|-----------|
| `--semantic-success` | `#22c55e` | Sėkmė, gerai | QA balas ≥ 70, patvirtinimai |
| `--semantic-error` | `#ef4444` | Klaida, dėmesio | Klaidos, limitus viršijantys rodikliai |
| `--semantic-warning` | `#f59e0b` | Įspėjimas | Kreditų mažai, pasenę dokumentai |
| `--semantic-info` | `#3b82f6` | Informacija | Žinučių pranešimai, tooltips |

**Taisyklė:** Semantic spalvos turi VIENODĄ reikšmę visame puslapyje. Žalia visada = gerai. Raudona visada = klaida.

#### Neutrals — fonas, paviršiai, tekstas

| Token | HEX | Naudojimas |
|-------|-----|-----------|
| `--neutral-900` | `#0d0f14` | Pagrindinis puslapio fonas |
| `--neutral-800` | `#141720` | Kortelių, sekcijų fonas |
| `--neutral-700` | `#1a1f2e` | Hover, elevated elementai |
| `--neutral-600` | `#252d3d` | Atskiriantys elementai, aktyvūs hover |
| `--neutral-400` | `rgba(255,255,255,0.08)` | Rėmeliai, divideriai |
| `--neutral-300` | `rgba(255,255,255,0.12)` | Aktyvūs rėmeliai |
| `--text-100` | `#ffffff` | Antraštės, svarbūs skaičiai |
| `--text-200` | `#e2e8f0` | Pagrindinis tekstas |
| `--text-300` | `#a0aec0` | Antriniai aprašymai, placeholder |
| `--text-400` | `#4a5568` | Neaktyvūs elementai, disabled |

### Kontrasto hierarchija (pagal design_app.md)

> "Didelis kontrastas rėkia „žiūrėk čia", o mažas kontrastas sako „tai yra antraeiliai dalykai""

| Lygis | Elementas | Kontrastas | Spalvų pora |
|-------|-----------|-----------|-------------|
| **1 — Pats svarbiausias** | CTA mygtukas | Aukščiausias | `#00ca88` ant `#0d0f14` |
| **2 — Svarbus** | H1 antraštė | Labai aukštas | `#ffffff` ant `#0d0f14` |
| **3 — Vidutinis** | H2, H3 | Aukštas | `#e2e8f0` ant `#141720` |
| **4 — Antrinis** | Body tekstas | Vidutinis | `#a0aec0` ant `#141720` |
| **5 — Tylus** | Placeholder, labels | Žemas | `#4a5568` ant `#141720` |

WCAG AA minimumas: 4.5:1 tekstui, 3:1 UI elementams.

### Elevation sistema (šešėliai)

> "Svarbesni elementai turi didesnį iškilumą nei mažiau svarbios kortelės"

| Lygis | CSS | Naudojimas |
|-------|-----|-----------|
| **0 — Flat** | `none` | Fonas, statiniai elementai |
| **1 — Raised** | `0 1px 3px rgba(0,0,0,0.3)` | Kortelės |
| **2 — Floating** | `0 4px 16px rgba(0,0,0,0.4)` | Hover kortelės, dropdowns |
| **3 — Modal** | `0 8px 32px rgba(0,0,0,0.6)` | Modalai, nav drawer |
| **Glow** | `0 0 24px var(--primary-glow)` | CTA hover, aktyvūs elementai |

Šešėliai visada krenta **iš viršaus** (vienas šviesos šaltinis). Tamsus dizainas = tamsūs šešėliai + glow efektai vietoje.

### Tarpų sistema (spacing scale)

> "Sistemingą tarpų skalę (pvz., 4px, 8px, 16px, 24px, 32px)"

| Token | px | Naudojimas |
|-------|----|-----------|
| `space-1` | 4px | Ikonos↔tekstas, badge padding |
| `space-2` | 8px | Elementų vidinis padding (mažas) |
| `space-3` | 12px | Mygtukų padding vertical |
| `space-4` | 16px | Mygtukų padding horizontal, kortelės vidus (mažas) |
| `space-6` | 24px | Kortelių vidus (standartinis) |
| `space-8` | 32px | Sekcijų vidiniai tarpai |
| `space-12` | 48px | Tarp kortelių grupių |
| `space-16` | 64px | Sekcijų tarpai |
| `space-24` | 96px | Pagrindinių sekcijų padding top/bottom |

### Logotipas ir pavadinimas

- **Pavadinimas:** `foxDoc` — būtent šis formatas visur (mažoji `fox`, didžioji `Doc`)
- **Logo:** `/public/favicon.svg` — lapės veidas su akiniais (tas pats kaip aplikacijoje, kopijuojamas iš `frontend/public/favicon.svg`)
- **Nav logotipas:** SVG ikona + `foxDoc` tekstas šalia
- **Niekada nenaudoti:** `FoxDoc`, `FOXDOC`, `fox doc`, `Fox Doc`

### Tipografija

Šriftai suderinti su aplikacija (`frontend/src/layouts/Layout.astro`):

- **H1, H2:** Space Grotesk Bold/SemiBold — modernūs, aiškūs, atpažįstami kaip aplikacijos šriftai
- **H3, H4:** Space Grotesk Medium
- **Body:** Plus Jakarta Sans Regular, 16px, line-height 1.7
- **Caption:** Plus Jakarta Sans Regular, 14px, `--text-300`
- **Code/duomenys:** JetBrains Mono — tas pats kaip aplikacijoje

**Fluid scaling:**
- H1: `clamp(2rem, 5vw, 3.75rem)` (32px → 60px)
- H2: `clamp(1.75rem, 4vw, 3rem)` (28px → 48px)
- H3: `clamp(1.25rem, 2.5vw, 1.5rem)` (20px → 24px)

### Komponentai

**Mygtukas (primarinis):**
- Fonas: `--accent` (#00ca88)
- Tekstas: juodas (#0d0f14)
- Border-radius: 8px
- Padding: 12px 24px
- Hover: glow efektas `box-shadow: 0 0 20px rgba(0,202,136,0.4)`

**Kortelė:**
- Fonas: `--bg-surface`
- Rėmelis: `1px solid var(--border)`
- Border-radius: 16px
- Hover: `--bg-elevated` + glow border

**Glassmorphism (hero fone):**
```css
backdrop-filter: blur(12px);
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
```

---

## 5. Landing Page (`/`) sekcijų specifikacija

### 5.1 Navigation
- Sticky header, `backdrop-filter: blur(20px)`
- Logo (kairėje) + navigacijos nuorodos (centre) + CTA mygtukas (dešinėje)
- Nuorodos: Funkcijos · Kainodara · Dokumentacija · Forumas
- CTA: "Išbandyti nemokamai" (žalias mygtukas)

### 5.2 Hero
- **Antraštė:** "Viešųjų pirkimų dokumentai — analizuojami per 3 minutes"
- **Subheadline:** "FoxDoc naudoja AI kad automatiškai ištrauktų esminius duomenis iš bet kokio pirkimo dokumentų paketo. Sutaupykite 4–6 valandas per analizę."
- **CTA:** "Išbandyti nemokamai" (3 kreditai, be kortelės) + "Žiūrėti kaip veikia →"
- **Vizualas:** Dešinėje — animuota produkto demonstracija (glassmorphism kortelė su mock ataskaita)
- **Fonas:** Subtilus radial gradient `#7c3aed → #0d0f14` + taškelių tinklelis

### 5.3 Partnerių logotipai
- Antraštė: "Pasitiki viešųjų pirkimų specialistai visoje Lietuvoje"
- Horizontali eilutė su 6–8 organizacijų logotipais (pilka spalva, hover → balta)
- Infinite scroll marquee animacija

### 5.4 Kaip veikia
- Antraštė: "3 žingsniai iki išsamios ataskaitos"
- 3 kortelės su numeracija + ikona + antraštė + aprašymas:
  1. **Įkelkite dokumentus** — PDF, DOCX, XLSX arba ZIP paketas
  2. **AI analizuoja** — Automatiškai ištraukiami visi esminiai duomenys
  3. **Gaukite ataskaitą** — Struktūrizuota ataskaita su QA balu + pokalbis su dokumentais
- Scroll-triggered animacija: kiekviena kortelė slide-in iš kairės

### 5.5 Use Cases (preview)
- Antraštė: "Kas naudoja FoxDoc?"
- Bento grid (3 kortelės):
  - **Perkančios organizacijos** — greitai vertina gautus pasiūlymus
  - **Tiekėjai** — analizuoja pirkimo sąlygas prieš teikdami pasiūlymą
  - **Auditoriai ir konsultantai** — tikrina pirkimų atitiktį reikalavimams
- Kiekviena kortelė: ikona + antraštė + 2 sakiniai + "Sužinoti daugiau →"

### 5.6 Partnerių atsiliepimai
- Antraštė: "Ką sako mūsų vartotojai"
- 3 atsiliepimai horizontaliai (kortelės):
  - Asmens nuotrauka + vardas + pareigos + organizacija
  - Citata (2–3 sakiniai)
  - Žvaigždutės (5/5)
- Mobile: horizontal scroll

### 5.7 Kainodara (preview)
- Antraštė: "Skaidri kainodara, nėra staigmenų"
- Toggle: Mėnesinis / Metinis (sutaupote 17%)
- 4 planai: Free · Starter €19 · Pro €59 · Team €149
- "Pro" pažymėtas kaip "Populiariausias" (vizualinis akcentas)
- CTA: "Peržiūrėti visas kainas →" → `/pricing`

### 5.8 DUK
- Antraštė: "Dažni klausimai"
- Akordeonas, 7 klausimai:
  1. Kaip veikia kreditų sistema?
  2. Kokius dokumentų formatus palaiko FoxDoc?
  3. Ar saugūs mano dokumentai?
  4. Ar galiu naudoti nemokamai?
  5. Kiek laiko užtrunka analizė?
  6. Ar veikia su ZIP archyvais?
  7. Ar galiu eksportuoti ataskaitą?

### 5.9 Finalinis CTA
- Gradientinis banner (`#7c3aed → #00ca88`)
- Antraštė: "Pradėkite taupyti laiką šiandien"
- Subtekstas: "3 kreditai nemokamai. Nereikia kredito kortelės."
- CTA mygtukas: "Išbandyti nemokamai" (balta su tamsiu tekstu)

---

## 6. Kiti puslapiai (aukšto lygio)

### `/pricing`
- Pilna kainų lentelė su visomis funkcijomis (✓/✗)
- Kreditų sistemos paaiškinimas
- Add-on kreditų paketai
- Metinis/mėnesinis toggle
- Enterprise CTA ("Susisiekite")
- FAQ sekcija (6–8 klausimai apie kainodarą)

### `/features`
- Kiekviena funkcija su detaliu aprašymu + screenshot
- Sekcijos: Dokumentų analizė · QA vertinimas · Eksportas · Pokalbis su dokumentais · Modelių pasirinkimas

### `/use-cases`
- Pilnas kiekvieno use case aprašymas
- Realūs scenarijai, konkretūs pavyzdžiai
- "Kaip FoxDoc padeda [perkančiai organizacijai]" struktūra

### `/docs`
- Šoninė navigacija (sidebar)
- Sekcijos: Pradžia · Kreditai · Dokumentų tipai · Ataskaita · Eksportas · DUK
- Kodo pavyzdžiai (jei yra API)

### `/forum`
- Diskusijų board su kategorijomis
- Kategorijos: Bendri klausimai · Funkcijų pasiūlymai · Klaidos · Geroji praktika
- Temos sąrašas + balsavimas + komentarai
- Registruotis/prisijungti per FoxDoc paskyrą
- *Techninė implementacija: custom Astro + Convex arba embed Discourse*

### `/about`
- Misija ir vertybės
- Komandos pristatymas
- Kontaktų forma
- Privatumo politika / Naudojimo sąlygos nuorodos

---

## 7. Animacijų specifikacija

| Elementas | Animacija | Trukmė |
|-----------|-----------|--------|
| Hero antraštė | Fade-in + slide-up | 0.6s, delay 0.1s |
| Hero subtext | Fade-in + slide-up | 0.6s, delay 0.3s |
| Hero CTA | Fade-in + scale-up | 0.4s, delay 0.5s |
| Sekcijų kortelės | Scroll-triggered fade+slide | 0.5s, stagger 0.1s |
| Bento kortelės hover | Glow border + bg shift | 0.3s ease |
| Partnerių logotipai | Infinite marquee | 30s linear loop |
| Pricing toggle | Smooth price number swap | 0.3s |
| DUK akordeonas | Height expand/collapse | 0.3s ease |
| CTA mygtukas hover | Glow pulse | 0.3s |

Visos animacijos gerbia `prefers-reduced-motion`.

---

## 8. Mobile-First Responsive Design

### Principas
Visas kodas rašomas **mobile-first** — baziniai stiliai skirti mobiliems, `md:` / `lg:` / `xl:` klasės prideda didesnių ekranų pakeitimus.

```css
/* NETEISINGA — desktop-first */
.grid { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }

/* TEISINGA — mobile-first */
.grid { grid-template-columns: 1fr; }
@media (min-width: 768px) { .grid { grid-template-columns: repeat(3, 1fr); } }
```

### Breakpoints (Tailwind CSS)

| Vardas | Min-width | Tailwind prefix | Naudojimas |
|--------|-----------|-----------------|-----------|
| **xs** | 0px | (bazė) | Mobilūs telefonai (360–480px) |
| **sm** | 640px | `sm:` | Dideli telefonai, mažos planšetės |
| **md** | 768px | `md:` | Planšetės, horizontalus telefonas |
| **lg** | 1024px | `lg:` | Nešiojami kompiuteriai |
| **xl** | 1280px | `xl:` | Staliniai kompiuteriai |
| **2xl** | 1536px | `2xl:` | Dideli monitoriai |

### Komponentų elgsena pagal ekraną

| Komponentas | Mobile (< 640px) | Tablet (640–1024px) | Desktop (> 1024px) |
|-------------|-----------------|--------------------|--------------------|
| **Nav** | Hamburger meniu + drawer | Hamburger arba pilnas | Pilnas horizontal nav |
| **Hero** | 1 stulpelis, mockup po tekstu | 1 stulpelis, didesnis | 2 stulpeliai šalia |
| **Partneriai** | Lėtesnis marquee | Marquee | Marquee |
| **How it works** | 1 stulpelis, stack | 1 stulpelis | 3 stulpeliai |
| **Use Cases** | 1 stulpelis | 2 stulpeliai | 3 stulpeliai |
| **Atsiliepimai** | Horizontal scroll | 2 stulpeliai | 3 stulpeliai |
| **Pricing** | 1 stulpelis, scroll | 2 stulpeliai | 4 stulpeliai |
| **FAQ** | Pilnas plotis | Pilnas plotis | Max 3xl centrinis |
| **Docs sidebar** | Paslėptas (toggle) | Paslėptas (toggle) | Visada rodomas |
| **Forum** | 1 stulpelis | 1 stulpelis | 2 stulpeliai (sąrašas + sidebar) |

### Tipografija (fluid scaling)

```css
/* CSS clamp: min, preferred, max */
h1 { font-size: clamp(2rem, 5vw, 3.75rem); }    /* 32px → 60px */
h2 { font-size: clamp(1.75rem, 4vw, 3rem); }     /* 28px → 48px */
h3 { font-size: clamp(1.25rem, 2.5vw, 1.5rem); } /* 20px → 24px */
body { font-size: clamp(0.9rem, 1.5vw, 1rem); }  /* 14px → 16px */
```

### Touch targets

- Visi mygtukai ir nuorodos: **min. 44×44px** (Apple HIG standartas)
- Nav hamburger mygtukas: **48×48px**
- FAQ accordion mygtukai: **min. 56px aukščio**
- Pricing plan kortelių CTA: **pilnas plotis** mobiliuose

### Mobile Nav (hamburger)

Mobiliame variante Nav rodo hamburger ikoną. Spustelėjus — drawer iš dešinės su:
- Logo
- Navigacijos nuorodos (stambios, lengvai spaudžiamos)
- CTA mygtukas (pilnas plotis)
- Uždarymo mygtukas

### Sticky CTA mobiliuose

Mobiliame variante — sticky juosta apačioje su CTA mygtuku:
```astro
<div class="fixed bottom-0 left-0 right-0 p-4 bg-bg-base/90 backdrop-blur-lg border-t border-[rgba(255,255,255,0.08)] md:hidden z-40">
  <a href="https://app.foxdoc.io" class="block w-full py-3 text-center font-semibold rounded-lg bg-accent text-bg-base">
    Išbandyti nemokamai
  </a>
</div>
```

### Testavimas

Prieš kiekvieną commitą patikrinti šiuose plotuose:
- 375px (iPhone SE / standartinis)
- 390px (iPhone 15)
- 768px (iPad)
- 1280px (Desktop)

---

## 9. Performance tikslai

- LCP < 2.0s
- CLS < 0.1
- 60 FPS animacijos
- Lighthouse score ≥ 90
- Fontai: `font-display: swap`
- Vaizdai: WebP + lazy loading
