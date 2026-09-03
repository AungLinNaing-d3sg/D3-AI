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
 * `ws:`/`wss:` for the Next.js dev HMR socket only in development.
 */
async function headers() {
  const isDev = process.env.NODE_ENV !== "production";

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : ""),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
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
