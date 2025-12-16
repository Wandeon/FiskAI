import { ImageResponse } from "next/og"

export const runtime = "edge"

export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        background: "linear-gradient(135deg, #0b1b4f 0%, #1e40af 55%, #2563eb 100%)",
        position: "relative",
        padding: "64px",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(900px circle at 15% 20%, rgba(96,165,250,0.35), transparent 55%), radial-gradient(700px circle at 80% 10%, rgba(99,102,241,0.35), transparent 52%)",
        }}
      />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "18px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.22)",
            padding: "10px 16px",
            borderRadius: "999px",
            width: "fit-content",
            fontSize: "18px",
            fontWeight: 700,
          }}
        >
          FiskAI • Centar znanja
        </div>

        <div
          style={{
            fontSize: "66px",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            maxWidth: "860px",
          }}
        >
          Vodiči, usporedbe i alati za odluke u Hrvatskoj
        </div>

        <div style={{ fontSize: "26px", color: "rgba(255,255,255,0.85)", maxWidth: "820px" }}>
          Paušalni obrt • Obrt na dohodak • j.d.o.o. • d.o.o. • PDV prag 60.000€
        </div>

        <div style={{ display: "flex", gap: "14px", marginTop: "22px", flexWrap: "wrap" }}>
          {["Čarobnjak", "Vodiči", "Usporedbe", "PDV kalkulator", "Uplatnice"].map((label) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.20)",
                padding: "10px 14px",
                borderRadius: "14px",
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: "64px",
          bottom: "64px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.18)",
          padding: "14px 16px",
          borderRadius: "18px",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "7px",
              background: "linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "18px", fontWeight: 800 }}>FiskAI</div>
          <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.85)" }}>
            AI-first računovodstvo
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  )
}
