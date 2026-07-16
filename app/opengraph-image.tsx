import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Fortune Cat — the money tracker that fills itself";
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
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: "linear-gradient(160deg, #14141a 0%, #1d1a24 100%)",
          color: "#f5f2ea",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 120 }}>🐱</div>
        <div style={{ fontSize: 64, fontWeight: 700 }}>Your money logs itself.</div>
        <div style={{ fontSize: 30, color: "#d4af37", display: "flex", gap: 14 }}>
          <span>Fortune Cat</span>
          <span style={{ color: "#8b8696" }}>·</span>
          <span style={{ color: "#8b8696" }}>no bank login · any currency · $9 once for Pro</span>
        </div>
      </div>
    ),
    size,
  );
}
