/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Dark console theme (xAI/Grok-style) ──────────────────────────
        canvas: '#000000', // page background — pure black
        surface: {
          DEFAULT: '#0B0B0D', // cards / panels
          2: '#141417', // inputs, raised fills
        },
        primary: {
          DEFAULT: '#FFFFFF', // solid buttons — white on black
          hover: '#E6E6E6',
          soft: '#161619', // subtle selected / chip background
        },
        ink: {
          DEFAULT: '#F4F4F5', // primary text (near-white)
          soft: '#8A8A90', // secondary text (muted gray)
          faint: '#5C5C63', // placeholders / disabled
        },
        line: {
          DEFAULT: '#1D1D20', // hairline borders
          strong: '#2C2C31', // input / stronger borders
        },
        success: '#3FB950',
        warning: '#D29922',
        danger: '#F85149',
      },
      fontFamily: {
        sans: [
          'Inter',
          'Plus Jakarta Sans',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        'page-title': ['32px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        section: ['20px', { lineHeight: '1.35', fontWeight: '650' }],
        'card-title': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.6)',
        pop: '0 16px 48px rgba(0, 0, 0, 0.7)',
        'focus-ring': '0 0 0 3px rgba(255, 255, 255, 0.12)',
      },
      maxWidth: {
        content: '1440px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 220ms ease-out',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
