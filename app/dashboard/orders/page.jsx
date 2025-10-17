// app/dashboard/orders/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ---------- Helpers ----------
function startOfToday() { const d=new Date(); d.setHours(0,0,0,0); return d; }
function startOfYesterday() { const d=startOfToday(); d.setDate(d.getDate()-1); return d; }
function startOfNDaysAgo(n) { const d=startOfToday(); d.setDate(d.getDate()-n); return d; }
function toISO(d) { return new Date(d).toISOString(); }
function fmtDateTime(d) {
  try {
    return new Date(d).toLocaleString("de-DE", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  } catch { return String(d ?? ""); }
}
function chosenLabel(opt) {
  return opt === "123" ? "1–3 ⭐ löschen"
       : opt === "12"  ? "1–2 ⭐ löschen"
       : opt === "1"   ? "1 ⭐ löschen"
       : "Individuell";
}
function chosenCount(opt, counts) {
  const c = counts || {};
  if (opt === "123") return c.c123 ?? null;
  if (opt === "12")  return c.c12  ?? null;
  if (opt === "1")   return c.c1   ?? null;
  return null;
}

// Versucht, eine öffentliche URL aus Supabase für pdf_path zu holen,
// ohne process.env im Client zu verwenden.
async function getPublicUrlForPath(sb, path) {
  try {
    const { data } = sb.storage.from("contracts").getPublicUrl(path);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

export default function OrdersPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const rangeParam = (sp.get("range") || "today").toString(); // today|yesterday|7d|all

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const { gteISO, ltISO } = useMemo(() => {
    let gte = null, lt = null;
    if (rangeParam === "today") {
      gte = startOfToday(); lt = new Date(gte); lt.setDate(lt.getDate()+1);
    } else if (rangeParam === "yesterday") {
      gte = startOfYesterday(); lt = startOfToday();
    } else if (rangeParam === "7d") {
      gte = startOfNDaysAgo(6); lt = new Date();
    }
    return { gteISO: gte ? toISO(gte) : null, ltISO: lt ? toISO(lt) : null };
  }, [rangeParam]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const sb = supabase();

        // 1) eingeloggten User holen
        const { data: authData, error: authErr } = await sb.auth.getUser();
        if (authErr) throw authErr;
        const userId = authData?.user?.id || null;
        if (!userId) {
          setRows([]);
          setErr("Nicht eingeloggt – bitte anmelden.");
          return;
        }

        // 2) eigene Leads laden (mit Zeitfilter, falls gesetzt)
        let query = sb
          .from("leads")
          .select(`
            id,
            created_at,
            google_profile,
            google_url,
            company,
            first_name,
            last_name,
            email,
            phone,
            selected_option,
            counts,
            pdf_path,
            pdf_signed_url
          `)
          .eq("source_account_id", userId)
          .order("created_at", { ascending: false })
          .limit(500);

        if (gteISO && ltISO) query = query.gte("created_at", gteISO).lt("created_at", ltISO);

        const { data, error } = await query;
        if (error) throw error;

        // 3) fehlende PDF-URLs (nur pdf_path vorhanden) clientseitig auflösen
        const withUrls = await Promise.all((data || []).map(async (r) => {
          if (r.pdf_signed_url) return r; // schon vorhanden
          if (r.pdf_path) {
            const url = await getPublicUrlForPath(sb, r.pdf_path);
            return { ...r, pdf_signed_url: url }; // in UI einheitlich als pdf_signed_url nutzen
          }
          return r;
        }));

        if (!cancelled) setRows(withUrls);
      } catch (e) {
        if (!cancelled) setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [rangeParam, gteISO, ltISO]);

  const setRange = (r) => {
    const url = r === "all" ? "/dashboard/orders" : `/dashboard/orders?range=${r}`;
    router.push(url);
  };

  return (
    <main style={{ maxWidth: 1100, margin: "20px auto", padding: "0 16px" }}>
      <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Meine Aufträge</h1>
        <Filters range={rangeParam} onChange={setRange} />
      </header>

      {loading ? (
        <div style={emptyStyle}>Lade…</div>
      ) : err ? (
        <div style={alertStyle("error")}><strong>Fehler:</strong>&nbsp;{err}</div>
      ) : (rows?.length ?? 0) === 0 ? (
        <div style={emptyStyle}>Keine Aufträge im gewählten Zeitraum.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((r) => {
            const label = chosenLabel(r.selected_option);
            const count = chosenCount(r.selected_option, r.counts);
            const pdfUrl = r.pdf_signed_url || null;

            return (
              <article key={r.id} style={cardStyle}>
                <div style={{ display:"grid", gridTemplateColumns:"minmax(240px,1.2fr) minmax(200px,.9fr) minmax(160px,.8fr) minmax(220px,.9fr)", gap:14, alignItems:"center" }}>
                  {/* Profil & Firma */}
                  <div>
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>{r.google_profile || "—"}</div>
                    {r.company ? <div style={{ color: "#64748b", marginTop: 4 }}>{r.company}</div> : null}
                  </div>

                  {/* Auswahl */}
                  <div>
                    <div style={{ fontWeight: 800 }}>{label}</div>
                    <div style={{ color: "#0b6cf2", fontWeight: 800, marginTop: 2 }}>
                      {Number.isFinite(Number(count)) ? `${Number(count).toLocaleString("de-DE")} Stück` : "—"}
                    </div>
                  </div>

                  {/* Datum */}
                  <div style={{ color: "#334155", fontWeight: 700 }}>{fmtDateTime(r.created_at)}</div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {pdfUrl ? (
                      <a href={pdfUrl} target="_blank" rel="noreferrer" style={pillBtn("blue")} title="PDF herunterladen">📄 PDF</a>
                    ) : (
                      <span style={pillBtn("muted")} title="Kein PDF gefunden">—</span>
                    )}
                    {r.google_url ? (
                      <a href={r.google_url} target="_blank" rel="noreferrer" style={pillBtn("ghost")} title="Google-Profil öffnen">↗ Profil</a>
                    ) : null}
                  </div>
                </div>

                {/* Kontaktzeile */}
                {(r.first_name || r.last_name || r.email || r.phone) ? (
                  <div style={{ marginTop: 10, color: "#475569" }}>
                    {(r.first_name || r.last_name) && (
                      <strong>{r.first_name || ""} {r.last_name || ""}</strong>
                    )}
                    {(r.email || r.phone) && (
                      <span style={{ marginLeft: 8, color: "#64748b" }}>
                        {r.email ? `· ${r.email}` : ""} {r.phone ? `· ${r.phone}` : ""}
                      </span>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

// ---------- UI-Teile & Styles ----------
function Filters({ range, onChange }) {
  const Item = ({ value, label }) => {
    const active = range === value || (value === "all" && !["today","yesterday","7d"].includes(range));
    return (
      <button
        type="button"
        onClick={() => onChange(value)}
        style={{ ...filterPillBase, ...(active ? filterPillActive : {}) }}
      >
        {label}
      </button>
    );
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Item value="today" label="Heute" />
      <Item value="yesterday" label="Gestern" />
      <Item value="7d" label="Letzte 7 Tage" />
      <Item value="all" label="Alle" />
    </div>
  );
}

const cardStyle = {
  padding: 16,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  background: "#fff",
  boxShadow: "0 10px 24px rgba(2,6,23,.06)",
};

const emptyStyle = {
  padding: 16,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#64748b",
};

function alertStyle(kind) {
  if (kind === "error") {
    return {
      padding: 14,
      borderRadius: 12,
      border: "1px solid #fecaca",
      background: "#fef2f2",
      color: "#7f1d1d",
      fontWeight: 700,
    };
  }
  return { padding: 14, borderRadius: 12, border: "1px solid #e5e7eb", background: "#f8fafc" };
}

function pillBtn(variant) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    padding: "0 14px",
    borderRadius: 999,
    fontWeight: 800,
    letterSpacing: ".2px",
    textDecoration: "none",
    border: "1px solid transparent",
  };
  if (variant === "blue") {
    return { ...base, background: "linear-gradient(135deg,#0b6cf2 0%,#3b82f6 100%)", color: "#fff", boxShadow: "0 6px 18px rgba(11,108,242,.28)" };
  }
  if (variant === "ghost") {
    return { ...base, background: "#f1f5f9", color: "#0f172a", border: "1px solid #e5e7eb" };
  }
  return { ...base, background: "#f8fafc", color: "#94a3b8", border: "1px solid #e5e7eb" };
}
