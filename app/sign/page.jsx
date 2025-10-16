"use client";

import { useEffect, useRef, useState } from "react";

export default function SignPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Daten aus Step 1 (Session)
  const [summary, setSummary] = useState<{
    googleProfile: string;
    selectedOption: string;
    counts: { c123: number | null; c12: number | null; c1: number | null };
  }>({
    googleProfile: "",
    selectedOption: "",
    counts: { c123: null, c12: null, c1: null },
  });

  // Option → Label + Count
  const optionLabel = (opt: string) =>
    ({ "123": "1–3 ⭐", "12": "1–2 ⭐", "1": "1 ⭐", custom: "Individuell" } as any)[opt] || opt;

  const optionCount = (opt: string, c?: { c123?: number | null; c12?: number | null; c1?: number | null }) => {
    if (!c) return null;
    if (opt === "123") return c.c123 ?? null;
    if (opt === "12") return c.c12 ?? null;
    if (opt === "1") return c.c1 ?? null;
    return null;
  };

  // Canvas DPR-Setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const cssW = 560, cssH = 240;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = cssW * ratio;
    canvas.height = cssH * ratio;
    const ctx = canvas.getContext("2d")!;
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

  // Canvas-Draw
  const getPos = (e: any) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const startDraw = (e: any) => { e.preventDefault(); const { x, y } = getPos(e); const ctx = canvasRef.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true); };
  const draw = (e: any) => { if (!isDrawing) return; e.preventDefault(); const { x, y } = getPos(e); const ctx = canvasRef.current!.getContext("2d")!; ctx.lineTo(x, y); ctx.stroke(); };
  const endDraw = (e: any) => { if (!isDrawing) return; e.preventDefault(); setIsDrawing(false); };
  const clearSig = () => {
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
  };

  const handleSubmit = async () => {
    if (!isChecked) { alert("Bitte AGB & Datenschutz bestätigen."); return; }

    // einfache Leer-Prüfung
    const c = canvasRef.current!;
    const blank = document.createElement("canvas");
    blank.width = c.width; blank.height = c.height;
    if (c.toDataURL() === blank.toDataURL()) { alert("Bitte unterschreiben."); return; }

    setSubmitting(true);
    const signaturePng = c.toDataURL("image/png");

    // (hier später: Upload zu Supabase + PDF-Generierung + E-Mail)
    console.log("Signature (base64, gekürzt):", signaturePng.slice(0, 60) + "…");
    alert("Unterschrift erfasst! (Nächster Schritt: PDF & E-Mail)");
    setSubmitting(false);
  };

  // Anzeige
  const chosenLabel = optionLabel(summary.selectedOption);
  const chosenCount = optionCount(summary.selectedOption, summary.counts);
  const countText = Number.isFinite(chosenCount as any) ? `→ ${(chosenCount as number).toLocaleString()} Bewertungen` : "→ —";

  return (
    <main className="sign-shell">
      <div className="card">
        {/* Header */}
        <header className="header">
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ad4679902a5d278c4cf0bc_Group%202085662922-p-500.png"
            alt="Sternblitz"
            className="logo"
            decoding="async"
          />
          <h1>Auftragsbestätigung <span className="brand">Sternblitz</span></h1>
          <p className="lead">
            Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.
          </p>
        </header>

        {/* Highlights */}
        <ul className="highlights" role="list">
          <li>
            <span className="chip">
              <CheckIcon /> <strong>Fixpreis: 290 €</strong> (einmalig)
            </span>
          </li>
          <li>
            <span className="chip">
              <CheckIcon /> Zahlung erst nach Löschung (von mind. 90 % der Bewertungen)
            </span>
          </li>
          <li>
            <span className="chip">
              <CheckIcon /> Dauerhafte Entfernung
            </span>
          </li>
        </ul>

        {/* Zusammenfassung */}
        <section className="summary" aria-labelledby="sumhead">
          <h2 id="sumhead" className="sr-only">Zusammenfassung</h2>
          <div className="row">
            <div className="item itemL">
              <div className="label">Google-Profil</div>
              <div className="value">{summary.googleProfile || "—"}</div>
            </div>
            <div className="item itemR">
              <div className="label">Zu löschende Bewertungen</div>
              <div className="value">
                {chosenLabel || "—"} <span className="count">{countText}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Signatur */}
        <section className="signature" aria-labelledby="sighead">
          <div className="sig-head">
            <div id="sighead" className="sig-title">Unterschrift</div>
            <button type="button" className="ghost" onClick={clearSig} aria-label="Unterschrift löschen">
              Löschen
            </button>
          </div>

          <div className="sig-pad" aria-live="polite">
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
              <a href="/AGB.pdf" target="_blank" rel="noopener noreferrer">AGB</a>{" "}
              und den{" "}
              <a href="/Datenschutz.pdf" target="_blank" rel="noopener noreferrer">Datenschutzbestimmungen</a>{" "}
              zu.
            </span>
          </label>

          <div className="actions">
            <button className="confirm" onClick={handleSubmit} disabled={submitting}>
              <span className="confirm__shine" aria-hidden />
              {submitting ? "Wird gespeichert…" : "Unterschrift bestätigen ✅"}
            </button>
          </div>
        </section>
      </div>

      {/* Styles */}
      <style jsx>{`
        :root{
          /* Palette (verstärkt, Grün in Richtung #d8e7db) */
          --bg-0:#f2f7f3;
          --bg-1:#d8e7db;      /* Hauptgrün soft */
          --bg-2:#ebf3ef;
          --bg-3:#e8eefc;      /* bläuliches Licht */
          --pink:#ffd7f0;

          --card:#ffffff;
          --ink:#0b0f19;
          --muted:#5b6472;
          --line:#e6ebe8;
          --pill:#eef7f1;
          --accent:#22c55e;
          --accent2:#34d399;
          --brand:#0984ff;

          --ring: 0 0 0 3px rgba(9, 132, 255, .18);
          --shadow-lg: 0 30px 70px rgba(10,20,10,.10);
          --shadow-soft: 0 8px 22px rgba(88,126,106,.18);
        }

        /* Page Background mit mehreren Lichtquellen + Körnung */
        .sign-shell{
          min-height:100dvh;
          background:
            radial-gradient(1200px 800px at 50% -10%, rgba(216,231,219,.9) 0%, transparent 65%),
            radial-gradient(1100px 700px at 120% -10%, rgba(255,164,231,.30) 0%, transparent 70%),
            radial-gradient(1300px 900px at -20% 120%, rgba(152,195,171,.25) 0%, transparent 70%),
            linear-gradient(180deg, var(--bg-2) 0%, var(--bg-0) 55%, #ffffff 100%);
          position:relative;
          display:flex;align-items:flex-start;justify-content:center;
          padding:54px 14px 80px;
          isolation:isolate;
        }
        .sign-shell::after{
          /* feine Körnung für Tiefe */
          content:""; position:fixed; inset:0; pointer-events:none; opacity:.06; mix-blend-mode:multiply;
          background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><defs><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='table' tableValues='0 0.6'/></feComponentTransfer></filter></defs><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          background-size: 220px 220px;
        }

        .card{
          width:100%;max-width:980px;background:var(--card);border:1px solid var(--line);
          border-radius:22px;box-shadow:var(--shadow-lg);overflow:hidden; position:relative;
        }

        /* Header */
        .header{
          text-align:center;padding:34px 26px 12px;
          background:
            radial-gradient(900px 300px at 50% -10%, rgba(216,231,219,.9) 0%, transparent 60%),
            linear-gradient(180deg, #ffffff 0%, #f6fbff 60%, #ffffff 100%);
        }
        .logo{height:56px;width:auto;margin-bottom:16px;object-fit:contain; filter: drop-shadow(0 4px 16px rgba(0,0,0,.06));}
        h1{margin:0;font-size:26px;letter-spacing:.2px;color:#111;font-weight:900}
        .brand{color:#111} /* alles schwarz wie gewünscht */
        .lead{margin:10px auto 0;max-width:700px;color:var(--muted);font-weight:500}

        /* Highlights */
        .highlights{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin:18px auto 6px;padding:0 20px 0;list-style:none}
        .chip{
          display:inline-flex;align-items:center;gap:10px;
          background:linear-gradient(180deg, #ffffff 0%, #f6fbff 100%);
          border:1px solid var(--line);
          border-radius:999px;padding:10px 14px;
          color:#111;font-weight:700;
          box-shadow: var(--shadow-soft), inset 0 1px 0 rgba(255,255,255,.8);
        }
        .chip svg{flex:none}

        /* Summary */
        .summary{padding:18px 22px 10px}
        .row{display:grid;grid-template-columns:3fr 2fr;gap:14px}
        .item{
          background:linear-gradient(135deg, #f8fffb 0%, #ffffff 70%); border:1px solid var(--line);
          border-radius:14px;padding:14px 16px; box-shadow:0 8px 22px rgba(88,126,106,.08);
        }
        .itemL{border-top:4px solid rgba(216,231,219,.9)}
        .itemR{border-top:4px solid rgba(9,132,255,.25)}
        .label{font-size:12px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.06em}
        .value{margin-top:6px;color:#0b0f19;font-weight:800;word-break:break-word}
        .count{margin-left:10px;color:var(--brand);font-weight:900}

        /* Signature */
        .signature{padding:16px 22px 28px}
        .sig-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .sig-title{font-size:16px;font-weight:900;color:#0b0f19}
        .ghost{
          background:transparent;border:1px solid var(--line);color:#0f172a;border-radius:10px;padding:6px 12px;font-weight:800;cursor:pointer;
          transition: background .15s ease, box-shadow .15s ease;
        }
        .ghost:hover{background:#f8fafc; box-shadow:0 2px 10px rgba(0,0,0,.05)}
        .sig-pad{
          border:1px dashed #cfe0d4;border-radius:16px;background:linear-gradient(180deg, #ffffff 0%, #f9fbf9 100%);
          padding:14px;display:flex;justify-content:center;align-items:center;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
        }
        .canvas{
          width:100%;max-width:560px;height:240px;border:2px solid #e6ebe8;border-radius:14px;background:#fff;touch-action:none;
          transition: box-shadow .15s ease, border-color .15s ease;
        }
        .canvas:focus-visible{outline:none; box-shadow: var(--ring); border-color: rgba(9,132,255,.35);}

        .agree{display:flex;gap:10px;align-items:flex-start;margin:14px 0 0;color:#0b0f19}
        .agree input{margin-top:3px}
        .agree a{color:var(--brand);text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:3px}
        .agree a:hover{opacity:.9}

        /* Confirm Button – grüner Verlauf, TEXT SCHWARZ, subtiler Shine */
        .actions{display:flex;justify-content:center;margin-top:22px}
        .confirm{
          position:relative; overflow:hidden;
          display:inline-flex;align-items:center;gap:10px;
          padding:14px 24px;border-radius:999px;border:1px solid rgba(27,94,32,.35);
          background: linear-gradient(135deg, #eaf4ed 0%, #d8e7db 100%);
          color:#0b0f19; /* schwarzer Text */
          font-weight:900; letter-spacing:.2px;
          box-shadow: 0 16px 40px rgba(88,126,106,.28), inset 0 1px 0 rgba(255,255,255,.7);
          transition: transform .12s ease, box-shadow .2s ease, filter .2s ease;
          will-change: transform;
        }
        .confirm:hover{transform:translateY(-1px); filter: brightness(1.02); box-shadow: 0 22px 48px rgba(88,126,106,.34)}
        .confirm:active{transform:translateY(0); filter:brightness(.98)}
        .confirm:disabled{opacity:.6;cursor:not-allowed}

        /* sanfter Shine */
        .confirm__shine{
          content:""; position:absolute; inset:-30%; background:
            radial-gradient(120px 60px at 10% 20%, rgba(255,255,255,.65) 0%, transparent 60%),
            radial-gradient(220px 120px at 80% 80%, rgba(255,255,255,.35) 0%, transparent 60%);
          animation: shine 6s ease-in-out infinite;
          pointer-events:none;
        }
        @keyframes shine{
          0%{ transform: translateX(-6%) translateY(-4%) }
          50%{ transform: translateX(6%) translateY(4%) }
          100%{ transform: translateX(-6%) translateY(-4%) }
        }

        /* A11y helper */
        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

        /* Mobile */
        @media (max-width: 820px){
          .header{padding:26px 16px 10px}
          .logo{height:52px}
          .row{grid-template-columns:1fr}
          .summary, .signature{padding:14px 14px 22px}
          .canvas{max-width:100%}
        }
      `}</style>
    </main>
  );
}

/* kleine, scharfe Checkmark-Icon-Komponente */
function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="9.25" fill="#d8e7db" stroke="#a8c3af" strokeWidth="1.5"/>
      <path d="M6 10.3l2.4 2.4L14.4 6.8" stroke="#0b0f19" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
