import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    // No remote images are used yet; add remotePatterns here when a CMS/CDN
    // is introduced (e.g. { protocol: "https", hostname: "cdn.d3-sg.com" }).
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
