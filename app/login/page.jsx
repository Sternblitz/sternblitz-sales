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
    <main className="login-wrap">
      <section className="login-card">
        {/* Logo */}
        <div className="logo-row">
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ad4679902a5d278c4cf0bc_Group%202085662922-p-500.png"
            alt="Sternblitz Logo"
            className="logo"
          />
          <h1 className="title">Sternblitz Vertriebsplattform</h1>
        </div>

        {/* Value Props (klein, untereinander) */}
        <ul className="props">
          <li>Live-Simulator direkt im Pitch</li>
          <li>Digitale Abschlüsse in Minuten</li>
          <li>Pay-after-Success — 299 € Reverse-Charge</li>
          <li>Echtzeit-Tracking für Teamleiter</li>
        </ul>

        {/* Login Formular */}
        <form onSubmit={onLogin} className="form">
          <label className="label">E-Mail</label>
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

      {/* Styles im selben File – nutzt deine Live-Simulator Optik */}
      <style jsx>{`
        :global(html), :global(body) { height: 100%; }
        .login-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 12px;
          background: url("https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689acdb9f72cb41186204eda_stars-rating.webp")
                      center/cover no-repeat;
          font-family: 'Poppins', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        }

        .login-card {
          width: 100%;
          max-width: 720px;                 /* eine schmale Karte, wirkt edel */
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 6px 28px rgba(0,0,0,.10);
          padding: 26px 20px 22px;
        }

        .logo-row {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
          margin-bottom: 10px;
        }
        .logo { height: 46px; width: auto; }
        .title {
          margin: 0;
          font-family: 'Outfit', sans-serif;
          font-size: 22px;
          font-weight: 600;
          color: #010101;
          text-align: center;
        }

        .props {
          margin: 8px auto 18px;
          padding: 0 16px;
          list-style: none;
          max-width: 540px;
          color: rgba(1,1,1,.78);
          font-size: 14px;
          line-height: 1.55;
        }
        .props li { margin: 6px 0; text-align: center; }

        .form {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .label {
          font-size: 12px;
          color: #374151;
          margin-top: 8px;
        }
        .input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid rgba(1,1,1,.10);
          border-radius: 12px;
          font-size: 16px;
          outline: none;
          transition: box-shadow .15s ease, border-color .15s ease;
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
        }

        .msg { margin: 6px 0 0; font-size: 14px; }
        .msg.err { color: #dc2626; }
        .msg.ok { color: #065f46; }

        .cta {
          margin-top: 14px;
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          background: linear-gradient(90deg, #000, #333);
          color: #fff;
          font-weight: 600;
          border: 0;
          cursor: pointer;
          transition: filter .2s ease, transform .06s ease;
        }
        .cta:hover { filter: brightness(1.05); }
        .cta:active { transform: translateY(1px); }

        .hint {
          margin-top: 10px;
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        }

        /* Responsive – eine Spalte bleibt erhalten, nur Abstände skalieren */
        @media (max-width: 768px) {
          .login-card { padding: 22px 14px 18px; }
          .title { font-size: 20px; }
          .logo { height: 40px; }
          .props { font-size: 13px; }
        }
        @media (max-width: 480px) {
          .login-wrap { padding: 24px 10px; }
          .login-card { border-radius: 12px; }
          .title { font-size: 18px; }
          .props { font-size: 12.5px; }
        }
      `}</style>
    </main>
  );
}
