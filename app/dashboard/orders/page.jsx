// app/dashboard/orders/page.jsx
import { supabaseAdmin } from "@/lib/supabaseServer";
import Link from "next/link";

// Keine SSG/Caches – immer frische Daten
export const revalidate = 0;
export const dynamic = "force-dynamic";

function startEndForRange(range) {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  if (range === "today") {
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
  } else if (range === "yesterday") {
    start = new Date(now); start.setDate(start.getDate()-1); start.setHours(0,0,0,0);
    end   = new Date(start); end.setHours(23,59,59,999);
  } else if (range === "7d") {
    start = new Date(now); start.setDate(start.getDate()-6); start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
  } else {
    start = null; // kein Filter
  }
  return { start, end };
}

function prettyDate(ts) {
  try {
    return new Date(ts).toLocaleString("de-DE");
  } catch {
    return "–";
  }
}

function optionLabel(opt) {
  if (opt === "123") return "1–3 ⭐ löschen";
  if (opt === "12")  return "1–2 ⭐ löschen";
  if (opt === "1")   return "1 ⭐ löschen";
  return "Individuell";
}

export default async function OrdersPage({ searchParams }) {
  const range = (searchParams?.range || "").toLowerCase(); // today | yesterday | 7d | ""
  const { start, end } = startEndForRange(range);

  const sb = supabaseAdmin();

  // Basisselekt – später filtern wir hier per sales_rep/source_account_id/role
  let query = sb
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (start && end) {
    query = query.gte("created_at", start.toISOString())
                 .lte("created_at", end.toISOString());
  }

  const { data: rows, error } = await query;

  return (
    <main style={{maxWidth: "1100px", margin:"0 auto", padding:"18px"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12, marginBottom:12}}>
        <h1 style={{margin:0, fontSize:22}}>Meine Aufträge</h1>

        {/* Filter */}
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          {[
            ["", "Alle"],
            ["today", "Heute"],
            ["yesterday", "Gestern"],
            ["7d", "Letzte 7 Tage"],
          ].map(([val, label]) => (
            <Link
              key={val || "all"}
              href={val ? `?range=${val}` : `/dashboard/orders`}
              style={{
                display:"inline-flex",
                alignItems:"center",
                height:36,
                padding:"0 14px",
                borderRadius:999,
                fontWeight:800,
                letterSpacing:".2px",
                textDecoration:"none",
                border: "1px solid #e5e7eb",
                background: range===val ? "linear-gradient(135deg,#0b6cf2,#3b82f6)" : "#fff",
                color: range===val ? "#fff" : "#111",
                boxShadow: range===val ? "0 6px 18px rgba(11,108,242,.28)" : "0 2px 6px rgba(0,0,0,.04)"
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </header>

      {/* Fehleranzeige */}
      {error ? (
        <div style={{
          border:"1px solid #fee2e2",
          background:"#fff1f2",
          color:"#991b1b",
          padding:"12px 14px",
          borderRadius:12,
          marginTop:10
        }}>
          Fehler beim Laden: {error.message}
        </div>
      ) : null}

      {/* Leerzustand */}
      {!error && (!rows || rows.length === 0) ? (
        <div style={{
          marginTop:16,
          padding:"18px 16px",
          border:"1px dashed #cbd5e1",
          borderRadius:14,
          background:"#fff"
        }}>
          Keine Aufträge im gewählten Zeitraum.
        </div>
      ) : null}

      {/* Liste */}
      <div style={{display:"grid", gridTemplateColumns:"1fr", gap:12, marginTop:12}}>
        {(rows || []).map((r) => {
          const cnts = (r.counts || {}) as any;
          const chosen =
            r.selected_option === "123" ? cnts.c123 :
            r.selected_option === "12"  ? cnts.c12  :
            r.selected_option === "1"   ? cnts.c1   : null;

          return (
            <div key={r.id} style={{
              border:"1px solid #e5e7eb",
              background:"#fff",
              borderRadius:14,
              padding:"14px 16px",
              boxShadow: "0 16px 36px rgba(2,6,23,.06)"
            }}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                <div>
                  <div style={{fontWeight:900, fontSize:16}}>
                    {r.company || `${r.first_name||""} ${r.last_name||""}` || "—"}
                  </div>
                  <div style={{color:"#64748b", fontSize:13}}>
                    {r.first_name || "—"} {r.last_name || ""} · {r.email || "—"} · {r.phone || "—"}
                  </div>
                </div>

                <div style={{color:"#64748b", fontSize:13}}>
                  {prettyDate(r.created_at)}
                </div>
              </div>

              <div style={{marginTop:10, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
                <div style={{border:"1px solid #e5e7eb", borderRadius:12, padding:"10px 12px", background:"#f9fbff"}}>
                  <div style={{fontSize:12, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em", marginBottom:4}}>
                    Google-Profil
                  </div>
                  <div style={{fontWeight:800}}>{r.google_profile || "—"}</div>
                </div>

                <div style={{border:"1px solid #e5e7eb", borderRadius:12, padding:"10px 12px", background:"#fff"}}>
                  <div style={{fontSize:12, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em", marginBottom:4}}>
                    Auswahl
                  </div>
                  <div style={{fontWeight:800}}>
                    {optionLabel(r.selected_option)}{Number.isFinite(chosen) ? ` → ${chosen} Stück` : ""}
                  </div>
                </div>
              </div>

              <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:12}}>
                {r.pdf_url ? (
                  <a
                    href={r.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display:"inline-flex",
                      alignItems:"center",
                      gap:8,
                      height:36,
                      padding:"0 14px",
                      borderRadius:999,
                      background:"linear-gradient(135deg,#22c55e,#16a34a)",
                      color:"#fff",
                      fontWeight:900,
                      textDecoration:"none",
                      boxShadow:"0 8px 22px rgba(34,197,94,.35)"
                    }}
                  >
                    ⬇️ Vertrag (PDF)
                  </a>
                ) : null}

                {r.google_url ? (
                  <a
                    href={r.google_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display:"inline-flex",
                      alignItems:"center",
                      gap:8,
                      height:36,
                      padding:"0 14px",
                      borderRadius:999,
                      background:"#eef5ff",
                      border:"1px solid #dbeafe",
                      color:"#0a58c7",
                      fontWeight:800,
                      textDecoration:"none"
                    }}
                  >
                    ↗ Google-Profil öffnen
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
