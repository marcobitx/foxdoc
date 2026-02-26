# foxDoc Forum Redesign — Design Document
**Date:** 2026-02-26
**Status:** Approved
**Scope:** `.worktrees/feat-landing/landing/src/pages/forum/` — forumo puslapių perdarbymas

---

## 1. Problema

Esamas forumo puslapis turi šiuos trūkumus:
- **Neatitinka dizaino sistemos** — naudoja rudas šiltas spalvas (`#231c18`, `#b5a99f`) vietoje cool dark sistemos (`#0d0f14`, `#141720`)
- **Nėra sidebar** — dizaino doc nurodo 2 stulpelių layoutą desktop'e
- **Nėra thread sąrašo** — tik kategorijų sąrašas su "netrukus" placeholder
- **Nėra statistikų** — kategorijų kortelės be post/view count
- **CTA neatitinka** — oranžiniai mygtukai (`#f59e0b`) vietoje žalių (`#00ca88`)
- **Inline stiliai** — ne Tailwind klasės

---

## 2. Pasirinktas požiūris: Discourse stilius

Discourse stilius geriausiai tinka procurement profesionalams:
- Temos kaip lentelės eilutės su reply count, views, last activity
- Sidebar su kategorijomis ir statistikomis
- Greita orientacija, aiški informacijos hierarchija

---

## 3. Puslapių struktūra

### 3.1 `/forum` — pagrindinis puslapis

**Header:**
- `foxDoc bendruomenė` antraštė + subtext
- Search bar (realtime filter per mock duomenis)
- `Sukurti temą` mygtukas (žalias CTA, atidaro modalą)

**Pagrindinis turinys (70% plotis desktop'e):**
- Kategorijų tabs: `Visi · Bendri klausimai · Techninė pagalba · Pirkimų diskusijos · Idėjos · Sėkmingos analizės`
- Sort: `Naujausi · Populiarūs · Neatsakyti`
- Thread sąrašas (Discourse stilius)

**Sidebar (30% plotis desktop'e):**
- Statistikos kortelė (nariai, temos, atsakymai, aktyvūs dabar)
- Populiariausios žymos (clickable, filtruoja)
- Aktyviausi nariai (6 avatar circles)
- Naujienos (foxDoc release notes)

**Mobile:** 1 stulpelis, sidebar po thread sąrašu

### 3.2 `/forum/[category]` — kategorijos puslapis

- Breadcrumb: `← Atgal į forumą`
- Kategorijos header: ikona + pavadinimas + aprašymas + stats
- Thread sąrašas filtruotas pagal kategoriją
- Sidebar: kitos kategorijos + kategorijos statistikos

---

## 4. Thread kortelės dizainas

```
┌──────────────────────────────────────────────────────┬──────┐
│ 🟡 Kaip interpretuoti CPV kodus su keliais skyriais? │  12  │
│    Ar galima naudoti vieną CPV kai...                │  ↩   │
│    [CPV] [Metodika]  👤 Rūta K. · 2h                │ 234👁│
└──────────────────────────────────────────────────────┴──────┘
```

**Elementai:**
- Kairysis thin border — kategorijos spalva
- Antraštė (bold, `#ffffff`)
- Excerpt — pirmos 80 simbolių (text-300)
- Tags — small badge pills
- Autorius + laikas
- Reply count + views (dešinėje)
- Prisegta tema: `#rgba(0,202,136,0.04)` fonas + `📌` badge
- Karšta tema: `🔥` indikatorius (>100 views per 24h)

---

## 5. Spalvų sistema

Suderinta su `docs/plans/2026-02-25-landing-page-design.md`:

| Elementas | Spalva |
|-----------|--------|
| Puslapio fonas | `#0d0f14` (neutral-900) |
| Thread kortelė fonas | `#141720` (neutral-800) |
| Thread hover | `#1a1f2e` (neutral-700) |
| Antraštė | `#ffffff` |
| Excerpt/tekstas | `#a0aec0` (text-300) |
| Statistikos skaičiai | `#4a5568` (text-400) |
| Primary CTA | `#00ca88` |
| Tag fonas | `rgba(255,255,255,0.06)` |
| Prisegta tema fonas | `rgba(0,202,136,0.04)` |

### Kategorijų spalvos (thin left border)

| Kategorija | Spalva |
|-----------|--------|
| Bendri klausimai | `#f59e0b` |
| Techninė pagalba | `#ef4444` |
| Pirkimų diskusijos | `#3b82f6` |
| Idėjos ir pasiūlymai | `#7c3aed` |
| Sėkmingos analizės | `#22c55e` |

---

## 6. "Sukurti temą" modalas

- Glassmorphism: `backdrop-filter: blur(12px)`
- Laukai: Antraštė, Kategorija (select), Turinys (textarea), Žymos (tag input)
- Submit → localStorage + success toast "Tema sukurta! ✓"
- Dismiss: Escape, click outside, ✕ mygtukas
- Žymos: Enter prideda, ✕ pašalina

---

## 7. Mock duomenys

Failas: `landing/src/lib/forum-data.ts`

~12 thread'ų su realistišku lietuvišku turiniu:
- CPV kodų klausimai
- ZIP parsingo problemos
- Pasiūlymai dėl eksporto
- Pirkimų teisės diskusijos
- Sėkmingų analizių istorijos

Kiekvienas thread: `{ id, title, excerpt, category, author, avatar, date, replies, views, tags, pinned?, hot? }`

---

## 8. Responsive layout

| Ekranas | Layout |
|---------|--------|
| Mobile (< 768px) | 1 stulpelis, sidebar po sąrašu |
| Tablet (768–1024px) | 1 stulpelis, sidebar po sąrašu |
| Desktop (> 1024px) | 2 stulpeliai: 70% + 30% |

---

## 9. Failų pakeitimai

| Veiksmas | Failas |
|----------|--------|
| Perrašyti | `landing/src/pages/forum/index.astro` |
| Perrašyti | `landing/src/pages/forum/[category].astro` |
| Sukurti | `landing/src/lib/forum-data.ts` |
| Sukurti | `landing/src/components/forum/ThreadCard.astro` |
| Sukurti | `landing/src/components/forum/ForumSidebar.astro` |
| Sukurti | `landing/src/components/forum/CreateTopicModal.tsx` |
| Sukurti | `landing/src/components/forum/CategoryTabs.tsx` |
