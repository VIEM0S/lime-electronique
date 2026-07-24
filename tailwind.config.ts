import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Identité Lime-électronique : l'accent lime porte le nom de la
        // boutique plutôt qu'un terracotta générique.
        ink: "#16211F",
        lime: {
          DEFAULT: "#B7D12A",
          deep: "#8FA916",
          soft: "#E9F1C4",
        },
        paper: "#F6F5EF",
        ember: { DEFAULT: "#E2A33D", soft: "#FBF0DD" },
        signal: { DEFAULT: "#D14343", soft: "#FBE7E7" },
        ok: { DEFAULT: "#3F9142", soft: "#E4F3E4" },
        // Alias conservés pour compat pendant la migration progressive.
        accent: "#16211F",
        accent2: "#B7D12A",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.25s ease-out",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
