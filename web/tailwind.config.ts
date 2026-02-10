import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0f",
        surface: "#12121a",
        "surface-hover": "#1a1a26",
        border: "#1e1e2e",
        "text-primary": "#e4e4ef",
        "text-secondary": "#8b8ba3",
        accent: "#6366f1",
        "accent-hover": "#818cf8",
        profit: "#22c55e",
        loss: "#ef4444",
      },
    },
  },
  plugins: [],
};

export default config;
