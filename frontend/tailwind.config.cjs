/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#06B6D4',
        secondary: '#8B5CF6',
        accent: '#EC4899',
        bg: '#09090B',
        card: '#18181B',
        textlight: '#F4F4F5',
      },
      boxShadow: {
        'glow': '0 0 30px rgba(6, 182, 212, 0.6)',
      },
    },
  },
  plugins: [],
}