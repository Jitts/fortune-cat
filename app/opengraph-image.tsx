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
          gap: 30,
          background: "radial-gradient(120% 120% at 78% 12%, #2a2013 0%, #17130f 55%)",
          color: "#f7f1e6",
          fontFamily: "sans-serif",
        }}
      >
        {/* minted fortune coin */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 132,
            height: 132,
            borderRadius: 999,
            background: "linear-gradient(180deg, #f4d888, #e8bd54)",
            color: "#2a1e05",
            fontSize: 60,
            fontWeight: 800,
            boxShadow: "0 0 0 6px rgba(237,195,91,0.18)",
          }}
        >
          金
        </div>
        <div style={{ fontSize: 66, fontWeight: 800, letterSpacing: -1 }}>Your money logs itself.</div>
        <div style={{ fontSize: 28, color: "#edc35b", display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontWeight: 700 }}>Fortune Cat</span>
          <span style={{ color: "#8f8578" }}>·</span>
          <span style={{ color: "#c9bfae" }}>no bank login · any currency · $9 once for Pro</span>
        </div>
      </div>
    ),
    size,
  );
}
