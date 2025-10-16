"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LiveSimulator from "../../components/LiveSimulator";

export default function DashboardPage() {
  const router = useRouter();

  const [formOpen, setFormOpen] = useState(false);
  const [blast, setBlast] = useState(false);

  const [option, setOption] = useState("123"); // "123" | "12" | "1" | "custom"

  // Google-Profil (Form-Feld, editierbar)
  const formGoogleInputRef = useRef(null);
  const [googleField, setGoogleField] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");

  // Stats für Labels (vom Simulator)
  const [counts, setCounts] = useState({ c123: null, c12: null, c1: null });

  // Kontaktdaten
  const [company, setCompany] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Individuelle Wünsche
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

  // Session ziehen
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

  // Events vom Simulator (ohne auto-öffnen)
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

  // EIN Button -> frische Daten ziehen, Rakete kurz "fliegen", Formular öffnen
  const openFormWithBlast = () => {
    pullLatest();
    setBlast(true);
    setTimeout(() => {
      setFormOpen(true);
      setTimeout(scrollToForm, 30);
      setTimeout(() => setBlast(false), 300);
    }, 260);
  };

  // Google Places Autocomplete im Formular (bearbeitbar)
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
      counts, // für Prefill der /sign Seite
      submittedAt: new Date().toISOString(),
    };
    try {
      sessionStorage.setItem("sb_checkout_payload", JSON.stringify(payload));
    } catch {}
    // Weiter zur Signatur-Seite (Prefill passiert dort aus sessionStorage)
    router.push("/sign");
  };

  return (
    <main className="shell">
      {/* Live-Simulator */}
      <LiveSimulator />

      {/* EIN Button (schwarz, mit 🚀) */}
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

      {/* Formular-Card auf dem neuen Hintergrund */}
      <section
        ref={formRef}
        className={`drawer ${formOpen ? "open" : ""}`}
        aria-hidden={!formOpen}
      >
        <header className="drawer-head">
          <h2 className="title">Es kann gleich losgehen ✨</h2>
          <p className="sub">
            Bitte alle Felder ausfüllen. Mit <span className="req">*</span>{" "}
            markiert = Pflicht.
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

          {/* Welche Bewertungen sollen gelöscht werden? (+ Live Counts) */}
          <div className="group">
            <div className="group-title">
              Welche Bewertungen sollen gelöscht werden?{" "}
              <span className="req">*</span>
            </div>

            <div className="checks">
              <label className={`choice ${option === "123" ? "on" : ""}`}>
                <input
                  type="radio"
                  name="delopt"
                  value="123"
                  checked={option === "123"}
                  onChange={() => onOptionChange("123")}
                />
                <span className="mark" />
                1–3 ⭐ löschen{" "}
                <span className="hint">→ {fmtCount(counts.c123)} Bewertungen</span>
              </label>

              <label className={`choice ${option === "12" ? "on" : ""}`}>
                <input
                  type="radio"
                  name="delopt"
                  value="12"
                  checked={option === "12"}
                  onChange={() => onOptionChange("12")}
                />
                <span className="mark" />
                1–2 ⭐ löschen{" "}
                <span className="hint">→ {fmtCount(counts.c12)} Bewertungen</span>
              </label>

              <label className={`choice ${option === "1" ? "on" : ""}`}>
                <input
                  type="radio"
                  name="delopt"
                  value="1"
                  checked={option === "1"}
                  onChange={() => onOptionChange("1")}
                />
                <span className="mark" />
                1 ⭐ löschen{" "}
                <span className="hint">→ {fmtCount(counts.c1)} Bewertungen</span>
              </label>

              <label className={`choice ${option === "custom" ? "on" : ""}`}>
                <input
                  type="radio"
                  name="delopt"
                  value="custom"
                  checked={option === "custom"}
                  onChange={() => onOptionChange("custom")}
                />
                <span className="mark" />
                Individuelle Löschungen
              </label>
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

          {/* Weiter-Button (zentriert, Pfeil) */}
          <div className="actions center roomy">
            <button className="submit-btn next" type="submit">
              <span className="label">Weiter</span> <span aria-hidden>➡️</span>
            </button>
          </div>
        </form>
      </section>

      {/* Styles – Hintergrund wie auf der /sign Seite + dezente Card */}
      <style jsx global>{`
        :root{
          --ink:#0f172a;
          --muted:#64748b;
          --line:#e5e7eb;
          --shadow:0 22px 60px rgba(2,6,23,.10);
          --shadow-soft:0 16px 36px rgba(2,6,23,.08);
          --blue:#0b6cf2;
        }
/* 1) Keep the page gradient truly behind everything */
.shell{
  min-height:100dvh;
  padding:0 14px 80px;
  position: relative;
  z-index: 0;            /* allows ::before to sit at -1 */
  background: transparent;
}
.shell::before{
  content:"";
  position: fixed;       /* cover the full viewport */
  inset:0;
  z-index:-1;            /* real back layer */
  pointer-events:none;
  background:
    radial-gradient(1200px 600px at 12% 0%, rgba(216,231,219,.95) 0%, rgba(216,231,219,.12) 60%),
    radial-gradient(1400px 700px at 100% 0%, rgba(52,140,255,.42) 0%, rgba(52,140,255,0) 65%),
    linear-gradient(180deg, #f3f9ff 0%, #ffffff 60%, #ffffff 100%);
}

/* 2) Make the Live-Simulator render on an opaque base (no tinting) */
/* These class names exist in your LiveSimulator code */
.review-container{
  position: relative;
  border-radius: 16px;                 /* keep your rounded box */
  background-color: #fff;              /* <- opaque base under its gradient */
  /* keep the simulator’s own gradient background as-is in its own CSS */
}

/* If the gradient of the simulator sits on a child element instead,
   ensure that child does NOT override the white base to transparent. */
.review-card{
  background-color: transparent;       /* its gradient can stay translucent */
}

/* Optional: add a subtle shadow to separate the simulator panel from the page gradient */
.review-container{
  box-shadow: 0 24px 60px rgba(2,6,23,.10);
}
/* sorgt wieder für die weiße Box hinter dem Input im Live-Simulator */
.review-container {
  position: relative;
  background: #fff;             /* deckt die Fläche wieder weiß ab */
  border-radius: 16px;          /* gleichmäßig rund */
  box-shadow: 0 20px 50px rgba(0,0,0,0.08); /* leicht angehoben */
}

/* optional: falls der Input selbst transparent ist, bleibt er sauber */
.review-container input {
  background: #fff;
}

/* falls der Simulator einen inneren Wrapper nutzt (z. B. .review-card),
   stell sicher, dass der keine Hintergrundfarbe überschreibt */
.review-card {
  background: transparent;
}

        .sb-wrap{max-width:1208px;margin:0 auto;}

        /* EIN Button (schwarz) mit 🚀 – etwas größer */
        .cta{display:flex;justify-content:center;margin-top:18px}
        .primary-btn{
          appearance:none;border:1px solid #0b0b0b;background:#0b0b0b;color:#fff;
          padding:16px 28px;border-radius:18px;font-weight:800;letter-spacing:.2px;font-size:17px;
          box-shadow:0 10px 26px rgba(0,0,0,.2);
          transition:transform .12s, box-shadow .2s, background .2s;
          display:inline-flex;gap:10px;align-items:center;position:relative;overflow:hidden;
          animation:pulseBtn 2.2s ease-in-out infinite;
        }
        .primary-btn:hover{transform:translateY(-1px);background:#111;box-shadow:0 14px 32px rgba(0,0,0,.28)}
        .rocket{display:inline-block;transition:transform .25s ease}
        .primary-btn.blast .rocket{transform:translateY(-18px) translateX(6px) rotate(-12deg) scale(1.08)}
        @keyframes pulseBtn{0%{transform:scale(.995)}50%{transform:scale(1)}100%{transform:scale(.995)}}

        /* Drawer-Card (dezenter) */
        .drawer{
          max-width:920px;
          margin:20px auto 0;
          background: linear-gradient(135deg, rgba(255,255,255,.96) 0%, rgba(255,255,255,.92) 80%);
          backdrop-filter: saturate(1.1) blur(0px);
          border:1px solid rgba(15,23,42,.08);
          border-radius:20px;
          box-shadow: var(--shadow);
          opacity:0; transform: translateY(-6px);
          transition: all .28s ease; pointer-events:none;
        }
        .drawer.open{opacity:1; transform: translateY(0); pointer-events:auto;}

        .drawer-head{text-align:center;padding:22px 22px 0}
        .drawer-head .title{font-family:"Outfit",sans-serif;font-weight:800;font-size:28px;margin:0 0 6px;color:#0f172a}
        .drawer-head .sub{color:#4b5563;font-size:15px;margin:0}

        .lead-form{padding:18px 22px 26px}
        .group{margin-top:18px}
        .group-title{font-family:"Outfit",sans-serif;font-weight:700;font-size:18px;color:#0f172a;margin-bottom:8px}
        .req{color:#e11d48;font-weight:800}

        .profile-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .profile-input{position:relative;flex:1 1 520px;min-width:300px}
        .profile-input input{
          width:100%;height:36px;border-radius:10px;border:1px solid rgba(0,0,0,.12);
          padding:8px 34px 8px 12px;font-size:15px;background:#fff;transition:border-color .16s, box-shadow .16s;
        }
        .profile-input input:focus{border-color:#0b6cf2;box-shadow:0 0 0 3px rgba(11,108,242,.2)}
        .clear-x{
          position:absolute;right:8px;top:50%;transform:translateY(-50%);
          width:22px;height:22px;line-height:20px;border-radius:50%;
          border:1px solid rgba(0,0,0,.15);background:#fff;color:#111;font-size:16px;cursor:pointer;padding:0;
        }
        .profile-link{
          display:inline-flex;align-items:center;height:36px;padding:0 12px;border-radius:10px;
          border:1px solid #dbeafe;background:#eef5ff;color:#0a58c7;font-weight:600;text-decoration:none;white-space:nowrap;
        }
        .profile-link:hover{background:#e4efff}

        .checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:8px}
        .choice{
          display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;border:1px solid #eaf0fe;background:#fff;cursor:pointer;user-select:none;
          font-weight:600;color:#0e0e0e;transition:border-color .14s, box-shadow .14s, transform .05s;
        }
        .choice:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,.06);border-color:#d6e5ff}
        .choice.on{box-shadow:0 0 0 2px rgba(11,108,242,.22) inset;border-color:#0b6cf2;background:#eef5ff}
        .choice input{display:none}
        .choice .mark{width:18px;height:18px;border-radius:4px;border:2px solid #64748b;display:inline-block;position:relative;flex:none}
        .choice.on .mark{border-color:#0b6cf2;background:#eaf3ff}
        .choice.on .mark::after{content:"";position:absolute;inset:3px;background:#0b6cf2;border-radius:2px}
        .choice .hint{margin-left:6px;font-weight:700;font-size:13px;color:#0b6cf2}

        .field{display:flex;flex-direction:column;gap:6px;margin-top:10px}
        .field label{font-weight:600;color:#475569;font-size:13px}
        .field input,.field textarea{
          height:34px;border-radius:10px;border:1px solid rgba(0,0,0,.12);padding:6px 10px;font-size:15px;background:#fff;transition:border-color .16s, box-shadow .16s;
        }
        .field textarea{height:auto}
        .field input:focus,.field textarea:focus{border-color:#0b6cf2;box-shadow:0 0 0 3px rgba(11,108,242,.2)}

        .row{display:flex;gap:12px}
        .half{flex:1}

        .actions{display:flex;justify-content:flex-end;margin-top:6px}
        .actions.center{justify-content:center}
        .actions.roomy{margin-top:22px}

        .submit-btn.next{
          display:inline-flex;align-items:center;gap:10px;padding:14px 22px;border-radius:999px;border:1px solid #16a34a;
          background:linear-gradient(135deg,#34d399 0%,#22c55e 100%);color:#ffffff;font-weight:800;letter-spacing:.2px;
          box-shadow:0 12px 28px rgba(34,197,94,.35);transition:transform .12s, box-shadow .18s, filter .18s;
        }
        .submit-btn.next:hover{transform:translateY(-1px);filter:brightness(1.03);box-shadow:0 16px 36px rgba(34,197,94,.45)}
        .submit-btn.next:active{transform:translateY(0);filter:brightness(.98);box-shadow:0 8px 18px rgba(34,197,94,.35)}
        .submit-btn.next .label{font-size:16px}

        /* Mobile */
        @media (max-width:820px){
          .drawer{margin:16px 0 0;border-radius:16px}
          .checks{grid-template-columns:1fr}
          .row{flex-direction:column}
          .actions{justify-content:stretch}
          .actions.center{justify-content:center}
          .submit-btn.next{width:100%;justify-content:center}
        }
      `}</style>
    </main>
  );
}
