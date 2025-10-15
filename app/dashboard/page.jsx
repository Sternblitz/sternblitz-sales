"use client";
import { useEffect, useState } from "react";
import LiveSimulator from "@/components/LiveSimulator";

export default function DashboardPage() {
  const [prefill, setPrefill] = useState({ google_profile_url: "", name: "", address: "" });

  useEffect(() => {
    const onType = () => {
      const v = document.getElementById("company-input")?.value?.trim() || "";
      setPrefill(p => ({ ...p, google_profile_url: v }));
    };
    const onPlace = (e) => {
      const name = e?.detail?.name || "";
      const address = e?.detail?.address || "";
      setPrefill({ google_profile_url: [name, address].filter(Boolean).join(" "), name, address });
    };
    const onStart = () => {
      // hier später Formular öffnen / scrollen
      // document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth" });
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
        {/* <div id="order-form" style={{ maxWidth: 755, margin: "16px auto 0" }}>
          ...hier kommt als Nächstes dein Auftrags-Formular...
        </div> */}
      </div>
    </main>
  );
}
