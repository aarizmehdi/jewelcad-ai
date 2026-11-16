import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        studio: {
          950: "#07090e",
          900: "#0b0f17",
          850: "#101622",
          800: "#161d2c",
          700: "#222c3f",
          600: "#323f56",
          500: "#495b7a",
          400: "#8092af",
          300: "#b2bfd4",
          200: "#e0e6f0",
          100: "#f5f7fa",
        },
        gold: {
          400: "#f6cd46",
          500: "#e5b824",
          600: "#ca9f10",
        },
        accent: {
          cyan: "#38bdf8",
          emerald: "#10b981",
          rose: "#fb7185",
          amber: "#f59e0b",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
