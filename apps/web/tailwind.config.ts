import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#dce8ff",
          500: "#3b6bfa",
          600: "#2d5de8",
          700: "#2450cc",
          900: "#0f2a7a",
        },
        protected: "#22c55e",
        "some-risks": "#eab308",
        "needs-attention": "#f97316",
        "at-risk": "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
