/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        indigo: {
          50: '#edf7f5',
          100: '#d9efeb',
          200: '#b7ded7',
          300: '#8bc8bd',
          400: '#5aacaa',
          500: '#378f95',
          600: '#287881',
          700: '#236571',
          800: '#205260',
          900: '#1c4552',
          950: '#12333f',
        },
      },
    },
  },
  plugins: [],
};
