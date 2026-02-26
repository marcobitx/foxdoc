// landing/src/components/sections/PricingFull.tsx
// Full pricing page — plans grid, feature comparison table, add-on packs, credit guide
// React island (client:load) for monthly/annual toggle interactivity

import { useState, Fragment } from 'react';

const s = {
  page: { maxWidth: '76rem', margin: '0 auto', padding: '5rem 1.5rem 4rem' } as React.CSSProperties,
  sectionLabel: { fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.75rem' },
  h2: { fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 'clamp(1.75rem, 4vw, 3rem)', color: '#fdf9f7', lineHeight: 1.2, margin: '0 0 0.75rem' },
  subtle: { color: '#b5a99f', marginBottom: '2rem' },
  card: (highlight: boolean): React.CSSProperties => ({
    position: 'relative', borderRadius: '1.25rem',
    border: highlight ? '1px solid rgba(245,158,11,0.45)' : '1px solid rgba(168,162,158,0.1)',
    outline: highlight ? '4px solid rgba(245,158,11,0.1)' : 'none',
    outlineOffset: '3px',
    background: highlight
      ? 'linear-gradient(155deg, #221608 0%, #1a1410 40%, #1c140a 100%)'
      : '#141210',
    boxShadow: highlight
      ? '0 0 60px rgba(245,158,11,0.1), 0 0 20px rgba(245,158,11,0.06), inset 0 1px 0 rgba(245,158,11,0.12)'
      : 'none',
    padding: '1.75rem',
    display: 'flex', flexDirection: 'column',
  }),
};

const plans = [
  {
    name: 'Free', monthly: 0, annual: 0, annualTotal: 0, credits: '3 vienkartiniai', users: '1', highlight: false,
    desc: 'Išbandykite be įsipareigojimų',
    cta: 'Pradėti nemokamai', ctaHref: 'https://app.foxdoc.io?plan=free',
    features: [
      { text: 'PDF, DOCX, XLSX analizė', ok: true },
      { text: 'Pagrindinė struktūrizuota ataskaita', ok: true },
      { text: '1 vartotojas', ok: true },
      { text: 'ZIP archyvų palaikymas', ok: false },
      { text: 'Eksportas PDF / DOCX', ok: false },
      { text: 'Chat Q&A su dokumentais', ok: false },
      { text: 'API prieiga', ok: false },
    ],
  },
  {
    name: 'Pro', monthly: 59, annual: 49, annualTotal: 590, credits: '75 / mėn.', users: '3', highlight: true,
    desc: 'Specialistams ir komandoms',
    cta: 'Rinktis Pro', ctaHref: 'https://app.foxdoc.io?plan=pro',
    features: [
      { text: 'Visi failų formatai + ZIP', ok: true },
      { text: 'Pilna ataskaita su QA balu', ok: true },
      { text: 'Eksportas PDF / DOCX', ok: true },
      { text: 'Chat Q&A su dokumentais', ok: true },
      { text: 'Iki 3 vartotojų', ok: true },
      { text: 'Prioritetinis apdorojimas', ok: true },
      { text: 'API prieiga', ok: false },
    ],
  },
  {
    name: 'Team', monthly: 149, annual: 124, annualTotal: 1490, credits: '200 / mėn.', users: '10', highlight: false,
    desc: 'Organizacijoms ir agentūroms',
    cta: 'Rinktis Team', ctaHref: 'https://app.foxdoc.io?plan=team',
    features: [
      { text: 'Visi Pro funkcijos', ok: true },
      { text: 'API prieiga', ok: true },
      { text: 'Iki 10 vartotojų', ok: true },
      { text: 'Prioritetinis palaikymas', ok: true },
      { text: 'Papildomi kreditų paketai', ok: true },
      { text: 'Pasirinktinė integracija', ok: true },
      { text: 'SLA garantija', ok: true },
    ],
  },
  {
    name: 'Enterprise', monthly: null, annual: null, annualTotal: null, credits: 'Neriboti', users: 'Neribota', highlight: false,
    desc: 'Didelėms organizacijoms',
    cta: 'Susisiekti', ctaHref: 'mailto:hello@foxdoc.io',
    features: [
      { text: 'Visi Team funkcijos', ok: true },
      { text: 'SSO / SAML', ok: true },
      { text: 'VPC / on-premise', ok: true },
      { text: 'GDPR DPA', ok: true },
      { text: 'Audito žurnalai', ok: true },
      { text: 'SLA garantija', ok: true },
      { text: 'Dedikuotas palaikymas', ok: true },
    ],
  },
] as const;

type FeatureGroup = { group: string; rows: { label: string; values: (boolean | string)[] }[] };

const featureGroups: FeatureGroup[] = [
  {
    group: 'Bazinės funkcijos',
    rows: [
      { label: 'Kreditai', values: ['3 (vienkartiniai)', '75/mėn.', '200/mėn.', 'Neriboti'] },
      { label: 'Vartotojai', values: ['1', '3', '10', 'Neribota'] },
      { label: 'PDF/DOCX/XLSX/ZIP analizė', values: [true, true, true, true] },
      { label: 'Ataskaita ekrane', values: [true, true, true, true] },
    ],
  },
  {
    group: 'Eksportas',
    rows: [
      { label: 'PDF eksportas', values: [false, true, true, true] },
      { label: 'DOCX eksportas', values: [false, true, true, true] },
      { label: 'Chat istorija', values: [false, true, true, true] },
    ],
  },
  {
    group: 'Pažangios funkcijos',
    rows: [
      { label: 'Modelio pasirinkimas', values: [false, true, true, true] },
      { label: 'Prioritetinė eilė', values: [false, true, true, true] },
    ],
  },
  {
    group: 'API ir integracija',
    rows: [
      { label: 'API prieiga', values: [false, false, true, true] },
      { label: 'Pasirinktiniai promptai', values: [false, false, true, true] },
      { label: 'Masinis įkėlimas', values: [false, false, true, true] },
    ],
  },
  {
    group: 'Įmonėms',
    rows: [
      { label: 'SSO/SAML', values: [false, false, false, true] },
      { label: 'VPC/on-premise', values: [false, false, false, true] },
      { label: 'SLA garantija', values: [false, false, false, true] },
      { label: 'GDPR DPA', values: [false, false, false, true] },
      { label: 'Audito žurnalai', values: [false, false, false, true] },
    ],
  },
];

const addons = [
  { credits: 10, price: 9, perCredit: '€0.90' },
  { credits: 50, price: 35, perCredit: '€0.70' },
  { credits: 100, price: 59, perCredit: '€0.59' },
];

const creditSizes = [
  { size: 'Standartinė (1–15 dok.)', credits: '1 kreditas' },
  { size: 'Didelė (16–50 dok., ZIP)', credits: '3 kreditai' },
  { size: 'Labai didelė (50+ dok.)', credits: '5 kreditai' },
];

const faqs = [
  { q: 'Ar kreditai perkeliami į kitą mėnesį?', a: 'Ne, mėnesiniai kreditai atsinaujina kiekvieną mėnesį ir neperkeliami. Papildomi (add-on) kreditų paketai galioja 12 mėnesių.' },
  { q: 'Ar galiu bet kada atšaukti prenumeratą?', a: 'Taip, galite atšaukti bet kada. Mokestis imamas iki ciklo pabaigos, po to prenumerata nesikartoja.' },
  { q: 'Kaip veikia kreditų skaičiavimas ZIP failams?', a: 'Sistema apskaičiuoja kreditų kainą prieš paleidžiant analizę ir parodo pranešimą. ZIP archyvai su 16–50 dokumentų kainuoja 3 kreditus.' },
];

function TableCheck({ yes }: { yes: boolean | string }) {
  if (typeof yes === 'string') return <span style={{ color: '#ede5df', fontSize: '0.8rem' }}>{yes}</span>;
  return yes
    ? <span style={{ color: '#f59e0b', fontSize: '1rem' }}>✓</span>
    : <span style={{ color: '#6d5f55', fontSize: '1rem' }}>✗</span>;
}

const FeatureCheck = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
    <circle cx="7" cy="7" r="7" fill="rgba(245,158,11,0.15)" />
    <path d="M4 7l2 2 4-4" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FeatureCross = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
    <circle cx="7" cy="7" r="7" fill="rgba(168,162,158,0.06)" />
    <path d="M5 9l4-4M9 9L5 5" stroke="rgba(168,162,158,0.25)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function PricingFull() {
  const [annual, setAnnual] = useState(true); // Default annual to encourage subscription

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer',
    fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s',
    background: active ? '#2e2520' : 'transparent',
    color: active ? '#fdf9f7' : '#b5a99f',
  });

  const ctaStyle = (highlight: boolean, enterprise: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0.75rem 1rem', borderRadius: '0.625rem', fontSize: '0.875rem',
    fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s',
    background: highlight ? '#f59e0b' : 'transparent',
    color: highlight ? '#0d0a08' : '#b5a99f',
    border: highlight ? 'none' : '1px solid rgba(168,162,158,0.15)',
  });

  return (
    <div style={{ background: '#0d0a08' }}>
      <div style={s.page}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <p style={s.sectionLabel}>// kainodara</p>
        <h1 style={{ ...s.h2, fontSize: 'clamp(2rem, 5vw, 3.75rem)' }}>
          Skaidri kainodara, nėra staigmenų
        </h1>
        <p style={s.subtle}>Kreditais pagrįsta sistema — mokate tik už tai, ką naudojate</p>

        {/* Toggle */}
        <div style={{ display: 'inline-flex', gap: '0.25rem', padding: '0.25rem', borderRadius: '0.5rem', background: '#231c18', border: '1px solid rgba(168,162,158,0.15)' }}>
          <button onClick={() => setAnnual(false)} style={toggleStyle(!annual)}>Mėnesinis</button>
          <button onClick={() => setAnnual(true)} style={{ ...toggleStyle(annual), display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Metinis
            <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '9999px', background: 'rgba(245, 158, 11,0.15)', color: '#f59e0b', fontWeight: 600 }}>
              −17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '4rem', alignItems: 'stretch' }}>
        {plans.map(plan => (
          <div key={plan.name} style={s.card(plan.highlight)}>
            {/* Popular badge */}
            {plan.highlight && (
              <div style={{
                position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)',
                background: '#f59e0b', color: '#0d0a08', fontSize: '0.65rem',
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                padding: '0.2rem 0.9rem', borderRadius: '0 0 0.5rem 0.5rem',
                letterSpacing: '0.06em', whiteSpace: 'nowrap',
              }}>
                ★ POPULIARIAUSIAS
              </div>
            )}

            {/* Plan header */}
            <div style={{ marginBottom: '1.25rem', paddingTop: plan.highlight ? '0.5rem' : 0 }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: '1rem', color: '#fdf9f7', margin: '0 0 0.25rem', letterSpacing: '0.01em' }}>
                {plan.name}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#5a4f47', margin: 0 }}>{plan.desc}</p>
            </div>

            {/* Price */}
            <div style={{ marginBottom: '1.5rem' }}>
              {plan.monthly === null ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fdf9f7', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>Individualiai</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                    <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fdf9f7', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1 }}>
                      €{annual ? plan.annual : plan.monthly}
                    </span>
                    {plan.monthly > 0 && <span style={{ fontSize: '0.8125rem', color: '#5a4f47' }}>/mėn.</span>}
                  </div>
                  {plan.monthly > 0 && annual && plan.annualTotal && (
                    <p style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.25rem', fontFamily: 'JetBrains Mono, monospace' }}>
                      Sutaupote €{(plan.monthly - plan.annual) * 12}/metus
                    </p>
                  )}
                </>
              )}
              <p style={{ fontSize: '0.75rem', color: '#7a6b61', marginTop: '0.375rem' }}>
                {plan.credits} kreditų
              </p>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(168,162,158,0.08)', marginBottom: '1.25rem' }} />

            {/* Features */}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.5rem' }}>
              {plan.features.map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  {f.ok ? <FeatureCheck /> : <FeatureCross />}
                  <span style={{ fontSize: '0.8125rem', lineHeight: 1.4, color: f.ok ? '#b5a99f' : '#3a3330' }}>{f.text}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <a href={plan.ctaHref} style={ctaStyle(plan.highlight, plan.name === 'Enterprise')}>
              {plan.cta}
            </a>
          </div>
        ))}
      </div>

      {/* Feature comparison table */}
      <div style={{ marginBottom: '4rem' }}>
        <h2 style={{ ...s.h2, fontSize: '1.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Pilnas funkcijų palyginimas
        </h2>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(168,162,158,0.22)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#b5a99f', fontWeight: 500, width: '30%' }}>Funkcija</th>
                {plans.map(p => (
                  <th key={p.name} style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: p.highlight ? '#f59e0b' : '#fdf9f7', fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif' }}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureGroups.map(group => (
                <Fragment key={group.group}>
                  <tr>
                    <td colSpan={5} style={{ padding: '1rem 1rem 0.5rem', fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.08em', borderTop: '1px solid rgba(168,162,158,0.10)' }}>
                      {group.group}
                    </td>
                  </tr>
                  {group.rows.map(row => (
                    <tr key={row.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.6rem 1rem', color: '#ede5df' }}>{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                          <TableCheck yes={v} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add-on credit packs */}
      <div style={{ marginBottom: '4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={s.sectionLabel}>// papildomi kreditai</p>
          <h2 style={{ ...s.h2, fontSize: '1.75rem' }}>Kreditų paketai</h2>
          <p style={{ ...s.subtle, marginBottom: 0 }}>Prieinama bet kuriame mokamame plane — naudokite kai reikia</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {addons.map(a => (
            <div key={a.credits} style={{ padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(168,162,158,0.15)', background: '#231c18', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2rem', fontWeight: 700, color: '#fdf9f7', margin: '0 0 0.25rem' }}>{a.credits}</p>
              <p style={{ color: '#b5a99f', fontSize: '0.875rem', margin: '0 0 1rem' }}>kreditų</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fdf9f7', margin: '0 0 0.25rem' }}>€{a.price}</p>
              <p style={{ fontSize: '0.75rem', color: '#ea580c', margin: '0 0 1.25rem' }}>{a.perCredit}/kreditas</p>
              <a href="https://app.foxdoc.io/billing" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid rgba(168,162,158,0.22)', color: '#fdf9f7', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'background 0.2s' }}>
                Pirkti
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Credit size guide */}
      <div style={{ marginBottom: '4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ ...s.h2, fontSize: '1.5rem' }}>Kiek kreditų naudoja analizė?</h2>
        </div>
        <div style={{ maxWidth: '36rem', margin: '0 auto', border: '1px solid rgba(168,162,158,0.15)', borderRadius: '0.75rem', overflow: 'hidden' }}>
          {creditSizes.map((c, i) => (
            <div key={c.size} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', borderBottom: i < creditSizes.length - 1 ? '1px solid rgba(168,162,158,0.10)' : 'none', background: i % 2 === 0 ? '#231c18' : '#2e2520' }}>
              <span style={{ color: '#ede5df', fontSize: '0.875rem' }}>{c.size}</span>
              <span style={{ color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem', fontWeight: 600 }}>{c.credits}</span>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#6d5f55', fontSize: '0.75rem', marginTop: '0.75rem' }}>
          Sistema apskaičiuoja kreditų kainą prieš kiekvieną analizę ir parodo pranešimą
        </p>
      </div>

      {/* FAQ strip */}
      <div style={{ maxWidth: '48rem', margin: '0 auto 4rem' }}>
        <h2 style={{ ...s.h2, fontSize: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>D.U.K. apie kainodara</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map(f => (
            <div key={f.q} style={{ padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(168,162,158,0.15)', background: '#231c18' }}>
              <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: '#fdf9f7', margin: '0 0 0.5rem', fontSize: '0.95rem' }}>{f.q}</p>
              <p style={{ color: '#b5a99f', margin: 0, fontSize: '0.875rem', lineHeight: 1.6 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Enterprise CTA */}
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem', borderRadius: '1rem', background: 'linear-gradient(135deg, rgba(234, 88, 12,0.15) 0%, rgba(245, 158, 11,0.08) 100%)', border: '1px solid rgba(168,162,158,0.15)' }}>
        <h2 style={{ ...s.h2, fontSize: '1.75rem', marginBottom: '0.75rem' }}>Reikia individualaus sprendimo?</h2>
        <p style={{ ...s.subtle, marginBottom: '1.5rem' }}>Didelės organizacijos, savivaldybės ir centriniai perkantys subjektai — susisiekite dėl Enterprise kainos</p>
        <a href="mailto:hello@foxdoc.io" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.875rem 2rem', borderRadius: '0.5rem', background: '#f59e0b', color: '#1a1512', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>
          Susisiekti su komanda
        </a>
      </div>
    </div>
    </div>
  );
}