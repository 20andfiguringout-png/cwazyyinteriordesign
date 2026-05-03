export default function Slide7Tech() {
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
            Sect. 06
          </div>
          <div style={{ fontSize: "1.5vw", fontFamily: "'DM Mono', monospace" }}>
            STACK
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
          [ TECHNICAL ]
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
          Built on Solid Ground
        </h2>

        <div style={{ width: "8vw", height: "0.4vw", backgroundColor: "#B5956A", marginBottom: "4vh" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2vw 4vw" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2vh" }}>
            <div style={{ borderTop: "0.1vw solid #C8C8C4", paddingTop: "1.5vh" }}>
              <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#999999", marginBottom: "0.5vh" }}>FRONTEND</div>
              <div style={{ fontSize: "1.6vw", fontWeight: 600 }}>React + TypeScript</div>
            </div>
            <div style={{ borderTop: "0.1vw solid #C8C8C4", paddingTop: "1.5vh" }}>
              <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#999999", marginBottom: "0.5vh" }}>DATA</div>
              <div style={{ fontSize: "1.6vw", fontWeight: 600 }}>Saved designs + versions</div>
              <div style={{ fontSize: "1.3vw", color: "#666666", marginTop: "0.5vh" }}>History for approvals and iteration</div>
            </div>
            <div style={{ borderTop: "0.1vw solid #C8C8C4", paddingTop: "1.5vh" }}>
              <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#999999", marginBottom: "0.5vh" }}>ENGINE</div>
              <div style={{ fontSize: "1.6vw", fontWeight: 600 }}>Custom SVG Layout Engine</div>
              <div style={{ fontSize: "1.3vw", color: "#666666", marginTop: "0.5vh" }}>Browser-native, zero server dependency</div>
            </div>
            <div style={{ borderTop: "0.1vw solid #C8C8C4", paddingTop: "1.5vh" }}>
              <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#999999", marginBottom: "0.5vh" }}>AUTH</div>
              <div style={{ fontSize: "1.6vw", fontWeight: 600 }}>Replit Auth</div>
              <div style={{ fontSize: "1.3vw", color: "#666666", marginTop: "0.5vh" }}>Secure, session-based identity</div>
            </div>
          </div>
          <div style={{ backgroundColor: "#111111", color: "#F4F4F0", padding: "2.5vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "2vh", letterSpacing: "0.05em", textTransform: "uppercase" }}>Output Format</div>
            <div style={{ fontSize: "2vw", fontWeight: 700, lineHeight: 1.1, marginBottom: "2vh" }}>Precision SVG Elevation</div>
            <div style={{ width: "4vw", height: "0.2vw", backgroundColor: "#B5956A", marginBottom: "2vh" }} />
            <div style={{ fontSize: "1.4vw", color: "#CCCCCC", lineHeight: 1.5 }}>The same format professional closet designers use. Generated in your browser in milliseconds.</div>
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
          <span>SYS.IDX: 007</span>
          <span>PAGE: 07</span>
        </div>
      </div>
    </div>
  );
}
