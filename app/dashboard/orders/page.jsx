"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const RANGE_OPTIONS = [
  { value: "", label: "Gesamte Zeit" },
  { value: "today", label: "Heute" },
  { value: "yesterday", label: "Gestern" },
  { value: "7d", label: "Letzte 7 Tage" },
];

const OPTION_LABELS = {
  "123": "1–3 Bewertungen",
  "12": "1–2 Bewertungen",
  "1": "1 Bewertung",
  custom: "Individuell",
};

function normaliseCounts(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {
      console.warn("counts parse error", e);
    }
  }
  return null;
}

function formatCounts(raw) {
  const counts = normaliseCounts(raw);
  if (!counts) return "—";

  const toNumber = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string" && value.trim() !== "") {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }
    return null;
  };

  const c123 = toNumber(counts.c123 ?? counts["c123"]);
  const c12 = toNumber(counts.c12 ?? counts["c12"]);
  const c1 = toNumber(counts.c1 ?? counts["c1"]);

  const parts = [];
  if (c123 !== null) parts.push(`1–3: ${c123}`);
  if (c12 !== null) parts.push(`1–2: ${c12}`);
  if (c1 !== null) parts.push(`1: ${c1}`);

  return parts.length ? parts.join(" | ") : "—";
}

function formatOption(option) {
  if (!option) return "—";
  return OPTION_LABELS[option] || option;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [range, setRange] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  const loadOrders = useCallback(async (selectedRange = "") => {
    setLoading(true);
    setError(null);
    try {
      const query = selectedRange ? `?range=${encodeURIComponent(selectedRange)}` : "";
      const res = await fetch(`/api/orders/list${query}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Fehler beim Laden");
      }
      setOrders(Array.isArray(json.rows) ? json.rows : []);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
      setError(e?.message || "Unbekannter Fehler");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(range);
  }, [range, loadOrders]);

  const formatDate = useCallback(
    (value) => {
      if (!value) return "—";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "—";
      return dateFormatter.format(date);
    },
    [dateFormatter]
  );

  const handleRangeChange = (event) => {
    setRange(event.target.value);
  };

  const handleRefresh = () => {
    loadOrders(range);
  };

  return (
    <main className="orders-page">
      <div className="hero">
        <div>
          <h1>Meine Aufträge</h1>
          <p className="subtitle">
            Hier findest du alle Aufträge, die über dein Sternblitz-Dashboard erstellt wurden.
          </p>
        </div>
        <div className="controls">
          <label className="range">
            <span>Zeitraum</span>
            <select value={range} onChange={handleRangeChange} aria-label="Zeitraum filtern">
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="refresh"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? "Lädt…" : "Neu laden"}
          </button>
        </div>
      </div>

      <section className="orders-card">
        {error && <div className="error">{error}</div>}

        {!error && (
          <>
            {loading ? (
              <div className="loading">Aufträge werden geladen…</div>
            ) : orders.length === 0 ? (
              <div className="empty">
                <h2>Noch keine Aufträge</h2>
                <p>
                  Sobald du eine Auftragsbestätigung unterschreibst, erscheint sie hier inklusive PDF-Download.
                </p>
              </div>
            ) : (
              <div className="table-wrapper" role="region" aria-live="polite">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Google-Profil</th>
                      <th>Kunde</th>
                      <th>Kontakt</th>
                      <th>Paket</th>
                      <th>Dokument</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const countsLabel = formatCounts(order.counts);
                      const optionLabel = formatOption(order.selected_option);
                      const chosenCount = order.option_chosen_count;
                      const numericChosenCount = Number(chosenCount);
                      const hasChosenCount =
                        chosenCount !== null &&
                        chosenCount !== undefined &&
                        Number.isFinite(numericChosenCount);
                      return (
                        <tr key={order.id}>
                          <td>
                            <span className="primary">{formatDate(order.created_at)}</span>
                          </td>
                          <td>
                            <span className="primary">{order.google_profile || "—"}</span>
                            {order.google_url && (
                              <a
                                href={order.google_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link"
                              >
                                Profil öffnen
                              </a>
                            )}
                          </td>
                          <td>
                            <span className="primary">
                              {[order.first_name, order.last_name].filter(Boolean).join(" ") || "—"}
                            </span>
                            {order.company && <span className="muted">{order.company}</span>}
                          </td>
                          <td>
                            <div className="contact">
                              {order.email && (
                                <a href={`mailto:${order.email}`} className="link">
                                  {order.email}
                                </a>
                              )}
                              {order.phone && (
                                <a href={`tel:${order.phone}`} className="link">
                                  {order.phone}
                                </a>
                              )}
                              {!order.email && !order.phone && <span className="muted">—</span>}
                            </div>
                          </td>
                          <td>
                            <span className="primary">{optionLabel}</span>
                            <span className="muted">{countsLabel}</span>
                            {hasChosenCount && (
                              <span className="muted">Stückzahl: {numericChosenCount}</span>
                            )}
                          </td>
                          <td>
                            {order.pdf_signed_url ? (
                              <a
                                href={order.pdf_signed_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link"
                              >
                                PDF öffnen
                              </a>
                            ) : (
                              <span className="muted">
                                {order.pdf_path ? "Speicherort hinterlegt" : "Noch kein Dokument"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {lastUpdated && (
        <p className="meta">Zuletzt aktualisiert: {formatDate(lastUpdated)}</p>
      )}

      <style jsx>{`
        .orders-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 20px 80px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .hero {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
        }

        h1 {
          font-size: 32px;
          margin: 0 0 4px;
        }

        .subtitle {
          margin: 0;
          color: #64748b;
          font-size: 16px;
        }

        .controls {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .range {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-weight: 600;
          color: #334155;
        }

        select {
          min-width: 170px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid #d0d7e2;
          padding: 0 12px;
          font-size: 14px;
          font-weight: 600;
          background: #ffffff;
          color: #0f172a;
          cursor: pointer;
        }

        .refresh {
          height: 40px;
          padding: 0 18px;
          border-radius: 999px;
          border: none;
          font-weight: 700;
          font-size: 14px;
          background: linear-gradient(135deg, #0b6cf2 0%, #3b82f6 100%);
          color: white;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.25);
        }

        .refresh:disabled {
          cursor: wait;
          opacity: 0.75;
          transform: none;
          box-shadow: none;
        }

        .refresh:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(59, 130, 246, 0.32);
        }

        .orders-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 12px 40px rgba(15, 23, 42, 0.06);
          border: 1px solid rgba(148, 163, 184, 0.18);
          min-height: 240px;
        }

        .loading {
          font-weight: 600;
          color: #475569;
        }

        .empty {
          text-align: center;
          color: #64748b;
        }

        .empty h2 {
          font-size: 22px;
          margin-bottom: 8px;
        }

        .error {
          padding: 14px 16px;
          border-radius: 14px;
          background: rgba(239, 68, 68, 0.1);
          color: #b91c1c;
          font-weight: 600;
        }

        .table-wrapper {
          overflow-x: auto;
          margin: 0 -8px;
          padding: 0 8px;
        }

        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        thead tr {
          background: #f8fafc;
        }

        th {
          text-align: left;
          padding: 14px 16px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          border-bottom: 1px solid #e2e8f0;
        }

        td {
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
          font-size: 15px;
        }

        tbody tr:hover {
          background: rgba(59, 130, 246, 0.04);
        }

        .primary {
          display: block;
          font-weight: 700;
          color: #0f172a;
        }

        .muted {
          display: block;
          font-size: 13px;
          color: #64748b;
          margin-top: 4px;
        }

        .contact {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .link {
          color: #2563eb;
          font-weight: 600;
          text-decoration: none;
        }

        .link:hover {
          text-decoration: underline;
        }

        .meta {
          color: #94a3b8;
          font-size: 13px;
          text-align: right;
        }

        @media (max-width: 900px) {
          .orders-page {
            padding: 24px 16px 64px;
          }

          h1 {
            font-size: 26px;
          }

          th,
          td {
            padding: 12px;
          }
        }

        @media (max-width: 640px) {
          .controls {
            width: 100%;
            justify-content: space-between;
          }

          select {
            min-width: 140px;
          }

          table {
            font-size: 14px;
          }
        }
      `}</style>
    </main>
  );
}
