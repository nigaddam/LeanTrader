/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00ff88',
          navy: '#0a0f1e',
          slate: '#111827',
          card: '#161d2f',
          border: '#1e2d45',
          muted: '#4b5563',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['DM Sans', 'sans-serif'],
      }
    }
  },
  plugins: []
}
