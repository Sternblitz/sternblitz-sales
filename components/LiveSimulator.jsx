"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

export default function LiveSimulator() {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [loadingText, setLoadingText] = useState("");
  const [data, setData] = useState(null); // { averageRating, totalReviews, breakdown }
  const [error, setError] = useState("");

  // Google Places Autocomplete initialisieren, sobald das Script geladen ist
  const handleGoogleLoaded = () => {
    try {
      if (!window.google || !window.google.maps || !window.google.maps.places) return;
      if (!inputRef.current) return;

      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["establishment"],
        fields: ["name", "formatted_address", "place_id", "url"],
      });

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place || !place.name) return;
        const name = place.name || "";
        const address = place.formatted_address || "";
        setQuery(`${name}${address ? ", " + address : ""}`);
        runFetch(name, address);
      });
    } catch (e) {
      console.error("Autocomplete init error:", e);
    }
  };

  // Laden-Countdown (wie in Webflow)
  const startCountdown = (secs = 4) => {
    let n = secs;
    setLoadingText(`Lade Bewertungen… ${n}`);
    const id = setInterval(() => {
      n -= 1;
      if (n > 0) setLoadingText(`Lade Bewertungen… ${n}`);
      else {
        setLoadingText("Lade Bewertungen…");
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  };

  // Proxy anfragen
  const runFetch = async (name, address) => {
    setError("");
    setData(null);
    const stop = startCountdown(4);
    try {
      const url = `/api/reviews?name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}`;
      console.log("[SB] fetch:", url);
      const res = await fetch(url, { cache: "no-store" });
      console.log("[SB] status:", res.status);
      const json = await res.json().catch(() => null);
      stop();
      setLoadingText("");
      if (!json) throw new Error("Leere Antwort");
      setData({
        averageRating: typeof json.averageRating === "number" ? json.averageRating : 4.1,
        totalReviews: typeof json.totalReviews === "number" ? json.totalReviews : 250,
        breakdown: json.breakdown || { 1: 10, 2: 20, 3: 30, 4: 90, 5: 100 },
        _fallback: json._fallback,
      });
    } catch (e) {
      stop();
      setLoadingText("");
      setError(`Fehler: ${e.message || String(e)}`);
    }
  };

  // Enter-Taste & Button
  const manualSearch = () => {
    if (!query.trim()) return;
    const parts = query.split(",");
    const name = (parts.shift() || "").trim();
    const address = parts.join(",").trim();
    runFetch(name, address);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      manualSearch();
    }
  };

  // kleine „Atmen“-Animation wie bei dir
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.classList.add("attention");
    const stopOnInteract = () => {
      el.classList.add("user-typing");
      el.classList.remove("attention");
    };
    ["focus", "keydown", "input", "paste"].forEach((ev) => el.addEventListener(ev, stopOnInteract, { once: true }));
    return () => {
      ["focus", "keydown", "input", "paste"].forEach((ev) => el.removeEventListener(ev, stopOnInteract));
    };
  }, []);

  // Renderer für Simulator-Karten
  const SimulatorView = () => {
    if (!data) return null;

    const fmt1 = (n) =>
      Number(n).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    const avg = data.averageRating;
    const total = data.totalReviews;
    const breakdown = data.breakdown || {};
    const badCount = (breakdown[1] || 0) + (breakdown[2] || 0) + (breakdown[3] || 0);

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

    const curVis = computeCurrentVisibility(avg);

    // Helper für „Anwenden“-Berechnung
    const apply = (removeArr) => {
      const kept = { 1: breakdown[1] || 0, 2: breakdown[2] || 0, 3: breakdown[3] || 0, 4: breakdown[4] || 0, 5: breakdown[5] || 0 };
      removeArr.forEach((s) => (kept[s] = 0));
      const removed = removeArr.reduce((sum, s) => sum + (breakdown[s] || 0), 0);
      const newTotal = Math.max(0, total - removed) || 1;
      const newSum = [1, 2, 3, 4, 5].reduce((a, s) => a + s * (kept[s] || 0), 0);
      const newAvg = newSum / (newTotal || 1);
      return { newTotal, newAvg };
    };

    const opt123 = apply([1, 2, 3]);

    return (
      <>
        {/* Chips 5..1 */}
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

        {/* 1–3 Sterne Block */}
        <div className="rating-block">
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5500b57e679a1940c168_bracket-img.webp"
            alt="curve line"
            className="line-top"
          />
          <div className="rating-text">
            <span className="icon">⚠️</span>
            <span className="text">
              1–3 Sterne: <strong id="bad-count">{badCount.toLocaleString()}</strong>
            </span>
            <span className="close">❌</span>
          </div>
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68a03d044d9deabf71840200_line.svg"
            alt="underline"
            className="line-bottom"
          />
        </div>

        {/* Karten */}
        <div className="review-row stack" style={{ alignItems: "flex-center" }}>
          <div className="rating-card">
            <div className="card-header header-current">
              <span>AKTUELL</span>
            </div>
            <div className="card-body">
              <img
                className="star-icon"
                style={{ width: "100%", maxWidth: 48 }}
                src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5709ae0db7541734c589_red-cross.webp"
                alt="Sterne"
              />
              <div className="before-after-text">
                <h2 className="rating-value" style={{ margin: 0 }}>
                  {" "}
                  {fmt1(avg)} ⭐ <br />
                </h2>
                <p className="review-count" style={{ margin: 0 }}>
                  {total.toLocaleString()} Bewertungen
                </p>
              </div>
            </div>
            <p className="visibility-pill">
              <span style={{ fontWeight: "bold" }}> {curVis}% </span> Online-Sichtbarkeit
            </p>
          </div>

          <div className="arrow-icon" style={{ fontSize: 28, fontWeight: 700, margin: "0 6px" }}>
            <img
              src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689ec12c6a1613f9c349ca46_yellow-arrow.avif"
              alt="Sterne"
            />
          </div>

          <div className="rating-card">
            <div className="card-header header-after">
              <span>NACH LÖSCHUNG</span>
            </div>
            <div className="card-body">
              <img
                className="star-icon"
                style={{ width: "100%", maxWidth: 48 }}
                src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5706192ab7698165e044_green-light.webp"
                alt="Sterne"
              />
              <div className="before-after-text ">
                <h2 id="h-new" className="rating-value shake" style={{ margin: 0 }}>
                  ⚡ ⭐ {fmt1(opt123.newAvg)}
                </h2>
                <p id="count-new" className="review-count" style={{ margin: 0 }}>
                  {opt123.newTotal.toLocaleString()} Bewertungen
                </p>
              </div>
            </div>
            <p className="visibility-pill visibility-green" id="vis-new">
              <span style={{ fontWeight: "bold" }}>
                +{computeImprovementVisibility(avg, opt123.newAvg)}%
              </span>{" "}
              Online-Sichtbarkeit
            </p>
          </div>
        </div>

        {/* Mini-Leiste */}
        <div className="rating-container" id="mini-bar">
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689eefe80e54d79546f87a55_lighting-img.webp"
            alt="⚡"
            className="lightning"
          />
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5448c4e3375cddbf3615_circle-cross.webp"
            alt="Ø"
            className="star"
          />
          <span id="mini-old" className="red-text">
            {fmt1(avg)}
          </span>
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ac2b2c267251dd29ee98db_star-img.svg"
            alt="★"
            className="star"
          />
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f525e7e62421dcab98fbd_Line%2026.svg"
            alt="→"
            className="arrow"
          />
          <span id="mini-new" className="green-text">
            {fmt1(opt123.newAvg)}
          </span>
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ac2b2c267251dd29ee98db_star-img.svg"
            alt="★"
            className="star"
          />
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689eefe80e54d79546f87a55_lighting-img.webp"
            alt="⚡"
            className="lightning"
          />
        </div>

        {/* Optionen + CTA (funktional später ans Formular) */}
        <p className="option-hint">Wie viele Sterne sollen weg? 👇</p>
        <div className="option-row">
          <div className="delete-option">
            <span className="option-title">1–3 ⭐ löschen</span>
            <div className="option-sub">
              <div>Entfernte: {badCount}</div>
              <div>Pauschal 299€</div>
            </div>
          </div>
          <div className="delete-option">
            <span className="option-title">1–2 ⭐ löschen</span>
            <div className="option-sub">
              <div>Entfernte: {(breakdown[1] || 0) + (breakdown[2] || 0)}</div>
              <div>Pauschal 299€</div>
            </div>
          </div>
          <div className="delete-option">
            <span className="option-title">1 ⭐ löschen</span>
            <div className="option-sub">
              <div>Entfernte: {breakdown[1] || 0}</div>
              <div>Pauschal 299€</div>
            </div>
          </div>
        </div>
        <div className="remove-unlimited-3">
          <p className="remove-unlimited-p-2">
            Lösche <span className="text-span-18">ALLE</span> schlechten Bewertungen für{" "}
            <span className="green-number-2">€299</span>
          </p>
          <button className="black-white-btn-small jetxt-button-review black-white-btn-mid">
            <span className="jetxt-btn">Jetzt loslegen</span>
          </button>
        </div>
        {data._fallback && (
          <div className="loading-text" style={{ marginTop: 8 }}>
            Hinweis: Demo-Daten (Upstream nicht erreichbar)
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {/* Google Maps Script – lädt einmal, danach init in onLoad */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={handleGoogleLoaded}
      />

      <div className="review-container">
        <h3 className="section-title">
          <img
            className="search-icon"
            style={{ marginTop: "-14px" }}
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68a00396345c18200df4a5b3_%F0%9F%94%8D.webp"
            alt="search-icon"
          />
          Live-Simulator: So viele Sterne hättest du ohne Hater.
        </h3>

        <div className="review-card">
          <div style={{ position: "relative", display: "inline-block", width: "100%", maxWidth: 675 }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              className="search-box"
              id="company-input"
              type="text"
              placeholder='Dein Unternehmen suchen... – z.B. "Restaurant XY"'
            />
            <p id="search-hint" className="search-hint" style={{ display: query ? "none" : "" }}>
              🚀 Probier’s aus: Such dein Unternehmen und sieh selbst, was passiert.
            </p>

            <button
              onClick={manualSearch}
              style={{
                marginTop: 10,
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                borderRadius: 30,
                padding: "10px 16px",
                border: "1px solid #ddd",
                cursor: "pointer",
                background: "linear-gradient(90deg, #000, #333)",
                color: "#fff",
              }}
            >
              Jetzt prüfen
            </button>

            {loadingText && <div id="review-output" className="loading-text">{loadingText}</div>}
            {!loadingText && error && <div className="loading-text" style={{ color: "#E1432E" }}>{error}</div>}
            {!loadingText && <div id="simulator" className="simulator-wrapper"><SimulatorView /></div>}
          </div>
        </div>
      </div>

      {/* Styles 1:1 wie zuvor (gekürzt auf das Wichtige) */}
      <style jsx global>{`
        .review-container{font-family:'Poppins',sans-serif;max-width:1207px;margin:auto;padding:80px 10px;border-radius:16px;background:url("https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689acdb9f72cb41186204eda_stars-rating.webp") center/cover no-repeat}
        .section-title{max-width:975px;font-family:'Outfit',sans-serif;color:#010101;font-weight:400!important;margin:0 auto;font-size:48px;line-height:120%;text-align:center}
        .review-card{max-width:755px;margin:40px auto 0;padding:40px;border-radius:8px;background:#fff}
        .search-box{width:100%;max-width:100%;padding:9px 20px;border:1px solid rgba(1,1,1,0.1);border-radius:8px;font-family:Poppins;font-size:18px;line-height:150%;outline:none}
        .search-box:focus{border-color:#49a84c}
        .search-box.attention{animation:breathe 2.2s ease-in-out infinite;transition:box-shadow .2s ease,transform .2s ease}
        .search-box:focus,.search-box.user-typing{animation:none!important;box-shadow:0 0 0 2px rgba(73,168,76,0.35)}
        @keyframes breathe{0%{transform:scale(.985);box-shadow:0 0 0 rgba(73,168,76,0)}50%{transform:scale(1);box-shadow:0 10px 28px rgba(73,168,76,.18)}100%{transform:scale(.985);box-shadow:0 0 0 rgba(73,168,76,0)}}
        .search-hint{font-family:Poppins,sans-serif;font-size:14px;line-height:1.45;text-align:center;color:rgba(1,1,1,.78);margin-top:8px}
        .loading-text{color:#010101;margin-top:8px;font-size:18px;font-weight:600;text-align:center}
        .review-row{display:flex;align-items:center;width:100%;max-width:675px;margin:24px auto 0;justify-content:space-between;gap:31px}
        .rating-chip{height:100%;text-align:center;padding:8px 12px;border-radius:6px;font-size:15px;font-weight:600;white-space:nowrap}
        .positive-chip{background-color:#49A84C1F;color:#49A84C}
        .negative-chip{background-color:#E1432E1F;color:#FF473F}
        .rating-card{overflow:hidden;width:100%;height:174px;max-width:274px;border:1px solid rgba(225,67,46,.12);border-radius:8px}
        .card-header{display:flex;justify-content:center;align-items:center;height:42px;font-size:20px;font-family:Poppins;font-weight:500;color:#fff}
        .header-current{background-color:#E0422F}.header-after{background-color:#49A84C}
        .card-body{display:flex;align-items:center;width:100%;padding:14px;gap:15px}
        .review-count{font-family:Poppins;color:rgba(1,1,1,.7);font-size:14px;font-weight:300;line-height:120%}
        .rating-value{margin:0;opacity:.6;font-family:'Outfit',sans-serif;color:#010101;font-size:27px!important;font-weight:600;line-height:100%}
        .visibility-pill{margin:6px 20px 13px 14px;width:100%;max-width:238px;padding:8px 16px;border-radius:69px;background:rgba(255,71,63,.12);font-family:Outfit;color:#FF473F;font-size:14px;line-height:100%}
        .visibility-green{background:#E8F5E9!important;color:#49A84C!important}
        .rating-block{text-align:center;display:flex;flex-direction:column;width:100%;max-width:341px;margin-left:auto;justify-content:end;position:relative;margin-bottom:20px;z-index:2}
        .line-top{width:100%;display:block;margin:0 auto 6px}
        .rating-text{font-family:Outfit,sans-serif;color:#e13121;display:flex;align-items:baseline;justify-content:center;gap:6px;font-size:19px;font-weight:600;line-height:1}
        .rating-text .text,.rating-text #bad-count{font-size:21px;font-weight:800;color:#e13121;display:inline-block;line-height:1}
        .rating-text .icon,.rating-text .close{font-size:16px;color:#FF473F;display:inline-block;line-height:1}
        .rating-container{display:flex;align-items:center;gap:8px;width:100%;justify-content:center;font-family:'Outfit',sans-serif;font-weight:600;font-size:24px;margin-top:14px}
        .option-hint{text-align:center;font-family:Poppins,sans-serif;font-size:15px;font-weight:500;margin:30px 0 -3px 0;color:#010101}
        .option-row{display:flex;margin-top:24px;gap:20px}
        .delete-option{flex:1 1 0;max-width:232px;padding:16px 16px;text-align:start;border:1px solid #eaf0fe;background:transparent;border-radius:10px;cursor:pointer}
        .remove-unlimited-3{background:#ebf7ee;padding:30px 20px;text-align:center;border-radius:16px;margin:20px auto;max-width:700px}
        .green-number-2{color:#16a34a;font-weight:700}
        .jetxt-button-review{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(90deg,#000,#333);color:#fff;font-size:16px;font-weight:500;padding:11px 7px;border:none;min-width:172px;border-radius:30px;cursor:pointer}
        @media (max-width:767px){.review-container{padding:50px 10px}.section-title{font-size:36px}.review-card{margin-top:24px;padding:24px 12px}.search-box{font-size:16px}}
        @media (max-width:479px){.review-container{padding:40px 10px;border-radius:12px}.section-title{font-size:32px}.review-card{padding:20px 12px 12px}.search-box{height:46px;padding:0 12px;font-size:16px;max-width:100%}}
      `}</style>
    </>
  );
}
