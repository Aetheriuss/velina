import type { Config } from 'tailwindcss'

/**
 * Tailwind is scoped to the new App Router UI. Colors resolve to CSS custom
 * properties defined in app/globals.css so a single token set drives both the
 * light and dark 2020 themes (toggled via `data-theme` on <html>).
 */
const config: Config = {
  // Only the new app/ tree and shared components are themed via tokens.
  // pages/ keeps its legacy JSS/Bootstrap styling until each route is migrated.
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/ui/**/*.{js,ts,jsx,tsx}',
    './components/providers/**/*.{js,ts,jsx,tsx}',
  ],
  // Preflight (the base reset) is disabled so adding Tailwind cannot disturb the
  // legacy Bootstrap-styled pages during the overlap. The app/ tree gets its own
  // scoped reset in globals.css.
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        accent: 'var(--rbx-accent)',
        'accent-hover': 'var(--rbx-accent-hover)',
        bg: 'var(--rbx-bg)',
        surface: 'var(--rbx-surface)',
        'surface-alt': 'var(--rbx-surface-alt)',
        text: 'var(--rbx-text)',
        'text-muted': 'var(--rbx-text-muted)',
        border: 'var(--rbx-border)',
        'nav-bg': 'var(--rbx-nav-bg)',
        positive: 'var(--rbx-positive)',
        negative: 'var(--rbx-negative)',
      },
      borderRadius: {
        rbx: 'var(--rbx-radius)',
      },
      boxShadow: {
        rbx: 'var(--rbx-shadow)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Source Sans Pro', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
