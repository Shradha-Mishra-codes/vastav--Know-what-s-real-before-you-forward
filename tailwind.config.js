/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background-rgb, 238 241 246) / <alpha-value>)",
        foreground: "rgb(var(--foreground-rgb, 15 28 46) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--ink-rgb, 12 24 41) / <alpha-value>)",
          muted: "rgb(var(--ink-muted-rgb, 61 79 102) / <alpha-value>)",
          soft: "rgb(var(--ink-soft-rgb, 92 109 130) / <alpha-value>)",
          surface: "rgb(var(--ink-surface-rgb, 21 34 56) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-rgb, 217 120 82) / <alpha-value>)",
          hover: "rgb(var(--accent-hover-rgb, 194 100 63) / <alpha-value>)",
          soft: "rgb(var(--accent-soft-rgb, 252 232 223) / <alpha-value>)",
          ring: "var(--accent-ring)",
        },
        paper: "rgb(var(--paper-rgb, 248 249 252) / <alpha-value>)",
        "paper-elevated": "rgb(var(--paper-elevated-rgb, 255 255 255) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        lifted: "var(--shadow-lifted)",
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};
