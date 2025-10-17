export const metadata = { title: "Sternblitz Sales", description: "Vertriebsplattform" };

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ margin: 0, background: "#F7FAFF", fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
        {children}
// app/layout.js
import "./globals.css";
import RepTracker from "./components/RepTracker";

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
      </body>
    </html>
  );
}
