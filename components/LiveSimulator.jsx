"use client";
import Script from "next/script";
import { useEffect } from "react";

export default function LiveSimulator() {
  useEffect(() => {
    const el = document.getElementById("company-input");
    if (el) el.classList.add("attention");
    return () => el && el.classList.remove("attention");
  }, []);

  return (
    <>
      {/* Fonts wie Webflow */}
      <Script id="sb-fonts" strategy="beforeInteractive">{`
        (function(){
          var l1=document.createElement('link'); l1.rel='stylesheet';
          l1.href='https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap';
          document.head.appendChild(l1);
          var l2=document.createElement('link'); l2.rel='stylesheet';
          l2.href='https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap';
          document.head.appendChild(l2);
        })();
      `}</Script>

      {/* initAutocomplete vordefinieren */}
      <Script id="sb-init-autocomplete" strategy="beforeInteractive">{`
        (function(){
          window.initAutocomplete = function(){
            try{
              var inp = document.getElementById("company-input");
              if (!inp || !(window.google && google.maps && google.maps.places)) return;

              var hint = document.getElementById("search-hint");
              if (inp && hint){
                inp.addEventListener("input", function(){
                  hint.style.display = inp.value.trim().length>0 ? "none" : "";
                });
              }

              var ac = new google.maps.places.Autocomplete(inp, {
                types:["establishment"], fields:["name","formatted_address","place_id","url"]
              });

              ac.addListener("place_changed", function(){
                var place = ac.getPlace();
                console.log("[SB] place_changed:", place);
                if (!place || !place.name) return;

                // Prefill Event (falls Formular lauscht)
                window.dispatchEvent(new CustomEvent("sb:place-selected", {
                  detail: {
                    name: place.name || "",
                    address: place.formatted_address || "",
                    place_id: place.place_id || "",
                    url: place.url || (place.place_id ? "https://www.google.com/maps/place/?q=place_id:"+place.place_id : "")
                  }
                }));

                if (typeof window.sbFetchData === "function"){
                  window.sbFetchData(place.name, place.formatted_address || "");
                } else {
                  console.warn("[SB] sbFetchData noch nicht bereit.");
                }
              });
            }catch(e){ console.error("initAutocomplete error:", e); }
          };
        })();
      `}</Script>

      {/* Google Maps */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initAutocomplete`}
        strategy="afterInteractive"
      />

      {/* UI */}
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
          <div className="input-wrapper" style={{ position: "relative", display: "inline-block", width: "100%" }}>
            <input
              className="search-box"
              id="company-input"
              type="text"
              placeholder='Dein Unternehmen suchen... – z.B. "Restaurant XY"'
            />
            <p id="search-hint" className="search-hint">
              🚀 Probier’s aus: Such dein Unternehmen und sieh selbst, was passiert.
            </p>

            {/* Optional: manuelle Suchen-Taste (falls User kein Enter macht) */}
            <button
              id="manual-search"
              style={{
                marginTop: 10, display: "inline-flex", gap: 8, alignItems: "center",
                borderRadius: 30, padding: "10px 16px", border: "1px solid #ddd", cursor: "pointer",
                background: "linear-gradient(90deg, #000, #333)", color: "#fff"
              }}
              onClick={()=>{
                const input = document.getElementById("company-input");
                if (!input) return;
                const raw = input.value.trim();
                if (!raw) return;
                const parts = raw.split(",");
                const name = (parts.shift() || "").trim();
                const address = parts.join(",").trim();
                if (typeof window.sbFetchData === "function") {
                  window.sbFetchData(name, address);
                }
              }}
            >
              <span>Jetzt prüfen</span>
            </button>

            <div id="review-output" className="loading-text"></div>
            <div id="simulator" className="simulator-wrapper"></div>

            {/* Spinner rechts im Input */}
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
                display: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Logik */}
      <Script id="sb-simulator-logic" strategy="afterInteractive">{`
        (function(){
          var REVIEW_API = "/api/reviews";
          var PAUSCHAL = 299;

          function q(s,p){ return (p||document).querySelector(s); }
          function fmt1(n){ return Number(n).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1}); }

          // Atmender Placeholder
          function typePlaceholder(el, text, speed){
            var i=0; speed=speed||40; el.setAttribute('placeholder','');
            var id=setInterval(function(){ el.setAttribute('placeholder', text.slice(0, i++)); if(i>text.length) clearInterval(id); }, speed);
            return id;
          }
          function startPlaceholderCycle(el){
            var examples=['Dein Unternehmen suchen...','z.B. Café Sonnenschein, Köln','z.B. Pizzeria Milano, Hannover','Dein Unternehmen suchen...','z.B. Autohaus Schmidt, Hamburg','z.B. Dr. Herrmann, Berlin Mitte'];
            var idx=0, typingId=null;
            function play(){ if(el.classList.contains('user-typing')||document.activeElement===el) return; typingId=typePlaceholder(el, examples[idx], 35); idx=(idx+1)%examples.length; }
            play(); var intervalId=setInterval(play, 5000);
            return function(){ clearInterval(intervalId); if(typingId) clearInterval(typingId); };
          }
          (function attachAttention(){
            var inp=q('#company-input'); if(!inp) return;
            inp.classList.add('attention');
            var stopCycle=startPlaceholderCycle(inp);
            var stopAttention=function(){ inp.classList.add('user-typing'); inp.classList.remove('attention'); stopCycle(); };
            ['focus','keydown','input','paste'].forEach(function(ev){ inp.addEventListener(ev, stopAttention,{once:true}); });
            inp.addEventListener('blur', function(){ if(!inp.value.trim()){ inp.classList.remove('user-typing'); inp.classList.add('attention'); startPlaceholderCycle(inp);} });
          })();

          function computeCurrentVisibility(rating){
            if (rating>=4.8) return 0;
            if (rating>=4.2){ var norm=(4.8-rating)/0.6; return -Math.round(170*Math.sqrt(norm)); }
            var below=Math.round((4.0-rating)*10);
            return -170 - below*3;
          }
          function computeImprovementVisibility(oldRating,newRating){
            if(newRating<=oldRating) return 0;
            var possible=5-oldRating; if(possible<=0) return 0;
            var frac=(newRating-oldRating)/possible;
            return Math.min(200, Math.round(frac*200));
          }

          function render(name, avg, total, breakdown){
            var sim=q("#simulator"); sim.innerHTML="";
            var distHTML=[5,4,3,2,1].map(function(s){
              var count=Number(breakdown[s]||0);
              return s>=4
               ? '<div class="rating-chip positive-chip">'+s+' ⭐ <span>'+count.toLocaleString()+'</span></div>'
               : '<div class="rating-chip negative-chip">⚠️ '+s+' ⭐ <span>'+count.toLocaleString()+'</span></div>';
            }).join("");
            sim.insertAdjacentHTML("beforeend", '<div class="review-row">'+distHTML+'</div>');

            var badCount=(breakdown[1]||0)+(breakdown[2]||0)+(breakdown[3]||0);
            var curVis=computeCurrentVisibility(avg);

            sim.insertAdjacentHTML("beforeend",
              '<div class="rating-block">'
              + '<img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5500b57e679a1940c168_bracket-img.webp" class="line-top" alt="curve">'
              + '<div class="rating-text"><span class="icon">⚠️</span><span class="text">1–3 Sterne: <strong id="bad-count">'+badCount.toLocaleString()+'</strong></span><span class="close">❌</span></div>'
              + '<img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68a03d044d9deabf71840200_line.svg" class="line-bottom" alt="underline"></div>'
            );

            sim.insertAdjacentHTML("beforeend",
              '<div class="review-row stack" style="align-items:flex-center;">'
              + '  <div class="rating-card">'
              + '    <div class="card-header header-current"><span>AKTUELL</span></div>'
              + '    <div class="card-body">'
              + '      <img class="star-icon" style="width:100%;max-width:48px;" src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5709ae0db7541734c589_red-cross.webp" alt="Sterne"/>'
              + '      <div class="before-after-text"><h2 class="rating-value" style="margin:0;"> '+fmt1(avg)+' ⭐ <br/></h2><p class="review-count" style="margin:0;">'+total.toLocaleString()+' Bewertungen</p></div>'
              + '    </div>'
              + '    <p class="visibility-pill"><span style="font-weight:bold !important;"> '+curVis+'% </span> Online-Sichtbarkeit</p>'
              + '  </div>'
              + '  <div class="arrow-icon" style="font-size:28px;font-weight:700;margin:0 6px;"><img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689ec12c6a1613f9c349ca46_yellow-arrow.avif" alt="→"/></div>'
              + '  <div class="rating-card">'
              + '    <div class="card-header header-after"><span>NACH LÖSCHUNG</span></div>'
              + '    <div class="card-body">'
              + '      <img class="star-icon" style="width:100%;max-width:48px;" src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5706192ab7698165e044_green-light.webp" alt="Sterne"/>'
              + '      <div class="before-after-text "><h2 id="h-new" class="rating-value shake" style="margin:0;"></h2><p id="count-new" class="review-count" style="margin:0;"></p></div>'
              + '    </div>'
              + '    <p class="visibility-pill visibility-green" id="vis-new"><span style="font-weight:bold !important;">+0%</span> Online-Sichtbarkeit</p>'
              + '  </div>'
              + '</div>'
            );

            sim.insertAdjacentHTML("beforeend",
              '<div class="rating-container" id="mini-bar">'
              + '  <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689eefe80e54d79546f87a55_lighting-img.webp" alt="⚡" class="lightning">'
              + '  <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f5448c4e3375cddbf3615_circle-cross.webp" alt="Ø" class="star">'
              + '  <span id="mini-old" class="red-text"></span>'
              + '  <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ac2b2c267251dd29ee98db_star-img.svg" alt="★" class="star">'
              + '  <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689f525e7e62421dcab98fbd_Line%2026.svg" alt="→" class="arrow">'
              + '  <span id="mini-new" class="green-text"></span>'
              + '  <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ac2b2c267251dd29ee98db_star-img.svg" alt="★" class="star">'
              + '  <img src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689eefe80e54d79546f87a55_lighting-img.webp" alt="⚡" class="lightning">'
              + '</div>'
            );

            sim.insertAdjacentHTML("beforeend",
              '<p class="option-hint">Wie viele Sterne sollen weg? 👇</p>'
              + '<div class="option-row">'
              + '  <div class="delete-option" id="btn-123" data-rem="1,2,3"><span class="option-title">1–3 ⭐ löschen</span><div class="option-sub"><div>Entfernte: '+((breakdown[1]||0)+(breakdown[2]||0)+(breakdown[3]||0))+'</div><div>Pauschal '+PAUSCHAL+'€</div></div></div>'
              + '  <div class="delete-option" id="btn-12" data-rem="1,2"><span class="option-title">1–2 ⭐ löschen</span><div class="option-sub"><div>Entfernte: '+((breakdown[1]||0)+(breakdown[2]||0))+'</div><div>Pauschal '+PAUSCHAL+'€</div></div></div>'
              + '  <div class="delete-option" id="btn-1" data-rem="1"><span class="option-title">1 ⭐ löschen</span><div class="option-sub"><div>Entfernte: '+(breakdown[1]||0)+'</div><div>Pauschal '+PAUSCHAL+'€</div></div></div>'
              + '</div>'
              + '<div class="remove-unlimited-3">'
              + '  <p class="remove-unlimited-p-2">Lösche <span class="text-span-18">ALLE</span> schlechten Bewertungen für <span class="green-number-2">€299</span></p>'
              + '  <button class="black-white-btn-small jetxt-button-review black-white-btn-mid" id="cta-btn"><span class="jetxt-btn">Jetzt loslegen</span></button>'
              + '</div>'
              + '<div class="note-text"><img style="width:16px;" src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68a00396345c18200df4a5b3_%F0%9F%94%8D.webp" alt="search-icon"> Hinweis: Diese Analyse ist eine Simulation. Reale Löschungen erfolgen nach Prüfung.</div>'
            );

            function apply(removeArr, btn){
              Array.prototype.forEach.call(document.querySelectorAll(".delete-option"), function(b){ b.classList.remove("active"); });
              if (btn) btn.classList.add("active");
              var kept={1:(breakdown[1]||0),2:(breakdown[2]||0),3:(breakdown[3]||0),4:(breakdown[4]||0),5:(breakdown[5]||0)};
              removeArr.forEach(function(s){ kept[s]=0; });
              var removed=removeArr.reduce(function(sum,s){ return sum+(breakdown[s]||0); },0);
              var newTotal=Math.max(0,total-removed)||1;
              var newSum=[1,2,3,4,5].reduce(function(a,s){ return a+(s*(kept[s]||0)); },0);
              var newAvg=newSum/(newTotal||1);

              var hNew=q("#h-new"), cNew=q("#count-new"), visNew=q("#vis-new");
              if (hNew) hNew.textContent="⚡ ⭐ "+fmt1(newAvg);
              if (cNew) cNew.textContent=newTotal.toLocaleString()+" Bewertungen";
              if (visNew) visNew.innerHTML='<span style="font-weight:bold !important;">+'+computeImprovementVisibility(avg,newAvg)+'%</span> Online-Sichtbarkeit';

              var miniOld=q("#mini-old"), miniNew=q("#mini-new");
              if (miniOld) miniOld.textContent=fmt1(avg);
              if (miniNew) miniNew.textContent=fmt1(newAvg);
            }

            document.addEventListener("click", function(e){
              var t=e.target.closest(".delete-option"); if(!t) return;
              var ids=(t.getAttribute("data-rem")||"").split(",").map(function(x){ return Number(x.trim()); });
              apply(ids, t);
            });

            var cta=document.getElementById("cta-btn");
            if (cta){ cta.addEventListener("click", function(){ window.dispatchEvent(new CustomEvent("sb:start-order")); }); }

            // Loader / Countdown
            var loadingStopper=null;
            function setInputSpinner(on){
              var sp = document.getElementById("input-loader");
              if (sp) sp.style.display = on ? "block" : "none";
            }
            function startLoadingCountdown(el, seconds){
              seconds = seconds || 4;
              el.style.display = "";
              el.textContent = "Lade Bewertungen… " + seconds;
              setInputSpinner(true);
              var id = setInterval(function(){
                seconds--;
                if (seconds > 0) el.textContent = "Lade Bewertungen… " + seconds;
                else { el.textContent = "Lade Bewertungen…"; clearInterval(id); }
              }, 1000);
              return function stop(){
                clearInterval(id);
                el.textContent = "";
                setInputSpinner(false);
              };
            }

            // Fetch via Proxy
            function fetchData(name, address){
              var out = q("#review-output");
              var hint = q("#search-hint");
              if (hint) hint.style.display = "none";

              out.scrollIntoView({ behavior: "smooth", block: "center" });

              if (loadingStopper) { loadingStopper(); loadingStopper = null; }
              loadingStopper = startLoadingCountdown(out, 4);

              var url = REVIEW_API + "?name=" + encodeURIComponent(name) + "&address=" + encodeURIComponent(address);
              console.log("[SB] fetch:", url);
              fetch(url, { cache: "no-store" })
                .then(function(r){ console.log("[SB] status:", r.status); return r.json(); })
                .then(function(d){
                  console.log("[SB] data:", d);
                  if (loadingStopper) { loadingStopper(); loadingStopper = null; }
                  out.textContent = "";

                  var avg = (d && typeof d.averageRating === "number") ? d.averageRating : 4.1;
                  var total = (d && typeof d.totalReviews === "number") ? d.totalReviews : 250;
                  var br = (d && d.breakdown) ? d.breakdown : {1:10,2:20,3:30,4:90,5:100};

                  render(name, avg, total, br);

                  // Default 1–3 aktivieren
                  var btn = document.getElementById("btn-123");
                  if (btn) btn.click();

                  // Wenn es Demo war, schreib einen Hinweis
                  if (d && d._fallback){
                    out.textContent = "Hinweis: Demo-Daten (Upstream nicht erreichbar)";
                    setTimeout(()=>{ out.textContent=""; }, 2500);
                  }
                })
                .catch(function(e){
                  console.error("[SB] fetch error:", e);
                  if (loadingStopper) { loadingStopper(); loadingStopper = null; }
                  out.textContent = "Fehler: " + (e && e.message ? e.message : e);
                });
            }

            window.sbFetchData = fetchData;

            (function enableEnterSearch(){
              var input = document.getElementById("company-input");
              if (!input) return;
              input.addEventListener("keydown", function(e){
                if (e.key === "Enter") {
                  var raw = input.value.trim();
                  if (!raw) return;
                  var parts = raw.split(",");
                  var name = (parts.shift() || "").trim();
                  var address = parts.join(",").trim();
                  window.sbFetchData(name, address);
                }
              });
            })();
          })();
      `}</Script>

      {/* CSS global (wie gehabt, leicht gestrafft) */}
      <style jsx global>{`
        @keyframes shake{0%{transform:translateX(0)}5%{transform:translateX(-8px)}10%{transform:translateX(8px)}15%{transform:translateX(-8px)}20%{transform:translateX(8px)}25%{transform:translateX(0)}100%{transform:translateX(0)}}
        .shake{animation:shake 1.5s ease-in-out infinite;opacity:1!important}
        .review-container{font-family:'Poppins',sans-serif;max-width:1207px;margin:auto;padding:80px 10px;border-radius:16px;background:url("https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/689acdb9f72cb41186204eda_stars-rating.webp") center/cover no-repeat}
        .loading-text{color:#010101;margin-top:8px;font-size:18px;font-weight:600;text-align:center}
        .search-hint{font-family:'Poppins',sans-serif;font-size:14px;line-height:1.45;text-align:center;color:rgba(1,1,1,.78);margin-top:8px}
        .section-title{max-width:975px;font-family:'Outfit',sans-serif;color:#010101;font-weight:400!important;margin:0 auto;font-size:48px;line-height:120%;text-align:center}
        .review-card{max-width:755px;margin:40px auto 0;padding:40px;border-radius:8px;background:#fff;box-sizing:border-box}
        .search-box{width:100%;max-width:100%!important;padding:9px 20px;border:1px solid rgba(1,1,1,0.1);border-radius:8px;font-family:Poppins;font-size:18px;line-height:150%;outline:none;box-sizing:border-box}
        .search-box:focus{border-color:#49a84c}
        .search-box::placeholder{color:#878686}
        @keyframes breathe{0%{transform:scale(0.985);box-shadow:0 0 0 rgba(73,168,76,0)}50%{transform:scale(1);box-shadow:0 10px 28px rgba(73,168,76,0.18)}100%{transform:scale(0.985);box-shadow:0 0 0 rgba(73,168,76,0)}}
        .search-box.attention{animation:breathe 2.2s ease-in-out infinite;transition:box-shadow .2s ease,transform .2s ease}
        .search-box:focus,.search-box.user-typing{animation:none!important;box-shadow:0 0 0 2px rgba(73,168,76,0.35)}
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
        .option-hint{text-align:center;font-family:Poppins,sans-serif;font-size:15px;font-weight:500;margin:30px 0 -3px 0;color:#010101}
        .note-text{margin-top:12px;font-family:Poppins;color:#3c3c3c;font-size:16px;font-weight:400;line-height:150%}
        .rating-block{text-align:center;display:flex;flex-direction:column;width:100%;max-width:341px;margin-left:auto;justify-content:end;position:relative;margin-bottom:20px;z-index:2}
        .line-top{width:100%;display:block;margin:0 auto 6px}
        .rating-text{font-family:Outfit,sans-serif;color:#e13121;display:flex;align-items:baseline;justify-content:center;gap:6px;font-size:19px;font-weight:600;line-height:1}
        .rating-text .text,.rating-text #bad-count{font-size:21px;font-weight:800;color:#e13121;display:inline-block;line-height:1}
        .rating-text .icon,.rating-text .close{font-size:16px;color:#FF473F;display:inline-block;line-height:1}
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
        @media (max-width:991px){.review-container{padding:70px 10px}.section-title{max-width:550px;font-size:40px}.review-card{padding:30px 16px}.rating-card{height:auto}}
        @media (max-width:767px){.review-container{padding:50px 10px}.section-title{font-size:36px}.review-card{margin-top:24px;padding:24px 12px}.search-box{font-size:16px}}
        @media (max-width:479px){.review-container{padding:40px 10px;border-radius:12px}.section-title{font-size:32px}.review-card{padding:20px 12px 12px}.search-box{height:46px;padding:0 12px;font-size:16px;max-width:100%!important}}
        @keyframes spin{0%{transform:translateY(-50%) rotate(0)}100%{transform:translateY(-50%) rotate(360deg)}}
      `}</style>
    </>
  );
}
