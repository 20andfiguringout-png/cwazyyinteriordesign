export default function Slide3Solution() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#111111",
        fontFamily: "'Space Grotesk', sans-serif",
        color: "#F4F4F0",
        display: "grid",
        gridTemplateColumns: "1fr 3fr",
        gridTemplateRows: "1fr auto",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          borderRight: "0.2vw solid #333333",
          borderBottom: "0.2vw solid #333333",
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
              color: "#999999",
            }}
          >
            Sect. 02
          </div>
          <div style={{ fontSize: "1.5vw", fontFamily: "'DM Mono', monospace", color: "#F4F4F0" }}>
            SOLUTION
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
              color: "#999999",
            }}
          >
            Alv&eacute;o
          </div>
        </div>
      </div>

      <div
        style={{
          borderBottom: "0.2vw solid #333333",
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
          [ RESPONSE ]
        </div>

        <h2
          style={{
            fontSize: "4.5vw",
            fontWeight: 700,
            lineHeight: 1,
            margin: "0 0 2.5vh 0",
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            color: "#F4F4F0",
            fontFamily: "'Playfair Display', serif",
          }}
        >
          The Solution
        </h2>

        <div style={{ width: "8vw", height: "0.4vw", backgroundColor: "#B5956A", marginBottom: "4vh" }} />

        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.8vw",
            fontWeight: 600,
            color: "#F4F4F0",
            lineHeight: 1.3,
            margin: "0 0 4vh 0",
            maxWidth: "52vw",
          }}
        >
          Alv&eacute;o generates a precision elevation drawing in seconds.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2.5vh" }}>
          <div style={{ display: "flex", gap: "2vw", alignItems: "flex-start", borderTop: "0.1vw solid #333333", paddingTop: "2vh" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", fontWeight: 500, minWidth: "5vw", marginTop: "0.2vh" }}>INPUT</div>
            <div style={{ fontSize: "1.6vw", color: "#CCCCCC", lineHeight: 1.4 }}>Room dimensions + wardrobe catalog</div>
          </div>
          <div style={{ display: "flex", gap: "2vw", alignItems: "flex-start", borderTop: "0.1vw solid #333333", paddingTop: "2vh" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", fontWeight: 500, minWidth: "5vw", marginTop: "0.2vh" }}>OUTPUT</div>
            <div style={{ fontSize: "1.6vw", color: "#CCCCCC", lineHeight: 1.4 }}>Architect-grade SVG layout &mdash; every rod, shelf, drawer placed correctly</div>
          </div>
          <div style={{ display: "flex", gap: "2vw", alignItems: "flex-start", borderTop: "0.1vw solid #333333", paddingTop: "2vh" }}>
            <div style={{ fontSize: "1vw", fontFamily: "'DM Mono', monospace", color: "#B5956A", fontWeight: 500, minWidth: "5vw", marginTop: "0.2vh" }}>SPEED</div>
            <div style={{ fontSize: "1.6vw", color: "#CCCCCC", lineHeight: 1.4 }}>Results in under 5 minutes &mdash; free to use, no sign-up required</div>
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
          backgroundColor: "#B5956A",
          color: "#111111",
          letterSpacing: "0.05em",
          fontWeight: 700,
        }}
      >
        <div>Alv&eacute;o Closet Configurator</div>
        <div style={{ display: "flex", gap: "2vw" }}>
          <span>SYS.IDX: 003</span>
          <span>PAGE: 03</span>
        </div>
      </div>
    </div>
  );
}
