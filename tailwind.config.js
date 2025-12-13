/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb', // Brand Blue
        secondary: '#64748b', // Slate Gray
        success: '#22c55e',
        danger: '#ef4444',
        background: '#f8fafc',
      }
    },
  },
  plugins: [],
}