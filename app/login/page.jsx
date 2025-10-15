"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase().auth.getSession().then(({ data }) => {
      if (data?.session) window.location.href = "/dashboard";
    });
  }, []);

  const onLogin = async (e) => {
    e.preventDefault();
    setErr(null); setOk(null);
    if (!email || !pw) { setErr("Bitte E-Mail und Passwort eingeben."); return; }
    setLoading(true);
    const { error } = await supabase().auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setOk("Login erfolgreich. Weiterleiten…");
    window.location.href = "/dashboard";
  };

  return (
    <main style={{
      minHeight:"100vh",
      display:"grid",
      placeItems:"center",
      background:"#F7FAFF",
      padding:"20px"
    }}>
      <div style={{
        width:"100%",
        maxWidth:960,
        display:"grid",
        gridTemplateColumns:"1.1fr 1fr",
        gap:24
      }}>
        {/* LEFT: Brand / Info */}
        <section style={{
          background:"#fff",
          borderRadius:20,
          padding:24,
          boxShadow:"0 6px 24px rgba(0,0,0,.06)"
        }}>
          <div style={{
            display:"flex",
            alignItems:"center",
            gap:12,
            marginBottom:10
          }}>
            <img
              src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ad4679902a5d278c4cf0bc_Group%202085662922-p-500.png"
              alt="Sternblitz Logo"
              style={{height:42, width:"auto"}}
            />
            <h1 style={{
              fontSize:20,
              fontWeight:700
            }}>
              Sternblitz Vertriebsplattform
            </h1>
          </div>

          <ul style={{
            margin:"12px 0 0 0",
            paddingLeft:18,
            color:"#374151",
            lineHeight:1.6
          }}>
            <li>Live-Simulator direkt im Pitch</li>
            <li>Digitale Kundenabschlüsse in Minuten</li>
            <li>Pay-after-Success – 299 € Reverse-Charge</li>
            <li>Echtzeit-Statistiken für Teamleiter</li>
          </ul>

          <p style={{
            marginTop:16,
            fontSize:12,
            color:"#6b7280"
          }}>Nur für autorisierte Sternblitz-Mitarbeiter.</p>
        </section>

        {/* RIGHT: Login */}
        <form onSubmit={onLogin} style={{
          background:"#fff",
          borderRadius:20,
          padding:24,
          boxShadow:"0 6px 24px rgba(0,0,0,.06)"
        }}>
          <h2 style={{fontSize:18, fontWeight:700, marginBottom:16}}>Login</h2>

          <label style={{fontSize:12, color:"#374151"}}>E-Mail</label>
          <input
            autoComplete="email"
            placeholder="vorname@sternblitz.de"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            style={{
              width:"100%", padding:12,
              border:"1px solid #e5e7eb", borderRadius:12,
              margin:"6px 0 12px"
            }}
          />

          <label style={{fontSize:12, color:"#374151"}}>Passwort</label>
          <div style={{
            display:"flex", gap:8, alignItems:"center", marginTop:6
          }}>
            <input
              autoComplete="current-password"
              placeholder="••••••••"
              type={showPw ? "text" : "password"}
              value={pw}
              onChange={e=>setPw(e.target.value)}
              style={{
                flex:1, padding:12,
                border:"1px solid #e5e7eb", borderRadius:12
              }}
            />
            <button
              type="button"
              onClick={()=>setShowPw(s=>!s)}
              style={{
                padding:"10px 12px",
                borderRadius:12,
                border:"1px solid #e5e7eb",
                background:"#fff",
                cursor:"pointer"
              }}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {err && <p style={{color:"#dc2626", marginTop:10}}>{err}</p>}
          {ok && <p style={{color:"#065f46", marginTop:10}}>{ok}</p>}

          <button disabled={loading} style={{
            marginTop:14,
            width:"100%", padding:12,
            borderRadius:12,
            background:"#000", color:"#fff",
            border:0, cursor:"pointer"
          }}>
            {loading ? "..." : "Einloggen"}
          </button>

          <p style={{
            marginTop:10, fontSize:12, color:"#6b7280"
          }}>
            Probleme beim Login? Wende dich an den Admin.
          </p>
        </form>
      </div>
    </main>
  );
}
