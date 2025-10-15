"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase().auth.getSession().then(({ data }) => {
      if (data?.session) window.location.href = "/dashboard";
    });
  }, []);

  const onLogin = async (e) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    const { error } = await supabase().auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) return setErr(error.message);
    window.location.href = "/dashboard";
  };

  return (
    <main style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center"}}>
      <form onSubmit={onLogin} style={{width:360, background:"#fff", padding:24, borderRadius:16, boxShadow:"0 6px 24px rgba(0,0,0,.08)"}}>
        <h1 style={{fontSize:22, fontWeight:600, marginBottom:12}}>Sternblitz Login</h1>
        <input
          placeholder="E-Mail"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          style={{width:"100%", padding:12, border:"1px solid #e5e7eb", borderRadius:12, marginBottom:8}}
        />
        <input
          placeholder="Passwort"
          type="password"
          value={pw}
          onChange={e=>setPw(e.target.value)}
          style={{width:"100%", padding:12, border:"1px solid #e5e7eb", borderRadius:12, marginBottom:8}}
        />
        {err && <p style={{color:"#dc2626", marginBottom:8}}>{err}</p>}
        <button disabled={loading} style={{width:"100%", padding:12, borderRadius:12, background:"#000", color:"#fff", border:0}}>
          {loading ? "..." : "Einloggen"}
        </button>
      </form>
    </main>
  );
}
