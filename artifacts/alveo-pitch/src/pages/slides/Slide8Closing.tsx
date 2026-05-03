export default function Slide8Closing() {
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
            Sect. 07
          </div>
          <div style={{ fontSize: "1.5vw", fontFamily: "'DM Mono', monospace", color: "#F4F4F0" }}>
            CLOSING
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
          justifyContent: "center",
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
            color: "#555555",
            letterSpacing: "0.05em",
          }}
        >
          [ END OF FILE ]
        </div>

        <h1
          style={{
            fontSize: "10vw",
            fontWeight: 700,
            lineHeight: 0.88,
            margin: "0 0 4vh 0",
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
            color: "#F4F4F0",
            fontFamily: "'Playfair Display', serif",
          }}
        >
          ALV&Eacute;O
        </h1>

        <div style={{ width: "14vw", height: "0.4vw", backgroundColor: "#B5956A", marginBottom: "4vh" }} />

        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "2.2vw",
            fontWeight: 400,
            color: "#CCCCCC",
            lineHeight: 1.3,
            margin: "0 0 1.5vh 0",
            fontStyle: "italic",
          }}
        >
          Carved for you.
        </p>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "1.3vw",
            fontWeight: 400,
            color: "#B5956A",
            letterSpacing: "0.05em",
            margin: 0,
          }}
        >
          alveocloset.com
        </p>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "1vw",
            fontWeight: 400,
            color: "#CCCCCC",
            letterSpacing: "0.05em",
            margin: "1.5vh 0 0 0",
          }}
        >
          Gallery · Compare · Present · Share
        </p>
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
          fontWeight: 700,
          letterSpacing: "0.05em",
        }}
      >
        <div>Alv&eacute;o Closet Configurator</div>
        <div style={{ display: "flex", gap: "2vw" }}>
          <span>SYS.IDX: 008</span>
          <span>DATE: 2026</span>
        </div>
      </div>
    </div>
  );
}
