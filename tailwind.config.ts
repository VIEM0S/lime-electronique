import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Identité Lime-électronique — bleu/argent du logo officiel du client
        // (couleurs extraites du fichier logo vectoriel fourni le 29/07/2026).
        ink: "#262626",
        lime: {
          DEFAULT: "#0050B0",
          deep: "#083078",
          soft: "#E4ECFA",
        },
        // Argent — teinte du "L" métallique du logo, second ton de la marque
        // (bordures, en-têtes de tableau, badges neutres) pour que "bleu ET
        // argent" se voie partout, pas seulement sur l'icône.
        argent: {
          DEFAULT: "#9AA7B4",
          deep: "#6B7684",
          soft: "#EEF1F4",
        },
        paper: "#EDF0F4",
        ember: { DEFAULT: "#E2A33D", soft: "#FBF0DD" },
        signal: { DEFAULT: "#D14343", soft: "#FBE7E7" },
        ok: { DEFAULT: "#3F9142", soft: "#E4F3E4" },
        // Alias conservés pour compat pendant la migration progressive.
        accent: "#262626",
        accent2: "#0050B0",
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
