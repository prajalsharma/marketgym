import { ImageResponse } from "next/og";

export const alt = "MarketGym: learn to read crypto markets by reasoning over real evidence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0b0d10",
          color: "#f2f4f7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "#f2f4f7" }} />
          <span style={{ fontWeight: 600 }}>MarketGym</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 600, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 960 }}>
            Read the market. Argue from evidence. Get graded.
          </div>
          <div style={{ fontSize: 30, color: "#a8b0bb", maxWidth: 900, lineHeight: 1.3 }}>
            A practice gym for crypto market analysis: real data, a coach that asks questions, and scores you can trust.
          </div>
        </div>
        <div style={{ display: "flex", gap: 36, fontSize: 24, color: "#a8b0bb" }}>
          <span>Diagnose</span>
          <span>Learn</span>
          <span>Practise</span>
          <span>Evaluate</span>
          <span>Improve</span>
          <span>Retain</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
