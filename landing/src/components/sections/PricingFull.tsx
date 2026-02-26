// landing/src/components/sections/PricingFull.tsx
// Full pricing page — plans grid, feature comparison table, add-on packs, credit guide
// React island (client:load) for monthly/annual toggle interactivity

import { useState } from 'react';

const s = {
  page: { maxWidth: '72rem', margin: '0 auto', padding: '5rem 1.5rem 4rem' } as React.CSSProperties,
  sectionLabel: { fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', color: '#00ca88', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.75rem' },
  h2: { fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 'clamp(1.75rem, 4vw, 3rem)', color: '#fff', lineHeight: 1.2, margin: '0 0 0.75rem' },
  subtle: { color: '#a0aec0', marginBottom: '2rem' },
  card: (highlight: boolean): React.CSSProperties => ({
    padding: '1.5rem', borderRadius: '1rem', border: highlight ? '1px solid rgba(0,202,136,0.35)' : '1px solid rgba(255,255,255,0.08)',
    background: highlight ? 'rgba(0,202,136,0.05)' : '#141720',
    boxShadow: highlight ? '0 0 30px rgba(0,202,136,0.08)' : 'none',
    display: 'flex', flexDirection: 'column', position: 'relative',
  }),
};

const plans = [
  {
    name: 'Free', monthly: 0, annual: 0, credits: '3 (vienkartiniai)', users: '1', highlight: false,
    cta: 'Pradėti nemokamai', ctaHref: 'https://app.foxdoc.io',
    features: ['Analizė ekrane', 'PDF/DOCX/XLSX/ZIP', '1 vartotojas'],
  },
  {
    name: 'Starter', monthly: 19, annual: 16, annualTotal: 190, credits: '20/mėn.', users: '1', highlight: false,
    cta: 'Rinktis Starter', ctaHref: 'https://app.foxdoc.io?plan=starter',
    features: ['PDF eksportas', 'Chat istorija', '1 vartotojas'],
  },
  {
    name: 'Pro', monthly: 59, annual: 49, annualTotal: 590, credits: '75/mėn.', users: '3', highlight: true,
    cta: 'Rinktis Pro', ctaHref: 'https://app.foxdoc.io?plan=pro',
    features: ['DOCX eksportas', 'Modelio pasirinkimas', 'Prioritetinė eilė', '3 vartotojai'],
  },
  {
    name: 'Team', monthly: 149, annual: 124, annualTotal: 1490, credits: '200/mėn.', users: '10', highlight: false,
    cta: 'Rinktis Team', ctaHref: 'https://app.foxdoc.io?plan=team',
    features: ['API prieiga', 'Pasirinktiniai promptai', 'Masinis įkėlimas', '10 vartotojų'],
  },
  {
    name: 'Enterprise', monthly: null, annual: null, credits: 'Neriboti', users: 'Neribota', highlight: false,
    cta: 'Susisiekti', ctaHref: 'mailto:hello@foxdoc.io',
    features: ['SSO/SAML', 'VPC/on-premise', 'SLA garantija', 'GDPR DPA', 'Audito žurnalai'],
  },
] as const;

type FeatureGroup = { group: string; rows: { label: string; values: (boolean | string)[] }[] };

const featureGroups: FeatureGroup[] = [
  {
    group: 'Bazinės funkcijos',
    rows: [
      { label: 'Kreditai', values: ['3 (vienkartiniai)', '20/mėn.', '75/mėn.', '200/mėn.', 'Neriboti'] },
      { label: 'Vartotojai', values: ['1', '1', '3', '10', 'Neribota'] },
      { label: 'PDF/DOCX/XLSX/ZIP analizė', values: [true, true, true, true, true] },
      { label: 'Ataskaita ekrane', values: [true, true, true, true, true] },
    ],
  },
  {
    group: 'Eksportas',
    rows: [
      { label: 'PDF eksportas', values: [false, true, true, true, true] },
      { label: 'DOCX eksportas', values: [false, false, true, true, true] },
      { label: 'Chat istorija', values: [false, true, true, true, true] },
    ],
  },
  {
    group: 'Pažangios funkcijos',
    rows: [
      { label: 'Modelio pasirinkimas', values: [false, false, true, true, true] },
      { label: 'Prioritetinė eilė', values: [false, false, true, true, true] },
    ],
  },
  {
    group: 'API ir integracija',
    rows: [
      { label: 'API prieiga', values: [false, false, false, true, true] },
      { label: 'Pasirinktiniai promptai', values: [false, false, false, true, true] },
      { label: 'Masinis įkėlimas', values: [false, false, false, true, true] },
    ],
  },
  {
    group: 'Įmonėms',
    rows: [
      { label: 'SSO/SAML', values: [false, false, false, false, true] },
      { label: 'VPC/on-premise', values: [false, false, false, false, true] },
      { label: 'SLA garantija', values: [false, false, false, false, true] },
      { label: 'GDPR DPA', values: [false, false, false, false, true] },
      { label: 'Audito žurnalai', values: [false, false, false, false, true] },
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

function Check({ yes }: { yes: boolean | string }) {
  if (typeof yes === 'string') return <span style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>{yes}</span>;
  return yes
    ? <span style={{ color: '#00ca88', fontSize: '1rem' }}>✓</span>
    : <span style={{ color: '#4a5568', fontSize: '1rem' }}>✗</span>;
}

export default function PricingFull() {
  const [annual, setAnnual] = useState(false);

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer',
    fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s',
    background: active ? '#1a1f2e' : 'transparent',
    color: active ? '#fff' : '#a0aec0',
  });

  const ctaStyle = (highlight: boolean, enterprise: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem',
    fontWeight: 600, textDecoration: 'none', minHeight: '44px', transition: 'all 0.2s',
    marginTop: 'auto',
    background: highlight ? '#00ca88' : enterprise ? 'transparent' : 'transparent',
    color: highlight ? '#0d0f14' : '#fff',
    border: highlight ? 'none' : '1px solid rgba(255,255,255,0.12)',
  });

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <p style={s.sectionLabel}>// kainodara</p>
        <h1 style={{ ...s.h2, fontSize: 'clamp(2rem, 5vw, 3.75rem)' }}>
          Skaidri kainodara, nėra staigmenų
        </h1>
        <p style={s.subtle}>Kreditais pagrįsta sistema — mokate tik už tai, ką naudojate</p>

        {/* Toggle */}
        <div style={{ display: 'inline-flex', gap: '0.25rem', padding: '0.25rem', borderRadius: '0.5rem', background: '#141720', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setAnnual(false)} style={toggleStyle(!annual)}>Mėnesinis</button>
          <button onClick={() => setAnnual(true)} style={{ ...toggleStyle(annual), display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Metinis
            <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '9999px', background: 'rgba(0,202,136,0.15)', color: '#00ca88', fontWeight: 600 }}>
              −17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '4rem' }}>
        {plans.map(plan => (
          <div key={plan.name} style={s.card(plan.highlight)}>
            {plan.highlight && (
              <span style={{ position: 'absolute', top: '-0.75rem', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', color: '#00ca88', background: '#0d0f14', border: '1px solid rgba(0,202,136,0.35)', padding: '0.2rem 0.75rem', borderRadius: '9999px', whiteSpace: 'nowrap' }}>
                ★ Populiariausias
              </span>
            )}
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: '1.125rem', color: '#fff', margin: plan.highlight ? '0.75rem 0 0.5rem' : '0 0 0.5rem' }}>
              {plan.name}
            </h3>

            {/* Price */}
            <div style={{ marginBottom: '1rem' }}>
              {plan.monthly === null ? (
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>Individualiai</span>
              ) : (
                <>
                  <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>
                    €{annual && plan.annual !== null ? plan.annual : plan.monthly}
                  </span>
                  {plan.monthly > 0 && <span style={{ fontSize: '0.875rem', color: '#a0aec0' }}>/mėn.</span>}
                  {annual && 'annualTotal' in plan && plan.annualTotal && (
                    <p style={{ fontSize: '0.75rem', color: '#a0aec0', margin: '0.25rem 0 0' }}>
                      €{plan.annualTotal}/metai — <span style={{ color: '#00ca88' }}>sutaupote €{ (plan.monthly * 12) - plan.annualTotal}</span>
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Credits + users */}
            <div style={{ fontSize: '0.875rem', color: '#a0aec0', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <p style={{ margin: 0 }}>✓ {plan.credits} kreditų</p>
              <p style={{ margin: 0 }}>✓ {plan.users} {plan.users === '1' ? 'vartotojas' : 'vartotojai'}</p>
            </div>

            {/* Feature highlights */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', fontSize: '0.8rem', color: '#a0aec0', display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                  <span style={{ color: '#00ca88', flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>

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
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#a0aec0', fontWeight: 500, width: '30%' }}>Funkcija</th>
                {plans.map(p => (
                  <th key={p.name} style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: p.highlight ? '#00ca88' : '#fff', fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif' }}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureGroups.map(group => (
                <>
                  <tr key={group.group}>
                    <td colSpan={6} style={{ padding: '1rem 1rem 0.5rem', fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.08em', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {group.group}
                    </td>
                  </tr>
                  {group.rows.map(row => (
                    <tr key={row.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.6rem 1rem', color: '#e2e8f0' }}>{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                          <Check yes={v} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
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
            <div key={a.credits} style={{ padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)', background: '#141720', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2rem', fontWeight: 700, color: '#fff', margin: '0 0 0.25rem' }}>{a.credits}</p>
              <p style={{ color: '#a0aec0', fontSize: '0.875rem', margin: '0 0 1rem' }}>kreditų</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '0 0 0.25rem' }}>€{a.price}</p>
              <p style={{ fontSize: '0.75rem', color: '#7c3aed', margin: '0 0 1.25rem' }}>{a.perCredit}/kreditas</p>
              <a href="https://app.foxdoc.io/billing" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, minHeight: '44px', transition: 'background 0.2s' }}>
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
        <div style={{ maxWidth: '36rem', margin: '0 auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', overflow: 'hidden' }}>
          {creditSizes.map((c, i) => (
            <div key={c.size} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', borderBottom: i < creditSizes.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', background: i % 2 === 0 ? '#141720' : '#1a1f2e' }}>
              <span style={{ color: '#e2e8f0', fontSize: '0.875rem' }}>{c.size}</span>
              <span style={{ color: '#00ca88', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem', fontWeight: 600 }}>{c.credits}</span>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#4a5568', fontSize: '0.75rem', marginTop: '0.75rem' }}>
          Sistema apskaičiuoja kreditų kainą prieš kiekvieną analizę ir parodo pranešimą
        </p>
      </div>

      {/* FAQ strip */}
      <div style={{ maxWidth: '48rem', margin: '0 auto 4rem' }}>
        <h2 style={{ ...s.h2, fontSize: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>D.U.K. apie kainodoarą</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map(f => (
            <div key={f.q} style={{ padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.08)', background: '#141720' }}>
              <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: '#fff', margin: '0 0 0.5rem', fontSize: '0.95rem' }}>{f.q}</p>
              <p style={{ color: '#a0aec0', margin: 0, fontSize: '0.875rem', lineHeight: 1.6 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Enterprise CTA */}
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem', borderRadius: '1rem', background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(0,202,136,0.08) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ ...s.h2, fontSize: '1.75rem', marginBottom: '0.75rem' }}>Reikia individualaus sprendimo?</h2>
        <p style={{ ...s.subtle, marginBottom: '1.5rem' }}>Didelės organizacijos, savivaldybės ir centriniai perkantys subjektai — susisiekite dėl Enterprise kainos</p>
        <a href="mailto:hello@foxdoc.io" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.875rem 2rem', borderRadius: '0.5rem', background: '#00ca88', color: '#0d0f14', fontWeight: 600, textDecoration: 'none', minHeight: '44px', fontSize: '1rem' }}>
          Susisiekti su komanda
        </a>
      </div>
    </div>
  );
}
