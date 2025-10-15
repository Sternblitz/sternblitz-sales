"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LiveSimulator from "../../components/LiveSimulator"; // Pfad passt

export default function DashboardPage() {
  // UI
  const [formOpen, setFormOpen] = useState(false);
  const [launching, setLaunching] = useState(false); // für Raketen-Animation
  const formRef = useRef(null);

  // Prefill aus Simulator
  const [profile, setProfile] = useState({ name: "", address: "", url: "" });
  const [option, setOption]   = useState("123"); // "123" | "12" | "1" | "custom"
  const [customText, setCustomText] = useState(""); // individueller Wunsch (Textfeld)

  // Kontaktdaten
  const [company, setCompany]     = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");

  // Readable Profil-Text
  const googleProfileText = useMemo(() => {
    const { name, address } = profile || {};
    if (!name && !address) return "";
    return `${name}${address ? ", " + address : ""}`;
  }, [profile]);

  // sessionStorage + Events vom Simulator
  const pullFromSession = () => {
    try {
      const raw = sessionStorage.getItem("sb_selected_profile");
      if (raw) {
        const p = JSON.parse(raw);
        setProfile({ name: p?.name || "", address: p?.address || "", url: p?.url || "" });
      }
      const opt = sessionStorage.getItem("sb_selected_option");
      if (opt) setOption(opt);
    } catch {}
  };

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    // Prefill direkt bei Mount
    pullFromSession();

    // Auf Simulator-Start hören (frisches Profil)
    const onStart = (e) => {
      const { name = "", address = "", url = "" } = e.detail || {};
      setProfile({ name, address, url });
    };

    // Option-Änderungen (im Simulator)
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

  // EIN großer CTA -> Formular öffnen
  const handleLaunch = () => {
    pullFromSession();
    setLaunching(true);          // Rocket Lift-Off
    setFormOpen(true);           // Drawer auf
    // kleine Verzögerung bis Animation “fertig” wirkt
    setTimeout(() => setLaunching(false), 800);
    scrollToForm();
  };

  // Option lokal + persistieren
  const onOptionChange = (val) => {
    setOption(val);
    try { sessionStorage.setItem("sb_selected_option", val); } catch {}
  };

  // Submit (nur Demo — kein Backend, damit Deploy clean bleibt)
  const onSubmit = (e) => {
    e.preventDefault();
    if (!googleProfileText.trim()) {
      alert("Bitte ein Google-Profil auswählen (Pflichtfeld).");
      return;
    }
    const payload = {
      googleProfile: googleProfileText,
      selectedOption: option,
      customText: option === "custom" ? customText : "",
      company, firstName, lastName, email, phone,
      submittedAt: new Date().toISOString(),
    };
    try { sessionStorage.setItem("sb_checkout_payload", JSON.stringify(payload)); } catch {}
    console.log("Lead payload:", payload);
    alert("Danke! Wir haben deine Angaben vorgemerkt. (Nächster Step: Signatur + PDF + E-Mail)");
  };

  return (
    <main className="sb-page-wrap">
      {/* Live-Simulator oben */}
      <div className="stars-bg">
        <LiveSimulator />
      </div>

      {/* EIN großer, pulsierender Rechteck-Button */}
      <div className="cta-box">
        <button
          type="button"
          className={`mega-cta ${launching ? "launch" : ""}`}
          onClick={handleLaunch}
          aria-label="Jetzt loslegen"
        >
          <span className="cta-label">Jetzt loslegen</span>
          <span className="cta-rocket" aria-hidden>🚀</span>
          <span className="pulse-ring" aria-hidden />
        </button>
      </div>

      {/* Formular */}
      <section ref={formRef} className={`drawer ${formOpen ? "open" : ""}`} aria-hidden={!formOpen}>
        <form className="lead-form" onSubmit={onSubmit} autoComplete="on">
          <h2 className="form-headline">Es kann gleich losgehen ✨</h2>
          <p className="form-sub">
            Bitte **alle Felder** ausfüllen (für den Vertriebseinsatz am Tablet optimiert).
          </p>

          {/* Google-Profil (Pflicht) */}
          <div className="field">
            <label>Google-Profil<span className="req">*</span></label>
            <div className="profile-input">
              <input
                type="text"
                value={googleProfileText}
                readOnly
                placeholder="Wird automatisch aus dem Live-Simulator übernommen"
                required
              />
              {profile?.url ? (
                <a className="profile-link" href={profile.url} target="_blank" rel="noreferrer">
                  Profil öffnen ↗
                </a>
              ) : null}
            </div>
          </div>

          {/* Auswahl: welche Bewertungen löschen */}
          <div className="group">
            <div className="group-title">Welche Bewertungen sollen gelöscht werden?<span className="req">*</span></div>
            <div className="checks">
              <label className={`choice ${option === "123" ? "on" : ""}`}>
                <input
                  type="radio"
                  name="delopt"
                  value="123"
                  checked={option === "123"}
                  onChange={() => onOptionChange("123")}
                  required
                />
                <span className="mark" /> 1–3 ⭐ löschen
              </label>

              <label className={`choice ${option === "12" ? "on" : ""}`}>
                <input
                  type="radio"
                  name="delopt"
                  value="12"
                  checked={option === "12"}
                  onChange={() => onOptionChange("12")}
                />
                <span className="mark" /> 1–2 ⭐ löschen
              </label>

              <label className={`choice ${option === "1" ? "on" : ""}`}>
                <input
                  type="radio"
                  name="delopt"
                  value="1"
                  checked={option === "1"}
                  onChange={() => onOptionChange("1")}
                />
                <span className="mark" /> 1 ⭐ löschen
              </label>

              <label className={`choice ${option === "custom" ? "on" : ""}`}>
                <input
                  type="radio"
                  name="delopt"
                  value="custom"
                  checked={option === "custom"}
                  onChange={() => onOptionChange("custom")}
                />
                <span className="mark" /> Individuelle Löschungen
              </label>
            </div>

            {option === "custom" && (
              <div className="field">
                <label>Individuelle Wünsche</label>
                <textarea
                  rows={4}
                  placeholder="Beschreibe hier, welche Bewertungen/Wünsche du individuell hast…"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Kontaktdaten */}
          <div className="group">
            <div className="group-title">Kontaktdaten</div>

            <div className="field">
              <label>Firmenname<span className="req">*</span></label>
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
                <label>Vorname<span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="Max"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="field half">
                <label>Nachname<span className="req">*</span></label>
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
                <label>E-Mail<span className="req">*</span></label>
                <input
                  type="email"
                  placeholder="max@firma.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field half">
                <label>Telefon<span className="req">*</span></label>
                <input
                  type="tel"
                  placeholder="+49 151 23456789"
                  pattern="^\+?[0-9 ]{6,}$"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="submit-btn">Auftrag bestätigen</button>
          </div>
        </form>
      </section>

      {/* Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Outfit:wght@400;600;700&display=swap');

        .sb-page-wrap{max-width:1208px;margin:0 auto;padding:0 12px 80px}

        /* Hintergrund wie Live-Simulator */
        .stars-bg{
          border-radius:16px;
          background:url("https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689acdb9f72cb41186204eda_stars-rating.webp") center/cover no-repeat;
        }

        /* EIN großer pulsierender Rechteck-CTA */
        .cta-box{display:flex;justify-content:center;margin-top:18px}
        .mega-cta{
          position:relative;
          display:flex;align-items:center;justify-content:center;gap:12px;
          width:min(920px,92vw);height:82px;
          border-radius:18px;border:1px solid rgba(0,0,0,.65);
          background:linear-gradient(103deg,#151515,#262626 55%, #0c0c0c 100%);
          color:#fff;font:700 22px/1 Poppins,system-ui;letter-spacing:.2px;
          box-shadow:0 14px 40px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.05);
          cursor:pointer;overflow:hidden;
          transition:transform .14s ease, box-shadow .24s ease, background .25s ease;
        }
        .mega-cta:hover{transform:translateY(-1px);box-shadow:0 18px 52px rgba(0,0,0,.34)}
        .mega-cta:active{transform:translateY(0)}
        .mega-cta .cta-label{position:relative;z-index:2}
        .mega-cta .cta-rocket{position:relative;z-index:2;transition:transform .5s ease, opacity .5s ease}
        .mega-cta .pulse-ring{
          position:absolute;inset:-10%;border-radius:24px;z-index:1;
          box-shadow:0 0 0 0 rgba(73,168,76,.35);
          animation:pulse 2.2s ease-in-out infinite;
        }
        @keyframes pulse{
          0%{box-shadow:0 0 0 0 rgba(73,168,76,.0)}
          50%{box-shadow:0 0 0 26px rgba(73,168,76,.14)}
          100%{box-shadow:0 0 0 0 rgba(73,168,76,.0)}
        }
        /* Lift-Off beim Klick */
        .mega-cta.launch .cta-rocket{transform:translateY(-12px) translateX(6px) rotate(-8deg)}
        
        /* Drawer */
        .drawer{
          max-width:880px;margin:18px auto 0;
          background:rgba(255,255,255,.9);backdrop-filter:blur(8px);
          border:1px solid rgba(0,0,0,.06);border-radius:16px;
          box-shadow:0 20px 60px rgba(0,0,0,.12);
          overflow:hidden;transform:translateY(-6px) scale(.985);opacity:0;pointer-events:none;
          transition:transform .28s ease, opacity .28s ease;
        }
        .drawer.open{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}

        .lead-form{padding:22px}
        .form-headline{
          margin:0 0 6px 0;
          font:700 22px/1.2 Poppins,system-ui;color:#0f172a;
        }
        .form-sub{
          margin:0 0 12px 0;
          font:600 13px/1.4 Poppins,system-ui;color:#475569;
        }
        .req{margin-left:6px;color:#e11d48}

        .group{margin-top:18px}
        .group-title{font:700 18px/1 Poppins,system-ui;color:#0f172a;margin-bottom:10px}

        .field{display:flex;flex-direction:column;gap:8px;margin-top:12px}
        .field.inline{flex-direction:row;align-items:center;gap:12px}
        .field.inline label{min-width:260px}
        .field label{font:600 13px/1.2 Poppins,system-ui;color:#475569}
        .field input{
          height:42px; /* kompakter */
          border-radius:12px;border:1px solid rgba(0,0,0,.1);padding:0 14px;
          font-size:15px;outline:none;background:#fff;transition:box-shadow .16s ease, border-color .16s ease;
        }
        .field textarea{
          border-radius:12px;border:1px solid rgba(0,0,0,.1);padding:10px 14px;
          font-size:15px;outline:none;background:#fff;transition:box-shadow .16s ease, border-color .16s ease;resize:vertical;
        }
        .field input:focus, .field textarea:focus{border-color:#49a84c;box-shadow:0 0 0 4px rgba(73,168,76,.18)}

        .profile-input{display:flex;gap:10px;align-items:center}
        .profile-input input{flex:1}
        .profile-link{font-size:13px;color:#2563eb;text-decoration:underline;white-space:nowrap}

        .row{display:flex;gap:12px}
        .half{flex:1}

        /* Choice Cards */
        .checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:10px}
        .choice{
          display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;
          padding:14px;border-radius:12px;background:#fff;
          border:1px solid #eaf0fe;transition:border-color .14s ease, box-shadow .14s ease, transform .05s ease;
          font-weight:600;color:#0e0e0e;
        }
        .choice:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,.06);border-color:#d6e5ff}
        .choice.on{box-shadow:0 0 0 2px rgba(73,168,76,.28) inset;border-color:#49A84C}
        .choice input{display:none}
        .choice .mark{
          width:18px;height:18px;border-radius:4px;border:2px solid #64748b;display:inline-block;position:relative;flex:none;
        }
        .choice.on .mark{border-color:#49A84C;background:#e8f5e9}
        .choice.on .mark::after{content:"";position:absolute;inset:3px;background:#49A84C;border-radius:2px}

        .actions{display:flex;justify-content:flex-end;margin-top:22px}
        .submit-btn{
          padding:13px 20px;border-radius:12px;border:1px solid #0b0b0b;background:#0b0b0b;color:#fff;
          font-weight:700;letter-spacing:.2px;
          box-shadow:0 12px 28px rgba(0,0,0,.18);
          transition:transform .12s ease, box-shadow .22s ease, background .22s ease;
        }
        .submit-btn:hover{transform:translateY(-1px);background:#111;box-shadow:0 16px 36px rgba(0,0,0,.24)}

        /* Mobile */
        @media (max-width: 820px){
          .lead-form{padding:16px}
          .row{flex-direction:column}
          .field.inline{flex-direction:column;align-items:flex-start}
          .field.inline label{min-width:unset}
          .checks{grid-template-columns:1fr}
          .submit-btn{width:100%}
          .mega-cta{height:76px}
        }
      `}</style>
    </main>
  );
}
