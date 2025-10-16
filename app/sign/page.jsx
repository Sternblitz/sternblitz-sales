"use client";

import { useEffect, useRef, useState } from "react";

export default function SignPage() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Daten aus Step 1 (Session)
  const [summary, setSummary] = useState({
    googleProfile: "",
    selectedOption: "",
    counts: { c123: null, c12: null, c1: null },
  });

  // --- Helper: Option → Label + Count aus Session ---
  const optionLabel = (opt) =>
    ({ "123": "1–3 ⭐", "12": "1–2 ⭐", "1": "1 ⭐", custom: "Individuell" }[opt] || opt);
  const optionCount = (opt, c) => {
    if (!c) return null;
    if (opt === "123") return c.c123;
    if (opt === "12") return c.c12;
    if (opt === "1") return c.c1;
    return null;
  };

  // Canvas einrichten (sauber mit DPR)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const cssW = 500,
      cssH = 220;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = cssW * ratio;
    canvas.height = cssH * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
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

  // Canvas-Draw
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if ("touches" in e) {
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
    // simple „leer?“ Prüfung
    const c = canvasRef.current;
    const blank = document.createElement("canvas");
    blank.width = c.width;
    blank.height = c.height;
    if (c.toDataURL() === blank.toDataURL()) {
      alert("Bitte unterschreiben.");
      return;
    }

    setSubmitting(true);
    const signaturePng = c.toDataURL("image/png");

    // hier später: Upload zu Supabase + PDF-Generierung
    console.log("Signature (PNG base64…):", signaturePng.slice(0, 60) + "…");
    alert("Unterschrift erfasst! (Nächster Schritt: PDF & E-Mail)");
    setSubmitting(false);
  };

  // Anzeige-Werte
  const chosenLabel = optionLabel(summary.selectedOption);
  const chosenCount = optionCount(summary.selectedOption, summary.counts);
  const countText = Number.isFinite(chosenCount)
    ? `→ ${chosenCount.toLocaleString()} Bewertungen`
    : "→ —";

  return (
    <main className="sign-shell">
      <div className="card">
        {/* Header mit Logo */}
        <header className="header">
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ad4679902a5d278c4cf0bc_Group%202085662922-p-500.png"
            alt="Sternblitz"
            className="logo"
          />
          <h1>Auftragsbestätigung Sternblitz</h1>
          <p className="lead">
            Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.
          </p>
        </header>

        {/* Highlights – untereinander */}
        <section className="highlights">
          <div className="hl-item">✔️ <strong>Fixpreis: 290 €</strong> (einmalig)</div>
          <div className="hl-item">✔️ Zahlung erst nach Löschung (von mind. 90 % der Bewertungen)</div>
          <div className="hl-item">✔️ Dauerhafte Entfernung</div>
        </section>

        {/* Zusammenfassung */}
        <section className="summary">
          <div className="row">
            <div className="item">
              <div className="label">Google-Profil</div>
              <div className="value">{summary.googleProfile || "—"}</div>
            </div>
            <div className="item">
              <div className="label">Zu löschende Bewertungen</div>
              <div className="value">
                {chosenLabel || "—"} <span className="count">{countText}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Signatur */}
        <section className="signature">
          <div className="sig-head">
            <div className="sig-title">Unterschrift</div>
            <button type="button" className="ghost" onClick={clearSig}>
              Löschen
            </button>
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
              onChange={(e) => setIsChecked(e.target.checked)}
            />
            <span>
              Ich stimme den{" "}
              <a href="/AGB.pdf" target="_blank" rel="noopener noreferrer">
                AGB
              </a>{" "}
              und den{" "}
              <a href="/Datenschutz.pdf" target="_blank" rel="noopener noreferrer">
                Datenschutzbestimmungen
              </a>{" "}
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
  :root{
    --bg:#ffffff;
    --ink:#0b0b0b;
    --muted:#475569;
    --line:#e6eaf1;
    --accent:#b5d0bb;
    --accent2:#d8e7db;
    --shadow:0 24px 60px rgba(2,6,23,.08);
  }

  /* 🌿 Farbiger, aber sanfter Gradient mit #d8e7db als Grundton */
  .sign-shell{
    min-height:100dvh;
    background:
      radial-gradient(1200px 700px at -10% -20%, rgba(99,180,255,0.65) 0%, transparent 70%),
      radial-gradient(1100px 700px at 120% -10%, rgba(255,164,231,0.55) 0%, transparent 70%),
      radial-gradient(1400px 800px at 50% 110%, rgba(216,231,219,0.85) 0%, transparent 70%),
      linear-gradient(180deg, #f9fbff 0%, #f3f9f6 50%, #ffffff 100%);
    display:flex;
    align-items:flex-start;
    justify-content:center;
    padding:52px 14px;
    background-attachment: fixed;
  }

  .card{
    width:100%;
    max-width:940px;
    background:rgba(255,255,255,0.9);
    backdrop-filter: blur(18px) saturate(160%);
    border:1px solid var(--line);
    border-radius:22px;
    box-shadow:0 30px 70px rgba(10,20,50,0.08);
    overflow:hidden;
    transition:all 0.3s ease;
  }

  .header{text-align:center;padding:30px 24px 14px;}
  .logo{height:72px;width:auto;margin-bottom:14px;object-fit:contain}
  h1{margin:0;font-size:30px;color:var(--ink);font-weight:900;letter-spacing:.2px}
  .lead{margin:10px auto 0;max-width:720px;color:var(--muted);font-size:16px}

  .highlights{
    display:flex;
    flex-direction:column;
    gap:10px;
    max-width:760px;
    margin:16px auto 6px;
    padding:0 20px;
  }
  .hl-item{
    background:linear-gradient(90deg, rgba(216,231,219,0.3) 0%, rgba(255,255,255,0.85) 100%);
    border:1px solid rgba(200,220,205,0.6);
    border-radius:12px;
    padding:10px 12px;
    font-weight:700;
    color:var(--ink);
    box-shadow:0 4px 10px rgba(160,190,170,0.15);
  }

  .summary{padding:16px 20px 6px}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .item{
    background:linear-gradient(135deg,#f6fbf7 0%, #ffffff 60%);
    border:1px solid var(--line);
    border-radius:14px;
    padding:12px 14px;
  }
  .label{font-size:12px;color:#6b7280;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
  .value{margin-top:4px;color:var(--ink);font-weight:800}
  .count{margin-left:8px;color:#0b6cf2;font-weight:900}

  .signature{padding:18px 20px 26px}
  .sig-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
  .sig-title{font-size:16px;font-weight:900;color:var(--ink)}
  .ghost{
    background:transparent;
    border:1px solid var(--line);
    color:var(--ink);
    border-radius:10px;
    padding:6px 10px;
    font-weight:800;
    cursor:pointer;
  }
  .ghost:hover{background:#f8fafc}
  .sig-pad{
    border:1px dashed #cbd5e1;
    border-radius:14px;
    background:#fff;
    padding:12px;
    display:flex;
    justify-content:center;
    align-items:center;
  }
  .canvas{
    width:100%;
    max-width:500px;
    height:220px;
    border:2px solid #e5e7eb;
    border-radius:12px;
    background:#fff;
    touch-action:none;
  }

  .agree{
    display:flex;
    gap:10px;
    align-items:flex-start;
    margin:12px 0 0;
    color:var(--ink);
  }
  .agree a{color:#0b6cf2;text-decoration:underline}

  .actions{display:flex;justify-content:center;margin-top:20px}
  .confirm{
    display:inline-flex;
    align-items:center;
    gap:10px;
    padding:14px 22px;
    border-radius:999px;
    border:1px solid #a6c6ad;
    background:linear-gradient(135deg,#e8f1ea 0%, #d8e7db 100%);
    color:#0b0b0b;
    font-weight:900;
    letter-spacing:.2px;
    box-shadow:0 16px 36px rgba(160,190,170,.35);
    transition:transform .12s, box-shadow .18s, filter .18s;
  }
  .confirm:hover{
    transform:translateY(-1px);
    filter:brightness(1.04);
    box-shadow:0 22px 50px rgba(160,190,170,.45);
  }
  .confirm:active{transform:translateY(0);filter:brightness(.98)}
  .confirm:disabled{opacity:.6;cursor:not-allowed}

  @media(max-width:800px){
    .row{grid-template-columns:1fr}
    .header{padding:24px 16px 10px}
    .summary,.signature{padding:14px 14px 20px}
  }
`}</style>
    </main>
  );
}
