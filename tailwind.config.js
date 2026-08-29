/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0F0A0C',
        card: '#191012',
        border: '#31212A',
        wine: '#C2405C',
        gold: '#D8A657',
        ink: '#F3EAE6',
        muted: '#9C8A90',
        danger: '#F43F5E',
        ok: '#4ADE80'
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        glow: '0 0 22px rgba(194, 64, 92, 0.30)',
        'glow-sm': '0 0 12px rgba(194, 64, 92, 0.22)',
        'glow-gold': '0 0 18px rgba(216, 166, 87, 0.28)'
      },
      borderRadius: { card: '18px' },
      maxWidth: { app: '30rem' }
    }
  },
  plugins: []
}
