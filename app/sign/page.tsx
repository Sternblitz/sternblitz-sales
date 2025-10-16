"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

export default function SignPage() {
  const sigRef = useRef(null);
  const [isChecked, setIsChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleClear = () => {
    sigRef.current.clear();
  };

  const handleSubmit = async () => {
    if (!isChecked) {
      alert("Bitte stimme zuerst den AGBs und Datenschutzbestimmungen zu.");
      return;
    }
    if (sigRef.current.isEmpty()) {
      alert("Bitte unterschreibe zuerst.");
      return;
    }

    setSubmitting(true);
    const signatureData = sigRef.current.toDataURL();

    // 🧩 später hier: Upload zu Supabase oder PDF-Erstellung
    console.log("Unterschrift gespeichert:", signatureData.slice(0, 50) + "...");

    alert("Unterschrift erfolgreich erfasst!");
    setSubmitting(false);
  };

  return (
    <main className="sign-wrap">
      <h1>Auftragsbestätigung Sternblitz ⚡️</h1>
      <p>
        Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.
      </p>
      <ul>
        <li>✔️ Fixpreis: 299 € (einmalig)</li>
        <li>✔️ Zahlung erst nach Löschung (von mind. 90 % der Bewertungen)</li>
        <li>✔️ Dauerhafte Entfernung</li>
      </ul>

      <p>
        Google-Profil: <strong>{typeof window !== "undefined" ? JSON.parse(sessionStorage.getItem("sb_checkout_payload") || "{}")?.googleProfile : ""}</strong><br />
        Folgende Bewertungen sollen gelöscht werden:{" "}
        <strong>{typeof window !== "undefined" ? JSON.parse(sessionStorage.getItem("sb_checkout_payload") || "{}")?.selectedOption : ""}</strong>
      </p>

      <div className="sig-area">
        <SignatureCanvas ref={sigRef} penColor="black" canvasProps={{ width: 400, height: 200, className: "sig-canvas" }} />
        <div className="sig-actions">
          <button type="button" onClick={handleClear}>Löschen</button>
        </div>
      </div>

      <div className="checkboxes">
        <label>
          <input type="checkbox" checked={isChecked} onChange={(e) => setIsChecked(e.target.checked)} />
          Ich stimme den{" "}
          <a href="/docs/AGB.pdf" target="_blank" rel="noopener noreferrer">AGB</a> und{" "}
          <a href="/docs/Datenschutz.pdf" target="_blank" rel="noopener noreferrer">Datenschutzbestimmungen</a> zu.
        </label>
      </div>

      <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Wird gespeichert..." : "Unterschrift bestätigen ✅"}
      </button>

      <style jsx>{`
        .sign-wrap {
          max-width: 700px;
          margin: 60px auto;
          font-family: "Outfit", sans-serif;
          padding: 20px;
          text-align: center;
        }
        .sig-area {
          margin: 20px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .sig-canvas {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
        }
        .sig-actions {
          margin-top: 8px;
        }
        .sig-actions button {
          background: #f87171;
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
        }
        .checkboxes {
          margin-top: 20px;
          text-align: left;
        }
        .submit-btn {
          margin-top: 20px;
          background: #0b0b0b;
          color: #fff;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          padding: 14px 20px;
          cursor: pointer;
          font-size: 16px;
        }
        .submit-btn:hover {
          background: #111;
        }
      `}</style>
    </main>
  );
}
