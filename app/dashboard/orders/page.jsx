// app/dashboard/orders/page.jsx
import { supabaseAdmin } from "@/lib/supabaseServer";

// --- kleine Helfer ---
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfYesterday() {
  const d = startOfToday();
  d.setDate(d.getDate() - 1);
  return d;
}
function startOfNDaysAgo(n) {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}
function toISO(d) {
  return new Date(d).toISOString();
}
function fmtDateTime(d) {
  try {
    return new Date(d).toLocaleString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(d ?? "");
  }
}
function chosenLabel(opt) {
  return opt === "123"
    ? "1–3 ⭐ löschen"
    : opt === "12"
    ? "1–2 ⭐ löschen"
    : opt === "1"
    ? "1 ⭐ löschen"
    : "Individuell";
}
function chosenCount(opt, counts) {
  if (!counts) return null;
  if (opt === "123") return counts.c123 ?? null;
  if (opt === "12") return counts.c12 ?? null;
  if (opt === "1") return counts.c1 ?? null;
  return null;
}

export const dynamic = "force-dynamic"; // liest immer frische Daten

export default async function OrdersPage({ searchParams }) {
  const range = (searchParams?.range || "today").toString(); // today|yesterday|7d

  // --- Zeitraum bestimmen ---
  let gte = null;
  let lt = null;
  if (range === "today") {
    gte = startOfToday();
    lt = new Date(gte); lt.setDate(lt.getDate() + 1);
  } else if (range === "yesterday") {
    gte = startOfYesterday();
    lt = startOfToday();
  } else if (range === "7d") {
    gte = startOfNDaysAgo(6); // inkl. heute (7 Tage total)
    lt = new Date(); // jetzt
  } else {
    // fallback: alles (kein Filter)
  }

  // --- Daten lesen ---
  const sb = supabaseAdmin();
  let q = sb.from("leads")
    .select(
      `
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
      pdf_url,
      pdf_path
    `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (gte && lt) {
    q = q.gte("created_at", toISO(gte)).lt("created_at", toISO(lt));
  }

  const { data: rows, error } = await q;

  return (
    <main style={{ maxWidth: 1100, margin: "20px auto", padding: "0 16px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Meine Aufträge</h1>
        <Filters range={range} />
      </header>

      {error ? (
        <div style={alertStyle("error")}>
          <strong>Fehler:</strong>&nbsp;{error.message}
        </div>
      ) : (rows?.length ?? 0) === 0 ? (
        <div style={emptyStyle}>
          <div>Keine Aufträge im gewählten Zeitraum.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((r) => {
            const label = chosenLabel(r.selected_option);
            const count = chosenCount(r.selected_option, r.counts);
            const pdfUrl =
              r.pdf_url || // unser Feld aus der API
              (r.pdf_path ? publicFromPath(r.pdf_path) : null);

            return (
              <article key={r.id} style={cardStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1.2fr) minmax(200px, .9fr) minmax(160px, .8fr) minmax(220px, .9fr)", gap: 14, alignItems: "center" }}>
                  {/* Profil & Firma */}
                  <div>
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>
                      {r.google_profile || "—"}
                    </div>
                    {r.company ? (
                      <div style={{ color: "#64748b", marginTop: 4 }}>
                        {r.company}
                      </div>
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
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={pillBtn("blue")}
                        title="PDF herunterladen"
                      >
                        📄 PDF
                      </a>
                    ) : (
                      <span style={pillBtn("muted")} title="Kein PDF gefunden">—</span>
                    )}

                    {r.google_url ? (
                      <a
                        href={r.google_url}
                        target="_blank"
                        rel="noreferrer"
                        style={pillBtn("ghost")}
                        title="Google-Profil öffnen"
                      >
                        ↗ Profil
                      </a>
                    ) : null}
                  </div>
                </div>

                {/* Kontaktzeile */}
                {(r.first_name || r.last_name || r.email || r.phone) ? (
                  <div style={{ marginTop: 10, color: "#475569" }}>
                    {r.first_name || r.last_name ? (
                      <strong>
                        {r.first_name || ""} {r.last_name || ""}
                      </strong>
                    ) : null}
                    {(r.email || r.phone) ? (
                      <span style={{ marginLeft: 8, color: "#64748b" }}>
                        {r.email ? `· ${r.email}` : ""} {r.phone ? `· ${r.phone}` : ""}
                      </span>
                    ) : null}
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

function Filters({ range }) {
  const Item = ({ href, active, label }) => (
    <a
      href={href}
      style={{
        ...filterPillBase,
        ...(active ? filterPillActive : {}),
      }}
    >
      {label}
    </a>
  );
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Item href="/dashboard/orders?range=today" label="Heute" active={range === "today"} />
      <Item href="/dashboard/orders?range=yesterday" label="Gestern" active={range === "yesterday"} />
      <Item href="/dashboard/orders?range=7d" label="Letzte 7 Tage" active={range === "7d"} />
      <Item href="/dashboard/orders" label="Alle" active={!(range === "today" || range === "yesterday" || range === "7d")} />
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
  return {
    padding: 14,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
  };
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
    return {
      ...base,
      background: "linear-gradient(135deg,#0b6cf2 0%,#3b82f6 100%)",
      color: "#fff",
      boxShadow: "0 6px 18px rgba(11,108,242,.28)",
    };
  }
  if (variant === "ghost") {
    return {
      ...base,
      background: "#f1f5f9",
      color: "#0f172a",
      border: "1px solid #e5e7eb",
    };
  }
  // muted
  return {
    ...base,
    background: "#f8fafc",
    color: "#94a3b8",
    border: "1px solid #e5e7eb",
  };
}

const filterPillBase = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 36,
  padding: "0 12px",
  borderRadius: 999,
  fontWeight: 800,
  color: "#0f172a",
  textDecoration: "none",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
};
const filterPillActive = {
  background: "linear-gradient(135deg,#34d399 0%,#22c55e 100%)",
  color: "#fff",
  border: "1px solid #16a34a",
  boxShadow: "0 6px 18px rgba(34,197,94,.28)",
};

// Falls nur der Storage-Pfad gespeichert ist, hier ggf. deinen Public-Bucket anpassen
function publicFromPath(path) {
  // Beispiel: du nutzt Bucket "contracts" mit Public.
  // Dann hast du meist schon `pdf_url`. Diese Fallback-Funktion nur, falls nur `pdf_path` existiert.
  // Passen, wenn nötig:
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/contracts/${encodeURIComponent(path)}`;
}
