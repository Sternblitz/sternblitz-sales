"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function TopNav() {
  const [rep, setRep] = useState(null);

  useEffect(() => {
    try { setRep(sessionStorage.getItem("sb_rep_code") || null); } catch {}
  }, []);

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 40,
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "saturate(1.1) blur(8px)",
      borderBottom: "1px solid #eef2ff"
    }}>
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12
      }}>
        {/* Logo + Marke */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ad4679902a5d278c4cf0bc_Group%202085662922-p-500.png"
            alt="Sternblitz"
            style={{ height: 34, width: "auto", objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,.08))" }}
          />
          <span style={{ fontWeight: 900, letterSpacing: ".3px", color: "#0f172a" }}>
            Sternblitz Sales
          </span>
        </Link>

        {/* Links rechts */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/dashboard" style={linkStyle}>Dashboard</Link>
          <Link href="/dashboard/orders" style={{ ...linkStyle, color: "#0b6cf2", fontWeight: 800 }}>
            Meine Aufträge
          </Link>
          {rep ? (
            <span style={{ fontSize: 12, color: "#64748b" }}>rep: <b>{rep}</b></span>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

const linkStyle = {
  textDecoration: "none",
  color: "#0f172a",
  fontWeight: 700
};
