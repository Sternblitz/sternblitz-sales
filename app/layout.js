// app/layout.js
import "./globals.css"; // keep if this file exists; see note below
import RepTracker from "../components/RepTracker"; // <-- FIXED PATH

export const metadata = {
  title: "Sternblitz Sales",
  description: "Vertriebsplattform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          background: "#F7FAFF",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
        }}
      >
        {/* Liest ?rep=... und speichert sessionStorage: sb_rep_code */}
        <RepTracker />
        {children}
      </body>
    </html>
  );
}
