"use client";
import { useEffect, useState } from "react";
import LiveSimulator from "@/components/LiveSimulator";
import NewOrderStarter from "@/components/NewOrderStarter";

export default function DashboardPage() {
  const [sim, setSim] = useState(null);

  useEffect(() => {
    const input = document.getElementById("company-input");
    if (!input) return;
    const handler = () => {
      setSim({ google_profile_url: input.value?.trim() || "", ts: new Date().toISOString() });
    };
    handler();
    input.addEventListener("input", handler);
    return () => input.removeEventListener("input", handler);
  }, []);

  return (
    <main style={{ minHeight: "100vh", padding: "12px" }}>
      <div style={{ maxWidth: 1207, margin: "0 auto" }}>
        {/* 1:1 Live-Simulator */}
        <LiveSimulator />

        {/* Button in deinem Style */}
        <div style={{ maxWidth: 755, margin: "16px auto 0" }}>
          <NewOrderStarter prefill={sim} />
        </div>
      </div>
    </main>
  );
}
