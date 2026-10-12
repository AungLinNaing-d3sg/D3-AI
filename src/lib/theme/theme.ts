/**
 * Light / dark theme state.
 *
 * The theme lives on `<html data-theme="light|dark">` (globals.css swaps the
 * colour tokens on it). An explicit choice is remembered in localStorage;
 * until the visitor makes one, the site follows the OS preference, including
 * live changes to it. `THEME_INIT_SCRIPT` runs in <head> before first paint
 * so there is never a flash of the wrong theme.
 */

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "d3-theme";
export const THEME_ATTRIBUTE = "data-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** Explicit stored choice wins; otherwise follow the OS. */
export function resolveTheme(stored: unknown, systemPrefersDark: boolean): Theme {
  if (isTheme(stored)) return stored;
  return systemPrefersDark ? "dark" : "light";
}

function readStored(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null; // storage blocked (private mode, policies)
  }
}

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const current = document.documentElement.getAttribute(THEME_ATTRIBUTE);
  return isTheme(current) ? current : "light";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute(THEME_ATTRIBUTE, theme);
  root.style.colorScheme = theme;
}

/** Apply and remember an explicit choice. */
export function setTheme(theme: Theme) {
  applyTheme(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* choice still applies for this page view */
  }
}

/** Notify on any theme change (explicit or OS-driven). */
export function subscribeTheme(onChange: () => void): () => void {
  if (typeof document === "undefined") return () => undefined;
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [THEME_ATTRIBUTE] });

  // Keep following the OS while the visitor has not chosen explicitly.
  const media = window.matchMedia?.(DARK_QUERY);
  const onSystem = (event: MediaQueryListEvent) => {
    if (!readStored()) applyTheme(event.matches ? "dark" : "light");
  };
  media?.addEventListener?.("change", onSystem);
  return () => {
    observer.disconnect();
    media?.removeEventListener?.("change", onSystem);
  };
}

/**
 * Inline, dependency-free version of resolve + apply for <head>. Static
 * string (no user input), allowed by the CSP's `script-src 'unsafe-inline'`.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var t=s==="light"||s==="dark"?s:(matchMedia(${JSON.stringify(DARK_QUERY)}).matches?"dark":"light");var r=document.documentElement;r.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},t);r.style.colorScheme=t;}catch(e){}})();`;
