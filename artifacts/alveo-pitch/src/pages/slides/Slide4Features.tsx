export default function Slide4Features() {
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
              fontSize: "1.5vw",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 700,
              marginBottom: "1vh",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Sect. 03
          </div>
          <div style={{ fontSize: "1.5vw", fontFamily: "'DM Mono', monospace" }}>
            FEATURES
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
          padding: "4vw 5vw 3vw 5vw",
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
            fontSize: "1.5vw",
            fontFamily: "'DM Mono', monospace",
            color: "#666666",
            letterSpacing: "0.05em",
          }}
        >
          [ CAPABILITIES ]
        </div>

        <h2
          style={{
            fontSize: "4.5vw",
            fontWeight: 700,
            lineHeight: 1,
            margin: "0 0 2vh 0",
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            fontFamily: "'Playfair Display', serif",
          }}
        >
          Key Features
        </h2>

        <div style={{ width: "8vw", height: "0.4vw", backgroundColor: "#B5956A", marginBottom: "4vh" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5vw" }}>
          <div style={{ backgroundColor: "#111111", color: "#F4F4F0", padding: "2vw 1.8vw" }}>
            <div style={{ fontSize: "1.5vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1.5vh", letterSpacing: "0.05em" }}>001</div>
            <div style={{ fontSize: "1.4vw", fontWeight: 700, marginBottom: "1vh", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.1 }}>Configurator</div>
            <div style={{ width: "2.5vw", height: "0.2vw", backgroundColor: "#B5956A", marginBottom: "1.2vh" }} />
            <div style={{ fontSize: "1.3vw", color: "#CCCCCC", lineHeight: 1.4 }}>Guided room and wardrobe input</div>
          </div>
          <div style={{ border: "0.2vw solid #111111", padding: "2vw 1.8vw" }}>
            <div style={{ fontSize: "1.5vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1.5vh", letterSpacing: "0.05em" }}>002</div>
            <div style={{ fontSize: "1.4vw", fontWeight: 700, marginBottom: "1vh", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.1 }}>Gallery</div>
            <div style={{ width: "2.5vw", height: "0.2vw", backgroundColor: "#111111", marginBottom: "1.2vh" }} />
            <div style={{ fontSize: "1.3vw", color: "#333333", lineHeight: 1.4 }}>Browse and save inspiration layouts</div>
          </div>
          <div style={{ border: "0.2vw solid #111111", padding: "2vw 1.8vw" }}>
            <div style={{ fontSize: "1.5vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1.5vh", letterSpacing: "0.05em" }}>003</div>
            <div style={{ fontSize: "1.4vw", fontWeight: 700, marginBottom: "1vh", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.1 }}>Layout Engine</div>
            <div style={{ width: "2.5vw", height: "0.2vw", backgroundColor: "#111111", marginBottom: "1.2vh" }} />
            <div style={{ fontSize: "1.3vw", color: "#333333", lineHeight: 1.4 }}>Proprietary zone allocation algorithm</div>
          </div>
          <div style={{ border: "0.2vw solid #111111", padding: "2vw 1.8vw" }}>
            <div style={{ fontSize: "1.5vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1.5vh", letterSpacing: "0.05em" }}>004</div>
            <div style={{ fontSize: "1.4vw", fontWeight: 700, marginBottom: "1vh", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1.1 }}>PDF Export</div>
            <div style={{ width: "2.5vw", height: "0.2vw", backgroundColor: "#111111", marginBottom: "1.2vh" }} />
            <div style={{ fontSize: "1.3vw", color: "#333333", lineHeight: 1.4 }}>Professional-grade output ready to build</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5vw", marginTop: "1.5vw" }}>
          <div style={{ border: "0.2vw solid #111111", padding: "1.5vw 1.4vw", backgroundColor: "#F9F8F4" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1vh", letterSpacing: "0.05em" }}>005</div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, marginBottom: "0.8vh", textTransform: "uppercase" }}>Presentation Mode</div>
            <div style={{ fontSize: "1vw", color: "#444444", lineHeight: 1.4 }}>Full-screen client walkthroughs</div>
          </div>
          <div style={{ border: "0.2vw solid #111111", padding: "1.5vw 1.4vw", backgroundColor: "#F9F8F4" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1vh", letterSpacing: "0.05em" }}>006</div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, marginBottom: "0.8vh", textTransform: "uppercase" }}>Compare</div>
            <div style={{ fontSize: "1vw", color: "#444444", lineHeight: 1.4 }}>Side-by-side saved design review</div>
          </div>
          <div style={{ border: "0.2vw solid #111111", padding: "1.5vw 1.4vw", backgroundColor: "#F9F8F4" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1vh", letterSpacing: "0.05em" }}>007</div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, marginBottom: "0.8vh", textTransform: "uppercase" }}>Share & Email</div>
            <div style={{ fontSize: "1vw", color: "#444444", lineHeight: 1.4 }}>Read-only links and email handoff</div>
          </div>
          <div style={{ border: "0.2vw solid #111111", padding: "1.5vw 1.4vw", backgroundColor: "#F9F8F4" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1vh", letterSpacing: "0.05em" }}>008</div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, marginBottom: "0.8vh", textTransform: "uppercase" }}>Optimizer</div>
            <div style={{ fontSize: "1vw", color: "#444444", lineHeight: 1.4 }}>Layout variants for faster decisions</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5vw", marginTop: "1.5vw" }}>
          <div style={{ backgroundColor: "#111111", color: "#F4F4F0", padding: "1.5vw 1.4vw" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1vh", letterSpacing: "0.05em" }}>009</div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, marginBottom: "0.8vh", textTransform: "uppercase" }}>Approvals</div>
            <div style={{ fontSize: "1vw", color: "#CCCCCC", lineHeight: 1.4 }}>Clear sign-off before production</div>
          </div>
          <div style={{ border: "0.2vw solid #111111", padding: "1.5vw 1.4vw", backgroundColor: "#F9F8F4" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1vh", letterSpacing: "0.05em" }}>010</div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, marginBottom: "0.8vh", textTransform: "uppercase" }}>Versioning</div>
            <div style={{ fontSize: "1vw", color: "#444444", lineHeight: 1.4 }}>Track changes across iterations</div>
          </div>
          <div style={{ border: "0.2vw solid #111111", padding: "1.5vw 1.4vw", backgroundColor: "#F9F8F4" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1vh", letterSpacing: "0.05em" }}>011</div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, marginBottom: "0.8vh", textTransform: "uppercase" }}>Specs</div>
            <div style={{ fontSize: "1vw", color: "#444444", lineHeight: 1.4 }}>Dimensions and material notes</div>
          </div>
          <div style={{ border: "0.2vw solid #111111", padding: "1.5vw 1.4vw", backgroundColor: "#F9F8F4" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", marginBottom: "1vh", letterSpacing: "0.05em" }}>012</div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, marginBottom: "0.8vh", textTransform: "uppercase" }}>Pricing</div>
            <div style={{ fontSize: "1vw", color: "#444444", lineHeight: 1.4 }}>Fast estimates for proposals</div>
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
          fontSize: "1.5vw",
          textTransform: "uppercase",
          backgroundColor: "#111111",
          color: "#F4F4F0",
          letterSpacing: "0.05em",
        }}
      >
        <div>Alv&eacute;o Closet Configurator</div>
        <div style={{ display: "flex", gap: "2vw" }}>
          <span>SYS.IDX: 004</span>
          <span>PAGE: 04</span>
        </div>
      </div>
    </div>
  );
}
