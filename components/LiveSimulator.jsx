"use client";
import { useState } from "react";

export default function LiveSimulator({ onApply }) {
  const [googleUrl, setGoogleUrl] = useState("");
  const [currentAvg, setCurrentAvg] = useState("3.5");
  const [targetAvg, setTargetAvg] = useState("4.9");

  const apply = () => {
    onApply({
      google_profile_url: googleUrl,
      before: currentAvg,
      after: targetAvg,
      ts: new Date().toISOString()
    });
  };

  return (
    <div style={{background:"#fff", padding:16, borderRadius:16, boxShadow:"0 4px 16px rgba(0,0,0,.06)", marginBottom:16}}>
      <h2 style={{fontSize:18, fontWeight:600, marginBottom:8}}>Live-Simulator</h2>
      <div style={{display:"grid", gap:8, gridTemplateColumns:"1fr 1fr 1fr"}}>
        <input placeholder="Google-Profil-URL" value={googleUrl} onChange={e=>setGoogleUrl(e.target.value)}
               style={{padding:10, border:"1px solid #e5e7eb", borderRadius:12}} />
        <input placeholder="Aktuell (z. B. 3.5)" value={currentAvg} onChange={e=>setCurrentAvg(e.target.value)}
               style={{padding:10, border:"1px solid #e5e7eb", borderRadius:12}} />
        <input placeholder="Ziel (z. B. 4.9)" value={targetAvg} onChange={e=>setTargetAvg(e.target.value)}
               style={{padding:10, border:"1px solid #e5e7eb", borderRadius:12}} />
      </div>
      <div style={{marginTop:10}}>
        <button onClick={apply} style={{padding:"10px 14px", borderRadius:12, background:"#000", color:"#fff", border:0}}>
          Übernehmen
        </button>
      </div>
    </div>
  );
}
