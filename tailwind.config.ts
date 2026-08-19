import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * Semantic tokens only. Components never reference a hex value or a raw Tailwind
 * colour. docs/09-UX-UI-SPECIFICATION.md §1.3.
 */
const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          fg: 'var(--primary-fg)',
        },
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        elevated: 'var(--elevated)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        focus: 'var(--focus)',
        status: {
          approved: 'var(--status-approved)',
          paid: 'var(--status-paid)',
          pending: 'var(--status-pending)',
          overdue: 'var(--status-overdue)',
          neutral: 'var(--status-neutral)',
        },
      },
      borderRadius: { DEFAULT: '8px', card: '12px', sheet: '16px' },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.10)',
      },
      transitionDuration: { DEFAULT: '150ms' },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
