import "./globals.css";                // (falls vorhanden)
import TopNav from "./components/TopNav";  // ⬅️ hinzufügen

export const metadata = {
  title: "Sternblitz Sales",
  description: "Vertriebsplattform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        <TopNav />        {/* ⬅️ hier einfügen */}
        {children}
      </body>
    </html>
  );
}
