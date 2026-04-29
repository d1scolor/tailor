import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "Tailor",
    short_name: "Tailor",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#12796f",
    background_color: "#faf9f6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  });
}
