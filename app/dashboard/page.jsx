"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import LiveSimulator from "../../components/LiveSimulator"; // Pfad ok

export default function DashboardPage() {
  // --- UI ---
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef(null);

  // --- Auswahl aus Simulator (persist) ---
  const [option, setOption] = useState("123"); // "123" | "12" | "1" | "custom"

  // --- Google-Profil (editierbar + Autocomplete im Formular) ---
  const formGoogleInputRef = useRef(null);
  const [googleField, setGoogleField] = useState(""); // sichtbarer, editierbarer Text
  const [googleUrl, setGoogleUrl] = useState("");     // echte Google-URL (falls aus Places)

  // --- Kontaktdaten & Custom Notes ---
  const [company, setCompany] = useState("");     // bleibt leer (nicht auto-filled)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  // --- Helper ---
  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Ziehe IMMER die aktuellste Auswahl aus dem Storage (falls vorhanden)
  const pullLatestFromSession = () => {
    try {
      const raw = sessionStorage.getItem("sb_selected_profile");
      if (raw) {
        const p = JSON.parse(raw);
        const fresh = [p?.name || "", p?.address || ""].filter(Boolean).join(", ");
        setGoogleField(fresh);
        setGoogleUrl(p?.url || "");
      }
      const opt = sessionStorage.getItem("sb_selected_option");
      if (opt) setOption(opt);
    } catch {}
  };

  // Event vom Simulator → immer überschreiben (frisch halten)
  useEffect(() => {
    const onStart = (e) => {
      const { name = "", address = "", url = "" } = e.detail || {};
      const fresh = [name, address].filter(Boolean).join(", ");
      setGoogleField(fresh);
      setGoogleUrl(url || "");
      // Option ebenfalls mitziehen, wenn geändert wurde
      try {
        const opt = sessionStorage.getItem("sb_selected_option");
        if (opt) setOption(opt);
      } catch {}
      // direkt Formular auf
      if (!formOpen) setFormOpen(true);
      setTimeout(scrollToForm, 30);
    };

    const onOpt = () => {
      try {
        const opt = sessionStorage.getItem("sb_selected_option");
        if (opt) setOption(opt);
      } catch {}
    };

    window.addEventListener("sb:simulator-start", onStart);
    window.addEventListener("sb:option-changed", onOpt);
    return () => {
      window.removeEventListener("sb:simulator-start", onStart);
      window.removeEventListener("sb:option-changed", onOpt);
    };
  }, [formOpen]);

  // EINZIGER Button → öffnet Formular + zieht *frisch* aus Session
  const openFormNow = () => {
    pullLatestFromSession();
    setFormOpen(true);
    setTimeout(scrollToForm, 30);
  };

  // --- Google Maps Autocomplete (nur im Formularfeld) ---
  const onMapsLoaded = () => {
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
        const fresh = [name, address].filter(Boolean).join(", ");
        setGoogleField(fresh);
        setGoogleUrl(url || "");
        // Persist für spätere Schritte
        try {
          sessionStorage.setItem(
            "sb_selected_profile",
            JSON.stringify({ name, address, url })
          );
        } catch {}
      });
    } catch (e) {
      console.warn("Form-Autocomplete init error:", e);
    }
  };

  const onOptionChange = (val) => {
    setOption(val);
    try {
      sessionStorage.setItem("sb_selected_option", val);
    } catch {}
  };

  // --- Absenden (nur Demo – deploy-safe) ---
  const onSubmit = (e) => {
    e.preventDefault();
    if (!googleField.trim()) {
      alert("Bitte wähle oder tippe dein Google-Profil.");
      formGoogleInputRef.current?.focus();
      return;
    }
    const payload = {
      googleProfile: googleField.trim(),
      googleUrl: googleUrl || "",
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
    console.log("Lead payload:", payload);
    alert("Top! Wir haben deine Angaben vorgemerkt. (Nächster Step: Signatur + PDF + E-Mail)");
  };

  return (
    <main className="sb-dashboard-wrap">
      {/* Google Maps Script für Autocomplete im Formular */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={onMapsLoaded}
      />

      {/* Live-Simulator oben */}
      <LiveSimulator />

      {/* EINZIGER Button (🚀) */}
      {!formOpen && (
        <div className="cta-one">
          <button className="rocket-btn" onClick={openFormNow}>
            <span className="emoji">🚀</span>
            <span>Jetzt loslegen</span>
          </button>
        </div>
      )}

      {/* Formular */}
      <section
        ref={formRef}
        className={`drawer ${formOpen ? "open" : ""}`}
        aria-hidden={!formOpen}
      >
        <div className="drawer-head">
          <h2 className="drawer-title">Es kann gleich losgehen ✨</h2>
          <p className="drawer-sub">
            Sag uns kurz, welches Google-Profil du meinst und was wir löschen sollen.
          </p>
        </div>

        <form className="lead-form" onSubmit={onSubmit} autoComplete="on">
          {/* Google-Profil (editierbar + Autocomplete) */}
          <div className="field">
            <label>Google-Profil <span className="req">*</span></label>
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
                  if (googleUrl) setGoogleUrl(""); // manuelle Eingabe → URL verwerfen
                }}
              />
              {googleUrl ? (
                <a className="profile-link" href={googleUrl} target="_blank" rel="noreferrer">
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
              <div className="field">
                <label>Schreibe hier deine individuellen Wünsche</label>
                <textarea
                  rows={4}
                  placeholder="Beschreibe kurz, was wir individuell löschen oder prüfen sollen…"
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
              <label>Firmenname</label>
              <input
                type="text"
                placeholder="z. B. Smashburger GmbH"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <div className="row">
              <div className="field half">
                <label>Vorname <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="Max"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="field half">
                <label>Nachname <span className="req">*</span></label>
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
                <label>E-Mail <span className="req">*</span></label>
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

        /* EIN Button (🚀) */
        .cta-one{display:flex;justify-content:center;margin-top:18px}
        .rocket-btn{
          display:inline-flex;align-items:center;gap:10px;cursor:pointer;
          border:1px solid rgba(0,0,0,.65); border-radius:16px;
          padding:16px 24px;font-weight:800;color:#fff;font-size:18px;
          background:linear-gradient(103deg,#151515,#2b2b2b 55%, #0c0c0c 100%);
          box-shadow:0 14px 40px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.05);
          transition:transform .14s ease, box-shadow .22s ease, background .25s ease;
        }
        .rocket-btn .emoji{font-size:20px;transform:translateY(-1px)}
        .rocket-btn:hover{transform:translateY(-1px);box-shadow:0 18px 48px rgba(0,0,0,.32)}

        /* Drawer mit gleichem Hintergrund wie der Live-Simulator */
        .drawer{
          max-width:900px;margin:20px auto 0;
          background:
            linear-gradient(rgba(255,255,255,.92), rgba(255,255,255,.92)),
            url("https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689acdb9f72cb41186204eda_stars-rating.webp") center/cover no-repeat;
          backdrop-filter:blur(8px);
          border:1px solid rgba(0,0,0,.06);border-radius:16px;
          box-shadow:0 20px 60px rgba(0,0,0,.12);
          overflow:hidden;transform:translateY(-6px) scale(.985);opacity:0;pointer-events:none;
          transition:transform .28s ease, opacity .28s ease;
        }
        .drawer.open{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}

        .drawer-head{padding:22px 22px 0}
        .drawer-title{margin:0;font:700 26px/1.2 Outfit,system-ui;color:#0f172a}
        .drawer-sub{margin:6px 0 0;color:#4b5563;font:500 14px/1.4 Poppins,system-ui}

        .lead-form{padding:16px 22px 22px}
        .group{margin-top:16px}
        .group-title{font:700 18px/1 Outfit,system-ui;color:#0f172a;margin:16px 0 8px}

        .field{display:flex;flex-direction:column;gap:6px;margin-top:10px}
        .field label{font:600 13px/1.2 Poppins,system-ui;color:#475569}
        .req{color:#e11d48;margin-left:2px}

        .field input,.field textarea{
          border-radius:10px;border:1px solid rgba(0,0,0,.12);padding:9px 12px;
          font-size:15.5px;outline:none;background:#fff;transition:box-shadow .16s ease, border-color .16s ease;
        }
        .field input{height:42px}          /* kompakter als vorher */
        .field textarea{min-height:108px;resize:vertical}
        .field input:focus,.field textarea:focus{border-color:#49a84c;box-shadow:0 0 0 4px rgba(73,168,76,.18)}

        .profile-input{display:flex;gap:10px;align-items:center}
        .profile-input input{flex:1}
        .profile-link{font-size:13px;color:#2563eb;text-decoration:underline;white-space:nowrap}

        .row{display:flex;gap:12px}
        .half{flex:1}

        /* Choice Cards */
        .checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:8px}
        .choice{
          display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;
          padding:12px;border-radius:10px;background:#fff;
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
          .lead-form{padding:14px}
          .row{flex-direction:column}
          .checks{grid-template-columns:1fr}
          .submit-btn{width:100%}
          .rocket-btn{width:100%;justify-content:center}
        }
      `}</style>
    </main>
  );
}
