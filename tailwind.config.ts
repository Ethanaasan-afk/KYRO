import type { Config } from "tailwindcss";

/**
 * Theme colors live in CSS variables (light/dark). Returning a function lets Tailwind
 * apply opacity modifiers too - `bg-primary/10`, `border-rose/40` - via color-mix().
 */
function v(name: string): string {
  const color = ({ opacityValue }: { opacityValue?: string }) =>
    opacityValue === undefined || opacityValue === "1" || opacityValue.startsWith("var(--tw-")
      ? `var(${name})`
      : `color-mix(in srgb, var(${name}) calc(${opacityValue} * 100%), transparent)`;
  return color as unknown as string;
}

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
        cloud: v("--cloud"),
        surface: {
          DEFAULT: v("--surface"),
          hover: v("--surface-hover"),
        },
        border: v("--border"),
        primary: {
          DEFAULT: v("--primary"),
          hover: v("--primary-hover"),
          soft: v("--primary-soft"),
        },
        sidebar: {
          DEFAULT: v("--sidebar"),
          elevated: v("--sidebar-elevated"),
          border: v("--sidebar-border"),
          text: v("--sidebar-text"),
          active: v("--sidebar-text-active"),
        },
        emerald: {
          DEFAULT: v("--emerald"),
          soft: v("--emerald-soft"),
        },
        sage: {
          DEFAULT: v("--sage"),
          soft: v("--sage-soft"),
        },
        aqua: {
          DEFAULT: v("--aqua"),
          deep: v("--aqua-deep"),
          wash: v("--aqua-wash"),
        },
        sun: {
          DEFAULT: v("--sun"),
          deep: v("--sun-deep"),
          wash: v("--sun-wash"),
        },
        tangerine: {
          DEFAULT: v("--tangerine"),
          deep: v("--tangerine-deep"),
          wash: v("--tangerine-wash"),
        },
        "vivid-teal": {
          DEFAULT: v("--vivid-teal"),
          wash: v("--vivid-teal-wash"),
        },
        coral: {
          DEFAULT: v("--coral"),
          deep: v("--coral-deep"),
        },
        violet: {
          DEFAULT: v("--violet"),
          soft: v("--violet-soft"),
        },
        brass: {
          DEFAULT: v("--brass"),
          soft: v("--brass-soft"),
        },
        amber: {
          DEFAULT: v("--amber"),
          soft: v("--amber-soft"),
        },
        rose: {
          DEFAULT: v("--rose"),
          soft: v("--rose-soft"),
        },
        ink: v("--ink"),
        slate: {
          DEFAULT: v("--slate"),
          dim: v("--slate-dim"),
        },
        mint: {
          DEFAULT: v("--emerald"),
          soft: v("--emerald-soft"),
        },
        paper: v("--ink"),
        mist: {
          DEFAULT: v("--slate"),
          dim: v("--slate-dim"),
        },
        charcoal: v("--cloud"),
        foreground: v("--ink"),
        muted: v("--slate"),
        accent: {
          DEFAULT: v("--primary"),
          soft: v("--primary-soft"),
          glow: v("--primary"),
        },
        danger: v("--rose"),
        warning: v("--amber"),
        success: v("--sage"),
        positive: v("--sage"),
        background: v("--cloud"),
        "surface-2": v("--surface-hover"),
        "surface-3": v("--surface-hover"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "10px",
        button: "10px",
      },
      boxShadow: {
        card: "var(--card-shadow)",
        lift: "var(--card-shadow-lift)",
      },
      transitionDuration: {
        fast: "180ms",
      },
      // Every whole percent, so modifiers like `border-white/12` or `bg-white/8` compile
      opacity: Object.fromEntries(
        Array.from({ length: 101 }, (_, i) => [String(i), String(i / 100)])
      ),
    },
  },
  plugins: [],
};
export default config;
