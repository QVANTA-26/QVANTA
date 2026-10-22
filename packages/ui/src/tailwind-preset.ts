import type { Config } from "tailwindcss";

const qvantaPreset: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6d001a",
          50: "#fff4f5",
          100: "#ffe4e8",
          200: "#fecdd5",
          300: "#fda4b2",
          400: "#fb7185",
          500: "#8f102d",
          600: "#6d001a",
          700: "#560014",
          800: "#40000f",
          900: "#2b000a"
        },
        accent: {
          DEFAULT: "#d8ad96",
          50: "#fffaf7",
          100: "#f8eee8",
          200: "#f0ddd3",
          300: "#e8c7b8",
          400: "#dfb39e",
          500: "#d19b83",
          600: "#b97862",
          700: "#965846",
          800: "#713f34",
          900: "#4e2a24"
        },
        violet: {
          DEFAULT: "#8f102d",
          500: "#8f102d",
          600: "#6d001a",
          700: "#560014"
        },
        cyan: {
          DEFAULT: "#e4d5cc",
          500: "#e4d5cc",
          600: "#d4bdb0",
          700: "#bd9c8b"
        },
        ink: "#f7f1eb",
        "ink-dim": "#b9aaa1",
        bg: {
          DEFAULT: "#0d0b0c",
          1: "#0d0b0c",
          2: "#151112",
          50: "#fffaf7",
          100: "#f7f1eb",
          200: "#eee6df",
          300: "#d5c8bf",
          400: "#aa9b92",
          500: "#756963",
          600: "#554944",
          700: "#3b3030",
          800: "#292122",
          900: "#1a1517",
          950: "#0c0a0c"
        },
        text: {
          DEFAULT: "#f7f1eb",
          50: "#fffaf7",
          100: "#f7f1eb",
          200: "#eee6df",
          300: "#d5c8bf",
          400: "#aa9b92",
          500: "#756963",
          600: "#554944",
          700: "#3b3030",
          800: "#292122",
          900: "#1a1517"
        }
      },
      backgroundColor: {
        DEFAULT: "#0d0b0c"
      },
      textColor: {
        DEFAULT: "#f7f1eb"
      },
      fontFamily: {
        display: [
          "'Space Grotesk'",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        body: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        "mono-quantum": [
          "'JetBrains Mono'",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace"
        ]
      }
    }
  }
};

export default qvantaPreset;
export { qvantaPreset };
