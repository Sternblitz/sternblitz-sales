"use client";

import { useEffect, useMemo, useState } from "react";
import LiveSimulator from "../../components/LiveSimulator"; // <- korrekter Pfad (app/dashboard -> ../.. -> components)

export default function DashboardPage() {
  // --- UI / Offen-States ---
  const [showStage2, setShowStage2] = useState(false); // nach erstem "Jetzt loslegen"
  const [formOpen, setFormOpen] = useState(false);     // nach großem Raketen-Button

  // --- Prefill aus Simulator ---
  const [profile, setProfile] = useState({ name: "", address: "", url: "" });
  const [option, setOption]   = useState("123"); // "123" | "12" | "1" | "custom"

  // --- Formularfelder ---
  const [customCount, setCustomCount] = useState("");
  const [company, setCompany]         = useState("");
  const [firstName, setFirstName]     = useState("");
  const [lastName, setLastName]       = useState("");
  const [email, setEmail]             = useState("");
  const [phone, setPhone]             = useState("");

  // Anzeigename für das Google-Profil
  const googleProfileText = useMemo(() => {
    const { name, address } = profile || {};
    if (!name && !address) return "";
    return `${name}${address ? ", " + address : ""}`;
  }, [profile]);

  // Prefill aus sessionStorage holen
  const pullFromSession = () => {
    try {
      const raw = sessionStorage.getItem("sb_selected_profile");
      if (raw) {
        const p = JSON.parse(raw);
        setProfile({
          name: p?.name || "",
          address: p?.address || "",
          url: p?.url || "",
        });
      }
      const opt = sessionStorage.getItem("sb_selected_option");
      if (opt) setOption(opt);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    pullFromSession();
    // Falls dein Simulator CustomEvents feuert, hören wir sie hier
    const onProfileChanged = () => pullFromSession();
    window.addEventListener("sb:profile-changed", onProfileChanged);
    window.addEventListener("sb:option-changed", onProfileChanged);
    return () => {
      window.removeEventListener("sb:profile-changed", onProfileChanged);
      window.removeEventListener("sb:option-changed", onProfileChanged);
    };
  }, []);

  // CTA 1 -> Stage2 sichtbar + frisches Prefill
  const handleStage1 = () => {
    pullFromSession();
    setShowStage2(true);
  };

  // CTA 2 (Rakete) -> Formular aufklappen + frisches Prefill
  const handleStage2 = () => {
    pullFromSession();
    setFormOpen((v) => !v);
  };

  // Option umschalten + mitschreiben
  const onOptionChange = (val) => {
    setOption(val);
    try {
      sessionStorage.setItem("sb_selected_option", val);
    } catch {}
  };

  // Absenden (Lead anstoßen – aktuell Demo)
  const onSubmit = (e) => {
    e.preventDefault();

    const payload = {
      googleProfile: googleProfileText,
      selectedOption: option,
      customCount: option === "custom" ? Number(customCount || 0) : null,
      company,
      firstName,
      lastName,
      email,
      phone,
    };

    try {
      sessionStorage.setItem("sb_checkout_payload", JSON.stringify(payload));
    } catch {}

    // Hier später: fetch("/api/lead", {method:"POST", body: JSON.stringify(payload)})
    console.log("Lead payload:", payload);
    alert("Top! Wir haben deine Angaben vorgemerkt. (Nächster Schritt: PDF/Signatur/AGB)");
  };

  return (
    <>
      <div className="dashboard-wrap">
        {/* 1) Live-Simulator */}
        <LiveSimulator />

        {/* 2) Stufe 1: schlanker CTA */}
        <div className="cta-stage1">
          <button className={`pill-btn ${showStage2 ? "on" : ""}`} onClick={handleStage1}>
            Jetzt loslegen
          </button>
        </div>

        {/* 3) Stufe 2: großer Raketen-Button */}
        {showStage2 && (
          <div className="cta-stage2">
            <button className={`rocket-btn ${formOpen ? "active" : ""}`} onClick={handleStage2}>
              <span className="emoji">🚀</span>
              <span>Jetzt loslegen</span>
            </button>
            <p className="cta-sub">
              Wir füllen die Felder automatisch mit deinem Profil &amp; der Auswahl aus dem Simulator.
            </p>
          </div>
        )}

        {/* 4) Formular: elegant aufklappbar */}
        <div className={`drawer ${formOpen ? "open" : ""}`} aria-hidden={!formOpen}>
          <form className="lead-form" onSubmit={onSubmit} autoComplete="on">
            {/* Google-Profil */}
            <div className="field">
              <label>Google-Profil</label>
              <div className="profile-input">
                <input
                  type="text"
                  value={googleProfileText}
                  readOnly
                  placeholder="Wird automatisch aus dem Live-Simulator übernommen"
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
              <div className="group-title">Welche Bewertungen sollen gelöscht werden?</div>
              <div className="checks">
                <label className={`choice ${option === "123" ? "on" : ""}`}>
                  <input
                    type="radio"
                    name="delopt"
                    value="123"
                    checked={option === "123"}
                    onChange={() => onOptionChange("123")}
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
                <div className="field inline">
                  <label>Wie viele sollen gelöscht werden?</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="z. B. 17"
                    value={customCount}
                    onChange={(e) => setCustomCount(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            {/* Kontaktdaten */}
            <div className="group">
              <div className="group-title">Kontaktdaten</div>

              <div className="field">
                <label>Firmenname</label>
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
                  <label>Vorname</label>
                  <input
                    type="text"
                    placeholder="Max"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="field half">
                  <label>Nachname</label>
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
                  <label>E-Mail</label>
                  <input
                    type="email"
                    placeholder="max@firma.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="field half">
                  <label>Telefon</label>
                  <input
                    type="tel"
                    placeholder="+49…"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="actions">
              <button type="submit" className="submit-btn">Auftrag anstoßen</button>
            </div>
          </form>
        </div>
      </div>

      {/* ======= Styles: clean & modern, mobile-first ======= */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Outfit:wght@400;600;700&display=swap');

        .dashboard-wrap{max-width:1208px;margin:0 auto;padding:0 12px 80px}

        /* Stage 1: schlanke Pille */
        .cta-stage1{display:flex;justify-content:center;margin-top:22px}
        .pill-btn{
          appearance:none;border:none;cursor:pointer;
          padding:12px 18px;border-radius:999px;
          font-weight:700;background:#0b0b0b;color:#fff;letter-spacing:.2px;
          box-shadow:0 8px 24px rgba(0,0,0,.18);
          transition:transform .12s ease, box-shadow .2s ease, background .2s ease;
        }
        .pill-btn:hover{transform:translateY(-1px);background:#111;box-shadow:0 12px 28px rgba(0,0,0,.22)}
        .pill-btn.on{outline:2px solid rgba(73,168,76,.4)}

        /* Stage 2: Rakete */
        .cta-stage2{display:flex;flex-direction:column;align-items:center;margin-top:14px}
        .rocket-btn{
          display:inline-flex;align-items:center;gap:10px;cursor:pointer;
          border:1px solid rgba(0,0,0,.65); border-radius:16px;
          padding:16px 22px;font-weight:700;color:#fff;
          background:linear-gradient(103deg,#151515,#2b2b2b 55%, #0c0c0c 100%);
          box-shadow:0 12px 30px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04);
          transition:transform .14s ease, box-shadow .22s ease, background .25s ease;
        }
        .rocket-btn .emoji{font-size:20px;transform:translateY(-1px)}
        .rocket-btn:hover{transform:translateY(-1px);box-shadow:0 16px 40px rgba(0,0,0,.28)}
        .rocket-btn.active{outline:2px solid rgba(73,168,76,.35)}
        .cta-sub{margin:10px 0 0;color:#6b7280;font-size:13px}

        /* Drawer: Glass-Card */
        .drawer{
          max-width:880px;margin:18px auto 0;
          background:rgba(255,255,255,.86);backdrop-filter:blur(8px);
          border:1px solid rgba(0,0,0,.06);border-radius:16px;
          box-shadow:0 20px 60px rgba(0,0,0,.12);
          overflow:hidden;transform:translateY(-6px) scale(.985);opacity:0;pointer-events:none;
          transition:transform .28s ease, opacity .28s ease;
        }
        .drawer.open{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}

        .lead-form{padding:22px}
        .group{margin-top:18px}
        .group-title{font:700 18px/1 Poppins,system-ui;color:#0f172a;margin-bottom:10px}

        .field{display:flex;flex-direction:column;gap:8px;margin-top:12px}
        .field.inline{flex-direction:row;align-items:center;gap:12px}
        .field.inline label{min-width:260px}
        .field label{font:600 13px/1.2 Poppins,system-ui;color:#475569}
        .field input{
          height:46px;border-radius:12px;border:1px solid rgba(0,0,0,.1);padding:0 14px;
          font-size:16px;outline:none;background:#fff;transition:box-shadow .16s ease, border-color .16s ease;
        }
        .field input:focus{border-color:#49a84c;box-shadow:0 0 0 4px rgba(73,168,76,.18)}

        .profile-input{display:flex;gap:10px;align-items:center}
        .profile-input input{flex:1}
        .profile-link{font-size:13px;color:#2563eb;text-decoration:underline;white-space:nowrap}

        .row{display:flex;gap:12px}
        .half{flex:1}

        /* Choice Cards (Radios als „Kästchen“) */
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

        .actions{display:flex;justify-content:flex-end;margin-top:18px}
        .submit-btn{
          padding:12px 18px;border-radius:12px;border:1px solid #0b0b0b;background:#0b0b0b;color:#fff;
          font-weight:700;letter-spacing:.2px;
          box-shadow:0 12px 28px rgba(0,0,0,.18);
          transition:transform .12s ease, box-shadow .22s ease, background .22s ease;
        }
        .submit-btn:hover{transform:translateY(-1px);background:#111;box-shadow:0 16px 36px rgba(0,0,0,.24)}

        /* Mobile */
        @media (max-width: 820px){
          .drawer{margin:14px 0;border-radius:14px}
          .lead-form{padding:16px}
          .row{flex-direction:column}
          .field.inline{flex-direction:column;align-items:flex-start}
          .field.inline label{min-width:unset}
          .checks{grid-template-columns:1fr}
          .submit-btn{width:100%}
        }
      `}</style>
    </>
  );
}
