// frontend/tailwind.config.cjs
// Design system tokens — Procurement Analyzer
// "Citrus Noir" — lime chartreuse primary, warm peach accent, deep neutral bg
// Inspired by @zeeuiux color hierarchy: Primary → Accent → Semantic → Neutrals

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      colors: {
        // Primary — Brand color (lime/chartreuse)
        brand: {
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16',
          600: '#65a30d',
          700: '#4d7c0f',
          800: '#3f6212',
          900: '#365314',
          950: '#1a2e05',
        },
        // Accent — Actions & highlights (warm peach/sand)
        accent: {
          50: '#fef7ee',
          100: '#fdedd3',
          200: '#fbd7a5',
          300: '#f8bc6d',
          400: '#f4a261',
          500: '#ef8633',
          600: '#e06d1b',
          700: '#ba5318',
          800: '#94431b',
          900: '#783919',
          950: '#411b0a',
        },
        // Neutrals — warm grays (NOT blue-tinted)
        surface: {
          50: '#fafaf9',
          100: '#f0efed',
          200: '#d6d3ce',
          300: '#a8a29e',
          400: '#78716c',
          500: '#57534e',
          600: '#44403c',
          700: '#292524',
          800: '#1c1917',
          900: '#120f0d',
          950: '#0a0908',
        },
      },
      backgroundImage: {
        // Unified page gradient — deep warm black with very subtle color hints
        'gradient-page': `
          radial-gradient(ellipse at 15% 5%, rgba(132,204,22,0.04) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 90%, rgba(244,162,97,0.03) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, #0d0c0a 0%, #0a0908 100%)
        `,
        'gradient-card': 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        'gradient-card-hover': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'gradient-accent': 'linear-gradient(135deg, #f4a261 0%, #ef8633 100%)',
        'gradient-brand': 'linear-gradient(135deg, #a3e635 0%, #84cc16 100%)',
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(132,204,22,0.06)',
        glow: '0 0 24px rgba(132,204,22,0.1)',
        'glow-lg': '0 0 40px rgba(132,204,22,0.15)',
        'glow-accent': '0 0 24px rgba(244,162,97,0.12)',
        'glow-accent-lg': '0 0 40px rgba(244,162,97,0.2)',
        card: '0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.12)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.35), 0 12px 32px rgba(0,0,0,0.18)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.03)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'border-flow': 'borderFlow 3s linear infinite',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(132,204,22,0.08)' },
          '50%': { boxShadow: '0 0 30px rgba(132,204,22,0.16)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
