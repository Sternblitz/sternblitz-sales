"use client";

import { useEffect, useRef, useState } from "react";
import LiveSimulator from "@/components/LiveSimulator";
import NewOrderStarter from "@/components/NewOrderStarter";

/**
 * Dashboard mit:
 *  - LiveSimulator oben (Google Places + Review-Simulation)
 *  - CTA "Jetzt loslegen" im Simulator speichert das gewählte Profil
 *  - Formular "NewOrderStarter" wird mit den Profil-Daten vorbefüllt
 *  - Sanfter Scroll zum Formular
 */
export default function DashboardPage() {
  const formRef = useRef(null);

  // Vorbefüllung aus dem Simulator (Firma/Adresse/ggf. URL)
  const [prefill, setPrefill] = useState({
    name: "",
    address: "",
    google_profile_url: "",
  });

  // Hilfsfunktion: sanft zum Formular scrollen
  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Beim ersten Render: sessionStorage lesen (falls der User z.B. neu lädt)
  useEffect(() => {
    try {
      const saved =
        typeof window !== "undefined"
          ? JSON.parse(sessionStorage.getItem("sb_selected_profile") || "null")
          : null;
      if (saved?.name) {
        setPrefill({
          name: saved.name || "",
          address: saved.address || "",
          google_profile_url: [saved.name || "", saved.address || ""]
            .filter(Boolean)
            .join(" ")
            .trim(),
        });
      }
    } catch {
      // still bleiben, wenn sessionStorage leer/ungültig
    }
  }, []);

  // Globales Event vom Simulator entgegennehmen
  useEffect(() => {
    const handler = (e) => {
      const { name = "", address = "", url = "" } = e.detail || {};
      setPrefill({
        name,
        address,
        google_profile_url: [name, address].filter(Boolean).join(" ").trim() || url || "",
      });
      // Formular in Sicht bringen
      scrollToForm();
    };
    window.addEventListener("sb:simulator-start", handler);
    return () => window.removeEventListener("sb:simulator-start", handler);
  }, []);

  // Direkter Callback aus der Komponente (wird parallel zum Event genutzt)
  const handleSimulatorStart = ({ name = "", address = "", url = "" }) => {
    setPrefill({
      name,
      address,
      google_profile_url: [name, address].filter(Boolean).join(" ").trim() || url || "",
    });
    scrollToForm();
  };

  return (
    <main className="sb-dashboard-wrap">
      {/* Live-Simulator oben */}
      <LiveSimulator onStart={handleSimulatorStart} />

      {/* Formularbereich */}
      <section ref={formRef} id="order-form" className="sb-form-section">
        <NewOrderStarter prefill={prefill} />
      </section>

      {/* Basale Styles für Abstände/Responsiveness (keine Brand-Änderungen) */}
      <style jsx>{`
        .sb-dashboard-wrap {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px;
        }
        .sb-form-section {
          margin-top: 32px;
          padding-bottom: 48px;
        }
        @media (max-width: 768px) {
          .sb-dashboard-wrap {
            padding: 12px;
          }
          .sb-form-section {
            margin-top: 24px;
          }
        }
      `}</style>
    </main>
  );
}
