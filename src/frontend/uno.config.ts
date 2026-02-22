import {
  defineConfig,
  presetUno,
  presetAttributify,
  presetIcons,
} from "unocss";

export default defineConfig({
  presets: [presetUno(), presetAttributify(), presetIcons()],
  theme: {
    // Color palette - aligned with status badge styles from design document
    colors: {
      // Primary brand colors
      primary: {
        DEFAULT: "#1a73e8",
        light: "#4285f4",
        dark: "#1557b0",
      },
      secondary: {
        DEFAULT: "#5f6368",
        light: "#80868b",
        dark: "#3c4043",
      },

      // Status badge colors (matching design document CSS)
      status: {
        red: {
          bg: "#fee",
          text: "#c00",
        },
        green: {
          bg: "#efe",
          text: "#0a0",
        },
        yellow: {
          bg: "#ffe",
          text: "#aa0",
        },
        gray: {
          bg: "#eee",
          text: "#666",
        },
        paused: {
          bg: "#fef",
          text: "#90a",
        },
        pending: {
          bg: "#eff",
          text: "#099",
        },
      },

      // Semantic colors
      success: "#0a0",
      warning: "#aa0",
      error: "#c00",
      info: "#099",

      // Neutral colors
      white: "#ffffff",
      black: "#000000",
      gray: {
        50: "#f9fafb",
        100: "#f3f4f6",
        200: "#e5e7eb",
        300: "#d1d5db",
        400: "#9ca3af",
        500: "#6b7280",
        600: "#4b5563",
        700: "#374151",
        800: "#1f2937",
        900: "#111827",
      },

      // Background colors
      bg: {
        primary: "#ffffff",
        secondary: "#f9fafb",
        tertiary: "#f3f4f6",
      },

      // Border colors
      border: {
        light: "#e5e7eb",
        DEFAULT: "#d1d5db",
        dark: "#9ca3af",
      },
    },

    // Spacing scale (rem-based for accessibility)
    spacing: {
      0: "0",
      1: "0.25rem", // 4px
      2: "0.5rem", // 8px
      3: "0.75rem", // 12px
      4: "1rem", // 16px
      5: "1.25rem", // 20px
      6: "1.5rem", // 24px
      8: "2rem", // 32px
      10: "2.5rem", // 40px
      12: "3rem", // 48px
      16: "4rem", // 64px
      20: "5rem", // 80px
      24: "6rem", // 96px
      32: "8rem", // 128px
    },

    // Typography
    fontSize: {
      xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
      sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14px
      base: ["1rem", { lineHeight: "1.5rem" }], // 16px
      lg: ["1.125rem", { lineHeight: "1.75rem" }], // 18px
      xl: ["1.25rem", { lineHeight: "1.75rem" }], // 20px
      "2xl": ["1.5rem", { lineHeight: "2rem" }], // 24px
      "3xl": ["1.875rem", { lineHeight: "2.25rem" }], // 30px
      "4xl": ["2.25rem", { lineHeight: "2.5rem" }], // 36px
    },

    fontFamily: {
      sans: [
        "system-ui",
        "-apple-system",
        "BlinkMacSystemFont",
        '"Segoe UI"',
        "Roboto",
        '"Helvetica Neue"',
        "Arial",
        "sans-serif",
      ],
      mono: [
        '"SF Mono"',
        "Monaco",
        "Consolas",
        '"Liberation Mono"',
        '"Courier New"',
        "monospace",
      ],
    },

    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },

    // Border radius
    borderRadius: {
      none: "0",
      sm: "0.125rem", // 2px
      DEFAULT: "0.25rem", // 4px
      md: "0.375rem", // 6px
      lg: "0.5rem", // 8px
      xl: "0.75rem", // 12px
      "2xl": "1rem", // 16px
      full: "9999px",
    },

    // Box shadows
    boxShadow: {
      sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      DEFAULT:
        "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
      md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      none: "none",
    },

    // Responsive breakpoints
    breakpoints: {
      sm: "640px", // Small devices (landscape phones)
      md: "768px", // Medium devices (tablets)
      lg: "1024px", // Large devices (desktops)
      xl: "1280px", // Extra large devices (large desktops)
      "2xl": "1536px", // 2X large devices (larger desktops)
    },
  },

  // Shortcuts for common patterns
  shortcuts: {
    // Button variants
    "btn-base":
      "px-4 py-2 rounded font-medium transition-colors cursor-pointer",
    "btn-primary": "btn-base bg-primary text-white hover:bg-primary-dark",
    "btn-secondary": "btn-base bg-secondary text-white hover:bg-secondary-dark",
    "btn-success": "btn-base bg-success text-white hover:opacity-90",
    "btn-danger": "btn-base bg-error text-white hover:opacity-90",

    // Card styles
    card: "bg-white rounded-lg shadow p-6",
    "card-hover": "card hover:shadow-md transition-shadow",

    // Form elements
    "input-base":
      "px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
    "textarea-base": "input-base resize-y min-h-20",
    "label-base": "block text-sm font-medium text-gray-700 mb-1",

    // Status badges (matching design document)
    "badge-base": "inline-block px-2 py-0.5 rounded text-sm font-bold",
    "badge-red": "badge-base bg-status-red-bg text-status-red-text",
    "badge-green": "badge-base bg-status-green-bg text-status-green-text",
    "badge-yellow": "badge-base bg-status-yellow-bg text-status-yellow-text",
    "badge-gray": "badge-base bg-status-gray-bg text-status-gray-text",
    "badge-paused": "badge-base bg-status-paused-bg text-status-paused-text",
    "badge-pending": "badge-base bg-status-pending-bg text-status-pending-text",

    // Layout helpers
    "container-base": "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    "flex-center": "flex items-center justify-center",
    "flex-between": "flex items-center justify-between",
  },
});
