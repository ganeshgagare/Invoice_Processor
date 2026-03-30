/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2f5bd3',
        secondary: '#4f2f8f',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #2f5bd3 0%, #4f2f8f 100%)',
      }
    },
  },
  plugins: [],
}
