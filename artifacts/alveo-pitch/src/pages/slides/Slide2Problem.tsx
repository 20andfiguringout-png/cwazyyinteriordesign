export default function Slide2Problem() {
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
            Sect. 01
          </div>
          <div style={{ fontSize: "1.5vw", fontFamily: "'DM Mono', monospace" }}>
            PROBLEM
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
          [ CONTEXT ]
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
          The Problem
        </h2>

        <div style={{ width: "8vw", height: "0.4vw", backgroundColor: "#B5956A", marginBottom: "4vh" }} />

        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.8vw",
            fontWeight: 600,
            color: "#111111",
            lineHeight: 1.3,
            margin: "0 0 4vh 0",
            maxWidth: "52vw",
          }}
        >
          Closet design is a manual, time-consuming process.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2.5vh" }}>
          <div style={{ display: "flex", gap: "2vw", alignItems: "flex-start", borderTop: "0.1vw solid #C8C8C4", paddingTop: "2vh" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", fontWeight: 500, minWidth: "2.5vw", marginTop: "0.2vh" }}>001</div>
            <div style={{ fontSize: "1.6vw", color: "#333333", lineHeight: 1.4 }}>Interior designers spend hours on custom layouts by hand</div>
          </div>
          <div style={{ display: "flex", gap: "2vw", alignItems: "flex-start", borderTop: "0.1vw solid #C8C8C4", paddingTop: "2vh" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", fontWeight: 500, minWidth: "2.5vw", marginTop: "0.2vh" }}>002</div>
            <div style={{ fontSize: "1.6vw", color: "#333333", lineHeight: 1.4 }}>Homeowners rely on generic catalog templates that don&apos;t fit real wardrobes</div>
          </div>
          <div style={{ display: "flex", gap: "2vw", alignItems: "flex-start", borderTop: "0.1vw solid #C8C8C4", paddingTop: "2vh" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", fontWeight: 500, minWidth: "2.5vw", marginTop: "0.2vh" }}>003</div>
            <div style={{ fontSize: "1.6vw", color: "#333333", lineHeight: 1.4 }}>The gap between idea and buildable plan costs time, money, and clients</div>
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
          <span>SYS.IDX: 002</span>
          <span>PAGE: 02</span>
        </div>
      </div>
    </div>
  );
}
