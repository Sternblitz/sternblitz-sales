"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const RANGE_OPTIONS = [
  { value: "all", label: "Alle" },
  { value: "today", label: "Heute" },
  { value: "yesterday", label: "Gestern" },
  { value: "7d", label: "Letzte 7 Tage" },
];

const OPTION_LABELS = {
  "123": "1–3 Sterne entfernen",
  "12": "1–2 Sterne entfernen",
  "1": "Nur 1-Sterne entfernen",
  custom: "Individuelle Lösung",
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function ensureCounts(raw) {
  if (!raw) return null;
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (value && typeof value === "object" && value.breakdown && typeof value.breakdown === "object") {
    const breakdown = value.breakdown;
    const c1 = Number(breakdown[1] || breakdown["1"] || 0);
    const c2 = Number(breakdown[2] || breakdown["2"] || 0);
    const c3 = Number(breakdown[3] || breakdown["3"] || 0);
    return {
      c1,
      c12: c1 + c2,
      c123: c1 + c2 + c3,
    };
  }
  if (value && typeof value === "object") {
    const c1 = Number(value.c1 ?? value["1"] ?? 0);
    const c12 = Number(value.c12 ?? value["12"] ?? 0);
    const c123 = Number(value.c123 ?? value["123"] ?? value.total ?? 0);
    return { c1, c12, c123 };
  }
  return null;
}

function formatCount(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toLocaleString("de-DE");
}

export default function OrdersPage() {
  const router = useRouter();
  const [range, setRange] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const fetchOrders = useCallback(
    async (selectedRange, signal) => {
      setLoading(true);
      setError(null);
      const params = selectedRange && selectedRange !== "all" ? `?range=${selectedRange}` : "";
      try {
        const res = await fetch(`/api/orders/list${params}`, {
          cache: "no-store",
          credentials: "include",
          signal,
        });
        if (signal?.aborted) return;
        if (res.status === 401) {
          const redirectTarget = encodeURIComponent("/dashboard/orders");
          router.replace(`/login?redirect=${redirectTarget}`);
          setRows([]);
          return;
        }
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body?.error || "Unbekannter Fehler beim Laden der Aufträge");
        }
        const nextRows = Array.isArray(body?.rows) ? body.rows : [];
        setRows(nextRows);
      } catch (e) {
        if (signal?.aborted) return;
        setRows([]);
        setError(e?.message || "Aufträge konnten nicht geladen werden.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchOrders(range, controller.signal);
    return () => controller.abort();
  }, [fetchOrders, range]);

  const headline = useMemo(() => {
    const active = RANGE_OPTIONS.find((opt) => opt.value === range);
    return active ? `Zeitraum: ${active.label}` : "Zeitraum";
  }, [range]);

  return (
    <main className="orders-shell">
      <div className="orders-header">
        <div>
          <h1>Meine Aufträge</h1>
          <p>{headline}</p>
        </div>
        <div className="range-switcher" role="group" aria-label="Zeitraum filtern">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`range-btn ${range === opt.value ? "active" : ""}`}
              onClick={() => setRange(opt.value)}
              disabled={loading && range === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="state state-error">{error}</div>}
      {!error && loading && <div className="state state-loading">Lade Aufträge …</div>}
      {!error && !loading && rows.length === 0 && (
        <div className="state state-empty">Keine Aufträge im ausgewählten Zeitraum.</div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Erstellt</th>
                <th>Google-Profil</th>
                <th>Kundendaten</th>
                <th>Paket</th>
                <th>1–3 Sterne</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const counts = ensureCounts(row.counts);
                const optionLabel = OPTION_LABELS[row.selected_option] || row.selected_option || "—";
                return (
                  <tr key={row.id}>
                    <td>{formatDate(row.created_at)}</td>
                    <td>
                      <div className="cell-primary">{row.google_profile || row.company || "—"}</div>
                      {row.google_url && (
                        <a className="cell-link" href={row.google_url} target="_blank" rel="noreferrer">
                          Profil öffnen ↗
                        </a>
                      )}
                    </td>
                    <td>
                      <div className="cell-primary">{[row.first_name, row.last_name].filter(Boolean).join(" ") || "—"}</div>
                      {row.company && <div className="cell-sub">{row.company}</div>}
                      <div className="cell-sub">{row.email || "—"}</div>
                      <div className="cell-sub">{row.phone || "—"}</div>
                    </td>
                    <td>{optionLabel}</td>
                    <td>
                      <div className="count-chip"><span>1★</span> {formatCount(counts?.c1)}</div>
                      <div className="count-chip"><span>1–2★</span> {formatCount(counts?.c12)}</div>
                      <div className="count-chip"><span>1–3★</span> {formatCount(counts?.c123)}</div>
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
        .orders-header {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .orders-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
        }
        .orders-header p {
          margin: 4px 0 0;
          color: #475569;
          font-size: 15px;
        }
        .range-switcher {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .range-btn {
          border: 1px solid #d0d7e2;
          background: #f8fafc;
          color: #0f172a;
          padding: 8px 14px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .range-btn:hover {
          background: #e2e8f0;
        }
        .range-btn.active {
          background: linear-gradient(135deg, #0b6cf2, #3b82f6);
          border-color: rgba(11, 108, 242, 0.4);
          color: #fff;
          box-shadow: 0 8px 18px rgba(11, 108, 242, 0.25);
        }
        .range-btn:disabled {
          opacity: 0.7;
          cursor: default;
        }
        .state {
          border-radius: 12px;
          padding: 18px 20px;
          font-size: 15px;
        }
        .state-loading {
          background: #f1f5f9;
          color: #0f172a;
        }
        .state-empty {
          background: #f8fafc;
          color: #475569;
        }
        .state-error {
          background: #fee2e2;
          color: #991b1b;
        }
        .table-wrapper {
          background: #fff;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.06);
          overflow: hidden;
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 780px;
        }
        thead {
          background: #f8fafc;
        }
        th {
          text-align: left;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          padding: 14px 18px;
          color: #475569;
        }
        td {
          padding: 18px;
          border-top: 1px solid #e2e8f0;
          vertical-align: top;
          font-size: 15px;
          color: #0f172a;
        }
        tbody tr:nth-child(even) {
          background: rgba(248, 250, 252, 0.6);
        }
        .cell-primary {
          font-weight: 600;
          color: #0f172a;
        }
        .cell-sub {
          color: #475569;
          font-size: 13px;
          margin-top: 2px;
          word-break: break-word;
        }
        .cell-link {
          display: inline-block;
          margin-top: 6px;
          font-size: 13px;
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
        }
        .cell-link:hover {
          text-decoration: underline;
        }
        .count-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #eff6ff;
          color: #1e3a8a;
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 13px;
          font-weight: 600;
          margin-right: 6px;
          margin-bottom: 6px;
        }
        .count-chip span {
          background: rgba(30, 58, 138, 0.12);
          color: #1e3a8a;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 999px;
        }
        @media (max-width: 720px) {
          .orders-shell {
            padding: 24px 12px 48px;
          }
          .orders-header {
            gap: 16px;
          }
        }
      `}</style>
    </main>
  );
}
