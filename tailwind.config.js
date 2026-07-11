/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ginger: {
          50: '#fdf8f3',
          100: '#fbeee0',
          200: '#f6d9bd',
          300: '#efbe90',
          400: '#e5995e',
          500: '#dd7b38',
          600: '#cf6027',
          700: '#ab491e',
          800: '#893b1d',
          900: '#6f321b',
          950: '#3c180c',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
