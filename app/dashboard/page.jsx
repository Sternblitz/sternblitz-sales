"use client";

import { useEffect, useRef, useState } from "react";
import LiveSimulator from "../../components/LiveSimulator"; // unverändert lassen

export default function DashboardPage() {
  const [formOpen, setFormOpen] = useState(false);

  // Auswahl aus dem Simulator
  const [option, setOption] = useState("123"); // "123" | "12" | "1" | "custom"

  // Google-Profil (Form-Feld, editierbar)
  const formGoogleInputRef = useRef(null);
  const [googleField, setGoogleField] = useState(""); // "Name, Adresse"
  const [googleUrl, setGoogleUrl] = useState("");

  // Kontaktdaten
  const [company, setCompany] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Individuelle Wünsche (Textfeld)
  const [customNotes, setCustomNotes] = useState("");

  // Flying check animation
  const [flyCheck, setFlyCheck] = useState(false);

  const formRef = useRef(null);
  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Immer das FRISCH gespeicherte Profil ziehen
  const pullLatest = () => {
    try {
      const raw = sessionStorage.getItem("sb_selected_profile");
      if (raw) {
        const p = JSON.parse(raw);
        setGoogleField([p?.name || "", p?.address || ""].filter(Boolean).join(", "));
        setGoogleUrl(p?.url || "");
      }
      const opt = sessionStorage.getItem("sb_selected_option");
      if (opt) setOption(opt);
    } catch {}
  };

  // Live-Events vom Simulator
  useEffect(() => {
    const onStart = (e) => {
      const { name = "", address = "", url = "" } = e.detail || {};
      setGoogleField([name, address].filter(Boolean).join(", "));
      setGoogleUrl(url || "");
      const opt = sessionStorage.getItem("sb_selected_option");
      if (opt) setOption(opt);
      setFormOpen(true);
      setTimeout(scrollToForm, 20);
    };
    const onOpt = () => {
      const opt = sessionStorage.getItem("sb_selected_option");
      if (opt) setOption(opt);
    };
    window.addEventListener("sb:simulator-start", onStart);
    window.addEventListener("sb:option-changed", onOpt);
    return () => {
      window.removeEventListener("sb:simulator-start", onStart);
      window.removeEventListener("sb:option-changed", onOpt);
    };
  }, []);

  // Einmalig beim Öffnen nochmal ziehen (falls Nutzer manuell tippt)
  const openForm = () => {
    pullLatest();
    setFormOpen(true);
    setTimeout(scrollToForm, 20);
  };

  // Google Places Autocomplete auch im Formular (bearbeitbar)
  useEffect(() => {
    const g = window.google;
    if (!g?.maps?.places || !formGoogleInputRef.current) return;
    try {
      const ac = new g.maps.places.Autocomplete(formGoogleInputRef.current, {
        types: ["establishment"],
        fields: ["name", "formatted_address", "url", "place_id"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const name = place?.name || "";
        const address = place?.formatted_address || "";
        const url = place?.url || "";
        const fresh = [name, address].filter(Boolean).join(", ");
        setGoogleField(fresh);
        setGoogleUrl(url || "");
        try {
          sessionStorage.setItem(
            "sb_selected_profile",
            JSON.stringify({ name, address, url })
          );
        } catch {}
      });
    } catch (e) {
      console.warn("Form autocomplete init error:", e);
    }
  }, [formOpen]); // initialisieren wenn das Formular sichtbar wird

  const onOptionChange = (val) => {
    setOption(val);
    try {
      sessionStorage.setItem("sb_selected_option", val);
    } catch {}
  };

  const triggerCheckFly = () => {
    setFlyCheck(true);
    // nach der Animation wieder entfernen
    setTimeout(() => setFlyCheck(false), 1400);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!googleField.trim()) {
      alert("Bitte ein Google-Profil angeben.");
      formGoogleInputRef.current?.focus();
      return;
    }
    const payload = {
      googleProfile: googleField.trim(),
      googleUrl,
      selectedOption: option,
      customNotes: option === "custom" ? customNotes.trim() : "",
      company,
      firstName,
      lastName,
      email,
      phone,
      submittedAt: new Date().toISOString(),
    };
    try {
      sessionStorage.setItem("sb_checkout_payload", JSON.stringify(payload));
    } catch {}

    // ✅ fliegender Haken
    triggerCheckFly();

    // kleines Delay, damit die Animation sichtbar ist
    setTimeout(() => {
      console.log("Lead payload:", payload);
      alert("Auftrag erfasst. (Nächster Schritt: Signatur & PDF)");
    }, 900);
  };

  return (
    <main className="sb-wrap">
      {/* Live-Simulator */}
      <LiveSimulator />

      {/* EIN Button (schwarz) */}
      {!formOpen && (
        <div className="cta">
          <button className="primary-btn" onClick={openForm}>
            Jetzt loslegen
          </button>
        </div>
      )}

      {/* Formular */}
      <section
        ref={formRef}
        className={`drawer ${formOpen ? "open" : ""}`}
        aria-hidden={!formOpen}
      >
        <header className="drawer-head">
          <h2 className="title">Es kann gleich losgehen ✨</h2>
          <p className="sub">
            Bitte kurz ausfüllen – dann bestätigen wir den Auftrag direkt.
          </p>
        </header>

        <form className="lead-form" onSubmit={submit}>
          {/* Google-Profil */}
          <div className="group">
            <div className="group-title">
              Google-Profil <span className="req">*</span>
            </div>
            <div className="profile-row">
              <div className="profile-input">
                <input
                  ref={formGoogleInputRef}
                  type="search"
                  inputMode="search"
                  placeholder='Unternehmen suchen oder eintragen… z. B. "Restaurant XY, Berlin"'
                  required
                  value={googleField}
                  onChange={(e) => {
                    setGoogleField(e.target.value);
                    if (googleUrl) setGoogleUrl("");
                  }}
                />
                {googleField && (
                  <button
                    type="button"
                    className="clear-x"
                    aria-label="Feld leeren"
                    onClick={() => {
                      setGoogleField("");
                      setGoogleUrl("");
                      formGoogleInputRef.current?.focus();
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {googleUrl ? (
                <a
                  className="profile-link"
                  href={googleUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Profil öffnen ↗
                </a>
              ) : null}
            </div>
          </div>

          {/* Welche Bewertungen sollen gelöscht werden? */}
          <div className="group">
            <div className="group-title">
              Welche Bewertungen sollen gelöscht werden? <span className="req">*</span>
            </div>

            <div className="checks">
              {[
                ["123", "1–3 ⭐ löschen"],
                ["12", "1–2 ⭐ löschen"],
                ["1", "1 ⭐ löschen"],
                ["custom", "Individuelle Löschungen"],
              ].map(([val, label]) => (
                <label key={val} className={`choice ${option === val ? "on" : ""}`}>
                  <input
                    type="radio"
                    name="delopt"
                    value={val}
                    checked={option === val}
                    onChange={() => onOptionChange(val)}
                  />
                  <span className="mark" />
                  {label}
                </label>
              ))}
            </div>

            {option === "custom" && (
              <div className="field">
                <label>
                  Individuelle Wünsche <span className="req">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Beschreibe kurz, was individuell gelöscht werden soll…"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {/* Kontaktdaten */}
          <div className="group">
            <div className="group-title">Kontaktdaten</div>

            <div className="field">
              <label>
                Firmenname <span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="z. B. Smashburger GmbH"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>

            <div className="row">
              <div className="field half">
                <label>
                  Vorname <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Max"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="field half">
                <label>
                  Nachname <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Mustermann"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="field half">
                <label>
                  E-Mail <span className="req">*</span>
                </label>
                <input
                  type="email"
                  placeholder="max@firma.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field half">
                <label>
                  Telefon <span className="req">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+49 160 1234567"
                  inputMode="tel"
                  pattern="^[+0-9][0-9 ()-]{6,}$"
                  title="Bitte eine gültige Telefonnummer angeben"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="actions center">
            <button className="submit-btn confirm" type="submit">
              <span className="emoji" aria-hidden>✅</span>
              <span className="label">Auftrag bestätigen</span>
            </button>
          </div>
        </form>
      </section>

      {/* Fliegender grüner Haken (nur wenn aktiv) */}
      {flyCheck && (
        <div className="check-fly" aria-hidden>
          {/* runder grüner Button mit weißem Haken – als SVG */}
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="28" fill="#16a34a"/>
            <path d="M16 28.5l7.2 7.2L40 19" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Styles */}
      <style jsx global>{`
        .sb-wrap {
          max-width: 1208px;
          margin: 0 auto;
          padding: 0 12px 80px;
        }

        /* EIN Button (schwarz) */
        .cta {
          display: flex;
          justify-content: center;
          margin-top: 18px;
        }
        .primary-btn {
          appearance: none;
          border: 1px solid #0b0b0b;
          background: #0b0b0b;
          color: #fff;
          padding: 14px 22px;
          border-radius: 999px;
          font-weight: 800;
          letter-spacing: 0.2px;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.2);
          transition: transform 0.12s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .primary-btn:hover {
          transform: translateY(-1px);
          background: #111;
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.28);
        }

        /* Drawer – dein grüner Verlauf (#dcebdf → #fff) bleibt */
        .drawer {
          max-width: 900px;
          margin: 20px auto 0;
          background: linear-gradient(135deg, #dcebdf 0%, #ffffff 80%);
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          opacity: 0;
          transform: translateY(-6px);
          transition: all 0.28s ease;
          pointer-events: none;
        }
        .drawer.open {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .drawer-head {
          text-align: center;
          padding: 22px 22px 0;
        }
        .drawer-head .title {
          font-family: "Outfit", sans-serif;
          font-weight: 800;
          font-size: 28px;
          margin: 0 0 6px;
          color: #0f172a;
        }
        .drawer-head .sub {
          color: #4b5563;
          font-size: 15px;
          margin: 0;
        }

        .lead-form {
          padding: 18px 22px 26px;
        }

        .group {
          margin-top: 18px;
        }
        .group-title {
          font-family: "Outfit", sans-serif;
          font-weight: 700;
          font-size: 18px;
          color: #0f172a;
          margin-bottom: 8px;
        }
        .req {
          color: #e11d48;
          font-weight: 800;
        }

        /* Google-Profil: wieder breit + Clear-X + Profil öffnen Button */
        .profile-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .profile-input {
          position: relative;
          flex: 1 1 520px;
          min-width: 300px;
        }
        .profile-input input {
          width: 100%;
          height: 36px; /* kompakter */
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          padding: 8px 34px 8px 12px; /* Platz für X rechts */
          font-size: 15px;
          background: #fff;
          transition: border-color 0.16s ease, box-shadow 0.16s ease;
        }
        .profile-input input:focus {
          border-color: #0b6cf2;
          box-shadow: 0 0 0 3px rgba(11, 108, 242, 0.2);
        }
        .clear-x {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 22px;
          height: 22px;
          line-height: 20px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.15);
          background: #fff;
          color: #111;
          font-size: 16px;
          cursor: pointer;
          padding: 0;
        }
        .profile-link {
          display: inline-flex;
          align-items: center;
          height: 36px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid #dbeafe;
          background: #eef5ff;
          color: #0a58c7;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
        }
        .profile-link:hover {
          background: #e4efff;
        }

        /* Choice Cards im Grid */
        .checks {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 8px;
        }
        .choice {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #eaf0fe;
          background: #fff;
          cursor: pointer;
          user-select: none;
          font-weight: 600;
          color: #0e0e0e;
          transition: border-color 0.14s ease, box-shadow 0.14s ease, transform 0.05s ease;
        }
        .choice:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
          border-color: #d6e5ff;
        }
        .choice.on {
          box-shadow: 0 0 0 2px rgba(11, 108, 242, 0.22) inset;
          border-color: #0b6cf2;
          background: #eef5ff;
        }
        .choice input {
          display: none;
        }
        .choice .mark {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 2px solid #64748b;
          display: inline-block;
          position: relative;
          flex: none;
        }
        .choice.on .mark {
          border-color: #0b6cf2;
          background: #eaf3ff;
        }
        .choice.on .mark::after {
          content: "";
          position: absolute;
          inset: 3px;
          background: #0b6cf2;
          border-radius: 2px;
        }

        /* Inputs kompakt */
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 10px;
        }
        .field label {
          font-weight: 600;
          color: #475569;
          font-size: 13px;
        }
        .field input,
        .field textarea {
          height: 34px; /* kompakter als zuvor */
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          padding: 6px 10px;
          font-size: 15px;
          background: #fff;
          transition: border-color 0.16s ease, box-shadow 0.16s ease;
        }
        .field textarea {
          height: auto;
        }
        .field input:focus,
        .field textarea:focus {
          border-color: #0b6cf2;
          box-shadow: 0 0 0 3px rgba(11, 108, 242, 0.2);
        }

        .row {
          display: flex;
          gap: 12px;
        }
        .half {
          flex: 1;
        }

        /* Extra Luft nach der Telefon-Reihe */
        .group:last-of-type .row:last-of-type {
          margin-bottom: 12px;
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 6px;
        }
        .actions.center { justify-content: center; }

        /* Dunkelgrüner, zentrierter Confirm-Button mit subtiler Pulse-Anim */
        .submit-btn.confirm{
          display:inline-flex;
          align-items:center;
          gap:10px;
          padding:14px 22px;
          border-radius:999px;
          border:1px solid #0b461f;
          background: linear-gradient(135deg, #166534 0%, #0f3f20 100%);
          color:#fff;
          font-weight:800;
          letter-spacing:.2px;
          box-shadow: 0 12px 30px rgba(6, 95, 70, .35);
          transition: transform .12s ease, box-shadow .18s ease, filter .18s ease, background .18s ease;
          will-change: transform, box-shadow, filter;
          animation: confirmPulse 2.4s ease-in-out infinite;
        }
        .submit-btn.confirm .label { font-size:16px; }
        .submit-btn.confirm .emoji { transform: translateY(-1px); transition: transform .2s ease; }
        .submit-btn.confirm:hover{
          transform: translateY(-1px);
          filter: brightness(1.05);
          box-shadow: 0 16px 36px rgba(6, 95, 70, .45);
        }
        .submit-btn.confirm:active{
          transform: translateY(0);
          filter: brightness(.98);
          box-shadow: 0 8px 18px rgba(6, 95, 70, .35);
        }
        .submit-btn.confirm:focus-visible{
          outline: none;
          box-shadow: 0 0 0 3px rgba(22, 101, 52, .22), 0 12px 30px rgba(6, 95, 70, .35);
        }
        .submit-btn.confirm:hover .emoji{
          transform: translateY(-3px) rotate(-6deg) scale(1.06);
        }
        @keyframes confirmPulse {
          0%   { transform: scale(.997); }
          50%  { transform: scale(1); }
          100% { transform: scale(.997); }
        }

        /* Fliegender grüner Haken */
        .check-fly{
          position: fixed;
          z-index: 1000;
          left: 50%;
          bottom: 110px;              /* startet knapp über dem Button */
          transform: translateX(-50%);
          pointer-events: none;
          animation: checkFly 1.1s cubic-bezier(.18,.64,.32,1) forwards;
          filter: drop-shadow(0 12px 22px rgba(6,95,70,.35));
        }
        @keyframes checkFly {
          0%   { transform: translate(-50%, 0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          60%  { transform: translate(calc(-50% + 180px), -220px) rotate(-8deg); opacity: 1; }
          100% { transform: translate(calc(-50% + 420px), -520px) rotate(8deg); opacity: 0; }
        }

        /* Mobile */
        @media (max-width: 820px) {
          .drawer {
            margin: 16px 0 0;
            border-radius: 16px;
          }
          .checks {
            grid-template-columns: 1fr;
          }
          .row {
            flex-direction: column;
          }
          .actions {
            justify-content: stretch;
          }
          .actions.center { justify-content: center; }
          .submit-btn.confirm{ width:100%; justify-content:center; }
          .check-fly{
            bottom: 96px;
            animation: checkFlyMobile 1.0s cubic-bezier(.18,.64,.32,1) forwards;
          }
          @keyframes checkFlyMobile {
            0%   { transform: translate(-50%, 0) rotate(0deg); opacity: 0; }
            10%  { opacity: 1; }
            60%  { transform: translate(calc(-50% + 80px), -180px) rotate(-8deg); opacity: 1; }
            100% { transform: translate(calc(-50% + 160px), -360px) rotate(8deg); opacity: 0; }
          }
        }
      `}</style>
    </main>
  );
}
