/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0ea5e9',
          600: '#0284c7',
          anilist: '#3db4f2',
          card: '#151f2e',
          dark: '#0b1622',
          surface: '#1e293b',
          muted: '#8ba0b2'
        }
      }
    },
  },
  plugins: [],
}
