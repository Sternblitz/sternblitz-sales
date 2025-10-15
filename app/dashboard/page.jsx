"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import LiveSimulator from "../../components/LiveSimulator"; // Pfad zu deinem Simulator

export default function DashboardPage() {
  // Sichtbarkeit Formular + Scroll
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef(null);

  // Prefill aus Simulator
  const [profile, setProfile] = useState({ name: "", address: "", url: "" });

  // Eingabefeld-Text im Formular (editierbar + clearbar)
  const [profileInput, setProfileInput] = useState("");

  // Bewertungsoptionen
  const [option, setOption] = useState("123"); // "123" | "12" | "1" | "custom"
  const [customNotes, setCustomNotes] = useState(""); // Textfeld statt Zahl

  // Kontaktdaten
  const [company, setCompany] = useState(""); // optional gelassen
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");

  // Anzeige-String (Name, Adresse)
  const googleProfileText = useMemo(() => {
    if (!profile?.name && !profile?.address) return "";
    return `${profile.name || ""}${profile.address ? ", " + profile.address : ""}`;
  }, [profile]);

  // Smooth scroll
  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Beim ersten Render: aus sessionStorage ziehen (z. B. nach Reload)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("sb_selected_profile");
      if (raw) {
        const p = JSON.parse(raw);
        const fresh = { name: p?.name || "", address: p?.address || "", url: p?.url || "" };
        setProfile(fresh);
        setProfileInput(
          [fresh.name, fresh.address].filter(Boolean).join(", ")
        );
      }
      const opt = sessionStorage.getItem("sb_selected_option");
      if (opt) setOption(opt);
    } catch {}
  }, []);

  // Events vom Simulator (immer das frischeste Profil nehmen)
  useEffect(() => {
    const onStart = (e) => {
      const { name = "", address = "", url = "" } = e.detail || {};
      const fresh = { name, address, url };
      setProfile(fresh);
      setProfileInput([name, address].filter(Boolean).join(", "));
      setOption(sessionStorage.getItem("sb_selected_option") || "123");
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
  }, []);

  // Einziger CTA: öffnet das Formular
  const handleOpenForm = () => {
    // Frisch aus Session ziehen, damit es nicht „stale“ ist
    try {
      const raw = sessionStorage.getItem("sb_selected_profile");
      if (raw) {
        const p = JSON.parse(raw);
        const fresh = { name: p?.name || "", address: p?.address || "", url: p?.url || "" };
        setProfile(fresh);
        setProfileInput([fresh.name, fresh.address].filter(Boolean).join(", "));
      }
      const opt = sessionStorage.getItem("sb_selected_option");
      if (opt) setOption(opt);
    } catch {}
    setFormOpen(true);
    scrollToForm();
  };

  // Radiobutton-Wechsel (auch in Session mitschreiben)
  const onOptionChange = (val) => {
    setOption(val);
    try { sessionStorage.setItem("sb_selected_option", val); } catch {}
  };

  // Clear-Button (X) beim Google-Profil
  const clearProfileInput = () => {
    setProfile({ name: "", address: "", url: "" });
    setProfileInput("");
  };

  // Google Places Autocomplete im Formularfeld (nur wenn API schon da)
  const orderInputRef = useRef(null);
  useEffect(() => {
    if (!formOpen) return;
    // erst NACH Öffnen des Formulars versuchen
    const g = typeof window !== "undefined" ? window.google : null;
    if (!g?.maps?.places || !orderInputRef.current) return;

    try {
      const ac = new g.maps.places.Autocomplete(orderInputRef.current, {
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
        setProfileInput([name, address].filter(Boolean).join(", "));
        try { sessionStorage.setItem("sb_selected_profile", JSON.stringify(sel)); } catch {}
      });
    } catch {}
  }, [formOpen]);

  // Submit
  const onSubmit = (e) => {
    e.preventDefault();

    // Google-Profil muss vorhanden sein (Pflichtfeld)
    const trimmed = profileInput.trim();
    if (!trimmed) {
      alert("Bitte ein Google-Profil angeben (Pflichtfeld).");
      return;
    }

    const payload = {
      googleProfileText: trimmed,
      selectedOption: option,
      customNotes: option === "custom" ? customNotes.trim() : "",
      company, firstName, lastName, email, phone,
      submittedAt: new Date().toISOString(),
    };
    try { sessionStorage.setItem("sb_checkout_payload", JSON.stringify(payload)); } catch {}
    console.log("Lead payload:", payload);
    alert("Top! Daten aufgenommen. Nächster Schritt: Vertrag/Signatur + PDF + E-Mail.");
  };

  return (
    <main className="sb-dashboard-wrap">
      {/* Google Places Script – hier, damit Autocomplete im Formular nutzbar ist */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
      />

      {/* Live-Simulator – mit seinem eigenen, hellen Hintergrund wie gehabt */}
      <LiveSimulator />

      {/* EINziger CTA */}
      <div className="cta-one">
        <button className="cta-btn" onClick={handleOpenForm}>
          <span className="txt">Jetzt loslegen</span>
          <span className="emoji">🚀</span>
        </button>
      </div>

      {/* Formular-Box */}
      <section
        ref={formRef}
        className={`drawer ${formOpen ? "open" : ""}`}
        aria-hidden={!formOpen}
      >
        <header className="drawer-head">
          <h2>Es kann gleich losgehen</h2>
          <p className="sub">
            Bitte alle Felder ausfüllen. Mit <span className="req">*</span> gekennzeichnete Felder sind Pflicht.
          </p>
        </header>

        <form className="lead-form" onSubmit={onSubmit} autoComplete="on">
          {/* Google-Profil */}
          <div className="group">
            <div className="group-title big">Google-Profil <span className="req">*</span></div>
            <div className="profile-line">
              <div className="profile-field">
                <input
                  ref={orderInputRef}
                  type="text"
                  placeholder='Unternehmen suchen oder einfügen, z. B. "Smashburger, Berlin"'
                  value={profileInput}
                  onChange={(e) => setProfileInput(e.target.value)}
                  required
                />
                {!!profileInput && (
                  <button
                    type="button"
                    className="clear"
                    aria-label="Feld leeren"
                    onClick={clearProfileInput}
                  >
                    ×
                  </button>
                )}
              </div>
              {profile?.url ? (
                <a className="profile-link" href={profile.url} target="_blank" rel="noreferrer">
                  Profil öffnen ↗
                </a>
              ) : null}
            </div>
          </div>

          {/* Welche Bewertungen… */}
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
                <label>Deine individuellen Wünsche</label>
                <textarea
                  rows={4}
                  placeholder="Schreibe hier deine individuellen Wünsche rein (z. B. Anzahl, Besonderheiten, Zeitrahmen)…"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Kontaktdaten – Vertriebler-Ton */}
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
                  inputMode="tel"
                  placeholder="+49 151 23456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="submit-btn">Auftrag bestätigen</button>
          </div>
        </form>
      </section>

      {/* ======= Styles ======= */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Outfit:wght@400;600;700&display=swap');

        .sb-dashboard-wrap{max-width:1208px;margin:0 auto;padding:0 12px 80px}

        /* EINziger CTA */
        .cta-one{display:flex;justify-content:center;margin-top:16px}
        .cta-btn{
          appearance:none;border:0;cursor:pointer;
          display:inline-flex;align-items:center;gap:10px;
          padding:16px 26px;border-radius:16px;
          font-weight:800;letter-spacing:.2px;font-size:18px;
          background:#0b0b0b;color:#fff;
          box-shadow:0 12px 30px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04);
          transform:translateZ(0);
          transition:transform .14s ease, box-shadow .22s ease, background .25s ease;
          animation:pulseBtn 2.2s ease-in-out infinite;
        }
        .cta-btn:hover{transform:translateY(-1px);box-shadow:0 16px 40px rgba(0,0,0,.28)}
        .cta-btn .emoji{font-size:20px;transform:translateY(-1px)}
        @keyframes pulseBtn{
          0%{transform:scale(.995)} 50%{transform:scale(1)} 100%{transform:scale(.995)}
        }

        /* Drawer (Formular-Box) – hellblauer Verlauf NUR INNEN */
        .drawer{
          max-width:880px;margin:18px auto 0;
          background:linear-gradient(180deg,#DBEDFF 0%, #FFFFFF 100%);
          border:1px solid rgba(0,0,0,.05);border-radius:16px;
          box-shadow:0 20px 60px rgba(0,0,0,.12);
          overflow:hidden;transform:translateY(-6px) scale(.985);opacity:0;pointer-events:none;
          transition:transform .28s ease, opacity .28s ease;
        }
        .drawer.open{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}

        .drawer-head{padding:20px 22px 0}
        .drawer-head h2{
          margin:0 0 6px 0;font:800 24px/1.2 Outfit,system-ui;color:#0f172a
        }
        .drawer-head .sub{
          margin:0 0 2px 0;color:#475569;font:600 13px/1.3 Poppins,system-ui
        }
        .req{color:#e11d48;font-weight:800}

        .lead-form{padding:16px 22px 22px}
        .group{margin-top:18px}
        .group-title{font:700 18px/1 Outfit,system-ui;color:#0f172a;margin-bottom:10px}
        .group-title.big{font-size:20px}

        .profile-line{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        .profile-field{
          position:relative;flex:1;min-width:260px
        }
        .profile-field input{
          height:46px;border-radius:12px;border:1px solid rgba(0,0,0,.1);padding:0 42px 0 14px;
          font-size:16px;outline:none;background:#fff;transition:box-shadow .16s ease, border-color .16s ease;
          width:100%;
        }
        .profile-field input:focus{border-color:#49a84c;box-shadow:0 0 0 4px rgba(73,168,76,.18)}
        .profile-field .clear{
          position:absolute;right:8px;top:50%;transform:translateY(-50%);
          width:28px;height:28px;border-radius:8px;border:1px solid rgba(0,0,0,.12);
          display:inline-flex;align-items:center;justify-content:center;background:#fff;cursor:pointer;
        }
        .profile-link{font-size:13px;color:#2563eb;text-decoration:underline;white-space:nowrap}

        .field{display:flex;flex-direction:column;gap:8px;margin-top:12px}
        .field label{font:600 13px/1.2 Poppins,system-ui;color:#475569}
        .field input{
          height:40px;border-radius:12px;border:1px solid rgba(0,0,0,.1);padding:0 12px;
          font-size:15px;outline:none;background:#fff;transition:box-shadow .16s ease, border-color .16s ease;
        }
        .field input:focus{border-color:#49a84c;box-shadow:0 0 0 4px rgba(73,168,76,.18)}
        .field textarea{
          min-height:110px;border-radius:12px;border:1px solid rgba(0,0,0,.1);padding:10px 12px;
          font-size:15px;outline:none;background:#fff;transition:box-shadow .16s ease, border-color .16s ease;
          resize:vertical;
        }
        .field textarea:focus{border-color:#49a84c;box-shadow:0 0 0 4px rgba(73,168,76,.18)}

        .row{display:flex;gap:12px}
        .half{flex:1}

        /* Choice Cards – altes, besseres Layout */
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
          padding:12px 20px;border-radius:12px;border:1px solid #0b0b0b;background:#0b0b0b;color:#fff;
          font-weight:800;letter-spacing:.2px;font-size:16px;
          box-shadow:0 12px 28px rgba(0,0,0,.18);
          transition:transform .12s ease, box-shadow .22s ease, background .22s ease;
        }
        .submit-btn:hover{transform:translateY(-1px);background:#111;box-shadow:0 16px 36px rgba(0,0,0,.24)}

        /* Mobile */
        @media (max-width: 820px){
          .drawer{margin:14px 0;border-radius:14px}
          .lead-form{padding:16px}
          .row{flex-direction:column}
          .checks{grid-template-columns:1fr}
          .submit-btn{width:100%}
        }
      `}</style>
    </main>
  );
}
