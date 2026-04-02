import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./styles/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4CAF50",
          50: "#F1F8F4",
          100: "#DFF0E3",
          200: "#BCE1C4",
          300: "#90CE9C",
          400: "#63BA73",
          500: "#4CAF50",
          600: "#3F9844",
          700: "#2E7D32",
          800: "#1F5A22",
          900: "#143B16"
        },
        foreground: "#1F2421",
        "muted-foreground": "#6B7280",
        accent: "#2E7D32",
        surface: "#F5F5F5",
        muted: {
          DEFAULT: "#E6EFE8",
          foreground: "#4B6251"
        },
        sunshine: "#FFD54F"
      },
      boxShadow: {
        brand: "0 20px 45px -15px rgba(31, 187, 122, 0.45)",
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      },
      fontFamily: {
        sans: ["'Inter'", "Helvetica", "Arial", "sans-serif"],
        display: ["'Poppins'", "Helvetica", "Arial", "sans-serif"]
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 300ms ease-out",
        "slide-in": "slideIn 300ms ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateX(-10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      transitionProperty: {
        DEFAULT: "all",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;
