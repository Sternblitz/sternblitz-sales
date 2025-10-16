"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type Counts = { c123: number | null; c12: number | null; c1: number | null };

export default function SignPage() {
  // Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Step-1 Daten
  const [summary, setSummary] = useState<{
    googleProfile: string;
    googleUrl?: string;
    selectedOption: "123" | "12" | "1" | "custom" | "";
    counts: Counts;
    company?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }>({
    googleProfile: "",
    selectedOption: "",
    counts: { c123: null, c12: null, c1: null },
    company: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // UI States
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [editContact, setEditContact] = useState(false);
  const [editOptionOpen, setEditOptionOpen] = useState(false);

  // lokale Bearbeitungsfelder
  const formGoogleInputRef = useRef<HTMLInputElement | null>(null);
  const [googleField, setGoogleField] = useState("");
  const [contactDraft, setContactDraft] = useState({
    company: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // ========= Helper =========
  const optionLabel = (opt: string) =>
    ({ "123": "1–3 ⭐", "12": "1–2 ⭐", "1": "1 ⭐", custom: "Individuell" } as any)[opt] || "—";

  const optionCount = (opt: string, c: Counts) => {
    if (!c) return null;
    if (opt === "123") return c.c123;
    if (opt === "12") return c.c12;
    if (opt === "1") return c.c1;
    return null;
  };

  const fmtCount = (n: number | null) =>
    Number.isFinite(n as number) ? `→ ${(n as number).toLocaleString()} Bewertungen` : "→ —";

  // ========= Session laden =========
  useEffect(() => {
    try {
      const p = JSON.parse(sessionStorage.getItem("sb_checkout_payload") || "{}");
      const counts = (p?.counts as Counts) || { c123: null, c12: null, c1: null };
      setSummary({
        googleProfile: p?.googleProfile || "",
        googleUrl: p?.googleUrl || "",
        selectedOption: p?.selectedOption || "",
        counts,
        company: p?.company || "",
        firstName: p?.firstName || "",
        lastName: p?.lastName || "",
        email: p?.email || "",
        phone: p?.phone || "",
      });
      setGoogleField(p?.googleProfile || "");
      setContactDraft({
        company: p?.company || "",
        firstName: p?.firstName || "",
        lastName: p?.lastName || "",
        email: p?.email || "",
        phone: p?.phone || "",
      });
    } catch {}
  }, []);

  // ========= Canvas Setup =========
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const cssW = 700;
    const cssH = 260;
    c.style.width = cssW + "px";
    c.style.height = cssH + "px";
    c.width = cssW * ratio;
    c.height = cssH * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  // ========= Google Places für Profil-Edit =========
  const initPlaces = () => {
    try {
      const g = (window as any).google;
      if (!g?.maps?.places || !formGoogleInputRef.current) return;
      const ac = new g.maps.places.Autocomplete(formGoogleInputRef.current, {
        types: ["establishment"],
        fields: ["name", "formatted_address", "url", "place_id"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace() || {};
        const name = place?.name || "";
        const address = place?.formatted_address || "";
        const url = place?.url || "";
        const fresh = [name, address].filter(Boolean).join(", ");
        setGoogleField(fresh);
        setSummary((s) => ({ ...s, googleProfile: fresh, googleUrl: url }));
        try {
          const payloadRaw = sessionStorage.getItem("sb_checkout_payload") || "{}";
          const payload = JSON.parse(payloadRaw);
          payload.googleProfile = fresh;
          payload.googleUrl = url;
          sessionStorage.setItem("sb_checkout_payload", JSON.stringify(payload));
        } catch {}
      });
    } catch {}
  };

  // ========= Zeichnen =========
  const pos = (e: any) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const start = (e: any) => {
    e.preventDefault();
    const { x, y } = pos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };
  const move = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = pos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const end = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
  };
  const clearSig = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
  };

  // ========= Aktionen =========
  const saveContact = () => {
    setSummary((s) => ({ ...s, ...contactDraft }));
    try {
      const raw = sessionStorage.getItem("sb_checkout_payload") || "{}";
      const payload = JSON.parse(raw);
      Object.assign(payload, contactDraft);
      sessionStorage.setItem("sb_checkout_payload", JSON.stringify(payload));
    } catch {}
    setEditContact(false);
  };

  const changeOption = (val: "123" | "12" | "1" | "custom") => {
    setSummary((s) => ({ ...s, selectedOption: val }));
    try {
      const raw = sessionStorage.getItem("sb_checkout_payload") || "{}";
      const payload = JSON.parse(raw);
      payload.selectedOption = val;
      sessionStorage.setItem("sb_checkout_payload", JSON.stringify(payload));
    } catch {}
    setEditOptionOpen(false);
  };

  const submit = async () => {
    if (!agree) {
      alert("Bitte AGB & Datenschutz bestätigen.");
      return;
    }
    // Canvas leer?
    const c = canvasRef.current!;
    const blank = document.createElement("canvas");
    blank.width = c.width;
    blank.height = c.height;
    if (c.toDataURL() === blank.toDataURL()) {
      alert("Bitte unterschreiben.");
      return;
    }
    setSaving(true);
    const signaturePng = c.toDataURL("image/png");
    // TODO: Upload + PDF
    console.log("Signature (base64…)", signaturePng.slice(0, 48) + "…");
    alert("Unterschrift erfasst! (PDF & Versand folgt)");
    setSaving(false);
  };

  const chosenLabel = optionLabel(summary.selectedOption);
  const chosenCount = optionCount(summary.selectedOption, summary.counts);
  const countText = fmtCount(chosenCount);

  return (
    <main className="shell">
      {/* Google Maps Script einmalig laden (nur falls nötig) */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={initPlaces}
      />

      {/* ======= CARD: Header + Bullets ======= */}
      <section className="card card-hero">
        <div className="hero-head">
          <img
            className="logo"
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ad4679902a5d278c4cf0bc_Group%202085662922-p-500.png"
            alt="Sternblitz"
          />
        </div>
        <h1>Auftragsbestätigung <b>Sternblitz</b></h1>
        <p className="lead">
          Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.
        </p>

        <div className="bullets">
          <div className="bullet">
            <span className="tick">✅</span>
            <span>Fixpreis: <b>299 €</b> (einmalig)</span>
          </div>
          <div className="bullet">
            <span className="tick">✅</span>
            <span>Zahlung erst nach Löschung (von mind. 90 % der Bewertungen)</span>
          </div>
          <div className="bullet">
            <span className="tick">✅</span>
            <span>Dauerhafte Entfernung</span>
          </div>
        </div>
      </section>

      {/* ======= GRID: Profil + Option ======= */}
      <section className="grid-2">
        {/* Google-Profil (mit grüner Top-Bar + Stift) */}
        <div className="card with-bar green">
          <div className="bar">
            <span>Google-Profil</span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                setEditProfile((v) => !v);
                setTimeout(() => formGoogleInputRef.current?.focus(), 10);
              }}
              aria-label="Profil bearbeiten"
              title="Profil bearbeiten"
            >
              ✏️
            </button>
          </div>

          {!editProfile ? (
            <div className="content">
              <div className="value">{summary.googleProfile || "—"}</div>
              {summary.googleUrl ? (
                <a className="open" href={summary.googleUrl} target="_blank" rel="noreferrer">
                  Profil öffnen ↗
                </a>
              ) : null}
            </div>
          ) : (
            <div className="content">
              <input
                ref={formGoogleInputRef}
                type="search"
                inputMode="search"
                placeholder='Unternehmen suchen oder eintragen … z. B. "Restaurant XY, Berlin"'
                value={googleField}
                onChange={(e) => setGoogleField(e.target.value)}
                className="text"
              />
              <div className="row-actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setEditProfile(false);
                    setGoogleField(summary.googleProfile || "");
                  }}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="btn solid"
                  onClick={() => {
                    setSummary((s) => ({ ...s, googleProfile: googleField }));
                    try {
                      const raw = sessionStorage.getItem("sb_checkout_payload") || "{}";
                      const payload = JSON.parse(raw);
                      payload.googleProfile = googleField;
                      sessionStorage.setItem("sb_checkout_payload", JSON.stringify(payload));
                    } catch {}
                    setEditProfile(false);
                  }}
                >
                  Übernehmen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Zu löschende Bewertungen (blaue Top-Bar + Stift + Menü) */}
        <div className="card with-bar blue">
          <div className="bar">
            <span>Zu löschende Bewertungen</span>
            <div className="bar-right">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setEditOptionOpen((v) => !v)}
                aria-label="Bewertungs-Option ändern"
                title="Bewertungs-Option ändern"
              >
                ✏️
              </button>
              {editOptionOpen && (
                <div className="dropdown">
                  {[
                    ["123", "1–3 ⭐ löschen"],
                    ["12", "1–2 ⭐ löschen"],
                    ["1", "1 ⭐ löschen"],
                    ["custom", "Individuelle Löschungen"],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={`drop-item ${summary.selectedOption === val ? "on" : ""}`}
                      onClick={() => changeOption(val as any)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="content">
            <div className="value">
              {chosenLabel} <span className="count">{countText}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======= Kontakt-Übersicht (dezent, editierbar mit Stift) ======= */}
      <section className="card with-bar violet">
        <div className="bar">
          <span>Kontakt-Übersicht</span>
          <button
            className="icon-btn"
            type="button"
            onClick={() => setEditContact((v) => !v)}
            aria-label="Kontaktdaten bearbeiten"
            title="Kontaktdaten bearbeiten"
          >
            ✏️
          </button>
        </div>

        {!editContact ? (
          <div className="contact-grid readonly">
            <div><b>Firma:</b> {summary.company || "—"}</div>
            <div><b>Vorname:</b> {summary.firstName || "—"}</div>
            <div><b>Nachname:</b> {summary.lastName || "—"}</div>
            <div><b>E-Mail:</b> {summary.email || "—"}</div>
            <div><b>Telefon:</b> {summary.phone || "—"}</div>
          </div>
        ) : (
          <>
            <div className="contact-grid">
              <label>
                <span>Firma</span>
                <input
                  value={contactDraft.company}
                  onChange={(e) => setContactDraft((d) => ({ ...d, company: e.target.value }))}
                />
              </label>
              <label>
                <span>Vorname</span>
                <input
                  value={contactDraft.firstName}
                  onChange={(e) => setContactDraft((d) => ({ ...d, firstName: e.target.value }))}
                />
              </label>
              <label>
                <span>Nachname</span>
                <input
                  value={contactDraft.lastName}
                  onChange={(e) => setContactDraft((d) => ({ ...d, lastName: e.target.value }))}
                />
              </label>
              <label>
                <span>E-Mail</span>
                <input
                  type="email"
                  value={contactDraft.email}
                  onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))}
                />
              </label>
              <label>
                <span>Telefon</span>
                <input
                  value={contactDraft.phone}
                  onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))}
                />
              </label>
            </div>
            <div className="row-actions">
              <button className="btn ghost" type="button" onClick={() => setEditContact(false)}>
                Abbrechen
              </button>
              <button className="btn solid" type="button" onClick={saveContact}>
                Speichern
              </button>
            </div>
          </>
        )}
      </section>

      {/* ======= Signatur ======= */}
      <section className="card signature">
        <div className="sig-head">
          <div className="sig-title">Unterschrift</div>
          <button type="button" className="icon-btn" onClick={clearSig} title="Unterschrift löschen">
            🗑️
          </button>
        </div>

        <div className="pad-wrap">
          <canvas
            ref={canvasRef}
            className="pad"
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={end}
          />
        </div>

        <label className="agree">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>
            Ich stimme den{" "}
            <a href="/AGB.pdf" target="_blank" rel="noopener noreferrer">AGB</a>{" "}
            und den{" "}
            <a href="/Datenschutz.pdf" target="_blank" rel="noopener noreferrer">Datenschutzbestimmungen</a>{" "}
            zu.
          </span>
        </label>

        <div className="cta">
          <button className="confirm" onClick={submit} disabled={saving}>
            {saving ? "Wird gespeichert …" : "Unterschrift bestätigen ✅"}
          </button>
        </div>
      </section>

      {/* ======= Styles ======= */}
      <style jsx>{`
        :root{
          --ink:#0f172a;
          --muted:#64748b;
          --line:#e5e7eb;
          --shadow:0 22px 60px rgba(2, 6, 23, .10);
          --shadow-soft: 0 16px 36px rgba(2,6,23,.08);
          --green:#22c55e;
          --green-100:#d8e7db; /* dein Wunschton */
          --blue:#0b6cf2;
          --vio:#7c3aed;
          --card:#ffffff;
        }

        /* Hintergrund: klarer, zweifarbiger Verlauf (heller eingestellt) */
        .shell{
          min-height:100dvh;
          background:
            radial-gradient(1200px 600px at 10% 0%, rgba(216,231,219,.85) 0%, transparent 60%),
            radial-gradient(1400px 700px at 100% 0%, rgba(173,203,255,.75) 0%, transparent 62%),
            linear-gradient(180deg, #f7fbff 0%, #f9fcff 60%, #ffffff 100%);
          padding:48px 14px 72px;
          display:flex;flex-direction:column;gap:18px;align-items:center;
        }

        .card{
          width:100%;max-width:980px;background:var(--card);
          border:1px solid rgba(15,23,42,.08);
          border-radius:20px;box-shadow:var(--shadow);overflow:hidden;
        }
        .card-hero{
          text-align:center;padding:26px 20px 18px;
          background: linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,.85) 58%, #ffffff 100%);
          box-shadow: var(--shadow);
        }
        .hero-head{display:flex;justify-content:center}
        .logo{height:56px;width:auto;object-fit:contain;filter: drop-shadow(0 4px 10px rgba(0,0,0,.08))}
        h1{margin:6px 0 4px;font-size:28px;color:#000;font-weight:800}
        .lead{margin:0 auto 12px;max-width:780px;color:var(--muted)}

        .bullets{display:flex;flex-direction:column;gap:10px;margin:8px auto 4px;max-width:760px}
        .bullet{
          display:flex;gap:10px;align-items:center;justify-content:flex-start;
          background:#ffffff;border:1px solid var(--line);border-radius:12px;padding:10px 12px;
          box-shadow: var(--shadow-soft);
        }
        .tick{font-size:16px}

        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:980px;width:100%}

        .with-bar .bar{
          display:flex;align-items:center;justify-content:space-between;gap:10px;
          padding:8px 12px;font-weight:800;color:#0b0b0b;border-bottom:1px solid rgba(15,23,42,.06);
        }
        .with-bar.blue .bar{background:linear-gradient(90deg, rgba(11,108,242,.14), rgba(11,108,242,.06));}
        .with-bar.green .bar{background:linear-gradient(90deg, rgba(34,197,94,.18), rgba(34,197,94,.08));}
        .with-bar.violet .bar{background:linear-gradient(90deg, rgba(124,58,237,.14), rgba(124,58,237,.06));}
        .with-bar .content{padding:12px 14px}
        .with-bar .value{font-weight:800;color:#0a0a0a}
        .with-bar .count{margin-left:8px;color:var(--blue);font-weight:800}

        .icon-btn{
          border:1px solid rgba(0,0,0,.08);background:#fff;border-radius:10px;min-width:30px;height:30px;
          display:inline-flex;align-items:center;justify-content:center;cursor:pointer;
          box-shadow:0 6px 16px rgba(0,0,0,.06);
        }
        .icon-btn:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(0,0,0,.08)}

        .text{
          width:100%;height:36px;border-radius:10px;border:1px solid rgba(0,0,0,.12);padding:6px 10px;
        }
        .row-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:10px}
        .btn{
          border-radius:10px;height:34px;padding:0 12px;font-weight:800;letter-spacing:.2px;cursor:pointer;
        }
        .btn.ghost{border:1px solid var(--line);background:#fff}
        .btn.solid{border:1px solid #0b6cf2;background:#0b6cf2;color:#fff}

        .open{display:inline-flex;margin-top:6px;color:#0b6cf2;font-weight:700}

        .bar-right{position:relative;display:flex;align-items:center;gap:6px}
        .dropdown{
          position:absolute;top:36px;right:0;background:#fff;border:1px solid var(--line);border-radius:12px;
          box-shadow:0 18px 46px rgba(0,0,0,.12);overflow:hidden;z-index:30;min-width:210px;
        }
        .drop-item{
          display:block;width:100%;text-align:left;padding:10px 12px;background:#fff;border:0;cursor:pointer;
        }
        .drop-item:hover{background:#f6faff}
        .drop-item.on{background:#eef5ff;font-weight:800}

        .contact-grid{display:grid;grid-template-columns:repeat(5, minmax(0,1fr));gap:10px;padding:12px 14px}
        .contact-grid.readonly{grid-template-columns:repeat(3, minmax(0,1fr))}
        .contact-grid label{display:flex;flex-direction:column;gap:6px}
        .contact-grid label input{
          height:34px;border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:6px 10px;
        }
        .contact-grid span{font-size:12px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.04em}

        .signature{padding:12px 14px}
        .sig-head{display:flex;justify-content:space-between;align-items:center;padding:4px 2px 8px}
        .sig-title{font-size:16px;font-weight:800}
        .pad-wrap{
          border:1px dashed #cbd5e1;border-radius:16px;background:#fff;padding:12px;box-shadow:var(--shadow-soft);
        }
        .pad{width:100%;max-width:700px;height:260px;border:2px solid #e5e7eb;border-radius:12px;background:#fff;touch-action:none;margin:0 auto;display:block}

        .agree{display:flex;gap:10px;align-items:flex-start;margin:12px 2px 0;color:var(--ink)}
        .agree a{color:#0b6cf2;text-decoration:underline}

        .cta{display:flex;justify-content:center;margin-top:16px}
        .confirm{
          display:inline-flex;align-items:center;justify-content:center;gap:10px;
          padding:14px 22px;border-radius:999px;border:1px solid rgba(0,0,0,.16);
          background:linear-gradient(135deg, #d6f2e1 0%, #bcead0 100%);
          color:#0b0b0b;font-weight:900;letter-spacing:.2px;
          box-shadow:0 14px 34px rgba(34,197,94,.30);
          transition:transform .12s ease, box-shadow .18s ease, filter .18s ease;
        }
        .confirm:hover{transform:translateY(-1px);filter:brightness(1.03);box-shadow:0 18px 42px rgba(34,197,94,.38)}
        .confirm:active{transform:translateY(0);filter:brightness(.98)}
        .confirm:disabled{opacity:.6;cursor:not-allowed}

        @media (max-width:1000px){
          .grid-2{grid-template-columns:1fr}
          .contact-grid{grid-template-columns:1fr 1fr}
          .contact-grid.readonly{grid-template-columns:1fr 1fr}
          .pad{max-width:100%}
        }
        @media (max-width:560px){
          .contact-grid{grid-template-columns:1fr}
          .contact-grid.readonly{grid-template-columns:1fr}
        }
      `}</style>
    </main>
  );
}
