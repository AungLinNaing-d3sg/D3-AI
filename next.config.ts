import type { NextConfig } from "next";

/**
 * Security response headers applied to every route.
 *
 * Flagged as a MEDIUM finding on the previous scaffold's security review
 * (missing CSP / clickjacking protection), so it ships from day one here.
 * `frame-ancestors 'none'` + `X-Frame-Options: DENY` prevents the site being
 * embedded in a third-party iframe (clickjacking). `script-src`/`style-src`
 * allow `'unsafe-inline'` because Next.js injects inline bootstrap scripts
 * and Tailwind emits inline `<style>` in dev; `connect-src` includes
 * `ws:`/`wss:` for the Next.js dev HMR socket only in development. `blob:`
 * is additionally allowed on `script-src`/`worker-src`/`connect-src` (both
 * environments) because Tone.js (see `lib/audio/audioManager.ts`) generates
 * its `Tone.Noise` AudioWorklet processor as a same-origin, browser-created
 * `blob:` URL at runtime — Chromium's CSP enforcement for
 * `audioWorklet.addModule()` checks both `script-src` (the worklet module
 * script itself) and `worker-src` (the underlying worklet construct).
 * `blob:` here is never attacker-controlled/remote content, so this doesn't
 * loosen the policy against exfiltration the way allowing an external host
 * would.
 */
async function headers() {
  const isDev = process.env.NODE_ENV !== "production";

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' blob:" + (isDev ? " 'unsafe-eval'" : ""),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    `connect-src 'self' blob:${isDev ? " ws: wss:" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        { key: "Content-Security-Policy", value: csp },
      ],
    },
  ];
}

const nextConfig: NextConfig = {
  typedRoutes: true,
  // `three/addons/...` (aka `three/examples/jsm/...` — see
  // three/scenes/CtaScene.tsx's `FontLoader`/`TextGeometry` imports, used to
  // build the real extruded "D3-SG" wordmark) ships as plain ESM source
  // with no separate CJS build, unlike the bundled `three` package entry
  // point itself. Turbopack/webpack already handle this fine at build
  // time, but `next/jest`'s test transform only compiles packages listed
  // here (see its own jest.js: "node_modules is not transformed, only
  // `transpiledPackages`") — without this, importing CtaScene in a test
  // fails the whole suite with "Must use import to load ES Module".
  transpilePackages: ["three"],
  images: {
    // No remote images are used yet; add remotePatterns here when a CMS/CDN
    // is introduced (e.g. { protocol: "https", hostname: "cdn.d3-sg.com" }).
    formats: ["image/avif", "image/webp"],
  },
  headers,
  // This repo already ships its own AI-agent configuration under `.claude/`
  // (see the root CLAUDE.md pipeline docs) — disable Next.js's built-in
  // AGENTS.md/CLAUDE.md auto-generation so `next dev`/`next build` don't
  // create unrelated, redundant files at the project root.
  agentRules: false,
};

export default nextConfig;
