"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import LiveSimulator from "../../components/LiveSimulator"; // passt zu deinem Setup

export default function DashboardPage() {
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef(null);

  const [option, setOption] = useState("123");
  const formGoogleInputRef = useRef(null);
  const [googleField, setGoogleField] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");

  const [company, setCompany] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

  useEffect(() => {
    const onStart = (e) => {
      const { name = "", address = "", url = "" } = e.detail || {};
      const fresh = [name, address].filter(Boolean).join(", ");
      setGoogleField(fresh);
      setGoogleUrl(url || "");
      try {
        const opt = sessionStorage.getItem("sb_selected_option");
        if (opt) setOption(opt);
      } catch {}
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

  const openFormNow = () => {
    pullLatestFromSession();
    setFormOpen(true);
    setTimeout(scrollToForm, 30);
  };

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
        try {
          sessionStorage.setItem("sb_selected_profile", JSON.stringify({ name, address, url }));
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
    alert("Formular wurde erfolgreich ausgefüllt. (Nächster Schritt: Signatur & PDF)");
  };

  return (
    <main className="sb-dashboard-wrap">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={onMapsLoaded}
      />

      <LiveSimulator />

      {!formOpen && (
        <div className="cta-one">
          <button className="rocket-btn" onClick={openFormNow}>
            <span className="emoji">🚀</span>
            <span>Jetzt loslegen</span>
          </button>
        </div>
      )}

      <section
        ref={formRef}
        className={`drawer ${formOpen ? "open" : ""}`}
        aria-hidden={!formOpen}
      >
        <div className="drawer-head">
          <h2 className="drawer-title">Es kann gleich losgehen ✨</h2>
          <p className="drawer-sub">
            Lass uns dieses Formular kurz gemeinsam ausfüllen – dann geht’s schon los.
          </p>
        </div>

        <form className="lead-form" onSubmit={onSubmit}>
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
                  if (googleUrl) setGoogleUrl("");
                }}
              />
              {googleUrl ? (
                <a className="profile-link" href={googleUrl} target="_blank" rel="noreferrer">
                  Profil öffnen ↗
                </a>
              ) : null}
            </div>
          </div>

          <div className="group">
            <div className="group-title">Welche Bewertungen sollen gelöscht werden? <span className="req">*</span></div>
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
                  <span className="mark" /> {label}
                </label>
              ))}
            </div>

            {option === "custom" && (
              <div className="field">
                <label>Individuelle Wünsche <span className="req">*</span></label>
                <textarea
                  rows={4}
                  placeholder="Beschreibe kurz, was individuell gelöscht werden soll..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <div className="group">
            <div className="group-title">Kontaktdaten</div>
            <div className="field">
              <label>Firmenname <span className="req">*</span></label>
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
                <label>Telefon <span className="req">*</span></label>
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

          <div className="actions">
            <button type="submit" className="submit-btn">Auftrag anstoßen</button>
          </div>
        </form>
      </section>

      <style jsx global>{`
        .sb-dashboard-wrap {
          max-width: 1208px;
          margin: 0 auto;
          padding: 0 12px 80px;
        }

        .cta-one {
          display: flex;
          justify-content: center;
          margin-top: 18px;
        }
        .rocket-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          border: 1px solid rgba(0, 0, 0, 0.65);
          border-radius: 16px;
          padding: 16px 26px;
          font-weight: 800;
          color: #fff;
          font-size: 18px;
          background: linear-gradient(103deg, #0a58c7, #1b74ff 55%, #0984ff 100%);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
          transition: transform 0.14s ease, box-shadow 0.22s ease, background 0.25s ease;
        }
        .rocket-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 46px rgba(0, 0, 0, 0.3);
        }

        .drawer {
          max-width: 900px;
          margin: 20px auto 0;
          background: linear-gradient(135deg, #DBEDFF 0%, #ffffff 80%);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          opacity: 0;
          transform: translateY(-6px);
          transition: all 0.3s ease;
          pointer-events: none;
        }
        .drawer.open {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .drawer-head {
          padding: 24px 24px 0;
          text-align: center;
        }
        .drawer-title {
          font-family: "Outfit", sans-serif;
          font-weight: 700;
          font-size: 28px;
          color: #0f172a;
          margin-bottom: 8px;
        }
        .drawer-sub {
          color: #4b5563;
          font-size: 15px;
        }

        .lead-form {
          padding: 20px 24px 30px;
        }

        .group-title {
          font-family: "Outfit", sans-serif;
          font-weight: 700;
          font-size: 18px;
          margin-top: 20px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 10px;
        }
        .field input,
        .field textarea {
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          padding: 8px 12px;
          font-size: 15px;
          height: 38px;
          background: #fff;
          transition: border-color 0.16s ease, box-shadow 0.16s ease;
        }
        .field textarea {
          height: auto;
        }
        .field input:focus,
        .field textarea:focus {
          border-color: #0984ff;
          box-shadow: 0 0 0 3px rgba(9, 132, 255, 0.2);
        }

        .req {
          color: #e11d48;
        }

        .choice {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #eaf0fe;
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
          background: #fff;
          font-weight: 600;
        }
        .choice.on {
          border-color: #0984ff;
          background: #eaf3ff;
        }

        .submit-btn {
          background: #0984ff;
          color: #fff;
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: 0.2s;
        }
        .submit-btn:hover {
          background: #0a6ae8;
        }
      `}</style>
    </main>
  );
}
