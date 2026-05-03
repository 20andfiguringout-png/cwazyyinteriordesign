export default function Slide6HowItWorks() {
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
            Sect. 05
          </div>
          <div style={{ fontSize: "1.5vw", fontFamily: "'DM Mono', monospace" }}>
            PROCESS
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
          padding: "5vw 5vw 3.5vh 5vw",
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
          [ WORKFLOW ]
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
          How It Works
        </h2>

        <div style={{ width: "8vw", height: "0.4vw", backgroundColor: "#B5956A", marginBottom: "4vh" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2vw 4vw" }}>
          <div style={{ borderTop: "0.1vw solid #C8C8C4", paddingTop: "2vh" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1vh", letterSpacing: "0.05em" }}>STEP 01</div>
            <div style={{ fontSize: "1.7vw", fontWeight: 700, marginBottom: "1vh", lineHeight: 1.1 }}>Tell us your space</div>
            <div style={{ fontSize: "1.4vw", color: "#555555", lineHeight: 1.4 }}>Dimensions, shape, constraints</div>
          </div>
          <div style={{ borderTop: "0.1vw solid #C8C8C4", paddingTop: "2vh" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1vh", letterSpacing: "0.05em" }}>STEP 02</div>
            <div style={{ fontSize: "1.7vw", fontWeight: 700, marginBottom: "1vh", lineHeight: 1.1 }}>Catalog your wardrobe</div>
            <div style={{ fontSize: "1.4vw", color: "#555555", lineHeight: 1.4 }}>What you own, down to shoe types</div>
          </div>
          <div style={{ borderTop: "0.1vw solid #C8C8C4", paddingTop: "2vh" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1vh", letterSpacing: "0.05em" }}>STEP 03</div>
            <div style={{ fontSize: "1.7vw", fontWeight: 700, marginBottom: "1vh", lineHeight: 1.1 }}>Choose your style</div>
            <div style={{ fontSize: "1.4vw", color: "#555555", lineHeight: 1.4 }}>Materials, finishes, aesthetic</div>
          </div>
          <div style={{ borderTop: "0.3vw solid #111111", paddingTop: "2vh" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1vh", letterSpacing: "0.05em" }}>STEP 04</div>
            <div style={{ fontSize: "1.7vw", fontWeight: 700, marginBottom: "1vh", lineHeight: 1.1 }}>Approve, price, and export</div>
            <div style={{ fontSize: "1.4vw", color: "#555555", lineHeight: 1.4 }}>A precision elevation with specs, pricing, and client-ready output</div>
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
          <span>SYS.IDX: 006</span>
          <span>PAGE: 06</span>
        </div>
      </div>
    </div>
  );
}
