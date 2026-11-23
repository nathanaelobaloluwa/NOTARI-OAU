import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        brand: {
          midnight: "#151C35",
          electric: "#4169E1",
          teal: "#20BFA9",
          cloud: "#F4F6FA",
        },
        notari: {
          midnight: "#151C35",
          electric: {
            DEFAULT: "#4169E1",
            hover: "#3358C8",
            light: "#EEF2FF",
          },
          teal: {
            DEFAULT: "#20BFA9",
            hover: "#19A390",
            light: "#E6FAF7",
          },
          cloud: "#F4F6FA",
          primary: {
            DEFAULT: "#4169E1",
            hover: "#3358C8",
            light: "#EEF2FF",
          },
          secondary: {
            DEFAULT: "#7C3AED",
            hover: "#6D28D9",
            light: "#F5F3FF",
          },
          dark: "#151C35",
          navy: {
            DEFAULT: "#151C35",
            900: "#0D1224",
            800: "#151C35",
            700: "#1E293B",
          },
          bg: "#F4F6FA",
          surface: "#FFFFFF",
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "#4F46E5",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#7C3AED",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#EEF2FF",
          foreground: "#4F46E5",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(21, 28, 53, 0.04), 0 1px 2px 0 rgba(21, 28, 53, 0.02)",
        card: "0 4px 20px -2px rgba(21, 28, 53, 0.05)",
        "card-hover": "0 10px 25px -5px rgba(65, 105, 225, 0.12), 0 8px 10px -6px rgba(21, 28, 53, 0.04)",
        "brand-glow": "0 0 24px -4px rgba(65, 105, 225, 0.35)",
        "teal-glow": "0 0 20px -3px rgba(32, 191, 169, 0.4)",
      },
      keyframes: {
        "notari-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.04)", opacity: "0.85" },
        },
        "notari-shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        "notari-reveal": {
          "0%": { opacity: "0", transform: "translateY(6px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "notari-indeterminate": {
          "0%": { left: "-35%", right: "100%" },
          "60%": { left: "100%", right: "-90%" },
          "100%": { left: "100%", right: "-90%" },
        },
      },
      animation: {
        "notari-pulse": "notari-pulse 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "notari-shimmer": "notari-shimmer 2s infinite linear",
        "notari-reveal": "notari-reveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "notari-indeterminate": "notari-indeterminate 1.6s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
