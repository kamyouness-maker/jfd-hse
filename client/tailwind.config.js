/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f0',
          100: '#dcf0dc',
          200: '#b8e2b8',
          300: '#86cc86',
          400: '#50b050',
          500: '#2d9e2d',
          600: '#1a7a1a',
          700: '#156015',
          800: '#124d12',
          900: '#0f3f0f',
        },
      },
    },
  },
  plugins: [],
};
