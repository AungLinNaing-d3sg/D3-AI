import { Color, LinearSRGBColorSpace, SRGBColorSpace } from "three";

/**
 * The site's own theme tokens (src/app/globals.css `:root` + Tailwind's
 * theme variables), resolved at runtime into Three.js colours so 3D scenes
 * reuse the exact same palette as the DOM instead of hard-coding a copy.
 *
 * Tokens may be written in hex, `rgb()` or `oklch()` (the brand/ink tokens
 * are hex; Tailwind's `--color-cyan-*`/`--color-violet-*` are `oklch()`), so
 * each value is parsed here — no canvas painting or pixel read-back, which
 * would stall the GPU. Where a token isn't defined or can't be parsed (SSR,
 * jsdom, a syntax this doesn't cover), the documented token value below is
 * used.
 */
const TOKENS = {
  base: ["--background", "#05070d"],
  ink50: ["--color-ink-50", "#f4f6fb"],
  ink100: ["--color-ink-100", "#e5e9f2"],
  ink200: ["--color-ink-200", "#c7cfe0"],
  ink300: ["--color-ink-300", "#9aa6c2"],
  ink500: ["--color-ink-500", "#4b5673"],
  ink700: ["--color-ink-700", "#232a3f"],
  ink800: ["--color-ink-800", "#141a2a"],
  brand300: ["--color-brand-300", "#ff9280"],
  brand400: ["--color-brand-400", "#fd6a50"],
  brand500: ["--color-brand-500", "#f14a30"],
  brand600: ["--color-brand-600", "#d63420"],
  brand700: ["--color-brand-700", "#b02719"],
  brand800: ["--color-brand-800", "#8a2118"],
  ink900: ["--color-ink-900", "#0b0f1a"],
  violet400: ["--color-violet-400", "#a78bfa"],
  cyan300: ["--color-cyan-300", "#67e8f9"],
  cyan400: ["--color-cyan-400", "#22d3ee"],
} as const;

export type ThemeColorName = keyof typeof TOKENS;
export type ThemeColors = Record<ThemeColorName, Color>;

let cached: ThemeColors | null = null;

/** OKLCH (CSS Color 4) → linear sRGB, via OKLab. */
function oklchToLinear(l: number, c: number, hueDegrees: number, out: Color): Color {
  const h = (hueDegrees * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  return out.setRGB(
    clamp01(4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp),
    clamp01(-1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp),
    clamp01(-0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp),
    LinearSRGBColorSpace
  );
}

/** Parses the CSS colour syntaxes the theme uses; `null` if it can't. */
export function parseCssColor(value: string): Color | null {
  const text = value.trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(text)) return new Color(text);
  const numbers = (body: string) =>
    body
      .replace(/\/.*$/, "")
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((part) => ({ value: parseFloat(part), percent: part.endsWith("%") }));
  const rgb = /^rgba?\((.*)\)$/.exec(text);
  if (rgb) {
    const [r, g, b] = numbers(rgb[1]!);
    if (!r || !g || !b || [r, g, b].some((n) => Number.isNaN(n.value))) return null;
    const channel = (n: { value: number; percent: boolean }) => (n.percent ? n.value / 100 : n.value / 255);
    return new Color().setRGB(channel(r), channel(g), channel(b), SRGBColorSpace);
  }
  const oklch = /^oklch\((.*)\)$/.exec(text);
  if (oklch) {
    const [l, c, h] = numbers(oklch[1]!);
    if (!l || !c || !h || [l, c, h].some((n) => Number.isNaN(n.value))) return null;
    return oklchToLinear(l.percent ? l.value / 100 : l.value, c.percent ? c.value * 0.004 : c.value, h.value, new Color());
  }
  return null;
}

/** Resolved once per page load (the tokens don't change at runtime). */
export function getThemeColors(): ThemeColors {
  if (cached) return cached;
  const styles = typeof document !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const resolved = {} as ThemeColors;
  (Object.keys(TOKENS) as ThemeColorName[]).forEach((name) => {
    const [variable, fallback] = TOKENS[name];
    resolved[name] = parseCssColor(styles?.getPropertyValue(variable) ?? "") ?? new Color(fallback);
  });
  // Only cache a real browser resolution; SSR falls back each time.
  if (styles) cached = resolved;
  return resolved;
}
