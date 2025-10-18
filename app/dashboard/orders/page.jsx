"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const RANGE_OPTIONS = [
  { value: "", label: "Gesamt" },
  { value: "today", label: "Heute" },
  { value: "yesterday", label: "Gestern" },
  { value: "7d", label: "Letzte 7 Tage" },
];

const OPTION_LABELS = {
  "123": "1–3 ⭐ löschen",
  "12": "1–2 ⭐ löschen",
  "1": "1 ⭐ löschen",
  custom: "Individuell",
};

const OPTION_SHORT = {
  "123": "1–3 ⭐",
  "12": "1–2 ⭐",
  "1": "1 ⭐",
  custom: "Individuell",
};

function normalizeCounts(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

function optionCount(option, counts) {
  if (!counts) return null;
  if (option === "123") return counts.c123 ?? counts["c123"] ?? null;
  if (option === "12") return counts.c12 ?? counts["c12"] ?? null;
  if (option === "1") return counts.c1 ?? counts["c1"] ?? null;
  return null;
}

function formatCount(n) {
  if (n == null) return "—";
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString("de-DE");
}

function formatCountsSummary(counts) {
  if (!counts) return null;
  const parts = [];
  if (counts.c123 != null) parts.push(`1–3⭐ ${formatCount(counts.c123)}`);
  if (counts.c12 != null) parts.push(`1–2⭐ ${formatCount(counts.c12)}`);
  if (counts.c1 != null) parts.push(`1⭐ ${formatCount(counts.c1)}`);
  return parts.length ? parts.join(" · ") : null;
}

function formatDateParts(iso) {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  const date = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

export default function OrdersPage() {
  const router = useRouter();
  const [range, setRange] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const qs = range ? `?range=${encodeURIComponent(range)}` : "";
      try {
        const res = await fetch(`/api/orders/list${qs}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json().catch(() => ({}));

        if (!active) return;

        if (res.status === 401) {
          setRows([]);
          setError("Bitte erneut einloggen.");
          const redirect = encodeURIComponent("/dashboard/orders");
          router.replace(`/login?redirect=${redirect}`);
          return;
        }

        if (!res.ok) {
          throw new Error(json?.error || `Fehler ${res.status}`);
        }

        setRows(Array.isArray(json?.rows) ? json.rows : []);
      } catch (err) {
        if (!active || controller.signal.aborted) return;
        setRows([]);
        setError(err?.message || "Fehler beim Laden der Aufträge.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [range, refreshToken, router]);

  const stats = useMemo(() => {
    const total = rows.length;
    const byOption = { "123": 0, "12": 0, "1": 0, custom: 0, other: 0 };
    for (const row of rows) {
      const key = row?.selected_option;
      if (key && Object.prototype.hasOwnProperty.call(byOption, key)) {
        byOption[key] += 1;
      } else {
        byOption.other += 1;
      }
    }
    return { total, byOption };
  }, [rows]);

  const triggerRefresh = () => setRefreshToken((v) => v + 1);

  return (
    <main className="orders-shell">
      <header className="orders-head">
        <div>
          <h1>Meine Aufträge</h1>
          <p>Hier findest du alle erstellten Aufträge – gefiltert nach Zeitraum.</p>
        </div>
        <button type="button" className="btn ghost" onClick={triggerRefresh} disabled={loading}>
          {loading ? "Aktualisiere…" : "Aktualisieren"}
        </button>
      </header>

      <section className="filters">
        <span className="label">Zeitraum:</span>
        <div className="chips">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value || "all"}
              type="button"
              className={`chip ${range === opt.value ? "active" : ""}`}
              onClick={() => setRange(opt.value)}
              disabled={loading && range === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="stats">
        <div className="card total">
          <span className="title">Gesamt</span>
          <span className="value">{stats.total.toLocaleString("de-DE")}</span>
        </div>
        {(["123", "12", "1", "custom"]).map((key) => (
          <div key={key} className="card option">
            <span className="title">{OPTION_SHORT[key] || "Sonstige"}</span>
            <span className="value">{stats.byOption[key]?.toLocaleString("de-DE") ?? "0"}</span>
          </div>
        ))}
      </section>

      {error ? <div className="alert error">{error}</div> : null}

      {loading ? (
        <div className="state">Lade Aufträge…</div>
      ) : rows.length === 0 ? (
        <div className="state empty">
          <span className="emoji" aria-hidden>📭</span>
          <p>Noch keine Aufträge im gewählten Zeitraum.</p>
          <p className="hint">Sobald du einen Auftrag einreichst, erscheint er hier automatisch.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Erstellt</th>
                <th>Google-Profil</th>
                <th>Option</th>
                <th>Kundendaten</th>
                <th>Dokumente &amp; Info</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const counts = normalizeCounts(row.counts);
                const amount = optionCount(row.selected_option, counts);
                const summary = formatCountsSummary(counts);
                const { date, time } = formatDateParts(row.created_at);
                const optionLabel = OPTION_LABELS[row.selected_option] || "Unbekannt";
                return (
                  <tr key={row.id || `${row.created_at}-${row.email}`}>
                    <td>
                      <div className="date">{date}</div>
                      <div className="time">{time}</div>
                    </td>
                    <td>
                      <div className="primary">{row.google_profile || "—"}</div>
                      {row.google_url ? (
                        <Link href={row.google_url} target="_blank" rel="noreferrer" className="link">
                          Profil öffnen ↗
                        </Link>
                      ) : null}
                    </td>
                    <td>
                      <div className="primary">{optionLabel}</div>
                      <div className="sub">{amount != null ? `${formatCount(amount)} Bewertungen` : "—"}</div>
                      {summary ? <div className="meta">{summary}</div> : null}
                    </td>
                    <td>
                      <div className="primary">{[row.first_name, row.last_name].filter(Boolean).join(" ") || "—"}</div>
                      {row.company ? <div className="sub">{row.company}</div> : null}
                      <div className="meta">{row.email || "—"}</div>
                      <div className="meta">{row.phone || "—"}</div>
                    </td>
                    <td>
                      {row.pdf_signed_url ? (
                        <Link href={row.pdf_signed_url} target="_blank" rel="noreferrer" className="link">
                          PDF öffnen
                        </Link>
                      ) : (
                        <span className="meta">Kein PDF</span>
                      )}
                      {row.rep_code ? <div className="meta">Rep-Code: {row.rep_code}</div> : null}
                      {row.source_account_id ? (
                        <div className="meta">Vertrieb-ID: {row.source_account_id}</div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .orders-shell {
          max-width: 1100px;
          margin: 0 auto;
          padding: 32px 20px 60px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .orders-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .orders-head h1 {
          font-size: 32px;
          margin-bottom: 4px;
        }
        .orders-head p {
          margin: 0;
          color: #475569;
        }
        .btn.ghost {
          border-radius: 12px;
          border: 1px solid #cbd5f5;
          padding: 10px 18px;
          background: #fff;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn.ghost:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .btn.ghost:not(:disabled):hover {
          border-color: #94a3b8;
          box-shadow: 0 6px 18px rgba(148, 163, 184, 0.2);
        }
        .filters {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px 14px;
        }
        .filters .label {
          font-weight: 700;
          color: #1e293b;
        }
        .chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .chip {
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          padding: 6px 16px;
          background: #fff;
          cursor: pointer;
          font-weight: 600;
          color: #334155;
          transition: all 0.18s ease;
        }
        .chip:hover {
          border-color: rgba(11, 108, 242, 0.4);
          color: #0b6cf2;
        }
        .chip.active {
          background: linear-gradient(135deg, #0b6cf2, #3b82f6);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 10px 24px rgba(59, 130, 246, 0.28);
        }
        .chip:disabled {
          opacity: 0.7;
          cursor: default;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px;
        }
        .card {
          background: #fff;
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
          border: 1px solid rgba(226, 232, 240, 0.8);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .card .title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
        }
        .card .value {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
        }
        .alert.error {
          background: #fee2e2;
          border: 1px solid #fca5a5;
          padding: 14px 16px;
          border-radius: 12px;
          color: #b91c1c;
          font-weight: 600;
        }
        .state {
          background: #fff;
          border-radius: 16px;
          padding: 40px 24px;
          text-align: center;
          color: #475569;
          box-shadow: inset 0 0 0 1px rgba(203, 213, 225, 0.5);
        }
        .state.empty {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
        }
        .state .emoji {
          font-size: 36px;
        }
        .state .hint {
          margin: 0;
          font-size: 14px;
          color: #64748b;
        }
        .table-wrap {
          overflow-x: auto;
          border-radius: 18px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
        }
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
        }
        thead {
          background: #0b6cf2;
          color: #fff;
        }
        th {
          text-align: left;
          padding: 14px 18px;
          font-size: 13px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        tbody tr:nth-child(even) {
          background: rgba(241, 245, 249, 0.4);
        }
        td {
          padding: 16px 18px;
          vertical-align: top;
          font-size: 15px;
          color: #0f172a;
        }
        .primary {
          font-weight: 700;
        }
        .sub {
          color: #1e293b;
          margin-top: 4px;
        }
        .meta {
          color: #64748b;
          font-size: 13px;
          margin-top: 4px;
          word-break: break-word;
        }
        .link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          color: #0b6cf2;
          font-weight: 600;
        }
        .date {
          font-weight: 700;
        }
        .time {
          color: #64748b;
          font-size: 13px;
          margin-top: 4px;
        }
        @media (max-width: 640px) {
          .orders-head {
            flex-direction: column;
            align-items: flex-start;
          }
          .orders-head h1 {
            font-size: 26px;
          }
          .orders-shell {
            padding: 24px 14px 50px;
          }
        }
      `}</style>
    </main>
  );
}
