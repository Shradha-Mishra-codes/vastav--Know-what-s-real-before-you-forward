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
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--mut)",
          soft: "var(--mut)",
          surface: "var(--ink)",
        },
        mut: "var(--mut)",
        border: "var(--border)",
        "brand-border": "var(--border)",
        brand: {
          1: "var(--brand-1)",
          2: "var(--brand-2)",
          3: "var(--brand-3)",
        },
        verdict: {
          verified: "#2FD08F",
          false: "#FF5C6C",
          outdated: "#FFC83D",
          partly: "#FF9A4D",
          unverified: "#A9B4C6",
        },
        // Maintain legacy semantic names mapped to new palette for stability
        accent: {
          DEFAULT: "#3D52D5",
          hover: "#7A4FE0",
          soft: "#CBD5FA",
          ring: "rgba(61, 82, 213, 0.35)",
        },
        paper: "rgba(255, 255, 255, 0.95)",
        "paper-elevated": "#ffffff",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-heading)", "var(--font-body)", "system-ui", "sans-serif"],
        devanagari: ["var(--font-devanagari)", "var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        card: "0 22px 50px rgba(61, 82, 213, 0.19)",
        "card-hover": "0 26px 54px rgba(61, 82, 213, 0.25)",
        glow: "0 10px 25px rgba(61, 82, 213, 0.35)",
        lifted: "0 16px 36px rgba(61, 82, 213, 0.22)",
      },
      borderRadius: {
        card: "22px",
      },
    },
  },
  plugins: [],
};
