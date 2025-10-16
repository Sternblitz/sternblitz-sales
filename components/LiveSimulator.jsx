"use client";

import { useRef, useState } from "react";
import Script from "next/script";

export default function LiveSimulator() {
  const inputRef = useRef(null);
  const [loadingText, setLoadingText] = useState("");
  const [data, setData] = useState(null); // { averageRating, totalReviews, breakdown }
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null); // { name, address, url? }
  const [activeOpt, setActiveOpt] = useState("123"); // "123" | "12" | "1"

  // ---------- Google Places ----------
  const onGoogleLoad = () => {
    try {
      const g = window.google;
      if (!g?.maps?.places || !inputRef.current) return;

      const ac = new g.maps.places.Autocomplete(inputRef.current, {
        types: ["establishment"],
        fields: ["name", "formatted_address", "url", "place_id"],
      });

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place?.name) return;

        const name = place.name || "";
        const address = place.formatted_address || "";
        const url = place.url || "";
        const sel = { name, address, url };

        setSelected(sel);
        try { sessionStorage.setItem("sb_selected_profile", JSON.stringify(sel)); } catch {}

        if (inputRef.current) {
          inputRef.current.value = `${name}${address ? ", " + address : ""}`;
        }

        // 👉 KEIN Formular-Open hier! Nur Daten laden + Events
        runFetch(name, address);

        // Optional: wer zuhören möchte (ohne UI zu öffnen)
        try { window.dispatchEvent(new CustomEvent("sb:simulator-start", { detail: sel })); } catch {}
      });
    } catch (e) {
      console.error("Autocomplete init error:", e);
    }
  };

  // ---------- Fetch & Countdown ----------
  const startCountdown = (secs = 4) => {
    let n = secs;
    setLoadingText(`Lade Bewertungen… ${n}`);
    const id = setInterval(() => {
      n -= 1;
      setLoadingText(n > 0 ? `Lade Bewertungen… ${n}` : "Lade Bewertungen…");
      if (n <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  };

  const persistAndBroadcastStats = (stats) => {
    try { sessionStorage.setItem("sb_stats", JSON.stringify(stats)); } catch {}
    try { window.dispatchEvent(new CustomEvent("sb:stats", { detail: stats })); } catch {}
  };

  const runFetch = async (name, address) => {
    setError("");
    setData(null);
    const stop = startCountdown(4);
    try {
      const res = await fetch(
        `/api/reviews?name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => null);
      stop();
      setLoadingText("");
      if (!json) throw new Error("Leere Antwort von der API");

      const averageRating = typeof json.averageRating === "number" ? json.averageRating : 4.1;
      const totalReviews  = typeof json.totalReviews  === "number" ? json.totalReviews  : 250;
      const breakdown     = json.breakdown || { 1: 10, 2: 20, 3: 30, 4: 90, 5: 100 };

      const nextData = { averageRating, totalReviews, breakdown };
      setData(nextData);

      // 👉 Stats für Formular verfügbar machen
      persistAndBroadcastStats({ totalReviews, breakdown });
    } catch (e) {
      stop();
      setLoadingText("");
      setError(`Fehler: ${e.message || String(e)}`);
    }
  };

  // ENTER startet Suche (Fallback ohne Dropdown-Klick) – auch hier: KEIN Formular-Open
  const onKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const raw = inputRef.current?.value || "";
    if (!raw.trim()) return;
    const parts   = raw.split(",");
    const name    = (parts.shift() || "").trim();
    const address = parts.join(",").trim();
    const sel     = { name, address, url: "" };

    setSelected(sel);
    try { sessionStorage.setItem("sb_selected_profile", JSON.stringify(sel)); } catch {}
    runFetch(name, address);

    try { window.dispatchEvent(new CustomEvent("sb:simulator-start", { detail: sel })); } catch {}
  };

  // ---------- UI Helpers ----------
  const fmt1 = (n) =>
    Number(n).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const computeCurrentVisibility = (rating) => {
    if (rating >= 4.8) return 0;
    if (rating >= 4.2) {
      const norm = (4.8 - rating) / 0.6;
      return -Math.round(170 * Math.sqrt(norm));
    }
    const below = Math.round((4.0 - rating) * 10);
    return -170 - below * 3;
  };

  const computeImprovementVisibility = (oldRating, newRating) => {
    if (newRating <= oldRating) return 0;
    const possible = 5 - oldRating;
    if (possible <= 0) return 0;
    const frac = (newRating - oldRating) / possible;
    return Math.min(200, Math.round(frac * 200));
  };

  const reducedStats = (dataObj, opt) => {
    const { totalReviews: total, breakdown } = dataObj;
    const map = { "123": [1, 2, 3], "12": [1, 2], "1": [1] };
    const removeArr = map[opt] || [1, 2, 3];

    const kept = { ...breakdown };
    removeArr.forEach((s) => (kept[s] = 0));

    const removed  = removeArr.reduce((sum, s) => sum + (breakdown[s] || 0), 0);
    const newTotal = Math.max(0, total - removed) || 1;
    const newSum   = [1, 2, 3, 4, 5].reduce((a, s) => a + s * (kept[s] || 0), 0);
    const newAvg   = newSum / newTotal;

    return { newTotal, newAvg, removed };
  };

  const getCounts = () => {
    if (!data?.breakdown) return { c123: 0, c12: 0, c1: 0 };
    const b   = data.breakdown;
    const c1  = b[1] || 0;
    const c12 = c1 + (b[2] || 0);
    const c123= c12 + (b[3] || 0);
    return { c123, c12, c1 };
  };

  const { c123, c12, c1 } = getCounts();

  const selectOption = (opt) => {
    setActiveOpt(opt);
    try { sessionStorage.setItem("sb_selected_option", opt); } catch {}
    try { window.dispatchEvent(new CustomEvent("sb:option-changed", { detail: opt })); } catch {}
  };

  // ---------- Render ----------
  const Cards = () => {
    if (!data) return null;

    const { averageRating: avg, totalReviews: total, breakdown } = data;
    const curVis = computeCurrentVisibility(avg);
    const { newTotal, newAvg } = reducedStats(data, activeOpt);

    return (
      <>
        {/* Sterne-Verteilung */}
        <div className="review-row">
          {[5, 4, 3, 2, 1].map((s) => {
            const count = Number(breakdown[s] || 0).toLocaleString();
            const cls = s >= 4 ? "rating-chip positive-chip" : "rating-chip negative-chip";
            return (
              <div key={s} className={cls}>
                {s} ⭐ <span>{count}</span>
              </div>
            );
          })}
        </div>

        {/* Klammer + 1–3 Summe */}
        <div className="rating-block">
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5500b57e679a1940c168_bracket-img.webp"
            alt="curve line"
            className="line-top"
          />
          <div className="rating-text">
            <span className="icon">⚠️</span>
            <span className="text">
              1–3 Sterne:{" "}
              <strong id="bad-count">
                {((breakdown[1] || 0) + (breakdown[2] || 0) + (breakdown[3] || 0)).toLocaleString()}
              </strong>
            </span>
            <span className="close">❌</span>
          </div>
        </div>

        {/* Karten */}
        <div className="review-row stack" style={{ alignItems: "flex-center" }}>
          <div className="rating-card">
            <div className="card-header header-current"><span>AKTUELL</span></div>
            <div className="card-body">
              <img className="star-icon" style={{ width: "100%", maxWidth: 48 }}
                   src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5709ae0db7541734c589_red-cross.webp" alt="Sterne" />
              <div className="before-after-text">
                <h2 className="rating-value" style={{ margin: 0 }}>{fmt1(avg)} ⭐</h2>
                <p className="review-count" style={{ margin: 0 }}>{total.toLocaleString()} Bewertungen</p>
              </div>
            </div>
            <p className="visibility-pill"><span style={{ fontWeight: 700 }}>{curVis}%</span> Online-Sichtbarkeit</p>
          </div>

          <div className="arrow-icon" style={{ fontSize: 28, fontWeight: 700, margin: "0 6px" }}>
            <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689ec12c6a1613f9c349ca46_yellow-arrow.avif" alt="→" />
          </div>

          <div className="rating-card">
            <div className="card-header header-after"><span>NACH LÖSCHUNG</span></div>
            <div className="card-body">
              <img className="star-icon" style={{ width: "100%", maxWidth: 48 }}
                   src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5706192ab7698165e044_green-light.webp" alt="Sterne" />
              <div className="before-after-text">
                <h2 className="rating-value shake" style={{ margin: 0 }}>⚡ ⭐ {fmt1(newAvg)}</h2>
                <p className="review-count" style={{ margin: 0 }}>{newTotal.toLocaleString()} Bewertungen</p>
              </div>
            </div>
            <p className="visibility-pill visibility-green" id="vis-new">
              <span style={{ fontWeight: 700 }}>
                +{computeImprovementVisibility(avg, newAvg)}%
              </span>{" "}
              Online-Sichtbarkeit
            </p>
          </div>
        </div>

        {/* Optionen */}
        <p className="option-hint">Wie viele Sterne sollen weg? 👇</p>
        <div className="option-row">
          <button
            className={`delete-option ${activeOpt === "123" ? "active" : ""}`}
            onClick={() => selectOption("123")}
            aria-pressed={activeOpt === "123"}
          >
            <span className="option-title">1–3 ⭐ löschen</span>
            <div className="option-sub">
              <div>Entfernte: {getCounts().c123.toLocaleString()}</div>
              <div>Pauschal 299€</div>
            </div>
          </button>

          <button
            className={`delete-option ${activeOpt === "12" ? "active" : ""}`}
            onClick={() => selectOption("12")}
            aria-pressed={activeOpt === "12"}
          >
            <span className="option-title">1–2 ⭐ löschen</span>
            <div className="option-sub">
              <div>Entfernte: {getCounts().c12.toLocaleString()}</div>
              <div>Pauschal 299€</div>
            </div>
          </button>

          <button
            className={`delete-option ${activeOpt === "1" ? "active" : ""}`}
            onClick={() => selectOption("1")}
            aria-pressed={activeOpt === "1"}
          >
            <span className="option-title">1 ⭐ löschen</span>
            <div className="option-sub">
              <div>Entfernte: {getCounts().c1.toLocaleString()}</div>
              <div>Pauschal 299€</div>
            </div>
          </button>
        </div>
      </>
    );
  };

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={onGoogleLoad}
      />

      <div className="review-container">
        {/* ... (dein Style/Markup wie gehabt) ... */}
        <h3 className="section-title">
          <img className="search-icon" style={{ marginTop: "-14px" }}
               src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68a00396345c18200df4a5b3_%F0%9F%94%8D.webp" alt="search-icon" />
          Live-Simulator: So viele Sterne hättest du ohne Hater.
        </h3>

        <div className="review-card">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              id="company-input"
              type="search"
              inputMode="search"
              placeholder='Dein Unternehmen suchen... – z.B. "Restaurant XY"'
              className="search-box attention"
              autoComplete="off"
              onKeyDown={onKeyDown}
            />
          </div>

          {loadingText && <div id="review-output" className="loading-text">{loadingText}</div>}
          {error && !loadingText && (
            <div className="loading-text" style={{ color: "#E1432E" }}>{error}</div>
          )}
          {!loadingText && data && (
            <div id="simulator" className="simulator-wrapper">
              <Cards />
            </div>
          )}
        </div>
      </div>

      {/* deine Styles bleiben identisch; ich habe keine farblichen Änderungen vorgenommen */}
    </>
  );
}
