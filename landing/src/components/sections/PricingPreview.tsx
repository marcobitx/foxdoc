// src/components/sections/PricingPreview.tsx
// Pricing preview with monthly/annual toggle — React island
import { useState } from 'react';

const plans = [
  { name: 'Free',    monthly: 0,   annual: 0,   credits: '3 (vienkartiniai)', users: 1,  highlight: false, cta: 'Pradėti nemokamai' },
  { name: 'Starter', monthly: 19,  annual: 16,  credits: '20/mėn.',          users: 1,  highlight: false, cta: 'Rinktis Starter' },
  { name: 'Pro',     monthly: 59,  annual: 49,  credits: '75/mėn.',          users: 3,  highlight: true,  cta: 'Rinktis Pro' },
  { name: 'Team',    monthly: 149, annual: 124, credits: '200/mėn.',         users: 10, highlight: false, cta: 'Rinktis Team' },
] as const;

export default function PricingPreview() {
  const [annual, setAnnual] = useState(false);

  return (
    <section style={{ padding: '4rem 1rem', background: '#0d0a08' }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            // kainodara
          </p>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 'clamp(1.75rem, 4vw, 3rem)', color: '#fdf9f7', lineHeight: 1.2, margin: '0 0 1rem' }}>
            Skaidri kainodara, nėra staigmenų
          </h2>
          <p style={{ color: '#b5a99f', marginBottom: '1.5rem' }}>
            Kreditais pagrįsta sistema — mokate tik už tai, ką naudojate
          </p>

          {/* Toggle */}
          <div style={{ display: 'inline-flex', gap: '0.25rem', padding: '0.25rem', borderRadius: '0.5rem', background: '#231c18', border: '1px solid rgba(168,162,158,0.15)' }}>
            <button
              onClick={() => setAnnual(false)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s',
                background: !annual ? '#2e2520' : 'transparent',
                color: !annual ? '#fdf9f7' : '#b5a99f',
              }}>
              Mėnesinis
            </button>
            <button
              onClick={() => setAnnual(true)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: annual ? '#2e2520' : 'transparent',
                color: annual ? '#fdf9f7' : '#b5a99f',
              }}>
              Metinis
              <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '9999px', background: 'rgba(245, 158, 11,0.15)', color: '#f59e0b', fontWeight: 600 }}>
                −17%
              </span>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {plans.map(plan => (
            <div key={plan.name} style={{
              padding: '1.5rem', borderRadius: '1rem', border: plan.highlight ? '1px solid rgba(245, 158, 11,0.35)' : '1px solid rgba(168,162,158,0.15)',
              background: plan.highlight ? 'rgba(245, 158, 11,0.05)' : '#231c18',
              boxShadow: plan.highlight ? '0 0 30px rgba(245, 158, 11,0.08)' : 'none',
              display: 'flex', flexDirection: 'column',
            }}>
              {plan.highlight && (
                <p style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b', marginBottom: '0.5rem' }}>★ Populiariausias</p>
              )}
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: '1.125rem', color: '#fdf9f7', margin: '0 0 0.5rem' }}>
                {plan.name}
              </h3>
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fdf9f7' }}>
                  €{annual ? plan.annual : plan.monthly}
                </span>
                {plan.monthly > 0 && <span style={{ fontSize: '0.875rem', color: '#b5a99f' }}>/mėn.</span>}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#b5a99f', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <p>✓ {plan.credits} kreditų</p>
                <p>✓ {plan.users} {plan.users === 1 ? 'vartotojas' : 'vartotojai'}</p>
              </div>
              <a href={`https://app.foxdoc.io?plan=${plan.name.toLowerCase()}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', minHeight: '44px', transition: 'all 0.2s',
                background: plan.highlight ? '#f59e0b' : 'transparent',
                color: plan.highlight ? '#1a1512' : '#fdf9f7',
                border: plan.highlight ? 'none' : '1px solid rgba(168,162,158,0.22)',
              }}>
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Link to full pricing */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a href="/pricing" style={{ fontSize: '0.875rem', color: '#f59e0b', textDecoration: 'none' }}
             onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
             onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}>
            Peržiūrėti visas kainas ir funkcijas →
          </a>
        </div>
      </div>
    </section>
  );
}
