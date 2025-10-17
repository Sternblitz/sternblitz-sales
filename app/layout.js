import "./globals.css";
import TopNav from "./components/TopNav";

export const metadata = {
  title: "Sternblitz Sales",
  description: "Vertriebsplattform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        <HideTopNavOnLogin>
          <TopNav />
        </HideTopNavOnLogin>
        {children}
      </body>
    </html>
  );
}

// client-wrapper
"use client";
import { usePathname } from "next/navigation";
function HideTopNavOnLogin({ children }) {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return children;
}
