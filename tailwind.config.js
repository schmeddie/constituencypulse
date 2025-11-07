/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': '#3b82f6',
        'soft-blue': '#60a5fa',
        'light-blue': '#dbeafe',
        'dark-grey': '#1f2937',
        'medium-grey': '#6b7280',
        'light-grey': '#f3f4f6',
        'border-grey': '#e5e7eb',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
