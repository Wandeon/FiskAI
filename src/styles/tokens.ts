export const designTokens = {
  typography: {
    fontFamily: ["Inter", "Sora", "system-ui", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"],
    headingFont: ["Sora", "Inter", "sans-serif"],
    baseSize: "16px",
    lineHeight: {
      snug: "1.3",
      relaxed: "1.6",
    },
  },
  colors: {
    brand: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
      950: "#172554",
    },
    neutrals: {
      25: "#f8fafc",
      50: "#f1f5f9",
      100: "#e2e8f0",
      200: "#cbd5f5",
      300: "#94a3b8",
      400: "#64748b",
      500: "#475569",
      600: "#334155",
      700: "#1e293b",
      800: "#0f172a",
    },
    gradients: {
      hero: "linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #ec4899 100%)",
      card: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(248,113,113,0.08))",
    },
    surfaces: {
      light: {
        background: "#f8fafc",
        foreground: "#0f172a",
        card: "#ffffff",
        muted: "#f1f5f9",
        border: "#e2e8f0",
      },
      dark: {
        background: "#0f172a",
        foreground: "#f8fafc",
        card: "#1e293b",
        muted: "#334155",
        border: "#334155",
      },
      glass: {
        background: "rgba(255, 255, 255, 0.08)",
        border: "rgba(255, 255, 255, 0.18)",
        shadow: "0 20px 40px rgba(15, 23, 42, 0.35)",
      },
    },
  },
  radii: {
    xs: "0.25rem",
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    "2xl": "1.5rem",
    pill: "999px",
    card: "1.5rem",
  },
  spacing: {
    18: "4.5rem",
    22: "5.5rem",
    88: "22rem",
  },
  shadows: {
    card: "0 10px 30px rgba(15, 23, 42, 0.08)",
    cardHover: "0 25px 50px rgba(15, 23, 42, 0.12)",
    elevated: "0 35px 60px rgba(15, 23, 42, 0.25)",
    glow: "0 0 40px rgba(99, 102, 241, 0.35)",
  },
}

export type DesignTokens = typeof designTokens
