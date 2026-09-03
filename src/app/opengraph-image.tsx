import { ImageResponse } from "next/og";
import { siteConfig } from "@/data/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #05070d 0%, #141a2a 60%, #6f1e18 130%)",
          color: "#f3f5f9",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(135deg, #fd6a50, #d63420)",
              fontSize: 28,
            }}
          >
            D3
          </div>
          <span>{siteConfig.name}</span>
        </div>
        <div style={{ display: "flex", marginTop: 48, fontSize: 54, fontWeight: 700, maxWidth: 900 }}>
          {siteConfig.tagline}
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 26, color: "#c7cfe0", maxWidth: 820 }}>
          Data & AI &middot; Microsoft Dynamics 365 & Power Platform &middot; Digital Development
        </div>
      </div>
    ),
    { ...size }
  );
}
