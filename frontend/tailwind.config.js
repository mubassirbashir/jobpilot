/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#080c14',
        surface:  '#0d1320',
        surface2: '#111827',
        accent:   '#00e5ff',
        accent2:  '#7c3aed',
        accent3:  '#10b981',
        warn:     '#f59e0b',
        danger:   '#ef4444',
        muted:    '#6b7a99',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
