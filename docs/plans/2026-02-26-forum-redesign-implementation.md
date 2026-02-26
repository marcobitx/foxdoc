# Forum Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Perrašyti forumo puslapius (`/forum`, `/forum/[category]`) pagal Discourse stilių su pilnu UI, mock duomenimis ir interaktyviais komponentais.

**Architecture:** Astro puslapiai su React islands interaktyviam turiniui (tabs, sort, search, modal). Mock duomenys `forum-data.ts` faile. Visos spalvos iš dizaino sistemos (ne rudos kaip dabar).

**Tech Stack:** Astro 5, React, Tailwind CSS, TypeScript. Worktree: `.worktrees/feat-landing/landing/`

**Design doc:** `docs/plans/2026-02-26-forum-redesign-design.md`

---

### Task 1: Sukurti mock duomenis (forum-data.ts)

**Files:**
- Create: `.worktrees/feat-landing/landing/src/lib/forum-data.ts`

**Step 1: Sukurti failą su tipais ir duomenimis**

```typescript
// landing/src/lib/forum-data.ts
// Mock forum data — replace with Convex queries when forum goes live
// Related: pages/forum/index.astro, pages/forum/[category].astro

export type CategorySlug =
  | 'bendri-klausimai'
  | 'technine-pagalba'
  | 'pirkimu-diskusijos'
  | 'idejus-pasiulymai'
  | 'sekmingos-analizės';

export interface Category {
  slug: CategorySlug;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface Thread {
  id: string;
  title: string;
  excerpt: string;
  category: CategorySlug;
  author: string;
  authorInitials: string;
  authorColor: string;
  date: string;
  replies: number;
  views: number;
  tags: string[];
  pinned?: boolean;
  hot?: boolean;
}

export const categories: Category[] = [
  {
    slug: 'bendri-klausimai',
    title: 'Bendri klausimai',
    description: 'Klausimai apie foxDoc naudojimą, funkcionalumą ir geriausias praktikas.',
    icon: '💬',
    color: '#f59e0b',
  },
  {
    slug: 'technine-pagalba',
    title: 'Techninė pagalba',
    description: 'Pranešimai apie klaidas, nesklandumus ir technines problemas.',
    icon: '🔧',
    color: '#ef4444',
  },
  {
    slug: 'pirkimu-diskusijos',
    title: 'Viešųjų pirkimų diskusijos',
    description: 'Diskusijos apie LT pirkimų teisę, praktikas, precedentus ir aktualijas.',
    icon: '🏛️',
    color: '#3b82f6',
  },
  {
    slug: 'idejus-pasiulymai',
    title: 'Idėjos ir pasiūlymai',
    description: 'Siūlykite naujas funkcijas, dalinkitės idėjomis kaip pagerinti foxDoc.',
    icon: '💡',
    color: '#7c3aed',
  },
  {
    slug: 'sekmingos-analizės',
    title: 'Sėkmingos analizės',
    description: 'Dalinkitės sėkmingomis analizių istorijomis ir naudingais atradimais.',
    icon: '⭐',
    color: '#22c55e',
  },
];

export const threads: Thread[] = [
  {
    id: '1',
    title: 'Kaip interpretuoti CPV kodus kai pirkimas apima kelis skyrius?',
    excerpt: 'Turiu situaciją — pirkimas apima IT paslaugas ir konsultacijas. Ar galima naudoti vieną CPV kodą ar reikia atskirų?',
    category: 'pirkimu-diskusijos',
    author: 'Rūta Kazlauskienė',
    authorInitials: 'RK',
    authorColor: '#7c3aed',
    date: '2026-02-26T08:30:00',
    replies: 12,
    views: 234,
    tags: ['CPV', 'Metodika', 'BVPŽ'],
    hot: true,
  },
  {
    id: '2',
    title: 'Pradžiamokslis: kaip naudotis foxDoc — viskas vienoje vietoje',
    excerpt: 'Šiame įraše rasite viską ko reikia norint pradėti — nuo failo įkėlimo iki ataskaitos interpretavimo.',
    category: 'bendri-klausimai',
    author: 'foxDoc Komanda',
    authorInitials: 'FK',
    authorColor: '#00ca88',
    date: '2026-02-01T09:00:00',
    replies: 0,
    views: 1420,
    tags: ['Pradžiamokslis', 'Gidas'],
    pinned: true,
  },
  {
    id: '3',
    title: 'foxDoc neparsina ZIP failo — gaunu klaidą "Nepavyko išskleisti"',
    excerpt: 'Bandau įkelti ZIP archyvą su 23 dokumentais. Sistema rodo klaidą po ~30 sekundžių. Bandžiau kelis kartus.',
    category: 'technine-pagalba',
    author: 'Tomas Petraitis',
    authorInitials: 'TP',
    authorColor: '#3b82f6',
    date: '2026-02-25T15:45:00',
    replies: 3,
    views: 89,
    tags: ['ZIP', 'Klaida', 'Parsavimas'],
  },
  {
    id: '4',
    title: 'Siūlau pridėti eksportą į Excel — labai reikalinga funkcija',
    excerpt: 'Šiuo metu galima eksportuoti į PDF ir DOCX, bet dirbant su dideliais duomenų kiekiais Excel formatas būtų daug patogiau.',
    category: 'idejus-pasiulymai',
    author: 'Ieva Stankevičiūtė',
    authorInitials: 'IS',
    authorColor: '#f59e0b',
    date: '2026-02-25T11:20:00',
    replies: 7,
    views: 156,
    tags: ['Excel', 'Eksportas', 'Funkcija'],
    hot: true,
  },
  {
    id: '5',
    title: 'Analizavau 47 dokumentų paketą — QA balas 91, viskas tiksliai!',
    excerpt: 'Perkančioji organizacija pateikė milžinišką pirkimo paketą. foxDoc per 4 minutes ištraukė visus CPV, vertes ir terminus.',
    category: 'sekmingos-analizės',
    author: 'Mindaugas Žukauskas',
    authorInitials: 'MŽ',
    authorColor: '#22c55e',
    date: '2026-02-24T16:00:00',
    replies: 5,
    views: 312,
    tags: ['QA balas', 'Didelis paketas', 'Sėkmė'],
  },
  {
    id: '6',
    title: 'Ar foxDoc palaiko skenuotus PDF failus (scanned PDF)?',
    excerpt: 'Turiu senus dokumentus išsaugotus kaip paveikslėliai PDF formatu. Ar sistema gali juos analizuoti naudodama OCR?',
    category: 'bendri-klausimai',
    author: 'Laima Norvilienė',
    authorInitials: 'LN',
    authorColor: '#ef4444',
    date: '2026-02-24T10:15:00',
    replies: 4,
    views: 167,
    tags: ['PDF', 'OCR', 'Skenuotas'],
  },
  {
    id: '7',
    title: 'Ar VPT reikalavimai dėl pirkimo dokumentų keičiasi 2026?',
    excerpt: 'Skaičiau apie planuojamus VPT pakeitimus dėl dokumentų standartizavimo. Kaip tai paveiks mūsų kasdienį darbą?',
    category: 'pirkimu-diskusijos',
    author: 'Gintaras Butkus',
    authorInitials: 'GB',
    authorColor: '#7c3aed',
    date: '2026-02-23T14:30:00',
    replies: 19,
    views: 445,
    tags: ['VPT', '2026', 'Teisė', 'Standartai'],
    hot: true,
  },
  {
    id: '8',
    title: 'QA balas 43 — kodėl toks žemas?',
    excerpt: 'Pateikiau standartinį pirkimą, bet gavau 43/100 QA balą. Ataskaita atrodo pilna. Kas gali sukelti tokį žemą balą?',
    category: 'bendri-klausimai',
    author: 'Viktorija Paulauskienė',
    authorInitials: 'VP',
    authorColor: '#f59e0b',
    date: '2026-02-23T09:45:00',
    replies: 6,
    views: 203,
    tags: ['QA balas', 'Kokybė', 'Ataskaita'],
  },
  {
    id: '9',
    title: 'Pasiūlymas: galimybė lyginti dvi analizes tarpusavyje',
    excerpt: 'Būtų labai naudinga turėti funkciją kuri leistų pasirinkti dvi atliktas analizes ir pamatyti skirtumus tarp jų.',
    category: 'idejus-pasiulymai',
    author: 'Andrius Jankauskas',
    authorInitials: 'AJ',
    authorColor: '#3b82f6',
    date: '2026-02-22T13:00:00',
    replies: 11,
    views: 289,
    tags: ['Palyginimas', 'Funkcija', 'Analizė'],
  },
  {
    id: '10',
    title: 'XLSX failas su formulėmis — ar foxDoc jas interpretuoja?',
    excerpt: 'Mūsų kainų lentelės turi sudėtingas Excel formules. Ar foxDoc mato tik reikšmes ar ir formules pačias?',
    category: 'technine-pagalba',
    author: 'Simona Mockevičiūtė',
    authorInitials: 'SM',
    authorColor: '#22c55e',
    date: '2026-02-22T10:00:00',
    replies: 2,
    views: 78,
    tags: ['XLSX', 'Excel', 'Formulės'],
  },
  {
    id: '11',
    title: 'Sutaupėme 6 valandas per vieną pirkimą — foxDoc veikia!',
    excerpt: 'Didžiulis pirkimas — 38 dokumentai, 3 tiekėjų pasiūlymai. Anksčiau tai užtrukdavo visą dieną, dabar — 2 valandas.',
    category: 'sekmingos-analizės',
    author: 'Rasa Bernotienė',
    authorInitials: 'RB',
    authorColor: '#00ca88',
    date: '2026-02-21T17:30:00',
    replies: 8,
    views: 534,
    tags: ['Laiko taupymas', 'Tiekėjai', 'Sėkmė'],
    hot: true,
  },
  {
    id: '12',
    title: 'Kaip pridėti kelis vartotojus prie Team plano?',
    excerpt: 'Nusipirkome Team planą, bet negaliu rasti kaip pakviesti kolegas į workspace. Ar tai daroma per nustatymus?',
    category: 'bendri-klausimai',
    author: 'Darius Valentinavičius',
    authorInitials: 'DV',
    authorColor: '#7c3aed',
    date: '2026-02-21T11:00:00',
    replies: 1,
    views: 45,
    tags: ['Team', 'Vartotojai', 'Nustatymai'],
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find(c => c.slug === slug);
}

export function getThreadsByCategory(slug?: string): Thread[] {
  if (!slug) return threads;
  return threads.filter(t => t.category === slug);
}

export function getForumStats() {
  return {
    members: 342,
    topics: threads.length,
    replies: threads.reduce((sum, t) => sum + t.replies, 0),
    activeNow: 12,
  };
}

export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  threads.forEach(t => t.tags.forEach(tag => tagSet.add(tag)));
  return Array.from(tagSet);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);
  if (diffH < 1) return 'Ką tik';
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' });
}
```

**Step 2: Patikrinti TypeScript kompiliaciją**

```bash
cd /c/Users/nj/projects/foxdoc/.worktrees/feat-landing/landing
bun run build 2>&1 | head -30
```
Expected: nėra TypeScript klaidų

**Step 3: Commit**

```bash
cd /c/Users/nj/projects/foxdoc/.worktrees/feat-landing
git add landing/src/lib/forum-data.ts
git commit -m "feat(forum): add mock forum data with types and helpers"
```

---

### Task 2: Sukurti ForumContent.tsx (React island)

**Files:**
- Create: `.worktrees/feat-landing/landing/src/components/forum/ForumContent.tsx`

Šis komponentas valdo: kategorijų tabs, sort, search, thread sąrašo render'inimą, "Sukurti temą" modalą.

**Step 1: Sukurti komponentą**

```tsx
// landing/src/components/forum/ForumContent.tsx
// Interactive forum content — tabs, sort, search, thread list, create topic modal
// React island — requires client:load in Astro
// Related: pages/forum/index.astro, lib/forum-data.ts

import { useState, useMemo } from 'react';
import { threads, categories, getAllTags, formatDate, type Thread, type CategorySlug } from '../../lib/forum-data';

// ── Thread Card ──────────────────────────────────────────────
function ThreadCard({ thread }: { thread: Thread }) {
  const category = categories.find(c => c.slug === thread.category)!;

  return (
    <div
      className="group relative flex gap-0 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden"
      style={{
        background: thread.pinned ? 'rgba(0,202,136,0.03)' : '#141720',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = thread.pinned ? 'rgba(0,202,136,0.06)' : '#1a1f2e';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = thread.pinned ? 'rgba(0,202,136,0.03)' : '#141720';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      {/* Category color indicator */}
      <div className="w-1 flex-shrink-0 rounded-l-xl" style={{ background: category.color }} />

      {/* Content */}
      <div className="flex flex-1 items-start gap-3 p-4 min-w-0">
        {/* Author avatar */}
        <div
          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
          style={{ background: thread.authorColor + '33', border: `1.5px solid ${thread.authorColor}66` }}
        >
          <span style={{ color: thread.authorColor }}>{thread.authorInitials}</span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap mb-1">
            {thread.pinned && (
              <span className="inline-flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,202,136,0.12)', color: '#00ca88' }}>
                📌 Prisegta
              </span>
            )}
            {thread.hot && !thread.pinned && (
              <span className="inline-flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                🔥 Karšta
              </span>
            )}
            <h3 className="text-sm font-semibold text-white leading-snug group-hover:text-[#00ca88] transition-colors">
              {thread.title}
            </h3>
          </div>

          <p className="text-xs leading-relaxed mb-2 line-clamp-1" style={{ color: '#a0aec0' }}>
            {thread.excerpt}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs" style={{ color: '#4a5568' }}>
              {thread.author} · {formatDate(thread.date)}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: category.color + '18', color: category.color }}
            >
              {category.icon} {category.title}
            </span>
            {thread.tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#a0aec0' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col items-center justify-center gap-1 px-4 py-4 flex-shrink-0 border-l" style={{ borderColor: 'rgba(255,255,255,0.06)', minWidth: '64px' }}>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{thread.replies}</p>
          <p className="text-xs" style={{ color: '#4a5568' }}>↩</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-mono" style={{ color: '#4a5568' }}>{thread.views >= 1000 ? `${(thread.views/1000).toFixed(1)}k` : thread.views}👁</p>
        </div>
      </div>
    </div>
  );
}

// ── Create Topic Modal ───────────────────────────────────────
function CreateTopicModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategorySlug | ''>('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function addTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(onClose, 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border p-6 relative"
        style={{
          background: 'rgba(20,23,32,0.95)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(255,255,255,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        {submitted ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-lg font-semibold text-white">Tema sukurta!</p>
            <p className="text-sm mt-1" style={{ color: '#a0aec0' }}>Jūsų tema bus paskelbta netrukus.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Nauja tema</h2>
              <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#a0aec0' }}>Antraštė</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Trumpai ir aiškiai apibūdinkite klausimą..."
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition-colors"
                  style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(0,202,136,0.4)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#a0aec0' }}>Kategorija</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as CategorySlug)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none transition-colors appearance-none"
                  style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <option value="">Pasirinkite kategoriją...</option>
                  {categories.map(c => (
                    <option key={c.slug} value={c.slug}>{c.icon} {c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#a0aec0' }}>Turinys</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Aprašykite savo klausimą ar temą detaliau..."
                  required
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition-colors resize-none"
                  style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(0,202,136,0.4)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#a0aec0' }}>Žymos <span style={{ color: '#4a5568' }}>(neprivaloma, Enter kad pridėti)</span></label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ background: 'rgba(0,202,136,0.12)', color: '#00ca88' }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70">✕</button>
                    </span>
                  ))}
                </div>
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                  placeholder="pvz. CPV, Sutartis..."
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 outline-none"
                  style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg transition-colors" style={{ color: '#a0aec0' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = '#a0aec0')}
              >
                Atšaukti
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
                style={{ background: '#00ca88', color: '#0d0f14' }}
                onMouseEnter={e => ((e.currentTarget.style.boxShadow = '0 0 20px rgba(0,202,136,0.4)'))}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                Publikuoti temą →
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main ForumContent Component ──────────────────────────────
type SortType = 'naujausi' | 'populiarūs' | 'neatsakyti';

interface ForumContentProps {
  initialCategory?: string;
}

export default function ForumContent({ initialCategory }: ForumContentProps) {
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory || 'visi');
  const [sort, setSort] = useState<SortType>('naujausi');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filtered = useMemo(() => {
    let result = [...threads];

    if (activeCategory !== 'visi') {
      result = result.filter(t => t.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.excerpt.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    // Pinned always first
    const pinned = result.filter(t => t.pinned);
    const rest = result.filter(t => !t.pinned);

    if (sort === 'naujausi') {
      rest.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sort === 'populiarūs') {
      rest.sort((a, b) => b.views - a.views);
    } else if (sort === 'neatsakyti') {
      rest.sort((a, b) => a.replies - b.replies);
    }

    return [...pinned, ...rest];
  }, [activeCategory, sort, search]);

  const tabItems = [
    { slug: 'visi', label: 'Visi', color: '#a0aec0' },
    ...categories.map(c => ({ slug: c.slug, label: c.title, color: c.color })),
  ];

  return (
    <>
      {/* Search + CTA row */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#4a5568' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ieškoti temų, žymų..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-colors"
            style={{ background: '#141720', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(0,202,136,0.3)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl flex-shrink-0 transition-all duration-200"
          style={{ background: '#00ca88', color: '#0d0f14' }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(0,202,136,0.35)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
        >
          + Sukurti temą
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {tabItems.map(tab => (
          <button
            key={tab.slug}
            onClick={() => setActiveCategory(tab.slug)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg flex-shrink-0 transition-all duration-150"
            style={{
              background: activeCategory === tab.slug ? tab.color + '22' : 'rgba(255,255,255,0.04)',
              color: activeCategory === tab.slug ? tab.color : '#a0aec0',
              border: activeCategory === tab.slug ? `1px solid ${tab.color}44` : '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sort row */}
      <div className="flex items-center gap-1 mb-5">
        <span className="text-xs mr-2" style={{ color: '#4a5568' }}>Rūšiuoti:</span>
        {(['naujausi', 'populiarūs', 'neatsakyti'] as SortType[]).map(s => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className="px-3 py-1 text-xs rounded-lg transition-colors capitalize"
            style={{
              background: sort === s ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: sort === s ? '#ffffff' : '#4a5568',
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-xs font-mono" style={{ color: '#4a5568' }}>
          {filtered.length} {filtered.length === 1 ? 'tema' : 'temos'}
        </span>
      </div>

      {/* Thread list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-12 text-center rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-sm" style={{ color: '#a0aec0' }}>Temų nerasta pagal paieškos kriterijus</p>
          </div>
        ) : (
          filtered.map(thread => <ThreadCard key={thread.id} thread={thread} />)
        )}
      </div>

      {/* Modal */}
      {showModal && <CreateTopicModal onClose={() => setShowModal(false)} />}
    </>
  );
}
```

**Step 2: Patikrinti TypeScript**

```bash
cd /c/Users/nj/projects/foxdoc/.worktrees/feat-landing/landing
bun run build 2>&1 | grep -i error | head -20
```
Expected: nėra klaidų

**Step 3: Commit**

```bash
cd /c/Users/nj/projects/foxdoc/.worktrees/feat-landing
git add landing/src/components/forum/ForumContent.tsx
git commit -m "feat(forum): add ForumContent React island with tabs, sort, search, modal"
```

---

### Task 3: Sukurti ForumSidebar.astro

**Files:**
- Create: `.worktrees/feat-landing/landing/src/components/forum/ForumSidebar.astro`

**Step 1: Sukurti statinį sidebar'ą**

```astro
---
// landing/src/components/forum/ForumSidebar.astro
// Forum sidebar — stats, popular tags, active members, news
// Static Astro component — no interactivity needed
// Related: pages/forum/index.astro

import { getForumStats, getAllTags, categories } from '../../lib/forum-data';

const stats = getForumStats();
const tags = getAllTags().slice(0, 12);

const members = [
  { initials: 'RK', color: '#7c3aed', name: 'Rūta K.' },
  { initials: 'FK', color: '#00ca88', name: 'foxDoc' },
  { initials: 'TP', color: '#3b82f6', name: 'Tomas P.' },
  { initials: 'IS', color: '#f59e0b', name: 'Ieva S.' },
  { initials: 'MŽ', color: '#22c55e', name: 'Mindaugas Ž.' },
  { initials: 'GB', color: '#7c3aed', name: 'Gintaras B.' },
];

interface Props {
  showCategories?: boolean;
}
const { showCategories = false } = Astro.props;
---

<aside class="space-y-4">

  <!-- Stats -->
  <div class="p-4 rounded-xl border" style="background: #141720; border-color: rgba(255,255,255,0.08);">
    <p class="text-xs font-mono mb-3" style="color: #a0aec0;">📊 Statistikos</p>
    <div class="grid grid-cols-2 gap-3">
      {[
        { label: 'Nariai', value: stats.members },
        { label: 'Temos', value: stats.topics },
        { label: 'Atsakymai', value: stats.replies },
        { label: 'Aktyvūs', value: stats.activeNow },
      ].map(s => (
        <div class="text-center p-2 rounded-lg" style="background: rgba(255,255,255,0.04);">
          <p class="text-lg font-bold text-white">{s.value}</p>
          <p class="text-xs" style="color: #4a5568;">{s.label}</p>
        </div>
      ))}
    </div>
    <div class="flex items-center gap-1.5 mt-3">
      <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
      <p class="text-xs" style="color: #22c55e;">{stats.activeNow} nariai dabar aktyvūs</p>
    </div>
  </div>

  <!-- Categories (shown on category pages) -->
  {showCategories && (
    <div class="p-4 rounded-xl border" style="background: #141720; border-color: rgba(255,255,255,0.08);">
      <p class="text-xs font-mono mb-3" style="color: #a0aec0;">📂 Kategorijos</p>
      <div class="space-y-1">
        {categories.map(cat => (
          <a href={`/forum/${cat.slug}`}
             class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors hover-cat">
            <span>{cat.icon}</span>
            <span style={`color: ${cat.color};`}>{cat.title}</span>
          </a>
        ))}
      </div>
    </div>
  )}

  <!-- Popular tags -->
  <div class="p-4 rounded-xl border" style="background: #141720; border-color: rgba(255,255,255,0.08);">
    <p class="text-xs font-mono mb-3" style="color: #a0aec0;">🏷️ Populiarios žymos</p>
    <div class="flex flex-wrap gap-1.5">
      {tags.map(tag => (
        <span class="px-2 py-1 text-xs rounded-md cursor-pointer transition-colors tag-pill"
              style="background: rgba(255,255,255,0.05); color: #a0aec0; border: 1px solid rgba(255,255,255,0.06);">
          {tag}
        </span>
      ))}
    </div>
  </div>

  <!-- Active members -->
  <div class="p-4 rounded-xl border" style="background: #141720; border-color: rgba(255,255,255,0.08);">
    <p class="text-xs font-mono mb-3" style="color: #a0aec0;">👥 Aktyviausi nariai</p>
    <div class="flex flex-wrap gap-2">
      {members.map(m => (
        <div class="relative group/member">
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-transform hover:scale-110"
               style={`background: ${m.color}22; border: 1.5px solid ${m.color}55; color: ${m.color};`}>
            {m.initials}
          </div>
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover/member:opacity-100 transition-opacity pointer-events-none z-10"
               style="background: #252d3d; color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1);">
            {m.name}
          </div>
        </div>
      ))}
    </div>
  </div>

  <!-- Naujienos -->
  <div class="p-4 rounded-xl border" style="background: #141720; border-color: rgba(255,255,255,0.08);">
    <p class="text-xs font-mono mb-3" style="color: #a0aec0;">📢 Naujienos</p>
    <div class="space-y-3">
      <div>
        <p class="text-xs font-medium text-white">foxDoc v2.1 išleista</p>
        <p class="text-xs mt-0.5" style="color: #4a5568;">Greičiau, tiksliau, daugiau formatų · Feb 20</p>
      </div>
      <div>
        <p class="text-xs font-medium text-white">Naujas ZIP palaikymas</p>
        <p class="text-xs mt-0.5" style="color: #4a5568;">Iki 100 dokumentų archyve · Feb 10</p>
      </div>
    </div>
  </div>

</aside>

<style>
.hover-cat { color: #a0aec0; }
.hover-cat:hover { background: rgba(255,255,255,0.06); }
.tag-pill:hover { background: rgba(0,202,136,0.1) !important; color: #00ca88 !important; border-color: rgba(0,202,136,0.3) !important; }
</style>
```

**Step 2: Commit**

```bash
cd /c/Users/nj/projects/foxdoc/.worktrees/feat-landing
git add landing/src/components/forum/ForumSidebar.astro
git commit -m "feat(forum): add ForumSidebar with stats, tags, members, news"
```

---

### Task 4: Perrašyti forum/index.astro

**Files:**
- Modify: `.worktrees/feat-landing/landing/src/pages/forum/index.astro`

**Step 1: Perrašyti puslapį**

```astro
---
// landing/src/pages/forum/index.astro
// Forum index — main forum page with category tabs and thread list
// Related: components/forum/ForumContent.tsx, components/forum/ForumSidebar.astro

import Layout from '../../layouts/Layout.astro';
import ForumContent from '../../components/forum/ForumContent';
import ForumSidebar from '../../components/forum/ForumSidebar.astro';
import { getForumStats } from '../../lib/forum-data';

const stats = getForumStats();
---

<Layout title="Forumas — foxDoc bendruomenė">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10">

    <!-- Header -->
    <div class="mb-8">
      <p class="text-xs font-mono mb-2" style="color: #00ca88; letter-spacing: 0.05em;">// forumas</p>
      <h1 class="font-heading font-bold mb-2" style="font-size: clamp(1.75rem, 4vw, 2.5rem); color: #ffffff;">
        foxDoc bendruomenė
      </h1>
      <p style="color: #a0aec0; font-size: 1rem; max-width: 36rem;">
        Diskutuokite apie viešuosius pirkimus, dalinkitės patirtimi ir gaukite pagalbą iš {stats.members} bendruomenės narių.
      </p>
    </div>

    <!-- Two column layout -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

      <!-- Main content (React island) -->
      <div>
        <ForumContent client:load />
      </div>

      <!-- Sidebar -->
      <div class="order-first lg:order-last">
        <ForumSidebar />
      </div>

    </div>
  </div>
</Layout>
```

**Step 2: Paleisti dev server ir patikrinti**

```bash
cd /c/Users/nj/projects/foxdoc/.worktrees/feat-landing/landing
bun run dev
```

Atidaryti `http://localhost:4321/forum` ir patikrinti:
- [ ] Thread sąrašas rodomas su visomis 12 temų
- [ ] Kategorijų tabs veikia (filtruoja)
- [ ] Sort veikia
- [ ] Search veikia (realitime)
- [ ] Sidebar rodo stats, tags, members
- [ ] "Sukurti temą" atidaro modalą
- [ ] Modalas submit rodo success state

**Step 3: Commit**

```bash
cd /c/Users/nj/projects/foxdoc/.worktrees/feat-landing
git add landing/src/pages/forum/index.astro
git commit -m "feat(forum): rewrite forum index with Discourse-style layout"
```

---

### Task 5: Perrašyti forum/[category].astro

**Files:**
- Modify: `.worktrees/feat-landing/landing/src/pages/forum/[category].astro`

**Step 1: Perrašyti puslapį**

```astro
---
// landing/src/pages/forum/[category].astro
// Forum category page — filtered thread list for single category
// Related: components/forum/ForumContent.tsx, lib/forum-data.ts

import Layout from '../../layouts/Layout.astro';
import ForumContent from '../../components/forum/ForumContent';
import ForumSidebar from '../../components/forum/ForumSidebar.astro';
import { categories, getThreadsByCategory, type CategorySlug } from '../../lib/forum-data';

export function getStaticPaths() {
  return categories.map(cat => ({
    params: { category: cat.slug },
    props: { category: cat },
  }));
}

const { category } = Astro.props;
const threadCount = getThreadsByCategory(category.slug as CategorySlug).length;
---

<Layout title={`${category.title} — foxDoc forumas`}>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10">

    <!-- Breadcrumb -->
    <div class="mb-6">
      <a href="/forum" class="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-white" style="color: #a0aec0;">
        ← Forumas
      </a>
    </div>

    <!-- Category header -->
    <div class="flex items-start gap-4 mb-8 p-5 rounded-2xl border" style="background: #141720; border-color: rgba(255,255,255,0.08);">
      <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
           style={`background: ${category.color}18;`}>
        {category.icon}
      </div>
      <div class="flex-1">
        <h1 class="font-heading font-bold text-white mb-1" style={`font-size: 1.5rem; color: ${category.color};`}>
          {category.title}
        </h1>
        <p class="text-sm mb-2" style="color: #a0aec0;">{category.description}</p>
        <p class="text-xs font-mono" style="color: #4a5568;">{threadCount} temos</p>
      </div>
    </div>

    <!-- Two column layout -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

      <!-- Content filtered to this category -->
      <div>
        <ForumContent client:load initialCategory={category.slug} />
      </div>

      <!-- Sidebar with other categories -->
      <div class="order-first lg:order-last">
        <ForumSidebar showCategories={true} />
      </div>

    </div>
  </div>
</Layout>
```

**Step 2: Patikrinti kategorijų puslapius**

Atidaryti kiekvieną:
- `http://localhost:4321/forum/bendri-klausimai`
- `http://localhost:4321/forum/technine-pagalba`
- `http://localhost:4321/forum/pirkimu-diskusijos`

Patikrinti:
- [ ] Breadcrumb rodo "← Forumas"
- [ ] Kategorijos header rodo teisingą pavadinimą ir spalvą
- [ ] Thread list filtruotas tik šiai kategorijai
- [ ] Sidebar rodo "Kategorijos" sekciją su kitomis kategorijomis

**Step 3: Build patikrinimas**

```bash
cd /c/Users/nj/projects/foxdoc/.worktrees/feat-landing/landing
bun run build 2>&1 | tail -10
```
Expected: `dist/` sukurtas, nėra klaidų

**Step 4: Mobile patikrinimas**

Chrome DevTools → Toggle device toolbar → 375px
- [ ] 1 stulpelis (sidebar po thread sąrašu)
- [ ] Kategorijų tabs horizontal scroll veikia
- [ ] Thread kortelės skaitomos

**Step 5: Galutinis commit**

```bash
cd /c/Users/nj/projects/foxdoc/.worktrees/feat-landing
git add landing/src/pages/forum/[category].astro
git commit -m "feat(forum): rewrite category page with header and filtered content"
```

---

### Task 6: Vizualinis patikrinimas ir cleanup

**Step 1: Patikrinti konsolę klaidų**

```bash
# Browser DevTools → Console
# Expected: nėra JavaScript klaidų
```

**Step 2: Patikrinti spalvų atitikimą dizaino sistemai**

Patikrinti kad nėra:
- [ ] `#231c18` (senų rudų spalvų)
- [ ] `#b5a99f` (seno teksto spalvos)
- [ ] `#f59e0b` ant mygtukų (tik ant Bendri klausimai kategorijos badge)

**Step 3: Galutinis commit**

```bash
cd /c/Users/nj/projects/foxdoc/.worktrees/feat-landing
git add -A
git commit -m "feat(forum): complete forum redesign — Discourse-style with mock data"
```
