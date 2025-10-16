"use client";

import { useEffect, useRef, useState } from "react";

export default function SignPage() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Größe + DPR sauber setzen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const w = 400;
    const h = 200;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = async () => {
    if (!isChecked) {
      alert("Bitte stimme zuerst den AGBs und Datenschutzbestimmungen zu.");
      return;
    }
    // Prüfen, ob etwas gezeichnet wurde (einfach: leeres Bild vergleichen)
    const canvas = canvasRef.current;
    const blank = document.createElement("canvas");
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      alert("Bitte unterschreibe zuerst.");
      return;
    }

    setSubmitting(true);

    // Unterschrift als DataURL (PNG)
    const signatureData = canvas.toDataURL("image/png");

    // Payload vom vorherigen Formular (Step 1)
    let payload = {};
    try {
      payload = JSON.parse(sessionStorage.getItem("sb_checkout_payload") || "{}");
    } catch {}

    // Hier später: Upload nach Supabase + PDF-Erstellung
    console.log("Signature PNG (kurz):", signatureData.slice(0, 60) + "…");
    console.log("Form-Payload:", payload);

    alert("Unterschrift erfasst! (Nächster Schritt: PDF + E-Mail)");
    setSubmitting(false);
  };

  // Aus Session lesen für Anzeige
  let gp = "", opt = "";
  if (typeof window !== "undefined") {
    try {
      const p = JSON.parse(sessionStorage.getItem("sb_checkout_payload") || "{}");
      gp = p?.googleProfile || "";
      const optMap = { "123": "1–3 ⭐", "12": "1–2 ⭐", "1": "1 ⭐", "custom": "Individuell" };
      opt = optMap[p?.selectedOption] || p?.selectedOption || "";
    } catch {}
  }

  return (
    <main className="sign-wrap">
      <h1>Auftragsbestätigung Sternblitz ⚡️</h1>

      <p>Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.</p>
      <ul className="bullets">
        <li>✔️ Fixpreis: 299 € (einmalig)</li>
        <li>✔️ Zahlung erst nach Löschung (von mind. 90 % der Bewertungen)</li>
        <li>✔️ Dauerhafte Entfernung</li>
      </ul>

      <div className="summary">
        <div><strong>Google-Profil:</strong> {gp || "—"}</div>
        <div><strong>Zu löschende Bewertungen:</strong> {opt || "—"}</div>
      </div>

      <div className="sig-area">
        <canvas
          ref={canvasRef}
          className="sig-canvas"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        <div className="sig-actions">
          <button type="button" onClick={handleClear}>Unterschrift löschen</button>
        </div>
      </div>

      <label className="agreements">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => setIsChecked(e.target.checked)}
        />
        <span>
          Ich stimme den{" "}
          <a href="/AGB.pdf" target="_blank" rel="noopener noreferrer">AGB</a> und den{" "}
          <a href="/Datenschutz.pdf" target="_blank" rel="noopener noreferrer">Datenschutzbestimmungen</a> zu.
        </span>
      </label>

      <div className="actions">
        <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Wird gespeichert…" : "Unterschrift bestätigen ✅"}
        </button>
      </div>

      <style jsx>{`
        .sign-wrap{max-width:760px;margin:60px auto;padding:20px;font-family:Outfit,system-ui}
        h1{margin:0 0 10px}
        .bullets{margin:12px 0 18px;padding-left:18px}
        .bullets li{margin:4px 0}
        .summary{background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;margin:10px 0 18px}
        .sig-area{display:flex;flex-direction:column;align-items:center;margin:16px 0}
        .sig-canvas{background:#fff;border:2px solid #e5e7eb;border-radius:10px;touch-action:none}
        .sig-actions{margin-top:8px}
        .sig-actions button{background:#ef4444;color:#fff;border:none;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer}
        .agreements{display:flex;align-items:flex-start;gap:10px;margin-top:10px}
        .agreements a{color:#0b6cf2;text-decoration:underline}
        .actions{margin-top:18px;display:flex;justify-content:flex-end}
        .submit-btn{background:#0b0b0b;color:#fff;border:none;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer}
        .submit-btn:hover{background:#111}
        @media (max-width:640px){
          .actions{justify-content:center}
          .sig-canvas{width:100%}
        }
      `}</style>
    </main>
  );
}
