"use client";

import { useEffect, useMemo, useState } from "react";

const RANGE_OPTIONS = [
  { value: "today", label: "Heute" },
  { value: "yesterday", label: "Gestern" },
  { value: "7d", label: "Letzte 7 Tage" },
  { value: "all", label: "Alle" },
];

const OPTION_LABELS = {
  "123": "1–3 Sterne",
  "12": "1–2 Sterne",
  "1": "1 Stern",
};

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return value;
  }
}

function describeOption(selected, counts) {
  if (!selected) return "—";
  const base = OPTION_LABELS[selected] || "Individuell";
  const chosen = counts?.[`c${selected}`];
  const numeric = Number.isFinite(chosen) ? Number(chosen).toLocaleString("de-DE") : null;
  return numeric ? `${base} · ${numeric}` : base;
}

export default function OrdersPage() {
  const [range, setRange] = useState("today");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/orders/list?range=${range}`, {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "Fehler beim Laden der Aufträge");
        }
        if (!active) return;
        setRows(Array.isArray(payload?.rows) ? payload.rows : []);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Unbekannter Fehler");
        setRows([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [range]);

  const rangeLabel = useMemo(() => {
    return RANGE_OPTIONS.find((opt) => opt.value === range)?.label || "Alle";
  }, [range]);

  return (
    <main className="orders-shell">
      <header className="orders-head">
        <div>
          <h1>Aufträge</h1>
          <p className="range-hint">Zeitraum: {rangeLabel}</p>
        </div>
        <label className="range-picker">
          <span>Zeitraum</span>
          <select value={range} onChange={(event) => setRange(event.target.value)}>
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && <p className="orders-error">{error}</p>}

      <div className="orders-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Firma</th>
              <th>Kontakt</th>
              <th>E-Mail</th>
              <th>Telefon</th>
              <th>Auswahl</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="empty">
                  Keine Aufträge im gewählten Zeitraum gefunden.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.created_at)}</td>
                  <td>{row.company || "—"}</td>
                  <td>
                    {[row.first_name, row.last_name].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td>
                    {row.email ? (
                      <a href={`mailto:${row.email}`} className="link">
                        {row.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{row.phone || "—"}</td>
                  <td>{describeOption(row.selected_option, row.counts)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {loading && <div className="orders-loading">Lade…</div>}
      </div>

      <style jsx>{`
        .orders-shell {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 24px;
        }
        .orders-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .orders-head h1 {
          font-size: 24px;
          margin: 0;
        }
        .range-hint {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 14px;
        }
        .range-picker {
          display: flex;
          flex-direction: column;
          font-size: 13px;
          color: #334155;
          gap: 4px;
        }
        .range-picker select {
          min-width: 180px;
          border-radius: 8px;
          border: 1px solid #cbd5f5;
          padding: 6px 10px;
          font-size: 14px;
        }
        .orders-error {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 14px;
        }
        .orders-table-wrap {
          position: relative;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          background: #ffffff;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        thead {
          background: #f8fafc;
        }
        th {
          text-align: left;
          padding: 12px;
          font-size: 13px;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        td {
          padding: 12px;
          font-size: 14px;
          border-top: 1px solid #f1f5f9;
        }
        td.empty {
          text-align: center;
          color: #64748b;
          font-style: italic;
        }
        .link {
          color: #2563eb;
          text-decoration: none;
        }
        .link:hover {
          text-decoration: underline;
        }
        .orders-loading {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 15px;
        }
        @media (max-width: 768px) {
          .orders-shell {
            padding: 18px 12px;
          }
          .orders-table-wrap {
            overflow-x: auto;
          }
          table {
            min-width: 720px;
          }
        }
      `}</style>
    </main>
  );
}
