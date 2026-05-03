export default function Slide1Title() {
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
            Ref. No.
          </div>
          <div style={{ fontSize: "1.5vw", fontFamily: "'DM Mono', monospace" }}>
            2026-ALV
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
            Alvéo
          </div>
        </div>
      </div>

      <div
        style={{
          borderBottom: "0.2vw solid #111111",
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
            color: "#666666",
            letterSpacing: "0.05em",
          }}
        >
          [ PITCH DECK ]
        </div>

        <h1
          style={{
            fontSize: "10vw",
            fontWeight: 700,
            lineHeight: 0.88,
            margin: "0 0 4vh 0",
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
            fontFamily: "'Playfair Display', serif",
          }}
        >
          ALV&Eacute;O
        </h1>

        <div style={{ width: "14vw", height: "0.4vw", backgroundColor: "#B5956A", marginBottom: "4vh" }} />

        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "2vw",
            fontWeight: 400,
            color: "#333333",
            maxWidth: "42vw",
            lineHeight: 1.35,
            margin: "0 0 1.5vh 0",
          }}
        >
          Closet design, made precise.
        </p>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "1.2vw",
            fontWeight: 400,
            color: "#666666",
            maxWidth: "42vw",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          A precision layout engine for the closet industry.
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
          backgroundColor: "#111111",
          color: "#F4F4F0",
          letterSpacing: "0.05em",
        }}
      >
        <div>Alv&eacute;o Closet Configurator</div>
        <div style={{ display: "flex", gap: "2vw" }}>
          <span>SYS.IDX: 001</span>
          <span>DATE: 2026</span>
        </div>
      </div>
    </div>
  );
}
