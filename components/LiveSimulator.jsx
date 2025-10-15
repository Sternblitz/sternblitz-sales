"use client";
import { useEffect, useRef } from "react";
import Script from "next/script";

export default function LiveSimulator() {
  const initialized = useRef(false);

  // Init Google Places Autocomplete (wird nach Script-Load aufgerufen)
  const initPlaces = () => {
    if (initialized.current) return;
    const el = document.getElementById("company-input");
    if (!el || !window.google?.maps?.places) return;

    const ac = new window.google.maps.places.Autocomplete(el, {
      fields: ["place_id", "name", "url", "website", "formatted_address", "rating", "user_ratings_total"],
      types: ["establishment"],
      componentRestrictions: { country: ["de", "at", "ch"] }
    });

    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      // Versuche offizielle URL; fallback: Place-ID-URL
      const url =
        place?.url ||
        (place?.place_id ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}` : "");
      // Trigger Custom Event, damit das Dashboard die URL sauber bekommt
      window.dispatchEvent(
        new CustomEvent("sb:place-selected", {
          detail: {
            url,
            name: place?.name || "",
            address: place?.formatted_address || "",
            rating: place?.rating ?? null,
            reviews: place?.user_ratings_total ?? null,
            place_id: place?.place_id || ""
          }
        })
      );
    });

    initialized.current = true;
  };

  useEffect(() => {
    // kleine Attention-Animation
    const el = document.getElementById("company-input");
    if (el) el.classList.add("attention");
    return () => el && el.classList.remove("attention");
  }, []);

  return (
    <>
      {/* Google Places Script (ENV-Key erforderlich) */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={initPlaces}
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
          <div className="input-wrapper" style={{ position: "relative", display: "block", width: "100%" }}>
            <input
              className="search-box"
              id="company-input"
              type="text"
              placeholder='Dein Unternehmen suchen... – z.B. "Restaurant XY"'
            />
            <p id="search-hint" className="search-hint">
              🚀 Probier’s aus: Such dein Unternehmen und sieh selbst, was passiert.
            </p>
            <div id="review-output" className="loading-text"></div>
            <div id="simulator" className="simulator-wrapper"></div>
            <div
              id="input-loader"
              style={{
                position: "absolute",
                top: "50%",
                right: 12,
                transform: "translateY(-50%)",
                width: 18,
                height: 18,
                border: "2px solid #ccc",
                borderTop: "2px solid #4caf50",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                display: "none"
              }}
            />
          </div>
        </div>
      </div>

      {/* Dein CSS 1:1 – plus Mobile-Fixes für das Input-Feld */}
      <style jsx global>{`
        @keyframes shake{0%{transform:translateX(0)}5%{transform:translateX(-8px)}10%{transform:translateX(8px)}15%{transform:translateX(-8px)}20%{transform:translateX(8px)}25%{transform:translateX(0)}100%{transform:translateX(0)}}
        .shake{animation:shake 1.5s ease-in-out infinite;opacity:1!important}
        .review-container{font-family:'Poppins',sans-serif;max-width:1207px;margin:auto;padding:80px 10px;border-radius:16px;background:url("https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689acdb9f72cb41186204eda_stars-rating.webp") center/cover no-repeat}
        .loading-text{color:#010101;margin-top:8px;font-size:18px;font-weight:600;text-align:center}
        .search-hint{font-family:'Poppins',sans-serif;font-size:14px;line-height:1.45;text-align:center;color:rgba(1,1,1,.78);margin-top:8px}
        @media (max-width:479px){.search-hint{font-size:13px;margin-top:6px}}
        .section-title{max-width:975px;font-family:'Outfit',sans-serif;color:#010101;font-weight:400!important;margin:0 auto;font-size:48px;line-height:120%;text-align:center}
        .review-card{max-width:755px;margin:40px auto 0;padding:40px;border-radius:8px;background:#fff;box-sizing:border-box}
        .search-box{
          width:100%;
          max-width:100% !important;   /* 🔒 nie breiter als die Karte */
          padding:9px 20px;
          border:1px solid rgba(1,1,1,0.1);
          border-radius:8px;
          font-family:Poppins;
          font-size:18px;
          line-height:150%;
          outline:none;
          box-sizing:border-box;       /* 🔒 inklusive Padding */
        }
        .search-box:focus{border-color:#49a84c}
        .search-box::placeholder{color:#878686}
        @keyframes breathe{0%{transform:scale(0.985);box-shadow:0 0 0 rgba(73,168,76,0)}50%{transform:scale(1);box-shadow:0 10px 28px rgba(73,168,76,0.18)}100%{transform:scale(0.985);box-shadow:0 0 0 rgba(73,168,76,0)}}
        .search-box.attention{animation:breathe 2.2s ease-in-out infinite;transition:box-shadow .2s ease,transform .2s ease}
        .search-box:focus,.search-box.user-typing{animation:none!important;box-shadow:0 0 0 2px rgba(73,168,76,0.35)}
        @media (prefers-reduced-motion:reduce){.search-box.attention{animation:none}}
        .review-row{display:flex;align-items:center;width:100%;max-width:675px;margin:24px auto 0;justify-content:space-between;gap:31px}
        .rating-chip{height:100%;text-align:center;padding:8px 12px;border-radius:6px;font-size:15px;font-weight:600;white-space:nowrap}
        .positive-chip{background-color:#49A84C1F;color:#49A84C}
        .negative-chip{background-color:#E1432E1F;color:#FF473F}
        .rating-card{overflow:hidden;width:100%;height:174px;max-width:274px;border:1px solid rgba(225,67,46,0.12);border-radius:8px}
        .card-header{display:flex;justify-content:center;align-items:center;height:42px;font-size:20px;font-family:Poppins;font-weight:500;color:#fff}
        .header-current{background-color:#E0422F}
        .header-after{background-color:#49A84C}
        .card-body{display:flex;align-items:center;width:100%;padding:14px;gap:15px}
        .review-count{font-family:Poppins;color:rgba(1,1,1,0.7);font-size:14px;font-weight:300;line-height:120%}
        .rating-value{margin:0;opacity:.6;font-family:'Outfit',sans-serif;color:#010101;font-size:27px!important;font-weight:600;line-height:100%}
        .visibility-pill{margin:6px 20px 13px 14px;width:100%;max-width:238px;padding:8px 16px;border-radius:69px;background:rgba(255,71,63,0.12);font-family:Outfit;color:#FF473F;font-size:14px;line-height:100%}
        .visibility-green{background:#E8F5E9!important;color:#49A84C!important}
        .delete-option{flex:1 1 0;max-width:232px;padding:16px 16px;text-align:start;border:1px solid #eaf0fe;background:transparent;border-radius:10px;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}
        .delete-option:hover{transform:translateY(-1px);box-shadow:0 2px 10px rgba(0,0,0,0.06);border-color:#d6e5ff}
        .delete-option.active{box-shadow:0 0 0 2px rgba(73,168,76,0.25) inset;border-color:#49A84C}
        .option-row{display:flex;margin-top:24px;gap:20px}
        .option-title{margin:0 0 6px 0;font-family:Poppins;color:#0e0e0e;font-size:22px;font-weight:700;line-height:120%}
        .option-sub{margin-top:2px;font-family:Poppins;color:#1a1a1a;line-height:1.35}
        .option-sub div:first-child{font-size:15px;font-weight:800;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:2px;text-decoration-color:rgba(73,168,76,0.55);transition:transform .12s ease}
        .option-sub div:last-child{font-size:12.5px;font-weight:600;color:rgba(0,0,0,0.62);letter-spacing:.1px}
        .delete-option:hover .option-sub div:first-child{transform:scale(1.035)}
        .option-hint{text-align:center;font-family:Poppins,sans-serif;font-size:15px;font-weight:500;margin:30px 0 -3px 0;color:#010101}
        .note-text{margin-top:12px;font-family:Poppins;color:#3c3c3c;font-size:16px;font-weight:400;line-height:150%}
        .rating-block{text-align:center;display:flex;flex-direction:column;width:100%;max-width:341px;margin-left:auto;justify-content:end;position:relative;margin-bottom:20px;z-index:2}
        .line-top{width:100%;display:block;margin:0 auto 6px}
        .rating-text{font-family:Outfit,sans-serif;color:#e13121;display:flex;align-items:baseline;justify-content:center;gap:6px;font-size:19px;font-weight:600;line-height:1}
        .rating-text .text,.rating-text #bad-count{font-size:21px;font-weight:800;color:#e13121;display:inline-block;line-height:1}
        .rating-text .icon,.rating-text .close{font-size:16px;color:#FF473F;display:inline-block;line-height:1}
        .rating-text #bad-count{position:relative;display:inline-block;font-weight:800;line-height:.95;padding-bottom:14px;z-index:3}
        .rating-text #bad-count::after{content:"";position:absolute;left:50%;transform:translateX(-50%);bottom:0;width:120%;height:16px;background:url("https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68a03d044d9deabf71840200_line.svg") no-repeat center/contain;pointer-events:none;z-index:2}
        .line-bottom{display:none!important}
        .remove-unlimited-3{background:#ebf7ee;padding:30px 20px;text-align:center;border-radius:16px;margin:20px auto;max-width:700px}
        .remove-unlimited-p-2{font-family:Poppins;color:rgb(1,1,1);font-size:16px;line-height:100%}
        .text-span-18{font-weight:700;color:#000}
        .green-number-2{color:#16a34a;font-weight:700}
        .jetxt-button-review{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(90deg,#000,#333);color:#fff;font-size:16px;font-weight:500;padding:11px 7px;border:none;min-width:172px;border-radius:30px;cursor:pointer;transition:all .3s ease}
        .jetxt-button-review:hover{background:linear-gradient(90deg,#444,#000);border:1px solid #000}
        .rating-container{display:flex;align-items:center;gap:8px;width:100%;justify-content:center;font-family:'Outfit',sans-serif;font-weight:600;font-size:24px;margin-top:14px}
        .red-text{color:#E1432E}.green-text{color:#49A84C}
        @media (max-width:991px){.review-container{padding:70px 10px}.section-title{max-width:550px;font-size:40px}.rating-card{height:auto}}
        @media (max-width:767px){
          .review-container{padding:50px 10px}
          .section-title{font-size:36px}
          .review-card{margin-top:24px;padding:24px 12px} /* 🔧 weniger Padding mobil */
          .search-box{font-size:16px}
        }
        @media (max-width:479px){
          .review-container{padding:40px 10px;border-radius:12px}
          .section-title{font-size:32px}
          .review-card{padding:20px 12px 12px}
          .search-box{height:46px;padding:0 12px;font-size:16px;max-width:100% !important}
        }
        @media (min-width:992px){.rating-text #bad-count::after{bottom:0px;height:14px;width:120%}.rating-block{margin-bottom:22px}}
        @keyframes spin{0%{transform:translateY(-50%) rotate(0deg)}100%{transform:translateY(-50%) rotate(360deg)}}
      `}</style>
    </>
  );
}
