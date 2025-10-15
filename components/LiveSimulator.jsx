"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

export default function LiveSimulator() {
  const inputRef = useRef(null);
  const [loadingText, setLoadingText] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  // Google Places initialisieren – genau einmal
  const onGoogleLoad = () => {
    try {
      const g = window.google;
      if (!g?.maps?.places || !inputRef.current) return;
      const ac = new g.maps.places.Autocomplete(inputRef.current, {
        types: ["establishment"],
        fields: ["name", "formatted_address"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place?.name) return;
        fetchReviews(place.name, place.formatted_address || "");
      });
    } catch (e) {
      console.error("Autocomplete init error:", e);
    }
  };

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

  const fetchReviews = async (name, address) => {
    setError("");
    setData(null);
    const stop = startCountdown(4);
    try {
      const res = await fetch(
        `/api/reviews?name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      stop();
      setLoadingText("");
      setData(json && typeof json === "object" ? json : null);
      if (!json) setError("Leere Antwort vom Server.");
    } catch (e) {
      stop();
      setLoadingText("");
      setError(`Fehler: ${e.message || String(e)}`);
    }
  };

  const onEnter = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const raw = inputRef.current?.value || "";
    if (!raw.trim()) return;
    const parts = raw.split(",");
    const name = (parts.shift() || "").trim();
    const address = parts.join(",").trim();
    fetchReviews(name, address);
  };

  // Demo-Renderer – identisch wie zuvor (gekürzt)
  const View = () => {
    if (!data) return null;
    const fmt1 = (n) =>
      Number(n).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    const avg = data.averageRating ?? 4.1;
    const total = data.totalReviews ?? 250;
    const breakdown = data.breakdown ?? { 1: 10, 2: 20, 3: 30, 4: 90, 5: 100 };
    const badCount = (breakdown[1] || 0) + (breakdown[2] || 0) + (breakdown[3] || 0);

    const apply = (removeArr) => {
      const kept = { ...breakdown };
      removeArr.forEach((s) => (kept[s] = 0));
      const removed = removeArr.reduce((s, x) => s + (breakdown[x] || 0), 0);
      const newTotal = Math.max(0, total - removed) || 1;
      const newSum = [1, 2, 3, 4, 5].reduce((a, s) => a + s * (kept[s] || 0), 0);
      const newAvg = newSum / newTotal;
      return { newTotal, newAvg };
    };
    const opt123 = apply([1, 2, 3]);

    return (
      <>
        <div className="review-row">
          {[5, 4, 3, 2, 1].map((s) => {
            const cls = s >= 4 ? "rating-chip positive-chip" : "rating-chip negative-chip";
            return (
              <div className={cls} key={s}>
                {s} ⭐ <span>{Number(breakdown[s] || 0).toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        <div className="rating-block">
          <img
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5500b57e679a1940c168_bracket-img.webp"
            alt=""
            className="line-top"
          />
          <div className="rating-text">
            <span className="icon">⚠️</span>
            <span className="text">
              1–3 Sterne: <strong id="bad-count">{badCount.toLocaleString()}</strong>
            </span>
            <span className="close">❌</span>
          </div>
        </div>

        <div className="review-row stack" style={{ alignItems: "flex-center" }}>
          <div className="rating-card">
            <div className="card-header header-current">AKTUELL</div>
            <div className="card-body">
              <img
                className="star-icon"
                style={{ width: "100%", maxWidth: 48 }}
                src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5709ae0db7541734c589_red-cross.webp"
                alt=""
              />
              <div className="before-after-text">
                <h2 className="rating-value" style={{ margin: 0 }}>
                  {fmt1(avg)} ⭐
                </h2>
                <p className="review-count" style={{ margin: 0 }}>
                  {total.toLocaleString()} Bewertungen
                </p>
              </div>
            </div>
          </div>

          <div className="rating-card">
            <div className="card-header header-after">NACH LÖSCHUNG</div>
            <div className="card-body">
              <img
                className="star-icon"
                style={{ width: "100%", maxWidth: 48 }}
                src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5706192ab7698165e044_green-light.webp"
                alt=""
              />
              <div className="before-after-text">
                <h2 className="rating-value shake" style={{ margin: 0 }}>
                  ⚡ ⭐ {fmt1(opt123.newAvg)}
                </h2>
                <p className="review-count" style={{ margin: 0 }}>
                  {opt123.newTotal.toLocaleString()} Bewertungen
                </p>
              </div>
            </div>
          </div>
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
        <h3 className="section-title">
          <img
            className="search-icon"
            style={{ marginTop: "-14px" }}
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68a00396345c18200df4a5b3_%F0%9F%94%8D.webp"
            alt=""
          />
          Live-Simulator: So viele Sterne hättest du ohne Hater.
        </h3>

        <div className="review-card">
          <div className="input-wrap">
            <input
              ref={inputRef}
              id="company-input"
              type="search"
              inputMode="search"
              placeholder='Dein Unternehmen suchen... – z.B. "Restaurant XY"'
              className="search-box"
              autoComplete="off"
              onKeyDown={onEnter}
            />
            <button className="jetzt-pruefen" onClick={onEnter}>
              Jetzt prüfen
            </button>
          </div>

          {loadingText && <div className="loading-text">{loadingText}</div>}
          {error && !loadingText && (
            <div className="loading-text" style={{ color: "#E1432E" }}>
              {error}
            </div>
          )}
          {!loadingText && <div id="simulator" className="simulator-wrapper">{data && <View />}</div>}
        </div>
      </div>

      {/* ✅ Mobile-sichere Breiten & Box-Sizing */}
      <style jsx global>{`
        .input-wrap{position:relative;display:block;width:100%}
        .search-box{
          width:100%;max-width:100%;
          padding:10px 14px;border:1px solid rgba(1,1,1,.1);border-radius:8px;
          font-family:Poppins;font-size:18px;line-height:1.4;outline:none;
          box-sizing:border-box;
        }
        .jetzt-pruefen{
          margin-top:10px;display:inline-flex;gap:8px;align-items:center;
          border-radius:30px;padding:10px 16px;border:1px solid #ddd;cursor:pointer;
          background:linear-gradient(90deg,#000,#333);color:#fff;font-weight:600;
        }
        @media (max-width:479px){
          .review-card{padding:16px 12px}
          .search-box{font-size:16px;height:46px}
          .jetzt-pruefen{width:100%;justify-content:center}
        }
      `}</style>
    </>
  );
}
