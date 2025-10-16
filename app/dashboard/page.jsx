"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LiveSimulator from "../../components/LiveSimulator";

export default function DashboardPage() {
  const router = useRouter();

  const [formOpen, setFormOpen] = useState(false);
  const [blast, setBlast] = useState(false);
  const [option, setOption] = useState("123");

  const formGoogleInputRef = useRef(null);
  const [googleField, setGoogleField] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [counts, setCounts] = useState({ c123: null, c12: null, c1: null });

  const [company, setCompany] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  const formRef = useRef(null);
  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const computeCounts = (stats) => {
    const b = stats?.breakdown || {};
    const c1 = b[1] || 0;
    const c12 = c1 + (b[2] || 0);
    const c123 = c12 + (b[3] || 0);
    return { c123, c12, c1 };
  };

  const pullLatest = () => {
    try {
      const raw = sessionStorage.getItem("sb_selected_profile");
      if (raw) {
        const p = JSON.parse(raw);
        setGoogleField([p?.name || "", p?.address || ""].filter(Boolean).join(", "));
        setGoogleUrl(p?.url || "");
      }
      const statsRaw = sessionStorage.getItem("sb_stats");
      if (statsRaw) setCounts(computeCounts(JSON.parse(statsRaw)));
      const opt = sessionStorage.getItem("sb_selected_option");
      if (opt) setOption(opt);
    } catch {}
  };

  useEffect(() => {
    const onStart = (e) => {
      const { name = "", address = "", url = "" } = e.detail || {};
      setGoogleField([name, address].filter(Boolean).join(", "));
      setGoogleUrl(url || "");
    };
    const onOpt = () => {
      const opt = sessionStorage.getItem("sb_selected_option");
      if (opt) setOption(opt);
    };
    const onStats = (e) => {
      setCounts(computeCounts(e.detail));
      try {
        sessionStorage.setItem("sb_stats", JSON.stringify(e.detail));
      } catch {}
    };

    window.addEventListener("sb:simulator-start", onStart);
    window.addEventListener("sb:option-changed", onOpt);
    window.addEventListener("sb:stats", onStats);

    pullLatest();
    return () => {
      window.removeEventListener("sb:simulator-start", onStart);
      window.removeEventListener("sb:option-changed", onOpt);
      window.removeEventListener("sb:stats", onStats);
    };
  }, []);

  const openFormWithBlast = () => {
    pullLatest();
    setBlast(true);
    setTimeout(() => {
      setFormOpen(true);
      setTimeout(scrollToForm, 30);
      setTimeout(() => setBlast(false), 300);
    }, 260);
  };

  useEffect(() => {
    const g = window.google;
    if (!g?.maps?.places || !formGoogleInputRef.current || !formOpen) return;
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
    } catch {}
  }, [formOpen]);

  const onOptionChange = (val) => {
    setOption(val);
    try {
      sessionStorage.setItem("sb_selected_option", val);
    } catch {}
  };

  const fmtCount = (n) => (Number.isFinite(n) ? n.toLocaleString() : "—");

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
      counts,
      submittedAt: new Date().toISOString(),
    };
    try {
      sessionStorage.setItem("sb_checkout_payload", JSON.stringify(payload));
    } catch {}
    router.push("/sign");
  };

  return (
    <main className="shell">
      {/* Seiten-Gradient als eigene Schicht */}
      <div className="page-bg" aria-hidden />

      {/* Live-Simulator */}
      <LiveSimulator />

      {/* CTA Button */}
      {!formOpen && (
        <div className="cta">
          <button
            className={`primary-btn ${blast ? "blast" : ""}`}
            onClick={openFormWithBlast}
          >
            <span className="label">Jetzt loslegen</span>
            <span className="rocket" aria-hidden>
              🚀
            </span>
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
            Bitte alle Felder ausfüllen. Mit <span className="req">*</span> markiert
            = Pflicht.
          </p>
        </header>

        <form className="lead-form" onSubmit={submit}>
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

          {/* Bewertungen */}
          <div className="group">
            <div className="group-title">
              Welche Bewertungen sollen gelöscht werden?{" "}
              <span className="req">*</span>
            </div>
            <div className="checks">
              {[
                ["123", "1–3 ⭐ löschen", counts.c123],
                ["12", "1–2 ⭐ löschen", counts.c12],
                ["1", "1 ⭐ löschen", counts.c1],
                ["custom", "Individuelle Löschungen", null],
              ].map(([val, label, num]) => (
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
                  {num !== null && (
                    <span className="hint">→ {fmtCount(num)} Bewertungen</span>
                  )}
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
              <label>Firmenname *</label>
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
                <label>Vorname *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="field half">
                <label>Nachname *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="row">
              <div className="field half">
                <label>E-Mail *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field half">
                <label>Telefon *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Button */}
          <div className="actions center roomy">
            <button className="submit-btn next" type="submit">
              <span className="label">Weiter</span> <span aria-hidden>➡️</span>
            </button>
          </div>
        </form>
      </section>

      {/* Styles */}
      <style jsx global>{`
        .shell {
          position: relative;
          min-height: 100dvh;
          padding: 0 14px 80px;
        }
        .page-bg {
          position: fixed;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(1200px 600px at 12% 0%, rgba(216,231,219,.95) 0%, rgba(216,231,219,.12) 60%),
            radial-gradient(1400px 700px at 100% 0%, rgba(52,140,255,.42) 0%, rgba(52,140,255,0) 65%),
            linear-gradient(180deg, #f3f9ff 0%, #ffffff 60%, #ffffff 100%);
        }
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
          padding: 16px 28px;
          border-radius: 18px;
          font-weight: 800;
          letter-spacing: 0.2px;
          font-size: 17px;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </main>
  );
}
