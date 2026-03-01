// src/components/sections/PricingPreview.tsx
// Pricing preview with monthly/annual toggle — React island
// Full feature lists per plan, premium card hierarchy with amber glow on Pro
// Related: index.astro, pages/pricing.astro

import { useState } from 'react';

const plans = [
  {
    name: 'Free',
    monthly: 0,
    annual: 0,
    desc: 'Išbandykite be įsipareigojimų',
    credits: '3 vienkartiniai',
    users: 1,
    highlight: false,
    cta: 'Pradėti nemokamai',
    ctaHref: '/auth?plan=free',
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
    name: 'Pro',
    monthly: 59,
    annual: 49,
    desc: 'Specialistams ir komandoms',
    credits: '75 / mėn.',
    users: 3,
    highlight: true,
    cta: 'Rinktis Pro',
    ctaHref: '/auth?plan=pro',
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
    name: 'Team',
    monthly: 149,
    annual: 124,
    desc: 'Organizacijoms ir agentūroms',
    credits: '200 / mėn.',
    users: 10,
    highlight: false,
    cta: 'Rinktis Team',
    ctaHref: '/auth?plan=team',
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
] as const;

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
    <circle cx="7" cy="7" r="7" fill="rgba(245,158,11,0.15)" />
    <path d="M4 7l2 2 4-4" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Cross = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
    <circle cx="7" cy="7" r="7" fill="rgba(168,162,158,0.06)" />
    <path d="M5 9l4-4M9 9L5 5" stroke="rgba(168,162,158,0.35)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function PricingPreview() {
  const [annual, setAnnual] = useState(true); // Default annual to encourage subscription

  return (
    <section style={{ padding: '5rem 1rem', background: '#0d0a08' }}>
      <div style={{ maxWidth: '76rem', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{
            fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace',
            color: '#f59e0b', marginBottom: '0.75rem', letterSpacing: '0.08em',
          }}>
            // kainodara
          </p>
          <h2 style={{
            fontFamily: 'var(--font-heading, Space Grotesk, sans-serif)', fontWeight: 700,
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', color: '#fdf9f7',
            lineHeight: 1.15, margin: '0 0 0.75rem',
          }}>
            Skaidri kainodara
          </h2>
          <p style={{ color: '#7a6b61', fontSize: '0.9375rem', marginBottom: '1.75rem' }}>
            Kreditais pagrįsta sistema — mokate tik už tai, ką naudojate
          </p>

          {/* Toggle */}
          <div style={{
            display: 'inline-flex', gap: '0.25rem', padding: '0.25rem',
            borderRadius: '0.625rem', background: '#1a1410',
            border: '1px solid rgba(168,162,158,0.12)',
          }}>
            {(['Mėnesinis', 'Metinis'] as const).map((label, idx) => {
              const active = idx === 0 ? !annual : annual;
              return (
                <button
                  key={label}
                  onClick={() => setAnnual(idx === 1)}
                  style={{
                    padding: '0.5rem 1.125rem', borderRadius: '0.375rem', border: 'none',
                    cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500,
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: active ? '#2e2318' : 'transparent',
                    color: active ? '#fdf9f7' : '#7a6b61',
                  }}>
                  {label}
                  {label === 'Metinis' && (
                    <span style={{
                      fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '99px',
                      background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700,
                      letterSpacing: '0.02em',
                    }}>−17%</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Plans */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem', alignItems: 'stretch',
        }}>
          {plans.map(plan => (
            <div
              key={plan.name}
              style={{
                position: 'relative', borderRadius: '1.25rem',
                border: plan.highlight ? '1px solid rgba(245,158,11,0.45)' : '1px solid rgba(168,162,158,0.1)',
                // Double border effect via outline for Pro
                outline: plan.highlight ? '4px solid rgba(245,158,11,0.1)' : 'none',
                outlineOffset: '3px',
                background: plan.highlight
                  ? 'linear-gradient(155deg, #221608 0%, #1a1410 40%, #1c140a 100%)'
                  : '#141210',
                boxShadow: plan.highlight
                  ? '0 0 60px rgba(245,158,11,0.1), 0 0 20px rgba(245,158,11,0.06), inset 0 1px 0 rgba(245,158,11,0.12)'
                  : 'none',
                padding: '1.75rem',
                display: 'flex', flexDirection: 'column',
              }}>

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
                <h3 style={{
                  fontFamily: 'var(--font-heading, Space Grotesk, sans-serif)',
                  fontWeight: 600, fontSize: '1rem', color: '#fdf9f7',
                  margin: '0 0 0.25rem', letterSpacing: '0.01em',
                }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#5a4f47', margin: 0 }}>{plan.desc}</p>
              </div>

              {/* Price */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{
                    fontSize: '2.25rem', fontWeight: 800, color: '#fdf9f7',
                    fontFamily: 'var(--font-heading, Space Grotesk, sans-serif)', lineHeight: 1,
                  }}>
                    €{annual ? plan.annual : plan.monthly}
                  </span>
                  {plan.monthly > 0 && (
                    <span style={{ fontSize: '0.8125rem', color: '#5a4f47' }}>/mėn.</span>
                  )}
                </div>
                {plan.monthly > 0 && annual && (
                  <p style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.25rem', fontFamily: 'JetBrains Mono, monospace' }}>
                    Sutaupote €{(plan.monthly - plan.annual) * 12}/metus
                  </p>
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
                    {f.ok ? <Check /> : <Cross />}
                    <span style={{
                      fontSize: '0.8125rem', lineHeight: 1.4,
                      color: f.ok ? '#b5a99f' : '#3a3330',
                    }}>{f.text}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={plan.ctaHref}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0.4375rem 1rem', borderRadius: '0.375rem',
                  fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none',
                  transition: 'all 0.2s',
                  background: plan.highlight ? '#f59e0b' : 'transparent',
                  color: plan.highlight ? '#0d0a08' : '#b5a99f',
                  border: plan.highlight ? 'none' : '1px solid rgba(168,162,158,0.15)',
                }}
                onMouseOver={e => {
                  if (!plan.highlight) {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(245,158,11,0.3)';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#fdf9f7';
                  } else {
                    (e.currentTarget as HTMLAnchorElement).style.background = '#fbbf24';
                  }
                }}
                onMouseOut={e => {
                  if (!plan.highlight) {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(168,162,158,0.15)';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#b5a99f';
                  } else {
                    (e.currentTarget as HTMLAnchorElement).style.background = '#f59e0b';
                  }
                }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Bottom link */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a
            href="/pricing"
            style={{ fontSize: '0.8125rem', color: '#5a4f47', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseOver={e => (e.currentTarget.style.color = '#f59e0b')}
            onMouseOut={e => (e.currentTarget.style.color = '#5a4f47')}
          >
            Peržiūrėti visas kainas ir funkcijas →
          </a>
        </div>

      </div>
    </section>
  );
}
