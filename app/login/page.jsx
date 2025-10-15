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
    <main className="login-bg">
      <section className="login-box">
        {/* Logo + Titel */}
        <div className="head">
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ad4679902a5d278c4cf0bc_Group%202085662922-p-500.png"
            alt="Sternblitz Logo"
            className="logo"
          />
          <h1 className="headline">Sternblitz-Salesplattform</h1>
          <p className="subtitle">Die All-in-One-Lösung</p>
        </div>

        {/* Formular */}
        <form onSubmit={onLogin} className="form">
          <h2 className="login-text">Login</h2>

          <label className="label">E-Mail-Adresse</label>
          <input
            className="input"
            autoComplete="email"
            placeholder="vorname@sternblitz.de"
            value={email}
            onChange={e=>setEmail(e.target.value)}
          />

          <label className="label">Passwort</label>
          <div className="pw-row">
            <input
              className="input"
              autoComplete="current-password"
              placeholder="••••••••"
              type={showPw ? "text" : "password"}
              value={pw}
              onChange={e=>setPw(e.target.value)}
            />
            <button type="button" className="pw-toggle" onClick={()=>setShowPw(s=>!s)}>
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {err && <p className="msg err">{err}</p>}
          {ok && <p className="msg ok">{ok}</p>}

          <button disabled={loading} className="cta">
            {loading ? "..." : "Einloggen"}
          </button>

          <p className="hint">Nur für autorisierte Sternblitz-Mitarbeiter.</p>
        </form>
      </section>

      {/* Styling */}
      <style jsx>{`
        .login-bg {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 14px;
          background: url("https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689acdb9f72cb41186204eda_stars-rating.webp")
                      center/cover no-repeat;
          font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system;
        }

        .login-box {
          width: 100%;
          max-width: 480px;
          background: #fff;
          border-radius: 18px;
          padding: 32px 26px 26px;
          box-shadow: 0 6px 30px rgba(0,0,0,.12);
          text-align: center;
        }

        .head {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 22px;
        }
        .logo {
          height: 72px;
          width: auto;
          margin-bottom: 8px;
        }
        .headline {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #010101;
          margin: 0;
        }
        .subtitle {
          font-family: 'Poppins', sans-serif;
          font-size: 15px;
          color: rgba(1,1,1,.7);
          font-weight: 500;
          margin-top: 4px;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }
        .login-text {
          font-size: 20px;
          font-weight: 700;
          color: #000;
          margin-bottom: 6px;
        }
        .label {
          font-size: 13px;
          color: #333;
          text-align: left;
          margin-top: 6px;
        }
        .input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid rgba(1,1,1,.12);
          border-radius: 12px;
          font-size: 16px;
          outline: none;
          transition: all .2s ease;
        }
        .input:focus {
          border-color: #49a84c;
          box-shadow: 0 0 0 2px rgba(73,168,76,.25);
        }

        .pw-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .pw-toggle {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #fff;
          cursor: pointer;
          font-size: 13px;
        }

        .msg { margin: 6px 0 0; font-size: 14px; }
        .msg.err { color: #dc2626; }
        .msg.ok { color: #065f46; }

        .cta {
          margin-top: 16px;
          width: 100%;
          padding: 13px 14px;
          border-radius: 12px;
          background: linear-gradient(90deg, #000, #333);
          color: #fff;
          font-weight: 600;
          border: 0;
          cursor: pointer;
          transition: transform .05s ease, filter .2s ease;
        }
        .cta:hover { filter: brightness(1.07); }
        .cta:active { transform: translateY(1px); }

        .hint {
          margin-top: 14px;
          font-size: 13px;
          color: #6b7280;
        }

        @media (max-width: 480px) {
          .login-box { padding: 26px 18px 20px; border-radius: 14px; }
          .headline { font-size: 21px; }
          .logo { height: 60px; }
          .subtitle { font-size: 14px; }
          .login-text { font-size: 18px; }
          .input { font-size: 15px; }
        }
      `}</style>
    </main>
  );
}
