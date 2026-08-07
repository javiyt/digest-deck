import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        paper: "#f8fafc",
        accent: "#0f766e"
      }
    }
  },
  plugins: []
} satisfies Config;
