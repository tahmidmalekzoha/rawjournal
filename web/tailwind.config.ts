import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        surface: "#0a0a0a",
        "surface-hover": "#141414",
        border: "#1a1a1a",
        "text-primary": "#e5e5e5",
        "text-secondary": "#737373",
        accent: "#ffffff",
        "accent-hover": "#d4d4d4",
        profit: "#5a9a6e",
        loss: "#c4605a",
        muted: "#141414",
        foreground: "#e5e5e5",
        "muted-foreground": "#737373",
        primary: "#ffffff",
        "primary-foreground": "#000000",
      },
    },
  },
  plugins: [],
};

export default config;
