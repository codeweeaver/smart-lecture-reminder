/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        noun: {
          50:  '#f0faf4',
          100: '#d5f2e1',
          200: '#a8e3c1',
          300: '#72ce9e',
          400: '#3db57a',
          500: '#1a9a5c',
          600: '#127a46',
          700: '#0d5c34',
          800: '#083d22',
          900: '#041f12',
        },
        gold: {
          400: '#f5c842',
          500: '#e8b824',
          600: '#c99a0a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
}
