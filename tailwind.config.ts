import type { Config } from "tailwindcss"
import { designTokens } from "./src/styles/tokens"
import tailwindcssAnimate from "tailwindcss-animate"
import tailwindcssTypography from "@tailwindcss/typography"

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: designTokens.colors.brand,
        neutral: designTokens.colors.neutrals,
        surface: {
          DEFAULT: "var(--surface)",
          secondary: "var(--surface-secondary)",
          elevated: "var(--surface-elevated)",
        },
        // Semantic colors
        success: {
          50: "#f0fdf4",
          500: "#22c55e",
          600: "#16a34a",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        danger: {
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
        },
      },
      borderRadius: {
        card: designTokens.radii.card,
        button: designTokens.radii.md,
        pill: designTokens.radii.pill,
      },
      boxShadow: {
        card: designTokens.shadows.card,
        "card-hover": designTokens.shadows.cardHover,
        elevated: designTokens.shadows.elevated,
        glow: designTokens.shadows.glow,
      },
      spacing: {
        "18": designTokens.spacing["18"],
        "22": designTokens.spacing["22"],
        "88": designTokens.spacing["88"],
      },
      fontSize: {
        xxs: ["0.625rem", { lineHeight: "0.875rem" }],
      },
      fontFamily: {
        sans: designTokens.typography.fontFamily,
        heading: designTokens.typography.headingFont,
      },
      animation: {
        "slide-in": "slideIn 0.2s ease-out",
        "slide-in-right": "slideInRight 0.2s ease-out",
        "slide-out": "slideOut 0.15s ease-in",
        "fade-in": "fadeIn 0.15s ease-out",
        "fade-out": "fadeOut 0.1s ease-in",
        "scale-in": "scaleIn 0.15s ease-out",
        "scale-out": "scaleOut 0.1s ease-in",
        "bounce-in": "bounceIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "pulse-subtle": "pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "accordion-down": "accordionDown 0.2s ease-out",
        "accordion-up": "accordionUp 0.2s ease-out",
        "spin-slow": "spin 2s linear infinite",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        slideOut: {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(-100%)", opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        scaleOut: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.95)", opacity: "0" },
        },
        bounceIn: {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        accordionDown: {
          "0%": { height: "0", opacity: "0" },
          "100%": { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        accordionUp: {
          "0%": { height: "var(--radix-accordion-content-height)", opacity: "1" },
          "100%": { height: "0", opacity: "0" },
        },
      },
      transitionDuration: {
        "0": "0ms",
        "150": "150ms",
        "200": "200ms",
        "300": "300ms",
      },
      transitionTimingFunction: {
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      typography: {
        DEFAULT: {
          css: {
            color: "var(--foreground)",
            a: {
              color: "var(--accent)",
              textDecoration: "underline",
              textUnderlineOffset: "4px",
              fontWeight: "600",
            },
            strong: { color: "var(--foreground)" },
            h1: { fontFamily: "var(--font-heading)" },
            h2: { fontFamily: "var(--font-heading)" },
            h3: { fontFamily: "var(--font-heading)" },
            h4: { fontFamily: "var(--font-heading)" },
            code: {
              color: "var(--foreground)",
              backgroundColor: "var(--surface-secondary)",
              padding: "0.15rem 0.35rem",
              borderRadius: "0.375rem",
              border: "1px solid var(--border)",
              fontWeight: "600",
            },
            "code::before": { content: "''" },
            "code::after": { content: "''" },
            pre: {
              color: "var(--foreground)",
              backgroundColor: "var(--surface-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
            },
            "pre code": {
              backgroundColor: "transparent",
              border: "none",
              padding: "0",
              fontWeight: "500",
            },
            blockquote: {
              borderLeftColor: "var(--border)",
              color: "var(--foreground)",
            },
            hr: { borderColor: "var(--border)" },
            "ul > li::marker": { color: "var(--muted)" },
            "ol > li::marker": { color: "var(--muted)" },
            thead: { borderBottomColor: "var(--border)" },
            "tbody tr": { borderBottomColor: "var(--border)" },
          },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssTypography],
}
export default config
