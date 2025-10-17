// app/layout.js
export const metadata = {
  title: "Sternblitz Sales",
  description: "Vertriebsplattform",
};

import RepTracker from "./components/RepTracker"; // nur lassen, wenn die Datei existiert

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          background: "#F7FAFF",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
          color: "#0f172a",
        }}
      >
        {/* Optional: auskommentieren, falls du keins von beidem brauchst */}
        <RepTracker />
        {children}
      </body>
    </html>
  );
}
