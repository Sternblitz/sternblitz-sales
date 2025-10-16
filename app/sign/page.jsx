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
  const optionLabel = (opt) => ({ "123": "1–3 ⭐", "12": "1–2 ⭐", "1": "1 ⭐", "custom": "Individuell" }[opt] || opt);
  const optionCount = (opt, c) => {
    if (!c) return null;
    if (opt === "123") return c.c123;
    if (opt === "12")  return c.c12;
    if (opt === "1")   return c.c1;
    return null;
  };

  // Canvas einrichten (sauber mit DPR)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const cssW = 500, cssH = 220;
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
  const startDraw = (e) => { e.preventDefault(); const {x,y}=getPos(e); const ctx=canvasRef.current.getContext("2d"); ctx.beginPath(); ctx.moveTo(x,y); setIsDrawing(true); };
  const draw = (e) => { if(!isDrawing) return; e.preventDefault(); const {x,y}=getPos(e); const ctx=canvasRef.current.getContext("2d"); ctx.lineTo(x,y); ctx.stroke(); };
  const endDraw = (e) => { if(!isDrawing) return; e.preventDefault(); setIsDrawing(false); };
  const clearSig = () => {
    const c = canvasRef.current; const ctx = c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);
  };

  const handleSubmit = async () => {
    if (!isChecked) { alert("Bitte AGB & Datenschutz bestätigen."); return; }
    // simple „leer?“ Prüfung
    const c = canvasRef.current;
    const blank = document.createElement("canvas");
    blank.width = c.width; blank.height = c.height;
    if (c.toDataURL() === blank.toDataURL()) { alert("Bitte unterschreiben."); return; }

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
  const countText = Number.isFinite(chosenCount) ? `→ ${chosenCount.toLocaleString()} Bewertungen` : "→ —";

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
          <h1>Auftragsbestätigung <span>Sternblitz</span></h1>
          <p className="lead">
            Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.
          </p>
        </header>

        {/* Highlights */}
        <ul className="highlights">
          <li>✔️ Fixpreis: <strong>299 €</strong> (einmalig)</li>
          <li>✔️ Zahlung erst nach Löschung (von mind. 90 % der Bewertungen)</li>
          <li>✔️ Dauerhafte Entfernung</li>
        </ul>

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
            <input type="checkbox" checked={isChecked} onChange={(e)=>setIsChecked(e.target.checked)} />
            <span>
              Ich stimme den{" "}
              <a href="/AGB.pdf" target="_blank" rel="noopener noreferrer">AGB</a> und den{" "}
              <a href="/Datenschutz.pdf" target="_blank" rel="noopener noreferrer">Datenschutzbestimmungen</a> zu.
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
          --bg: #f7fafc;
          --card:#ffffff;
          --ink:#0f172a;
          --muted:#64748b;
          --line:#e5e7eb;
          --pill:#eaf7f0;
          --accent:#22c55e;
          --accent2:#34d399;
          --shadow: 0 24px 60px rgba(2,6,23,.08);
        }
        .sign-shell{
          min-height:100dvh;
          background:
            radial-gradient(80rem 30rem at 10% -10%, #e8fff3 0%, transparent 60%),
            radial-gradient(70rem 40rem at 110% -20%, #e6f0ff 0%, transparent 60%),
            var(--bg);
          display:flex;align-items:flex-start;justify-content:center;padding:48px 14px;
        }
        .card{
          width:100%;max-width:920px;background:var(--card);border:1px solid var(--line);
          border-radius:20px;box-shadow:var(--shadow);overflow:hidden;
        }
        .header{
          text-align:center;padding:28px 24px 10px;background:
            linear-gradient(180deg, #ffffff 0%, #f6fbff 60%, #ffffff 100%);
        }
        .logo{height:48px;width:auto;margin-bottom:10px;object-fit:contain}
        h1{margin:0;font-size:28px;color:var(--ink);font-weight:800}
        h1 span{color:#0b6cf2}
        .lead{margin:8px auto 0;max-width:660px;color:var(--muted)}

        .highlights{
          display:flex;gap:12px;flex-wrap:wrap;justify-content:center;
          margin:16px auto 10px;padding:0 20px 0;list-style:none;
        }
        .highlights li{
          background:#f8fafc;border:1px solid var(--line);border-radius:999px;
          padding:8px 12px;font-weight:600;color:#0a0a0a;
        }

        .summary{padding:16px 20px 6px}
        .row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .item{
          background:linear-gradient(135deg,#f7fff9 0%, #ffffff 60%);
          border:1px solid var(--line);border-radius:14px;padding:12px 14px;
        }
        .label{font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em}
        .value{margin-top:4px;color:var(--ink);font-weight:700}
        .count{margin-left:8px;color:#0b6cf2;font-weight:800}

        .signature{padding:16px 20px 24px}
        .sig-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
        .sig-title{font-size:16px;font-weight:800;color:var(--ink)}
        .ghost{
          background:transparent;border:1px solid var(--line);color:#0f172a;border-radius:10px;padding:6px 10px;font-weight:700;cursor:pointer;
        }
        .ghost:hover{background:#f8fafc}
        .sig-pad{
          border:1px dashed #cbd5e1;border-radius:14px;background:#fff;
          padding:12px;display:flex;justify-content:center;align-items:center;
        }
        .canvas{
          width:100%;max-width:500px;height:220px;border:2px solid #e5e7eb;border-radius:12px;background:#fff;touch-action:none;
        }

        .agree{display:flex;gap:10px;align-items:flex-start;margin:12px 0 0;color:var(--ink)}
        .agree a{color:#0b6cf2;text-decoration:underline}
        .actions{display:flex;justify-content:center;margin-top:18px}
        .confirm{
          display:inline-flex;align-items:center;gap:10px;padding:14px 22px;border-radius:999px;border:1px solid #16a34a;
          background:linear-gradient(135deg, var(--accent2) 0%, var(--accent) 100%);color:#ffffff;font-weight:800;letter-spacing:.2px;
          box-shadow:0 16px 36px rgba(34,197,94,.35);transition:transform .12s, box-shadow .18s, filter .18s;
        }
        .confirm:hover{transform:translateY(-1px);filter:brightness(1.03);box-shadow:0 22px 44px rgba(34,197,94,.45)}
        .confirm:active{transform:translateY(0);filter:brightness(.98)}
        .confirm:disabled{opacity:.6;cursor:not-allowed}

        @media (max-width:800px){
          .row{grid-template-columns:1fr}
          .header{padding:22px 16px 6px}
          .summary,.signature{padding:14px 14px 20px}
        }
      `}</style>
    </main>
  );
}
