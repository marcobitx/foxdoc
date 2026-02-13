// frontend/tailwind.config.cjs
// Design system tokens — Procurement Analyzer
// Professional dark theme with violet/orange accents, glassmorphism depth

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
        brand: {
          50: '#f3f0ff',
          100: '#e9e0ff',
          200: '#d4c2ff',
          300: '#b794f6',
          400: '#9f67ff',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        accent: {
          50: '#fff8ed',
          100: '#fff0d4',
          200: '#ffdda8',
          300: '#ffc471',
          400: '#ffa033',
          500: '#ff8c0a',
          600: '#f07000',
          700: '#c75404',
          800: '#9e430c',
          900: '#7f390d',
          950: '#451a04',
        },
        surface: {
          50: '#f0f1f5',
          100: '#dfe1ea',
          200: '#c5c8d8',
          300: '#a0a4bb',
          400: '#7b7f9c',
          500: '#5c6080',
          600: '#434662',
          700: '#2d3050',
          800: '#1c1f3a',
          900: '#121428',
          950: '#0a0b19',
        },
      },
      backgroundImage: {
        'gradient-page': 'radial-gradient(ellipse at 20% 0%, rgba(91,33,182,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(13,31,60,0.3) 0%, transparent 50%), linear-gradient(160deg, #0f1024 0%, #131530 30%, #0d1228 70%, #0a0b19 100%)',
        'gradient-card': 'linear-gradient(145deg, rgba(45,48,80,0.45) 0%, rgba(28,31,58,0.65) 100%)',
        'gradient-card-hover': 'linear-gradient(145deg, rgba(50,53,88,0.55) 0%, rgba(30,33,62,0.75) 100%)',
        'gradient-accent': 'linear-gradient(135deg, #ff8c0a 0%, #f07000 100%)',
        'gradient-brand': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        'gradient-sidebar': 'linear-gradient(180deg, rgba(28,31,58,0.95) 0%, rgba(18,20,40,0.98) 100%)',
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(139,92,246,0.08)',
        glow: '0 0 24px rgba(139,92,246,0.12)',
        'glow-lg': '0 0 40px rgba(139,92,246,0.18)',
        'glow-accent': '0 0 24px rgba(255,140,10,0.15)',
        'glow-accent-lg': '0 0 40px rgba(255,140,10,0.22)',
        card: '0 1px 3px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.3), 0 12px 32px rgba(0,0,0,0.2)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.04)',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(139,92,246,0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(139,92,246,0.2)' },
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
