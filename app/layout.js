import "./globals.css";             // Datei 4 unten – winzig, aber wichtig
import RepTracker from "./components/RepTracker";

export const metadata = {
  title: "Sternblitz Sales",
  description: "Vertriebsplattform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        <RepTracker />
        {children}
      </body>
    </html>
  );
}
