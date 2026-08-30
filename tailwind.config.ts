import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        panelHi: "var(--panelHi)",
        border: "var(--border)",
        borderHi: "var(--borderHi)",
        hover: "var(--hover)",
        track: "var(--track)",
        text: "var(--text)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        ok: "var(--ok)",
        bad: "var(--bad)",
        accent: "var(--accent)",
      },
      fontFamily: {
        grotesk: ["var(--font-grotesk)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
