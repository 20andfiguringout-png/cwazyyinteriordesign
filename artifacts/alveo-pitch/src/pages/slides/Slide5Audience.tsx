export default function Slide5Audience() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#F4F4F0",
        fontFamily: "'Space Grotesk', sans-serif",
        color: "#111111",
        display: "grid",
        gridTemplateColumns: "1fr 3fr",
        gridTemplateRows: "1fr auto",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          borderRight: "0.2vw solid #111111",
          borderBottom: "0.2vw solid #111111",
          padding: "4vw",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "1vw",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 700,
              marginBottom: "1vh",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Sect. 04
          </div>
          <div style={{ fontSize: "1.5vw", fontFamily: "'DM Mono', monospace" }}>
            MARKET
          </div>
        </div>

        <div>
          <div
            style={{
              width: "3vw",
              height: "3vw",
              backgroundColor: "#B5956A",
              borderRadius: "50%",
              marginBottom: "2vh",
            }}
          />
          <div
            style={{
              fontSize: "1.5vw",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Alv&eacute;o
          </div>
        </div>
      </div>

      <div
        style={{
          borderBottom: "0.2vw solid #111111",
          padding: "5vw 5vw 4vw 5vw",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "4vw",
            right: "4vw",
            fontSize: "1vw",
            fontFamily: "'DM Mono', monospace",
            color: "#666666",
            letterSpacing: "0.05em",
          }}
        >
          [ AUDIENCE ]
        </div>

        <h2
          style={{
            fontSize: "4.5vw",
            fontWeight: 700,
            lineHeight: 1,
            margin: "0 0 2.5vh 0",
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            fontFamily: "'Playfair Display', serif",
          }}
        >
          Who It&apos;s For
        </h2>

        <div style={{ width: "8vw", height: "0.4vw", backgroundColor: "#B5956A", marginBottom: "5vh" }} />

        <p
          style={{
            fontSize: "1.6vw",
            color: "#666666",
            fontFamily: "'DM Mono', monospace",
            marginBottom: "4vh",
            letterSpacing: "0.02em",
          }}
        >
          Designed for homeowners and interior designers.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3vw" }}>
          <div style={{ borderTop: "0.3vw solid #111111", paddingTop: "2.5vh" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1.5vh", letterSpacing: "0.05em", textTransform: "uppercase" }}>Segment A</div>
            <div style={{ fontSize: "2vw", fontWeight: 700, marginBottom: "2vh", letterSpacing: "-0.01em", lineHeight: 1.1 }}>Homeowners</div>
            <div style={{ fontSize: "1.5vw", color: "#444444", lineHeight: 1.5 }}>Design a closet without hiring a professional. Input your space and wardrobe once &mdash; get a layout built around your life.</div>
          </div>
          <div style={{ borderTop: "0.3vw solid #B5956A", paddingTop: "2.5vh" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1.5vh", letterSpacing: "0.05em", textTransform: "uppercase" }}>Segment B</div>
            <div style={{ fontSize: "2vw", fontWeight: 700, marginBottom: "2vh", letterSpacing: "-0.01em", lineHeight: 1.1 }}>Interior Designers</div>
            <div style={{ fontSize: "1.5vw", color: "#444444", lineHeight: 1.5 }}>Generate client proposals in minutes instead of hours. Share polished pitch-ready decks, version history, and precision SVG elevations at every stage of a project.</div>
          </div>
        </div>
      </div>

      <div
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "2vw 4vw",
          fontFamily: "'DM Mono', monospace",
          fontSize: "1vw",
          textTransform: "uppercase",
          backgroundColor: "#111111",
          color: "#F4F4F0",
          letterSpacing: "0.05em",
        }}
      >
        <div>Alv&eacute;o Closet Configurator</div>
        <div style={{ display: "flex", gap: "2vw" }}>
          <span>SYS.IDX: 005</span>
          <span>PAGE: 05</span>
        </div>
      </div>
    </div>
  );
}
