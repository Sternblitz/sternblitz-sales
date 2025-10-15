"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LiveSimulator from "@/components/LiveSimulator";
import NewOrderStarter from "@/components/NewOrderStarter";

export default function DashboardPage() {
  const [sessionOk, setSessionOk] = useState(null);
  const [sim, setSim] = useState(null);

  useEffect(() => {
    supabase().auth.getSession().then(({ data }) => {
      if (!data?.session) window.location.href = "/login";
      else setSessionOk(true);
    });
  }, []);

  if (!sessionOk) return null;

  return (
    <main style={{maxWidth:900, margin:"0 auto", padding:16}}>
      <header style={{marginBottom:12}}>
        <h1 style={{fontSize:22, fontWeight:600}}>Sternblitz Dashboard</h1>
        <p style={{color:"#6b7280", fontSize:14}}>Simulator oben · darunter Auftrag starten</p>
      </header>

      <LiveSimulator onApply={setSim} />
      <NewOrderStarter prefill={sim} />

      <section style={{marginTop:16, background:"#fff", padding:16, borderRadius:16, boxShadow:"0 4px 16px rgba(0,0,0,.06)"}}>
        <h3 style={{fontSize:16, fontWeight:600, marginBottom:6}}>Meine Aufträge (Platzhalter)</h3>
        <p style={{color:"#6b7280"}}>Hier kommen später Listen/Filter, Teams & Status.</p>
      </section>
    </main>
  );
}
