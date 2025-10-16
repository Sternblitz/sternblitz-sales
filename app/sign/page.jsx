"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

export default function SignPage() {
  const canvasRef = useRef(null);

  // Zustand
  const [isDrawing, setIsDrawing] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step-1 Daten
  const [summary, setSummary] = useState({
    googleProfile: "",
    selectedOption: "", // "123" | "12" | "1" | "custom"
    counts: { c123: null, c12: null, c1: null },
  });

  // Edit-Modi
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editRatingsOpen, setEditRatingsOpen] = useState(false);

  // Google Places
  const editInputRef = useRef(null);

  // Helpers
  const OPTION_LABEL = { "123": "1–3 ⭐", "12": "1–2 ⭐", "1": "1 ⭐", custom: "Individuell" };
  const optionLabel = (opt) => OPTION_LABEL[opt] || opt;
  const optionCount = (opt, c) =>
    opt === "123" ? c?.c123 : opt === "12" ? c?.c12 : opt === "1" ? c?.c1 : null;

  // Canvas setup (retina)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const cssW = 560,
      cssH = 240;
    c.style.width = cssW + "px";
    c.style.height = cssH + "px";
    c.width = cssW * ratio;
    c.height = cssH * ratio;
    const ctx = c.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0b0f19";
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

  // Places Autocomplete initialisieren, wenn Profil-Edit offen
  useEffect(() => {
    if (!editProfileOpen || !editInputRef.current) return;
    const g = window.google;
    if (!g?.maps?.places) return;
    try {
      const ac = new g.maps.places.Autocomplete(editInputRef.current, {
        types: ["establishment"],
        fields: ["name", "formatted_address", "url", "place_id"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const name = place?.name || "";
        const address = place?.formatted_address || "";
        const fresh = [name, address].filter(Boolean).join(", ");
        if (!fresh) return;
        setSummary((prev) => {
          const next = { ...prev, googleProfile: fresh };
          try {
            const payload = JSON.parse(sessionStorage.getItem("sb_checkout_payload") || "{}");
            payload.googleProfile = fresh;
            sessionStorage.setItem("sb_checkout_payload", JSON.stringify(payload));
          } catch {}
          return next;
        });
        setEditProfileOpen(false);
      });
    } catch {}
  }, [editProfileOpen]);

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

  // Submit
  const handleSubmit = async () => {
    if (!isChecked) {
      alert("Bitte AGB & Datenschutz bestätigen.");
      return;
    }
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
    console.log("Signature (gekürzt):", signaturePng.slice(0, 60) + "…");
    alert("Unterschrift erfasst! (Nächster Schritt: PDF & E-Mail)");
    setSubmitting(false);
  };

  // Anzeigen
  const chosen = summary.selectedOption || "";
  const chosenLabel = optionLabel(chosen);
  const chosenCount = optionCount(chosen, summary.counts);
  const countText = Number.isFinite(chosenCount)
    ? `→ ${Number(chosenCount).toLocaleString()} Bewertungen`
    : "→ —";

  // Ratings ändern + Session mitschreiben
  const setOptionAndPersist = (opt) => {
    setSummary((prev) => {
      const next = { ...prev, selectedOption: opt };
      try {
        const payload = JSON.parse(sessionStorage.getItem("sb_checkout_payload") || "{}");
        payload.selectedOption = opt;
        sessionStorage.setItem("sb_checkout_payload", JSON.stringify(payload));
      } catch {}
      return next;
    });
  };

  return (
    <main className="sign-shell">
      {/* Google Places (für Profil-Edit) */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
      />

      <div className="card">
        {/* Brand */}
        <header className="brandbar">
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ad4679902a5d278c4cf0bc_Group%202085662922-p-500.png"
            alt="Sternblitz"
            className="logo"
          />
        </header>

        {/* Hero */}
        <section className="hero-box">
          <h1>
            Auftragsbestätigung <span className="brand">Sternblitz</span>
          </h1>
          <p className="lead">
            Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.
          </p>

          <ul className="bullets" role="list">
            <Bullet color="blue">
              Fixpreis: <strong>290 €</strong> (einmalig)
            </Bullet>
            <Bullet color="red">
              Zahlung erst nach Löschung (von mind. 90&nbsp;% der Bewertungen)
            </Bullet>
            <Bullet color="green">Dauerhafte Entfernung</Bullet>
          </ul>
        </section>

        {/* Summary */}
        <section className="summary" aria-labelledby="sumhead">
          <h2 id="sumhead" className="sr-only">
            Zusammenfassung
          </h2>

          <div className="row">
            {/* Google-Profil – Top-Bar GRÜN + ✏️ */}
            <div className="item tint-green">
              <div className="accent" />
              <div className="item-head">
                <div className="label">Google-Profil</div>
                <button
                  type="button"
                  className="edit"
                  onClick={() => setEditProfileOpen((v) => !v)}
                  aria-label={editProfileOpen ? "Bearbeitung schließen" : "Google-Profil bearbeiten"}
                  title={editProfileOpen ? "Bearbeitung schließen" : "Bearbeiten"}
                >
                  ✏️
                </button>
              </div>

              {!editProfileOpen ? (
                <div className="value">{summary.googleProfile || "—"}</div>
              ) : (
                <div className="edit-row">
                  <input
                    ref={editInputRef}
                    type="search"
                    inputMode="search"
                    placeholder='Unternehmen suchen… z. B. "Restaurant XY, Berlin"'
                  />
                  <small className="edit-hint">Suche & wähle im Dropdown, um zu übernehmen.</small>
                </div>
              )}
            </div>

            {/* Zu löschende Bewertungen – Top-Bar BLAU + ✏️ + Auswahlpanel */}
            <div className="item tint-blue">
              <div className="accent" />
              <div className="item-head">
                <div className="label">Zu löschende Bewertungen</div>
                <button
                  type="button"
                  className="edit"
                  onClick={() => setEditRatingsOpen((v) => !v)}
                  aria-label={editRatingsOpen ? "Bearbeitung schließen" : "Option bearbeiten"}
                  title={editRatingsOpen ? "Bearbeitung schließen" : "Bearbeiten"}
                >
                  ✏️
                </button>
              </div>

              <div className="value">
                {chosen ? (
                  <>
                    {chosenLabel} <span className="count">{countText}</span>
                  </>
                ) : (
                  <span className="placeholder">Bitte wählen…</span>
                )}
              </div>

              {editRatingsOpen && (
                <div className="ratings-pop">
                  {["123", "12", "1", "custom"].map((opt) => (
                    <label key={opt} className={`opt ${chosen === opt ? "on" : ""}`}>
                      <input
                        type="radio"
                        name="ratingsopt"
                        value={opt}
                        checked={chosen === opt}
                        onChange={() => setOptionAndPersist(opt)}
                      />
                      <span className="mark" />
                      <span className="txt">
                        {optionLabel(opt)}
                        {opt !== "custom" && (
                          <em className="cnt">
                            {(() => {
                              const n = optionCount(opt, summary.counts);
                              return Number.isFinite(n) ? `→ ${n.toLocaleString()} Bewertungen` : "→ —";
                            })()}
                          </em>
                        )}
                      </span>
                    </label>
                  ))}
                  <div className="pop-actions">
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() => setEditRatingsOpen(false)}
                    >
                      Fertig
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Signatur */}
        <section className="signature" aria-labelledby="sighead">
          <div className="sig-head">
            <div id="sighead" className="sig-title">
              Unterschrift
            </div>
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
          --g-blue:#4285F4;
          --g-red:#EA4335;
          --g-yellow:#FBBC05;
          --g-green:#34A853;

          --ink:#0b0f19;
          --muted:#5b6472;
          --line:#e7ece9;

          --surface:#ffffff;
          --emerald-soft:#d8e7db; /* dein Grün */
          --emerald-strong:#10b981;
          --blue-strong:#2563eb;
        }

        /* HELLER, aber klarer Verlauf – keine graue Suppe */
        .sign-shell{
          min-height:100dvh;
          background:
            radial-gradient(900px 600px at 12% -8%, rgba(16,185,129,.18) 0%, transparent 60%),
            radial-gradient(900px 700px at 88% -12%, rgba(37,99,235,.18) 0%, transparent 60%),
            linear-gradient(135deg, rgba(16,185,129,.12) 0%, rgba(37,99,235,.12) 100%),
            linear-gradient(135deg, #f6fffb 0%, #f6f9ff 100%);
          display:flex;align-items:flex-start;justify-content:center;
          padding:60px 18px 90px;
        }

        /* Card-Stack */
        .card{width:100%;max-width:980px;background:transparent;border:0;border-radius:26px;overflow:visible}

        .brandbar{display:flex;justify-content:center;align-items:center;padding:2px 0 14px}
        .logo{height:66px;width:auto;object-fit:contain;filter:drop-shadow(0 8px 18px rgba(0,0,0,.12))}

        /* HERO-KARTE: heller + kräftiger Shadow */
        .hero-box{
          margin:0 auto 18px;max-width:920px;background:var(--surface);
          border:1px solid var(--line);border-radius:20px;
          box-shadow:
            0 30px 70px rgba(16,185,129,.14),
            0 18px 36px rgba(37,99,235,.10),
            0 2px 0 rgba(255,255,255,.8) inset;  /* feiner Glanz */
          padding:22px 22px 18px;
        }
        h1{margin:4px 0 6px;font-size:30px;line-height:1.1;font-weight:900;color:#111;text-align:center}
        .brand{color:#111}
        .lead{margin:0 auto 14px;max-width:760px;color:var(--muted);text-align:center}

        /* Bullets */
        .bullets{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
        .bullet{
          display:flex;align-items:center;gap:12px;
          background:linear-gradient(180deg,#ffffff 0%, #f6fbff 100%);
          border:1px solid var(--line);
          border-radius:12px;padding:12px 14px;font-weight:800;color:#111;
        }
        .tick{width:20px;height:20px;border-radius:999px;display:grid;place-items:center;color:white;font-size:12px;line-height:1}
        .tick.blue{background:var(--g-blue)}
        .tick.red{background:var(--g-red)}
        .tick.green{background:var(--g-green)}

        /* Summary Cards */
        .summary{padding:14px 2px 0}
        .row{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        .item{
          position:relative;background:var(--surface);border:1px solid var(--line);border-radius:16px;
          padding:14px 16px 16px;box-shadow:0 14px 34px rgba(0,0,0,.06)
        }
        .item .accent{
          position:absolute;left:0;top:0;right:0;height:8px;border-top-left-radius:16px;border-top-right-radius:16px;
        }
        /* sichere, sichtbare Top-Bars */
        .tint-green .accent{background:linear-gradient(90deg, var(--emerald-soft) 0%, #bfe0c8 100%)}
        .tint-blue  .accent{background:linear-gradient(90deg, rgba(66,133,244,.4) 0%, rgba(37,99,235,.65) 100%)}

        .item-head{display:flex;align-items:center;justify-content:space-between}
        .label{margin-top:2px;font-size:12px;color:var(--muted);font-weight:900;text-transform:uppercase;letter-spacing:.06em}
        .value{margin-top:8px;color:var(--ink);font-weight:900;word-break:break-word}
        .count{margin-left:8px;color:var(--g-blue);font-weight:900}
        .placeholder{color:#94a3b8;font-weight:700}

        .edit{
          border:1px solid var(--line);background:#fff;border-radius:8px;padding:4px 8px;cursor:pointer;
          box-shadow:0 6px 14px rgba(0,0,0,.06);font-weight:800
        }
        .edit:hover{background:#f4f8f5}

        .edit-row{margin-top:8px;display:flex;flex-direction:column;gap:6px}
        .edit-row input{
          height:38px;border:1px solid #cfe0d4;border-radius:10px;padding:6px 10px;font-size:15px;outline:none;
        }
        .edit-row input:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.18)}
        .edit-hint{color:#577; font-size:12px}

        /* Ratings Popover */
        .ratings-pop{
          position:relative;margin-top:10px;border:1px solid var(--line);border-radius:12px;
          background:#fff;box-shadow:0 18px 42px rgba(0,0,0,.08);padding:10px;
        }
        .opt{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;cursor:pointer}
        .opt:hover{background:#f7fafc}
        .opt input{display:none}
        .opt .mark{width:18px;height:18px;border-radius:4px;border:2px solid #64748b;display:inline-block;position:relative;flex:none}
        .opt.on .mark{border-color:#0b6cf2;background:#eaf3ff}
        .opt.on .mark::after{content:"";position:absolute;inset:3px;background:#0b6cf2;border-radius:2px}
        .opt .txt{font-weight:800}
        .opt .cnt{margin-left:8px;font-style:normal;color:#0b6cf2;font-weight:900}
        .pop-actions{display:flex;justify-content:flex-end;margin-top:6px}
        .ghost.small{padding:6px 10px;border-radius:8px}

        /* Signature */
        .signature{padding:18px 2px 24px} /* etwas weniger unten -> keine „Linie“ */
        .sig-head{display:flex;justify-content:space-between;align-items:center;margin:0 2px 10px}
        .sig-title{font-size:16px;font-weight:900;color:var(--ink)}
        .ghost{background:transparent;border:1px solid var(--line);color:#0f172a;border-radius:10px;padding:6px 12px;font-weight:800;cursor:pointer}
        .ghost:hover{background:#f8fafc}

        .sig-pad{
          border:1px dashed #cfe0d4;border-radius:16px;background:linear-gradient(180deg,#ffffff 0%, #fcfffd 100%);
          padding:14px;display:flex;justify-content:center;align-items:center;
        }
        .canvas{width:100%;max-width:560px;height:240px;border:2px solid #e6ebe8;border-radius:14px;background:#fff;touch-action:none}

        .agree{display:flex;gap:10px;align-items:flex-start;margin:14px 2px 0;color:var(--ink)}
        .agree a{color:#0b6cf2;text-decoration:underline;text-underline-offset:3px}

        .actions{display:flex;justify-content:center;margin-top:18px}
        .confirm{
          display:inline-flex;align-items:center;gap:10px;padding:16px 26px;border-radius:999px;border:1px solid rgba(27,94,32,.28);
          background:linear-gradient(135deg,#eef7f1 0%, var(--emerald-soft) 100%);
          color:#0b0f19;font-weight:900;letter-spacing:.2px;
          box-shadow:
            0 16px 38px rgba(22,74,52,.22),
            0 2px 0 rgba(255,255,255,.75) inset;
          transition:transform .12s ease, box-shadow .2s ease, filter .2s ease;
        }
        .confirm:hover{transform:translateY(-1px);filter:brightness(1.02);box-shadow:0 22px 48px rgba(22,74,52,.28)}
        .confirm:active{transform:translateY(0);filter:brightness(.98)}
        .confirm:disabled{opacity:.6;cursor:not-allowed}

        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

        @media (max-width:900px){
          .hero-box{border-radius:16px;padding:18px 16px}
          .row{grid-template-columns:1fr}
          .canvas{max-width:100%}
        }
      `}</style>
    </main>
  );
}

/* Bullet-Atom */
function Bullet({ color = "blue", children }) {
  return (
    <li className="bullet">
      <span className={`tick ${color}`} aria-hidden="true">✔</span>
      <span>{children}</span>
      <style jsx>{``}</style>
    </li>
  );
}
