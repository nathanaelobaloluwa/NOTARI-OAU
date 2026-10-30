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
        notari: {
          primary: {
            DEFAULT: "#4F46E5",
            hover: "#4338CA",
            light: "#EEF2FF",
          },
          secondary: {
            DEFAULT: "#7C3AED",
            hover: "#6D28D9",
            light: "#F5F3FF",
          },
          dark: "#101C3A",
          navy: {
            900: "#0B1120",
            800: "#0F172A",
            700: "#1E293B",
          },
          bg: "#F5F7FC",
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
        subtle: "0 1px 3px 0 rgba(16, 28, 58, 0.04), 0 1px 2px 0 rgba(16, 28, 58, 0.02)",
        card: "0 4px 20px -2px rgba(16, 28, 58, 0.05)",
        "card-hover": "0 10px 25px -5px rgba(79, 70, 229, 0.1), 0 8px 10px -6px rgba(16, 28, 58, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
