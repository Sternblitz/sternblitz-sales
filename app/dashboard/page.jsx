"use client";
import { useEffect, useState } from "react";
import LiveSimulator from "@/components/LiveSimulator";
import NewOrderStarter from "@/components/NewOrderStarter"; // dein Button-Komponent (Placeholder ok)

export default function DashboardPage() {
  const [prefill, setPrefill] = useState({ google_profile_url: "", name: "", address: "" });

  useEffect(() => {
    const onType = () => {
      const v = document.getElementById("company-input")?.value?.trim() || "";
      setPrefill(p => ({ ...p, google_profile_url: v }));
    };
    const onPlace = (e) => {
      // hier kommt Name/Adresse vom Autocomplete
      const { name = "", address = "" } = e.detail || {};
      setPrefill({
  google_profile_url: `${name} ${address}`.trim(),
  name,
  address,
});
    };
    const onStart = () => {
      // Klick auf "Jetzt loslegen" im Simulator
      document.getElementById("sb-neworder-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const input = document.getElementById("company-input");
    input?.addEventListener("input", onType);
    window.addEventListener("sb:place-selected", onPlace);
    window.addEventListener("sb:start-order", onStart);

    onType(); // initial

    return () => {
      input?.removeEventListener("input", onType);
      window.removeEventListener("sb:place-selected", onPlace);
      window.removeEventListener("sb:start-order", onStart);
    };
  }, []);

  return (
    <main style={{ minHeight: "100vh", padding: 12 }}>
      <div style={{ maxWidth: 1207, margin: "0 auto" }}>
        <LiveSimulator />

        <div id="sb-neworder-anchor" style={{ maxWidth: 755, margin: "16px auto 0", background:"#fff", padding:16, borderRadius:16, boxShadow:"0 4px 16px rgba(0,0,0,.06)" }}>
          <NewOrderStarter prefill={prefill} />
        </div>
      </div>
    </main>
  );
}
