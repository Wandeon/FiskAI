import { ImageResponse } from "next/og"

export const runtime = "edge"

export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "512px",
        height: "512px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
      }}
    >
      <div
        style={{
          width: "440px",
          height: "440px",
          borderRadius: "96px",
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 30px 60px rgba(15, 23, 42, 0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)",
                boxShadow: "0 14px 28px rgba(37, 99, 235, 0.35)",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: "54px",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              FiskAI
            </div>
            <div style={{ marginTop: "10px", fontSize: "22px", color: "rgba(255,255,255,0.85)" }}>
              Accounting, upgraded
            </div>
          </div>
        </div>
      </div>
    </div>,
    {
      width: 512,
      height: 512,
    }
  )
}
