"use client";

import { useEffect, useRef, useState } from "react";

export default function SignPage() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Daten aus Step 1
  const [summary, setSummary] = useState({
    googleProfile: "",
    selectedOption: "",
    counts: { c123: null, c12: null, c1: null },
  });

  // Helpers
  const optionLabel = (opt) =>
    ({ "123": "1–3 ⭐", "12": "1–2 ⭐", "1": "1 ⭐", custom: "Individuell" }[opt] || opt);
  const optionCount = (opt, c) => (opt === "123" ? c?.c123 : opt === "12" ? c?.c12 : opt === "1" ? c?.c1 : null);

  // Canvas vorbereiten
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const cssW = 560, cssH = 240;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = cssW * ratio;
    canvas.height = cssH * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  // Session lesen
  useEffect(() => {
    try {
      const p = JSON.parse(sessionStorage.getItem("sb_checkout_payload") || "{}");
      setSummary({
        googleProfile: p?.googleProfile || "",
        selectedOption: p?.selectedOption || "",
        counts: p?.counts || { c123: null, c12: null, c1: null },
      });
    } catch {}
  }, []);

  // Zeichnen
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const startDraw = (e) => {
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };
  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const endDraw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
  };
  const clearSig = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
  };

  const handleSubmit = async () => {
    if (!isChecked) {
      alert("Bitte AGB & Datenschutz bestätigen.");
      return;
    }
    // einfache Leer-Prüfung
    const c = canvasRef.current;
    const blank = document.createElement("canvas");
    blank.width = c.width; blank.height = c.height;
    if (c.toDataURL() === blank.toDataURL()) {
      alert("Bitte unterschreiben.");
      return;
    }

    setSubmitting(true);
    const signaturePng = c.toDataURL("image/png");

    // später: Supabase Upload + PDF + Mail
    console.log("Signature (gekürzt):", signaturePng.slice(0, 60) + "…");
    alert("Unterschrift erfasst! (Nächster Schritt: PDF & E-Mail)");
    setSubmitting(false);
  };

  const chosenLabel = optionLabel(summary.selectedOption);
  const chosenCount = optionCount(summary.selectedOption, summary.counts);
  const countText =
    Number.isFinite(chosenCount) ? `→ ${Number(chosenCount).toLocaleString()} Bewertungen` : "→ —";

  return (
    <main className="sign-shell">
      <div className="card">

        {/* Kopfbereich */}
        <header className="brandbar">
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ad4679902a5d278c4cf0bc_Group%202085662922-p-500.png"
            alt="Sternblitz"
            className="logo"
          />
        </header>

        {/* Hero-Box mit Bullets */}
        <section className="hero-box">
          <h1>Auftragsbestätigung <span className="brand">Sternblitz</span></h1>
          <p className="lead">
            Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.
          </p>

          <ul className="bullets" role="list">
            <HeroBullet color="blue">Fixpreis: <strong>290 €</strong> (einmalig)</HeroBullet>
            <HeroBullet color="red">Zahlung erst nach Löschung (von mind. 90&nbsp;% der Bewertungen)</HeroBullet>
            <HeroBullet color="green">Dauerhafte Entfernung</HeroBullet>
          </ul>
        </section>

        {/* Zusammenfassung */}
        <section className="summary" aria-labelledby="sumhead">
          <h2 id="sumhead" className="sr-only">Zusammenfassung</h2>

          <div className="row">
            {/* Google-Profil (GRÜN akzent) */}
            <div className="item tint-green">
              <div className="accent" />
              <div className="label">Google-Profil</div>
              <div className="value">{summary.googleProfile || "—"}</div>
            </div>

            {/* Zu löschende Bewertungen (BLAU akzent) */}
            <div className="item tint-blue">
              <div className="accent" />
              <div className="label">Zu löschende Bewertungen</div>
              <div className="value">
                {chosenLabel || "—"}{" "}
                <span className="count">{countText}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Signatur */}
        <section className="signature" aria-labelledby="sighead">
          <div className="sig-head">
            <div id="sighead" className="sig-title">Unterschrift</div>
            <button type="button" className="ghost" onClick={clearSig}>Löschen</button>
          </div>

          <div className="sig-pad">
            <canvas
              ref={canvasRef}
              className="canvas"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>

          <label className="agree">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e)=>setIsChecked(e.target.checked)}
            />
            <span>
              Ich stimme den{" "}
              <a href="/AGB.pdf" target="_blank" rel="noopener noreferrer">AGB</a>{" "}
              und den{" "}
              <a href="/Datenschutz.pdf" target="_blank" rel="noopener noreferrer">Datenschutzbestimmungen</a>{" "}
              zu.
            </span>
          </label>

          <div className="actions">
            <button className="confirm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Wird gespeichert…" : "Unterschrift bestätigen ✅"}
            </button>
          </div>
        </section>
      </div>

      {/* Styles */}
      <style jsx>{`
        /* ---------- Palette & Tokens ---------- */
        :root{
          --g-blue:#4285F4;
          --g-red:#EA4335;
          --g-yellow:#FBBC05;
          --g-green:#34A853;

          --soft-green:#d8e7db; /* dein gewünschter Grünton */
          --ink:#0b0f19;
          --muted:#5b6472;
          --line:#e7ece9;

          --surface:#ffffff;
          --shadow-strong: 0 28px 70px rgba(13, 34, 23, .12);
          --shadow-soft: 0 10px 26px rgba(22, 74, 52, .12);
        }

        /* ---------- Radikal neuer Hintergrund (klar & farbig) ---------- */
        .sign-shell{
          min-height:100dvh;
          background:
            radial-gradient(1400px 900px at -15% -10%, rgba(66,133,244,.18) 0%, transparent 55%),
            radial-gradient(1300px 800px at 120% -10%, rgba(234,67,53,.14) 0%, transparent 60%),
            radial-gradient(1200px 900px at 50% 120%, rgba(27,94,32,.18) 0%, transparent 55%),
            linear-gradient(180deg, #f7fbff 0%, #ffffff 50%, #ffffff 100%);
          display:flex;align-items:flex-start;justify-content:center;
          padding:56px 18px 90px;
        }

        .card{
          width:100%;max-width:980px;background:transparent;border:0;border-radius:26px;overflow:hidden;
        }

        /* ---------- Brand-Leiste ---------- */
        .brandbar{
          display:flex;justify-content:center;align-items:center;
          padding:6px 0 14px;
        }
        .logo{height:58px;width:auto;object-fit:contain;filter: drop-shadow(0 6px 16px rgba(0,0,0,.08));}

        /* ---------- Hero-Box ---------- */
        .hero-box{
          margin:0 auto 16px;max-width:920px;
          background: var(--surface);
          border:1px solid var(--line);
          border-radius:18px;
          box-shadow: var(--shadow-strong);
          padding:22px 22px 16px;
        }
        h1{margin:4px 0 6px;font-size:30px;line-height:1.1;font-weight:900;color:#111;text-align:center}
        .brand{color:#111}
        .lead{margin:0 auto 14px;max-width:760px;color:var(--muted);text-align:center}

        .bullets{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;align-items:stretch}
        .bullet{
          display:flex;align-items:center;gap:12px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          border:1px solid var(--line);
          border-radius:12px;
          padding:12px 14px;
          font-weight:700;color:#111;
        }
        .dot{width:18px;height:18px;border-radius:999px;box-shadow:0 0 0 3px rgba(255,255,255,.9), 0 6px 12px rgba(0,0,0,.08)}
        .dot.blue{background:var(--g-blue)}
        .dot.red{background:var(--g-red)}
        .dot.green{background:var(--g-green)}

        /* ---------- Zusammenfassung-Karten ---------- */
        .summary{padding:14px 2px 0}
        .row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .item{
          position:relative;
          background: var(--surface);
          border:1px solid var(--line);
          border-radius:16px;
          padding:14px 16px 16px;
          box-shadow: var(--shadow-soft);
        }
        .item .accent{
          position:absolute;left:0;top:0;right:0;height:6px;border-top-left-radius:16px;border-top-right-radius:16px;
          background: #ddd;
        }
        .tint-green .accent{ background: linear-gradient(90deg, var(--soft-green) 0%, #bfe0c8 100%); }
        .tint-blue  .accent{ background: linear-gradient(90deg, rgba(66,133,244,.22) 0%, rgba(66,133,244,.45) 100%); }

        .label{margin-top:2px;font-size:12px;color:var(--muted);font-weight:900;text-transform:uppercase;letter-spacing:.06em}
        .value{margin-top:8px;color:var(--ink);font-weight:900;word-break:break-word}
        .count{margin-left:8px;color:var(--g-blue);font-weight:900}

        /* ---------- Signatur ---------- */
        .signature{padding:18px 2px 28px}
        .sig-head{display:flex;justify-content:space-between;align-items:center;margin:0 2px 10px}
        .sig-title{font-size:16px;font-weight:900;color:var(--ink)}
        .ghost{
          background:transparent;border:1px solid var(--line);color:#0f172a;border-radius:10px;
          padding:6px 12px;font-weight:800;cursor:pointer;
        }
        .ghost:hover{background:#f8fafc}

        .sig-pad{
          border:1px dashed #cfe0d4;border-radius:16px;
          background: linear-gradient(180deg, #ffffff 0%, #fcfffd 100%);
          padding:14px;display:flex;justify-content:center;align-items:center;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
        }
        .canvas{
          width:100%;max-width:560px;height:240px;border:2px solid #e6ebe8;border-radius:14px;background:#fff;touch-action:none;
        }

        .agree{display:flex;gap:10px;align-items:flex-start;margin:14px 2px 0;color:var(--ink)}
        .agree a{color:#0b6cf2;text-decoration:underline;text-underline-offset:3px}

        /* ---------- Confirm Button (Text schwarz, grüner Chip) ---------- */
        .actions{display:flex;justify-content:center;margin-top:20px}
        .confirm{
          display:inline-flex;align-items:center;gap:10px;
          padding:14px 22px;border-radius:999px;border:1px solid rgba(27,94,32,.35);
          background: linear-gradient(135deg, #eef6f0 0%, var(--soft-green) 100%);
          color:#0b0f19;
          font-weight:900;letter-spacing:.2px;
          box-shadow: 0 16px 40px rgba(22,74,52,.28), inset 0 1px 0 rgba(255,255,255,.7);
          transition: transform .12s ease, box-shadow .2s ease, filter .2s ease;
        }
        .confirm:hover{transform:translateY(-1px);filter:brightness(1.02);box-shadow:0 22px 48px rgba(22,74,52,.34)}
        .confirm:active{transform:translateY(0);filter:brightness(.98)}
        .confirm:disabled{opacity:.6;cursor:not-allowed}

        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

        /* ---------- Responsive ---------- */
        @media (max-width:900px){
          .hero-box{border-radius:16px;padding:18px 16px}
          .row{grid-template-columns:1fr}
          .canvas{max-width:100%}
        }
      `}</style>
    </main>
  );
}

/* ---------- kleine UI-Bausteine ---------- */
function HeroBullet({ color = "blue", children }) {
  return (
    <li className="bullet">
      <span className={`dot ${color}`} aria-hidden="true" />
      <span>{children}</span>
      <style jsx>{``}</style>
    </li>
  );
}
