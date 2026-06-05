/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        "water-deep": "#0A1628",
        "water-dark": "#0F1E36",
        "water-blue": "#132743",
        "water-cyan": "#00D4FF",
        "water-teal": "#00E5CC",
        "water-green": "#00E676",
        "water-yellow": "#FFB020",
        "water-red": "#FF4D4F",
        "water-orange": "#FF7A45",
        "water-purple": "#8B5CF6",
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"SF Mono"', "Menlo", "monospace"],
        sans: ['"PingFang SC"', '"Microsoft YaHei"', "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "float": "float 3s ease-in-out infinite",
        "scroll": "scroll 20s linear infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(0, 212, 255, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(0, 212, 255, 0.8)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        scroll: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(circle at 50% 0%, rgba(0, 212, 255, 0.15) 0%, transparent 60%)",
      },
    },
  },
  plugins: [],
};
