"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import LiveSimulator from "../../components/LiveSimulator"; // Pfad passt zu deinem Setup

export default function DashboardPage() {
  // UI
  const [showStage2, setShowStage2] = useState(false); // erst großer Button -> danach Rakete
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef(null);

  // Prefill aus Simulator
  const [profile, setProfile] = useState({ name: "", address: "", url: "" });
  const [option, setOption] = useState("123"); // "123" | "12" | "1" | "custom"

  // Formular-Felder
  const [customCount, setCustomCount] = useState("");
  const [customNotes, setCustomNotes] = useState(""); // <— Freitext „individuelle Wünsche“
  const [company, setCompany] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

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
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    // Prefill direkt bei Mount
    pullFromSession();

    // Simulator feuert, wenn user sucht/enter drückt
    const onStart = (e) => {
      const { name = "", address = "", url = "" } = e.detail || {};
      setProfile({ name, address, url });
      if (!company) setCompany(name || "");
      const opt = sessionStorage.getItem("sb_selected_option");
      if (opt) setOption(opt);
      setShowStage2(true);
      setFormOpen(true);
      scrollToForm();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CTA 1 -> danach Rakete anzeigen
  const handleStage1 = () => {
    pullFromSession();
    setShowStage2(true);
  };

  // Rakete -> Formular togglen
  const handleStage2 = () => {
    pullFromSession();
    setFormOpen((v) => !v);
    if (!formOpen) scrollToForm();
  };

  // Option lokal + persistieren
  const onOptionChange = (val) => {
    setOption(val);
    try {
      sessionStorage.setItem("sb_selected_option", val);
    } catch {}
  };

  // === Google Places im FORMULAR (nur falls kein Profil aus Simulator) ===
  const formGoogleInputRef = useRef(null);
  const onMapsLoaded = () => {
    // Wenn das Profil schon gefüllt ist, kein Formular-Autocomplete nötig
    if (googleProfileText) return;
    try {
      const g = window.google;
      if (!g?.maps?.places || !formGoogleInputRef.current) return;
      const ac = new g.maps.places.Autocomplete(formGoogleInputRef.current, {
        types: ["establishment"],
        fields: ["name", "formatted_address", "url", "place_id"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const name = place?.name || "";
        const address = place?.formatted_address || "";
        const url = place?.url || "";
        const sel = { name, address, url };
        setProfile(sel);
        try {
          sessionStorage.setItem("sb_selected_profile", JSON.stringify(sel));
        } catch {}
      });
    } catch (e) {
      console.warn("Form-Autocomplete init error:", e);
    }
  };

  // Submit (validiert Google-Profil)
  const onSubmit = (e) => {
    e.preventDefault();

    // Wenn kein Google-Profil gesetzt wurde, aborten + Fokus aufs Formularfeld
    if (!googleProfileText.trim()) {
      alert("Bitte wähle dein Google-Profil über das Suchfeld aus.");
      formGoogleInputRef.current?.focus();
      return;
    }

    const payload = {
      googleProfile: googleProfileText,
      googleUrl: profile?.url || "",
      selectedOption: option,
      customCount: option === "custom" ? Number(customCount || 0) : null,
      customNotes: option === "custom" ? customNotes : "",
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

    console.log("Lead payload:", payload);
    alert("Danke! Wir haben deine Angaben vorgemerkt. (Nächster Step: Signatur + PDF + E-Mail)");
  };

  return (
    <main className="sb-dashboard-wrap">
      {/* Google Maps Script nur einmal laden (harmlos, falls Simulator es schon hat) */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={onMapsLoaded}
      />

      {/* 1) Live-Simulator */}
      <LiveSimulator />

      {/* 2) EIN großer Button – erst sichtbar */}
      {!showStage2 && (
        <div className="cta-stage1">
          <button className="big-start-btn" onClick={handleStage1}>
            Jetzt loslegen
          </button>
        </div>
      )}

      {/* 3) Danach: Raketen-Button (ersetzt den ersten) */}
      {showStage2 && (
        <div className="cta-stage2">
          <button className={`rocket-btn ${formOpen ? "active" : ""}`} onClick={handleStage2}>
            <span className="emoji">🚀</span>
            <span>Jetzt loslegen</span>
          </button>
          <p className="cta-sub">
            Wir füllen automatisch mit deinem Google-Profil & deiner Auswahl aus dem Simulator vor.
          </p>
        </div>
      )}

      {/* 4) Formular */}
      <section ref={formRef} className={`drawer ${formOpen ? "open" : ""}`} aria-hidden={!formOpen}>
        <form className="lead-form" onSubmit={onSubmit} autoComplete="on">
          {/* Google-Profil */}
          <div className="field">
            <label>Google-Profil</label>

            {/* Wenn schon ein Profil vorhanden ist: readOnly + Link */}
            {googleProfileText ? (
              <div className="profile-input">
                <input
                  type="text"
                  value={googleProfileText}
                  readOnly
                  aria-readonly
                  placeholder="Wird automatisch aus dem Live-Simulator übernommen"
                />
                {profile?.url ? (
                  <a className="profile-link" href={profile.url} target="_blank" rel="noreferrer">
                    Profil öffnen ↗
                  </a>
                ) : null}
              </div>
            ) : (
              // Falls leer: Google Places Autocomplete Pflichtfeld
              <div className="profile-input">
                <input
                  ref={formGoogleInputRef}
                  type="search"
                  inputMode="search"
                  placeholder='Dein Google-Unternehmen suchen… z. B. "Restaurant XY"'
                  required
                />
                <span className="profile-hint">Pflichtfeld</span>
              </div>
            )}
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
              <>
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

                <div className="field">
                  <label>Schreibe hier deine individuellen Wünsche</label>
                  <textarea
                    rows={4}
                    placeholder="Beschreibe kurz, was wir individuell löschen oder prüfen sollen…"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                  />
                </div>
              </>
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
                  placeholder="+49 160 1234567"
                  inputMode="tel"
                  pattern="^[+0-9][0-9 ()-]{6,}$"
                  title="Bitte eine gültige Telefonnummer angeben"
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
      </section>

      {/* Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Outfit:wght@400;600;700&display=swap');

        .sb-dashboard-wrap{max-width:1208px;margin:0 auto;padding:0 12px 80px}

        /* EIN großer, schöner Button */
        .cta-stage1{display:flex;justify-content:center;margin-top:22px}
        .big-start-btn{
          appearance:none;border:none;cursor:pointer;
          padding:16px 26px;border-radius:16px;
          font-weight:800;font-size:18px;letter-spacing:.2px;
          background:linear-gradient(103deg,#111,#1f1f1f 60%, #0c0c0c 100%);
          color:#fff;box-shadow:0 14px 40px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06);
          transition:transform .14s ease, box-shadow .22s ease, background .22s ease;
        }
        .big-start-btn:hover{transform:translateY(-1px);box-shadow:0 20px 48px rgba(0,0,0,.32)}

        /* Rakete */
        .cta-stage2{display:flex;flex-direction:column;align-items:center;margin-top:14px}
        .rocket-btn{
          display:inline-flex;align-items:center;gap:10px;cursor:pointer;
          border:1px solid rgba(0,0,0,.65); border-radius:16px;
          padding:16px 22px;font-weight:800;color:#fff;font-size:16px;
          background:linear-gradient(103deg,#151515,#2b2b2b 55%, #0c0c0c 100%);
          box-shadow:0 12px 30px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04);
          transition:transform .14s ease, box-shadow .22s ease, background .25s ease;
        }
        .rocket-btn .emoji{font-size:20px;transform:translateY(-1px)}
        .rocket-btn:hover{transform:translateY(-1px);box-shadow:0 16px 40px rgba(0,0,0,.28)}
        .rocket-btn.active{outline:2px solid rgba(73,168,76,.35)}
        .cta-sub{margin:10px 0 0;color:#6b7280;font-size:13px}

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
        .group{margin-top:18px}
        .group-title{font:700 18px/1 Poppins,system-ui;color:#0f172a;margin-bottom:10px}

        .field{display:flex;flex-direction:column;gap:8px;margin-top:12px}
        .field.inline{flex-direction:row;align-items:center;gap:12px}
        .field.inline label{min-width:260px}
        .field label{font:600 13px/1.2 Poppins,system-ui;color:#475569}
        .field input,.field textarea{
          border-radius:12px;border:1px solid rgba(0,0,0,.1);padding:10px 14px;
          font-size:16px;outline:none;background:#fff;transition:box-shadow .16s ease, border-color .16s ease;
        }
        .field input{height:46px}
        .field textarea{min-height:110px;resize:vertical}
        .field input:focus,.field textarea:focus{border-color:#49a84c;box-shadow:0 0 0 4px rgba(73,168,76,.18)}

        .profile-input{display:flex;gap:10px;align-items:center}
        .profile-input input{flex:1}
        .profile-link{font-size:13px;color:#2563eb;text-decoration:underline;white-space:nowrap}
        .profile-hint{font-size:12px;color:#6b7280;white-space:nowrap}

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
          .big-start-btn{width:100%}
        }
      `}</style>
    </main>
  );
}
