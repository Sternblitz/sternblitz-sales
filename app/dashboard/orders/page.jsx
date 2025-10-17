// app/dashboard/orders/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";

// UI helpers (same behaviour as before)
function fmtDateTime(d) {
  try {
    return new Date(d).toLocaleString("de-DE", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return String(d ?? ""); }
}
function chosenLabel(opt) {
  return opt === "123" ? "1–3 ⭐ löschen"
    : opt === "12" ? "1–2 ⭐ löschen"
    : opt === "1" ? "1 ⭐ löschen"
    : "Individuell";
}
function chosenCount(opt, counts) {
  if (!counts) return null;
  if (opt === "123") return counts.c123 ?? null;
  if (opt === "12")  return counts.c12  ?? null;
  if (opt === "1")   return counts.c1   ?? null;
  return null;
}
function pillBtn(variant) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    height: 38, padding: "0 14px", borderRadius: 999, fontWeight: 800,
    letterSpacing: ".2px", textDecoration: "none", border: "1px solid transparent",
  };
  if (variant === "blue") return {
    ...base, background: "linear-gradient(135deg,#0b6cf2 0%,#3b82f6 100%)",
    color: "#fff", boxShadow: "0 6px 18px rgba(11,108,242,.28)",
  };
  if (variant === "ghost") return {
    ...base, background: "#f1f5f9", color: "#0f172a", border: "1px solid #e5e7eb",
  };
  return { ...base, background: "#f8fafc", color: "#94a3b8", border: "1px solid #e5e7eb" };
}
const filterPillBase = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  height: 36, padding: "0 12px", borderRadius: 999, fontWeight: 800,
  color: "#0f172a", textDecoration: "none", background: "#f8fafc", border: "1px solid #e5e7eb",
};
const filterPillActive = {
  background: "linear-gradient(135deg,#34d399 0%,#22c55e 100%)",
  color: "#fff", border: "1px solid #16a34a", boxShadow: "0 6px 18px rgba(34,197,94,.28)",
};
const cardStyle = {
  padding: 16, borderRadius: 14, border: "1px solid #e5e7eb",
  background: "#fff", boxShadow: "0 10px 24px rgba(2,6,23,.06)",
};
const emptyStyle = {
  padding: 16, borderRadius: 12, border: "1px solid #e5e7eb",
  background: "#fff", color: "#64748b",
};

// if only pdf_path exists and bucket is public
function publicFromPath(path) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/contracts/${encodeURIComponent(path)}`;
}

export default function OrdersPage({ searchParams }) {
  const initialRange = (searchParams?.range || "today").toString(); // SSR param on first load
  const [range, setRange] = useState(initialRange);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  // keep URL in sync when clicking filter pills
  const setRangeAndPush = (r) => {
    setRange(r);
    const url = new URL(window.location.href);
    if (r === "all") url.searchParams.delete("range");
    else url.searchParams.set("range", r);
    history.replaceState(null, "", url.toString());
  };

  useEffect(() => {
    let abort = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = range && range !== "all" ? `?range=${encodeURIComponent(range)}` : "";
        const res = await fetch(`/api/orders/list${qs}`, { cache: "no-store" });
        const json = await res.json();
        if (abort) return;
        if (!res.ok) throw new Error(json?.error || "Fehler beim Laden");
        setRows(json.rows || []);
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    }
    load();
    return () => { abort = true; };
  }, [range]);

  const content = useMemo(() => {
    if (loading) return <div style={emptyStyle}>Lade Aufträge…</div>;
    if (error) {
      return (
        <div style={{
          padding: 14, borderRadius: 12, border: "1px solid #fecaca",
          background: "#fef2f2", color: "#7f1d1d", fontWeight: 700,
        }}>
          <strong>Fehler:</strong>&nbsp;{error}
        </div>
      );
    }
    if (!rows || rows.length === 0) {
      return <div style={emptyStyle}>Keine Aufträge im gewählten Zeitraum.</div>;
    }
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((r) => {
          const label = chosenLabel(r.selected_option);
          const count = chosenCount(r.selected_option, r.counts);
          const pdfUrl = r.pdf_signed_url || (r.pdf_path ? publicFromPath(r.pdf_path) : null);

          return (
            <article key={r.id} style={cardStyle}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "minmax(240px,1.2fr) minmax(200px,.9fr) minmax(160px,.8fr) minmax(220px,.9fr)",
                gap: 14, alignItems: "center"
              }}>
                {/* Profil & Firma */}
                <div>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>
                    {r.google_profile || "—"}
                  </div>
                  {r.company ? (
                    <div style={{ color: "#64748b", marginTop: 4 }}>{r.company}</div>
                  ) : null}
                </div>

                {/* Auswahl */}
                <div>
                  <div style={{ fontWeight: 800 }}>{label}</div>
                  <div style={{ color: "#0b6cf2", fontWeight: 800, marginTop: 2 }}>
                    {Number.isFinite(Number(count)) ? `${Number(count).toLocaleString("de-DE")} Stück` : "—"}
                  </div>
                </div>

                {/* Datum */}
                <div style={{ color: "#334155", fontWeight: 700 }}>
                  {fmtDateTime(r.created_at)}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {pdfUrl ? (
                    <a href={pdfUrl} target="_blank" rel="noreferrer" style={pillBtn("blue")} title="PDF herunterladen">
                      📄 PDF
                    </a>
                  ) : (
                    <span style={pillBtn("muted")} title="Kein PDF gefunden">—</span>
                  )}

                  {r.google_url ? (
                    <a href={r.google_url} target="_blank" rel="noreferrer" style={pillBtn("ghost")} title="Google-Profil öffnen">
                      ↗ Profil
                    </a>
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
    );
  }, [rows, loading, error]);

  return (
    <main style={{ maxWidth: 1100, margin: "20px auto", padding: "0 16px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Meine Aufträge</h1>
        <Filters range={range} setRange={setRangeAndPush} />
      </header>
      {content}
    </main>
  );
}

function Filters({ range, setRange }) {
  const Item = ({ value, label }) => {
    const active = range === value || (value === "all" && !["today","yesterday","7d"].includes(range));
    return (
      <button
        type="button"
        onClick={() => setRange(value)}
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
