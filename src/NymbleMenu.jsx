// NymbleMenu.jsx
export default function NymbleMenu() {
  const lunchPage = "https://nymble.gastrogate.com/lunch/";
  const lunchPdf = "https://pdf.gastrogate.com/pdf-lunch/nymble";

  return (
    <div style={{
      padding: "16px",
      borderRadius: "12px",
      background: "#fff",
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)"
    }}>
      <h3 style={{ marginTop: 0 }}>Nymble lunch</h3>
      <p>Se aktuell veckomeny hos Gastrogate.</p>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <a
          href={lunchPage}
          target="_blank"
          rel="noreferrer"
          style={buttonStyle}
        >
          Öppna lunchsidan
        </a>

        <a
          href={lunchPdf}
          target="_blank"
          rel="noreferrer"
          style={buttonStyle}
        >
          Öppna meny-PDF
        </a>
      </div>
    </div>
  );
}

const buttonStyle = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: "10px",
  textDecoration: "none",
  background: "#111",
  color: "#fff",
  fontWeight: 600
};
