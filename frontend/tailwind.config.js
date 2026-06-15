/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI Variable', 'Segoe UI', 'Avenir Next', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 50px rgba(15, 23, 42, 0.08)',
      },
      colors: {
        brand: {
          DEFAULT: 'var(--brand)',
          strong: 'var(--brand-strong)',
          soft: 'var(--brand-soft)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          strong: 'var(--secondary-strong)',
          soft: 'var(--secondary-soft)',
        },
        success: {
          DEFAULT: 'var(--success)',
          strong: 'var(--success-strong)',
          soft: 'var(--success-soft)',
          line: 'var(--success-line)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          strong: 'var(--warning-strong)',
          soft: 'var(--warning-soft)',
          line: 'var(--warning-line)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          strong: 'var(--danger-strong)',
          soft: 'var(--danger-soft)',
          line: 'var(--danger-line)',
        },
        ink: {
          DEFAULT: 'var(--text-strong)',
          soft: 'var(--text-soft)',
        },
        muted: 'var(--muted)',
        highlight: 'var(--highlight)',
        surface: {
          DEFAULT: 'var(--surface)',
          strong: 'var(--surface-strong)',
          white: 'var(--surface-white)',
        },
      },
    },
  },
  plugins: [],
};
