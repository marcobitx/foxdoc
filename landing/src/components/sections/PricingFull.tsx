// landing/src/components/sections/PricingFull.tsx
// Full pricing page — plans grid, feature comparison table, add-on packs, credit guide
// React island (client:load) for monthly/annual toggle interactivity

import { useState, Fragment } from 'react';
import { motion } from 'framer-motion';

const REEL_LH = 1.1; // line-height in em

const SlotReel = ({ digit, delay = 0, color, fontSize }: {
  digit: string; delay?: number; color: string; fontSize: string;
}) => {
  const num = parseInt(digit);
  // Build reel: 3 full spins through 0-9, land on target
  const reel: number[] = [];
  for (let i = 0; i < 3; i++) for (let d = 0; d < 10; d++) reel.push(d);
  reel.push(num);
  const finalY = -(reel.length - 1) * REEL_LH;

  return (
    <span style={{ display: 'inline-block', overflow: 'hidden', height: `${REEL_LH}em`, verticalAlign: 'bottom', fontSize }}>
      <motion.span
        initial={{ y: 0 }}
        animate={{ y: `${finalY}em` }}
        transition={{ duration: 1.4, delay, ease: [0.06, 0.87, 0.18, 1] }}
        style={{ display: 'flex', flexDirection: 'column', color, fontWeight: 300, letterSpacing: '-0.04em', fontFamily: 'Space Grotesk, sans-serif', lineHeight: REEL_LH }}
      >
        {reel.map((d, i) => (
          <span key={i} style={{ display: 'block', height: `${REEL_LH}em`, lineHeight: `${REEL_LH}em` }}>{d}</span>
        ))}
      </motion.span>
    </span>
  );
};

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
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
    <circle cx="7.5" cy="7.5" r="6.5" stroke="rgba(245,158,11,0.28)" strokeWidth="1"/>
    <path d="M4.5 7.5l2 2 4-4" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FeatureCross = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
    <circle cx="7.5" cy="7.5" r="6.5" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
    <path d="M5.5 9.5l4-4M9.5 9.5l-4-4" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function PricingFull() {
  const [annual, setAnnual] = useState(true); // Default annual to encourage subscription
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [hoveredCta, setHoveredCta] = useState<string | null>(null);

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
    <div style={{ background: 'linear-gradient(180deg, #fdf6ec 0%, #f5e4ca 12%, #2a180e 24%, #0d0a08 34%)' }}>
      <div style={s.page}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <p style={s.sectionLabel}>// kainodara</p>
        <h1 style={{ ...s.h2, fontSize: 'clamp(2rem, 5vw, 3.75rem)', color: '#1a1512' }}>
          Skaidri kainodara, nėra staigmenų
        </h1>
        <p style={{ ...s.subtle, color: '#4a3f38' }}>Kreditais pagrįsta sistema — mokate tik už tai, ką naudojate</p>

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: '1.25rem', marginBottom: '5rem', alignItems: 'stretch', paddingTop: '1.5rem' }}>
        {plans.map(plan => (
          <div key={plan.name} style={{ position: 'relative', zIndex: plan.highlight ? 2 : 1, display: 'flex', flexDirection: 'column' }}>

            {/* Accent bottom card — only for highlighted plan */}
            {plan.highlight && (
              <div style={{
                position: 'absolute',
                top: '-25px',
                left: '-3px',
                right: '-3px',
                bottom: '-3px',
                borderRadius: '1.5rem',
                background: '#f59e0b',
              }} />
            )}

            <div style={{
              position: 'relative',
              zIndex: 1,
              borderRadius: '1.5rem',
              padding: '3rem 2.25rem 2.25rem',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              background: plan.highlight
                ? 'radial-gradient(ellipse 110% 55% at 50% -5%, rgba(245,158,11,0.28) 0%, #2c1e0a 45%, #251709 100%)'
                : '#251709',
              border: plan.highlight
                ? '1px solid rgba(245,158,11,0.3)'
                : '1px solid rgba(255,255,255,0.06)',
              boxShadow: plan.highlight
                ? '0 40px 100px rgba(0,0,0,0.65), inset 0 1px 0 rgba(245,158,11,0.2)'
                : '0 8px 24px rgba(0,0,0,0.35)',
            }}>

            {/* Badge — tab hanging from top center */}
            {plan.highlight && (
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                transform: 'translateY(-70%)',
                background: 'transparent',
                color: '#1a0f00',
                fontSize: '0.75rem',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 900,
                textShadow: '0 1px 0 rgba(255,200,80,0.25)',
                WebkitTextStroke: '0.3px rgba(0,0,0,0.15)',
                padding: '0.275rem 1.125rem 0.375rem',
                letterSpacing: '0.14em',
                whiteSpace: 'nowrap',
              }}>
                POPULIARU
              </div>
            )}

            {/* Plan label + desc */}
            <div style={{ marginBottom: '2rem' }}>
              <p style={{
                fontSize: '0.8125rem',
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: 700,
                color: plan.highlight ? '#f59e0b' : '#c4b8b0',
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                margin: '0 0 0.5rem',
              }}>
                {plan.name}
              </p>
              <p style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: 500,
                fontSize: '0.9375rem',
                color: plan.highlight ? '#c8b8ae' : '#b5a99f',
                margin: 0,
                lineHeight: 1.35,
              }}>
                {plan.desc}
              </p>
            </div>

            {/* Price */}
            <div style={{ marginBottom: '2rem' }}>
              {plan.monthly === null ? (
                <>
                  <p style={{
                    fontSize: 'clamp(2rem, 3vw, 2.5rem)',
                    fontWeight: 300,
                    letterSpacing: '-0.03em',
                    color: '#fdf9f7',
                    fontFamily: 'Space Grotesk, sans-serif',
                    lineHeight: 1,
                    margin: '0 0 0.5rem',
                  }}>
                    Individualiai
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: '#8a7e78', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>Pagal poreikius</p>
                </>
              ) : plan.monthly === 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.125rem', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 400, color: '#8a7e78', marginTop: '0.6rem', fontFamily: 'Space Grotesk, sans-serif' }}>€</span>
                    <span style={{
                      fontSize: 'clamp(3rem, 4.5vw, 3.75rem)',
                      fontWeight: 300,
                      letterSpacing: '-0.04em',
                      color: '#fdf9f7',
                      fontFamily: 'Space Grotesk, sans-serif',
                      lineHeight: 1,
                    }}>0</span>
                  </div>
                  <p style={{ fontSize: '0.6875rem', color: '#8a7e78', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>visada nemokama · {plan.credits} kreditų</p>
                </>
              ) : (
                <>
                  <p style={{
                    fontSize: '0.8125rem',
                    color: '#6d6058',
                    marginBottom: '0.375rem',
                    textDecoration: 'line-through',
                    fontFamily: 'Space Grotesk, sans-serif',
                    letterSpacing: '-0.01em',
                    visibility: annual ? 'visible' : 'hidden',
                  }}>
                    €{plan.monthly}/mėn.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.125rem', marginBottom: '0.25rem' }}>
                    <span style={{
                      fontSize: '1rem',
                      fontWeight: 400,
                      color: plan.highlight ? '#d97706' : '#8a7e78',
                      marginTop: '0.6rem',
                      fontFamily: 'Space Grotesk, sans-serif',
                    }}>€</span>
                    {String(annual ? plan.annual : plan.monthly).split('').map((digit, i) => (
                      <SlotReel
                        key={`${annual ? 'a' : 'm'}-${i}`}
                        digit={digit}
                        delay={i * 0.07}
                        color={plan.highlight ? '#f59e0b' : '#fdf9f7'}
                        fontSize="clamp(3rem, 4.5vw, 3.75rem)"
                      />
                    ))}
                    <span style={{ fontSize: '0.75rem', color: '#8a7e78', alignSelf: 'flex-end', marginBottom: '0.4rem', marginLeft: '0.125rem', fontFamily: 'JetBrains Mono, monospace' }}>/mėn.</span>
                  </div>
                  <p style={{
                    fontSize: '0.6875rem',
                    color: '#22c55e',
                    margin: '0 0 0.375rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    visibility: annual && plan.annualTotal ? 'visible' : 'hidden',
                  }}>
                    ↓ €{plan.annualTotal ? (plan.monthly - plan.annual) * 12 : 0} sutaupote per metus
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: '#8a7e78', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>{plan.credits} kreditų / mėn.</p>
                </>
              )}
            </div>

            {/* Thin separator */}
            <div style={{
              height: '1px',
              background: plan.highlight ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)',
              marginBottom: '1.625rem',
            }} />

            {/* Features */}
            <ul style={{
              listStyle: 'none', margin: 0, padding: 0,
              flex: 1, display: 'flex', flexDirection: 'column',
              gap: '0.8125rem', marginBottom: '2rem',
            }}>
              {plan.features.map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                  {f.ok ? <FeatureCheck /> : <FeatureCross />}
                  <span style={{
                    fontSize: '0.8125rem',
                    lineHeight: 1.45,
                    color: f.ok
                      ? (plan.highlight ? '#c4b4a8' : '#b5a99f')
                      : '#5a5050',
                  }}>
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <a
              href={plan.ctaHref}
              onMouseEnter={() => setHoveredCta(plan.name)}
              onMouseLeave={() => setHoveredCta(null)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0.9375rem 1rem',
                borderRadius: '0.875rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '0.02em',
                transition: 'background 0.25s, border-color 0.25s, box-shadow 0.25s, color 0.25s',
                ...(plan.highlight ? {
                  background: 'linear-gradient(135deg, #f59e0b 0%, #e88c0a 100%)',
                  color: '#0d0a08',
                  border: 'none',
                  boxShadow: hoveredCta === plan.name
                    ? '0 4px 16px rgba(245,158,11,0.28)'
                    : '0 2px 8px rgba(245,158,11,0.12)',
                  opacity: hoveredCta === plan.name ? 0.92 : 1,
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  color: '#ede5df',
                  border: hoveredCta === plan.name
                    ? '1px solid rgba(255,255,255,0.22)'
                    : '1px solid rgba(255,255,255,0.10)',
                  boxShadow: 'none',
                }),
              }}
            >
              {plan.cta}
            </a>
            </div>
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
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', color: '#d97706', marginBottom: '0.5rem' }}>// dažni klausimai</p>
          <h2 style={{ ...s.h2, fontSize: '1.5rem' }}>D.U.K. apie kainodara</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {faqs.map((f, i) => (
            <div key={f.q} style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', background: '#ffffff' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.25rem', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', minHeight: '56px' }}
                aria-expanded={openFaq === i}
              >
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 500, fontSize: '0.9375rem', color: '#1a1512' }}>{f.q}</span>
                <span style={{ flexShrink: 0, fontSize: '1.25rem', color: '#ea580c', transition: 'transform 0.3s', transform: openFaq === i ? 'rotate(45deg)' : 'none', lineHeight: 1 }}>+</span>
              </button>
              {openFaq === i && (
                <p style={{ margin: 0, padding: '0 1.25rem 1rem', fontSize: '0.875rem', lineHeight: 1.7, color: '#4a3f38' }}>{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Enterprise CTA */}
      <div style={{ padding: '3rem', borderRadius: '1rem', border: '1px solid rgba(180,130,60,0.3)', position: 'relative', overflow: 'hidden' }}>
        {/* Background photo */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: '1rem', backgroundImage: "url('/images/cta-bg-m.png')", backgroundSize: 'cover', backgroundPosition: 'right center', backgroundRepeat: 'no-repeat' }} />
        {/* Left-aligned content */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '32rem' }}>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '1.75rem', color: '#fdf9f7', margin: '0 0 0.75rem', letterSpacing: '-0.01em' }}>Reikia individualaus sprendimo?</h2>
          <p style={{ color: '#e5d9ce', marginBottom: '1.5rem', fontSize: '0.9375rem', lineHeight: 1.6 }}>Didelės organizacijos, savivaldybės ir centriniai perkantys subjektai — susisiekite dėl Enterprise kainos</p>
          <a href="mailto:hello@foxdoc.io" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2rem', borderRadius: '0.5rem', background: '#f59e0b', color: '#1a1512', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>
            Susisiekti su komanda
          </a>
        </div>
      </div>
    </div>
    </div>
  );
}