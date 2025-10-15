"use client";
import { useEffect, useRef } from "react";
import Script from "next/script";

export default function LiveSimulator() {
  const initOnce = useRef(false);

  // Callback für das Inline-Script unten (Reviews + Rendering)
  useEffect(() => {
    // Aktiviert die Placeholder-Atmung beim ersten Mount
    const el = document.getElementById("company-input");
    if (el) el.classList.add("attention");
    return () => el && el.classList.remove("attention");
  }, []);

  // Google Places initialisieren, sobald das Script geladen ist
  const onMapsLoaded = () => {
    if (initOnce.current) return;
    initOnce.current = true;
    if (typeof window.initAutocomplete === "function") {
      window.initAutocomplete();
    }
  };

  return (
    <>
      {/* Google Fonts optional global in app/layout.js laden, hier nicht nötig */}

      {/* Google Maps Places – Key aus ENV */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={onMapsLoaded}
      />

      {/* HTML-Struktur 1:1 */}
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
        </div>
      </div>

      {/* Dein kompletter Simulator-Code als Inline-Script (leicht angepasst):
          - nutzt ENV für REVIEW_API optional (sonst fallback)
          - Buttontext = "Jetzt loslegen"
          - Mobile-Fix für Input (max-width:100%, box-sizing:border-box) */}
      <Script id="sb-simulator-logic" strategy="afterInteractive">{`
        (() => {
          const REVIEW_API = process.env.NEXT_PUBLIC_REVIEW_API || "https://sternblitz-review-simulator-cwnz.vercel.app/api/reviews";
          const PAUSCHAL = 299;

          const q = (s, p = document) => p.querySelector(s);
          const fmt1 = (n) => Number(n).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

          function typePlaceholder(el, text, speed = 40) {
            let i = 0;
            el.setAttribute('placeholder', '');
            const id = setInterval(() => {
              el.setAttribute('placeholder', text.slice(0, i++));
              if (i > text.length) clearInterval(id);
            }, speed);
            return id;
          }

          function startPlaceholderCycle(el) {
            const examples = [
              'Dein Unternehmen suchen...',
              'z.B. Café Sonnenschein, Köln',
              'z.B. Pizzeria Milano, Hannover',
              'Dein Unternehmen suchen...',
              'z.B. Autohaus Schmidt, Hamburg',
              'z.B. Dr. Herrmann, Berlin Mitte',
              'Dein Unternehmen suchen...',
              'z.B. Restaurant El Greco, Nürnberg',
              'z.B. Friseursalon Bella, Düsseldorf',
              'Dein Unternehmen suchen...',
              'z.B. Fitnessstudio FitOne, Stuttgart',
              'z.B. Blumenladen Rose, Leipzig'
            ];
            let idx = 0, typingId = null;
            const play = () => {
              if (el.classList.contains('user-typing') || document.activeElement === el) return;
              typingId = typePlaceholder(el, examples[idx], 35);
              idx = (idx + 1) % examples.length;
            };
            play();
            const intervalId = setInterval(play, 5000);
            return () => { clearInterval(intervalId); if (typingId) clearInterval(typingId); };
          }

          function attachAttentionToSearch() {
            const inp = q('#company-input');
            if (!inp) return () => {};
            inp.classList.add('attention');
            const stopCycle = startPlaceholderCycle(inp);
            const stopAttention = () => {
              inp.classList.add('user-typing');
              inp.classList.remove('attention');
              stopCycle();
            };
            ['focus','keydown','input','paste'].forEach(ev =>
              inp.addEventListener(ev, stopAttention, { once: true })
            );
            inp.addEventListener('blur', () => {
              if (!inp.value.trim()) {
                inp.classList.remove('user-typing');
                inp.classList.add('attention');
                startPlaceholderCycle(inp);
              }
            });
            return stopCycle;
          }

          attachAttentionToSearch();

          function computeCurrentVisibility(rating) {
            if (rating >= 4.8) return 0;
            if (rating >= 4.2) {
              const norm = (4.8 - rating) / 0.6;
              return -Math.round(170 * Math.sqrt(norm));
            }
            const below = Math.round((4.0 - rating) * 10);
            return -170 - below * 3;
          }
          function computeImprovementVisibility(oldRating, newRating) {
            if (newRating <= oldRating) return 0;
            const possible = 5 - oldRating;
            if (possible <= 0) return 0;
            const frac = (newRating - oldRating) / possible;
            return Math.min(200, Math.round(frac * 200));
          }

          function render(name, avg, total, breakdown) {
            const sim = q("#simulator");
            sim.innerHTML = "";

            const distHTML = [5,4,3,2,1].map(s => {
              const count = Number(breakdown[s] || 0);
              return s >= 4
                ? \`<div class="rating-chip positive-chip">\${s} ⭐ <span>\${count.toLocaleString()}</span></div>\`
                : \`<div class="rating-chip negative-chip">⚠️ \${s} ⭐ <span>\${count.toLocaleString()}</span></div>\`;
            }).join("");
            sim.insertAdjacentHTML("beforeend", \`<div class="review-row">\${distHTML}</div>\`);

            const badCount = (breakdown[1]||0)+(breakdown[2]||0)+(breakdown[3]||0);
            const curVis = computeCurrentVisibility(avg);

            sim.insertAdjacentHTML("beforeend", \`
              <div class="rating-block">
                <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5500b57e679a1940c168_bracket-img.webp" alt="curve line" class="line-top">
                <div class="rating-text">
                  <span class="icon">⚠️</span>
                  <span class="text">1–3 Sterne: <strong id="bad-count">\${badCount.toLocaleString()}</strong></span>
                  <span class="close">❌</span>
                </div>
                <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68a03d044d9deabf71840200_line.svg" alt="underline" class="line-bottom">
              </div>
            \`);

            sim.insertAdjacentHTML("beforeend", \`
              <div class="review-row stack" style="align-items:flex-center;">
                <div class="rating-card">
                  <div class="card-header header-current"><span>AKTUELL</span></div>
                  <div class="card-body">
                    <img class="star-icon" style="width:100%; max-width:48px;" src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5709ae0db7541734c589_red-cross.webp" alt="Sterne"/>
                    <div class="before-after-text">
                      <h2 class="rating-value" style="margin:0;"> \${fmt1(avg)} ⭐ <br/></h2>
                      <p class="review-count" style="margin:0;">\${total.toLocaleString()} Bewertungen</p>
                    </div>
                  </div>
                  <p class="visibility-pill"><span style="font-weight:bold !important;"> \${curVis}% </span> Online-Sichtbarkeit</p>
                </div>
                <div class="arrow-icon" style="font-size:28px;font-weight:700;margin:0 6px;">
                  <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689ec12c6a1613f9c349ca46_yellow-arrow.avif" alt="Sterne"/>
                </div>
                <div class="rating-card">
                  <div class="card-header header-after"><span>NACH LÖSCHUNG</span></div>
                  <div class="card-body">
                    <img class="star-icon" style="width:100%; max-width:48px;" src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5706192ab7698165e044_green-light.webp" alt="Sterne"/>
                    <div class="before-after-text ">
                      <h2 id="h-new" class="rating-value shake" style="margin:0;"></h2>
                      <p id="count-new" class="review-count" style="margin:0;"></p>
                    </div>
                  </div>
                  <p class="visibility-pill visibility-green" id="vis-new"><span style="font-weight:bold !important;">+0%</span> Online-Sichtbarkeit</p>
                </div>
              </div>
            \`);

            sim.insertAdjacentHTML("beforeend", \`
              <div class="rating-container" id="mini-bar">
                <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689eefe80e54d79546f87a55_lighting-img.webp" alt="⚡" class="lightning">
                <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5448c4e3375cddbf3615_circle-cross.webp" alt="Ø" class="star">
                <span id="mini-old" class="red-text"></span>
                <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ac2b2c267251dd29ee98db_star-img.svg" alt="★" class="star">
                <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f525e7e62421dcab98fbd_Line%2026.svg" alt="→" class="arrow">
                <span id="mini-new" class="green-text"></span>
                <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ac2b2c267251dd29ee98db_star-img.svg" alt="★" class="star">
                <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689eefe80e54d79546f87a55_lighting-img.webp" alt="⚡" class="lightning">
              </div>
            \`);

            sim.insertAdjacentHTML("beforeend", \`
              <p class="option-hint">Wie viele Sterne sollen weg? 👇</p>
              <div class="option-row">
                <div class="delete-option" id="btn-123" data-rem="1,2,3">
                  <span class="option-title">1–3 ⭐ löschen</span>
                  <div class="option-sub"><div>Entfernte: \${(breakdown[1]||0)+(breakdown[2]||0)+(breakdown[3]||0)}</div><div>Pauschal \${PAUSCHAL}€</div></div>
                </div>
                <div class="delete-option" id="btn-12" data-rem="1,2">
                  <span class="option-title">1–2 ⭐ löschen</span>
                  <div class="option-sub"><div>Entfernte: \${(breakdown[1]||0)+(breakdown[2]||0)}</div><div>Pauschal \${PAUSCHAL}€</div></div>
                </div>
                <div class="delete-option" id="btn-1" data-rem="1">
                  <span class="option-title">1 ⭐ löschen</span>
                  <div class="option-sub"><div>Entfernte: \${(breakdown[1]||0)}</div><div>Pauschal \${PAUSCHAL}€</div></div>
                </div>
              </div>

              <div class="remove-unlimited-3">
                <p class="remove-unlimited-p-2">
                  Lösche <span class="text-span-18">ALLE</span> schlechten Bewertungen für 
                  <span class="green-number-2">€299</span>
                </p>
                <button class="black-white-btn-small jetxt-button-review black-white-btn-mid" id="cta-btn">
                  <span class="jetxt-btn">Jetzt loslegen</span>
                </button>
              </div>

              <div class="note-text">
                <img style="width:16px;" src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68a00396345c18200df4a5b3_%F0%9F%94%8D.webp" alt="search-icon">
                Hinweis: Diese Analyse ist eine Simulation. Reale Löschungen erfolgen nach Prüfung.
              </div>
            \`);

            function apply(removeArr, btn) {
              document.querySelectorAll(".delete-option").forEach(b => b.classList.remove("active"));
              if (btn) btn.classList.add("active");
              const kept = { ...breakdown };
              removeArr.forEach(s => { kept[s] = 0; });

              const removed = removeArr.reduce((sum, s) => sum + (breakdown[s] || 0), 0);
              const newTotal = Math.max(0, total - removed) || 1;
              const newSum = Object.entries(kept).reduce((a, [s, c]) => a + Number(s) * Number(c), 0);
              const newAvg = newSum / (newTotal || 1);

              q("#h-new").textContent = \`⚡ ⭐ \${fmt1(newAvg)}\`;
              q("#count-new").textContent = \`\${newTotal.toLocaleString()} Bewertungen\`;
              q("#vis-new").innerHTML = \`<span style="font-weight:bold !important;">+\${computeImprovementVisibility(avg, newAvg)}%</span> Online-Sichtbarkeit\`;

              const miniOld = q("#mini-old");
              const miniNew = q("#mini-new");
              if (miniOld) miniOld.textContent = fmt1(avg);
              if (miniNew) miniNew.textContent = fmt1(newAvg);
            }

            // Buttons binden
            document.addEventListener("click", (e) => {
              const t = e.target.closest(".delete-option");
              if (!t) return;
              const ids = (t.getAttribute("data-rem")||"").split(",").map(x => Number(x.trim()));
              apply(ids, t);
            });

            // CTA: feuert ein Event, damit das Dashboard den Checkout/Formular öffnen kann
            const ctaBtn = document.getElementById("cta-btn");
            if (ctaBtn) {
              ctaBtn.addEventListener("click", () => {
                window.dispatchEvent(new CustomEvent("sb:start-order"));
              });
            }

            // Loader Anzeige während Fetch
            let loadingStopper = null;
            function startLoadingCountdown(el, duration = 4) {
              let n = duration;
              el.textContent = \`Lade Bewertungen… \${n}\`;
              const id = setInterval(() => {
                n--;
                if (n > 0) el.textContent = \`Lade Bewertungen… \${n}\`;
                else { el.textContent = \`Lade Bewertungen…\`; clearInterval(id); }
              }, 1000);
              return () => { clearInterval(id); el.textContent = ""; };
            }

            function fetchData(name, address) {
              const out = q("#review-output");
              const hint = q("#search-hint");
              if (hint) hint.style.display = "none";

              if (loadingStopper) { loadingStopper(); loadingStopper = null; }
              loadingStopper = startLoadingCountdown(out, 4);

              fetch(\`\${REVIEW_API}?name=\${encodeURIComponent(name)}&address=\${encodeURIComponent(address)}\`)
                .then(r => r.json())
                .then(d => {
                  if (loadingStopper) { loadingStopper(); loadingStopper = null; }
                  out.textContent = "";
                  render(name, d.averageRating, d.totalReviews, d.breakdown);
                })
                .catch(e => {
                  if (loadingStopper) { loadingStopper(); loadingStopper = null; }
                  out.textContent = "Fehler: " + e.message;
                });
            }

            // Google Autocomplete Hook
            window.initAutocomplete = () => {
              const inp = q("#company-input");
              const hint = q("#search-hint");
              if (!inp) return;

              if (inp && hint) {
                inp.addEventListener("input", () => {
                  hint.style.display = inp.value.trim().length > 0 ? "none" : "";
                });
              }

              const ac = new google.maps.places.Autocomplete(inp, {
                types: ["establishment"], fields: ["name", "formatted_address"]
              });
              ac.addListener("place_changed", () => {
                const place = ac.getPlace();
                if (!place?.name) return;
                fetchData(place.name, place.formatted_address || "");
                // Event für Dashboard: vorbefüllte Google-Suchphrase
                window.dispatchEvent(new CustomEvent("sb:place-selected", {
                  detail: { name: place.name, address: place.formatted_address || "" }
                }));
              });
            };
          })();
      `}</Script>

      {/* CSS 1:1 + Mobile-Fixes */}
      <style jsx global>{`
        @keyframes shake{0%{transform:translateX(0)}5%{transform:translateX(-8px)}10%{transform:translateX(8px)}15%{transform:translateX(-8px)}20%{transform:translateX(8px)}25%{transform:translateX(0)}100%{transform:translateX(0)}}
        .shake{animation:shake 1.5s ease-in-out infinite;opacity:1!important}
        .review-container{font-family:'Poppins',sans-serif;max-width:1207px;margin:auto;padding:80px 10px;border-radius:16px;background:url("https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689acdb9f72cb41186204eda_stars-rating.webp") center/cover no-repeat}
        .loading-text{color:#010101;margin-top:8px;font-size:18px;font-weight:600;text-align:center}
        .search-hint{font-family:'Poppins',sans-serif;font-size:14px;line-height:1.45;text-align:center;color:rgba(1,1,1,.78);margin-top:8px}
        @media (max-width:479px){.search-hint{font-size:13px;margin-top:6px}}
        .section-title{max-width:975px;font-family:'Outfit',sans-serif;color:#010101;font-weight:400!important;margin:0 auto;font-size:48px;line-height:120%;text-align:center}
        .review-card{max-width:755px;margin:40px auto 0;padding:40px;border-radius:8px;background:#fff;box-sizing:border-box}
        .search-box{width:100%;max-width:100% !important;padding:9px 20px;border:1px solid rgba(1,1,1,0.1);border-radius:8px;font-family:Poppins;font-size:18px;line-height:150%;outline:none;box-sizing:border-box}
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
        .black-white-btn-mid{background:linear-gradient(103.09deg,#676767 -0.61%,#010101 71.09%);transition:all .4s ease;border-right:1px solid #000000d6 !important;border-left:1px solid #595959 !important;box-shadow:-1px 4px 4px 0px #00000040}
        .black-white-btn-mid .jetxt-btn{transition:all .4s ease}
        .black-white-btn-mid:hover{background:linear-gradient(103.09deg,#ffffff,#cccccc)}
        .black-white-btn-mid:hover .jetxt-btn{color:#000 !important}
        .rating-container{display:flex;align-items:center;gap:8px;width:100%;justify-content:center;font-family:'Outfit',sans-serif;font-weight:600;font-size:24px;margin-top:14px}
        .red-text{color:#E1432E}.green-text{color:#49A84C}
        @media (max-width:991px){.review-container{padding:70px 10px}.section-title{max-width:550px;font-size:40px}.rating-card{height:auto}}
        @media (max-width:767px){.review-container{padding:50px 10px}.section-title{font-size:36px}.review-card{margin-top:24px;padding:24px 12px}.search-box{font-size:16px}}
        @media (max-width:479px){.review-container{padding:40px 10px;border-radius:12px}.section-title{font-size:32px}.review-card{padding:20px 12px 12px}.search-box{height:46px;padding:0 12px;font-size:16px;max-width:100% !important}}
        @media (min-width:992px){.rating-text #bad-count::after{bottom:0px;height:14px;width:120%}.rating-block{margin-bottom:22px}}
        @keyframes spin{0%{transform:translateY(-50%) rotate(0deg)}100%{transform:translateY(-50%) rotate(360deg)}}
      `}</style>
    </>
  );
}
