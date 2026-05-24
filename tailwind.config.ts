import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f1117",
        parchment: "#f5f0e8",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pop": "pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(24px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        pop: { from: { transform: "scale(0.8)", opacity: "0" }, to: { transform: "scale(1)", opacity: "1" } },
      },
    },
  },
  plugins: [],
};

export default config;
