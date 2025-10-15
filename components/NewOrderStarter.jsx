"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * NewOrderStarter
 * Props:
 *  - prefill: { name, address, google_profile_url }
 */
export default function NewOrderStarter({ prefill = {} }) {
  // Formularstate
  const [option, setOption] = useState("123"); // "123" | "12" | "1" | "custom"
  const [customCount, setCustomCount] = useState("");
  const [company, setCompany] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Prefill übernehmen (aus props + sessionStorage fallback)
  useEffect(() => {
    try {
      const opt = sessionStorage.getItem("sb_selected_option");
      if (opt) setOption(opt);
      // Firma default = prefill.name (falls sinnvoll)
      if (!company && prefill?.name) setCompany(prefill.name);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.name]);

  const googleProfileText = useMemo(() => {
    const name = prefill?.name || "";
    const addr = prefill?.address || "";
    if (!name && !addr) return prefill?.google_profile_url || "";
    return `${name}${addr ? ", " + addr : ""}`;
  }, [prefill]);

  const onSubmit = async (e) => {
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
      // audit
      submittedAt: new Date().toISOString(),
    };

    try {
      // lokal merken (Debug)
      sessionStorage.setItem("sb_checkout_payload", JSON.stringify(payload));
    } catch {}

    // Backend call
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }
      alert("Top! Deine Anfrage ist eingegangen. (Nächster Schritt: Signatur & PDF)");
    } catch (err) {
      console.error(err);
      alert("Uff – konnte nicht senden. Prüfe Eingaben/Netzwerk und versuch’s nochmal.");
    }
  };

  return (
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
              onChange={() => setOption("123")}
            />
            <span className="mark" /> 1–3 ⭐ löschen
          </label>

          <label className={`choice ${option === "12" ? "on" : ""}`}>
            <input
              type="radio"
              name="delopt"
              value="12"
              checked={option === "12"}
              onChange={() => setOption("12")}
            />
            <span className="mark" /> 1–2 ⭐ löschen
          </label>

          <label className={`choice ${option === "1" ? "on" : ""}`}>
            <input
              type="radio"
              name="delopt"
              value="1"
              checked={option === "1"}
              onChange={() => setOption("1")}
            />
            <span className="mark" /> 1 ⭐ löschen
          </label>

          <label className={`choice ${option === "custom" ? "on" : ""}`}>
            <input
              type="radio"
              name="delopt"
              value="custom"
              checked={option === "custom"}
              onChange={() => setOption("custom")}
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
  );
}
