import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        accent: "#2F4858",
        accent2: "#D97757",
      },
    },
  },
  plugins: [],
};
export default config;
