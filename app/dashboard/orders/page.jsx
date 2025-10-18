"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const RANGE_PRESETS = [
  { label: "Heute", value: "today" },
  { label: "Gestern", value: "yesterday" },
  { label: "Letzte 7 Tage", value: "7d" },
  { label: "Gesamter Zeitraum", value: "all" },
];

const OPTION_LABELS = {
  "123": "Paket 1–3 ⭐",
  "12": "Paket 1–2 ⭐",
  "1": "Paket 1 ⭐",
  custom: "Individuell",
};

const numberFormatter = new Intl.NumberFormat("de-DE");
const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function normalizeCounts(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) || {};
    } catch (error) {
      console.warn("Konnte counts nicht parsen", error);
      return {};
    }
  }
  return raw;
}

function formatCount(option, counts) {
  if (!counts) return null;
  const raw =
    option === "123"
      ? counts.c123
      : option === "12"
        ? counts.c12
        : option === "1"
          ? counts.c1
          : null;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
}

export default function OrdersPage() {
  const router = useRouter();
  const [range, setRange] = useState("7d");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const redirectTarget = useMemo(
    () => `/login?redirect=${encodeURIComponent("/dashboard/orders")}`,
    []
  );

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/list?range=${range}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (res.status === 401) {
        router.replace(redirectTarget);
        return;
      }

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.error) {
        throw new Error(payload?.error || "Aufträge konnten nicht geladen werden.");
      }

      setOrders(Array.isArray(payload?.rows) ? payload.rows : []);
    } catch (err) {
      console.error("orders load", err);
      setError(err?.message || "Unbekannter Fehler beim Laden der Aufträge.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [range, redirectTarget, router]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders, reloadToken]);

  const handleRangeChange = (value) => {
    if (value === range) return;
    setRange(value);
    setReloadToken((token) => token + 1);
  };

  const handleManualReload = () => {
    setReloadToken((token) => token + 1);
  };

  return (
    <main className="orders-shell">
      <header className="orders-head">
        <div>
          <h1>Meine Aufträge</h1>
          <p>
            Übersicht über alle von dir erstellten Aufträge. Filtere nach Zeitraum
            und öffne direkt die unterschriebenen Dokumente.
          </p>
        </div>
        <div className="head-actions">
          <div className="range-picker" role="tablist" aria-label="Zeitraum filtern">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                role="tab"
                aria-selected={range === preset.value}
                className={`range-btn ${range === preset.value ? "active" : ""}`}
                onClick={() => handleRangeChange(preset.value)}
                disabled={loading && range === preset.value}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="reload-btn"
            onClick={handleManualReload}
            disabled={loading}
          >
            ↻ Aktualisieren
          </button>
        </div>
      </header>

      {error && <div className="status error">{error}</div>}
      {!error && loading && <div className="status loading">Lade Aufträge…</div>}

      {!loading && !error && orders.length === 0 && (
        <div className="status empty">
          <strong>Keine Aufträge im ausgewählten Zeitraum.</strong>
          <p>Versuche einen anderen Zeitraum oder lege einen neuen Auftrag an.</p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <section className="orders-list" aria-live="polite">
          {orders.map((order) => {
            const counts = normalizeCounts(order.counts);
            const formattedCount = formatCount(order.selected_option, counts);
            const optionLabel = OPTION_LABELS[order.selected_option] || "Individuell";
            const createdAt = order.created_at
              ? dateFormatter.format(new Date(order.created_at))
              : "—";
            const countLabel = Number.isFinite(formattedCount)
              ? `${numberFormatter.format(formattedCount)} Bewertungen`
              : null;

            return (
              <article key={order.id || order.created_at} className="order-card">
                <header className="order-card-head">
                  <div className="order-title">
                    <h2>{order.company || order.google_profile || "Unbenannter Auftrag"}</h2>
                    <span className="timestamp">{createdAt}</span>
                  </div>
                  <div className="order-badge">{optionLabel}</div>
                </header>

                <div className="order-grid">
                  <div className="item">
                    <span className="label">Google-Profil</span>
                    {order.google_url ? (
                      <a href={order.google_url} target="_blank" rel="noreferrer" className="value link">
                        {order.google_profile || order.google_url}
                      </a>
                    ) : (
                      <span className="value">{order.google_profile || "—"}</span>
                    )}
                  </div>

                  <div className="item">
                    <span className="label">Kontakt</span>
                    <span className="value">
                      {[order.first_name, order.last_name].filter(Boolean).join(" ") || "—"}
                      {order.email && <>
                        <br />
                        <span className="muted">{order.email}</span>
                      </>}
                      {order.phone && <>
                        <br />
                        <span className="muted">{order.phone}</span>
                      </>}
                    </span>
                  </div>

                  <div className="item">
                    <span className="label">Ausgewähltes Paket</span>
                    <span className="value">
                      {optionLabel}
                      {countLabel && <span className="muted"> · {countLabel}</span>}
                    </span>
                  </div>

                  {order.customNotes && (
                    <div className="item">
                      <span className="label">Notizen</span>
                      <span className="value">{order.customNotes}</span>
                    </div>
                  )}
                </div>

                <footer className="order-footer">
                  {order.pdf_signed_url ? (
                    <a
                      className="doc-link"
                      href={order.pdf_signed_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Signiertes Dokument öffnen
                    </a>
                  ) : order.pdf_path ? (
                    <span className="muted">PDF in Vorbereitung ({order.pdf_path})</span>
                  ) : (
                    <span className="muted">Kein PDF hinterlegt</span>
                  )}
                </footer>
              </article>
            );
          })}
        </section>
      )}

      <style jsx>{`
        .orders-shell {
          max-width: 1100px;
          margin: 0 auto;
          padding: 32px 20px 80px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .orders-head {
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 24px;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(14, 116, 144, 0.08));
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
        }
        .orders-head h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
        }
        .orders-head p {
          margin: 6px 0 0;
          max-width: 620px;
          line-height: 1.45;
          color: #1f2937;
        }
        .head-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }
        .range-picker {
          display: inline-flex;
          gap: 8px;
          padding: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.75);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
        }
        .range-btn {
          border: none;
          border-radius: 999px;
          padding: 8px 16px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          color: #1f2937;
          background: transparent;
          transition: all 0.18s ease;
        }
        .range-btn.active {
          background: linear-gradient(135deg, #0b6cf2, #2563eb);
          color: #fff;
          box-shadow: 0 12px 24px rgba(11, 108, 242, 0.3);
        }
        .range-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .reload-btn {
          border: none;
          border-radius: 10px;
          padding: 10px 16px;
          font-weight: 700;
          font-size: 14px;
          background: #0f172a;
          color: #fff;
          cursor: pointer;
          transition: transform 0.15s ease, filter 0.2s ease;
        }
        .reload-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.05);
        }
        .reload-btn:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        .status {
          border-radius: 16px;
          padding: 18px 20px;
          font-size: 15px;
          line-height: 1.5;
        }
        .status.loading {
          background: rgba(59, 130, 246, 0.08);
          color: #1d4ed8;
        }
        .status.error {
          background: rgba(220, 38, 38, 0.1);
          color: #b91c1c;
        }
        .status.empty {
          background: rgba(148, 163, 184, 0.12);
          color: #334155;
        }
        .status.empty p {
          margin: 6px 0 0;
        }
        .orders-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 18px;
        }
        .order-card {
          background: #fff;
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
          display: flex;
          flex-direction: column;
          gap: 16px;
          border: 1px solid rgba(15, 23, 42, 0.06);
        }
        .order-card-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .order-title h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
        }
        .timestamp {
          display: inline-block;
          margin-top: 6px;
          font-size: 13px;
          color: #64748b;
        }
        .order-badge {
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.12);
          color: #1d4ed8;
          font-weight: 600;
          font-size: 13px;
        }
        .order-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }
        .item .label {
          display: block;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 6px;
        }
        .item .value {
          display: inline-block;
          color: #0f172a;
          font-weight: 600;
          line-height: 1.4;
          word-break: break-word;
        }
        .item .value.link {
          color: #1d4ed8;
          text-decoration: none;
        }
        .item .value.link:hover {
          text-decoration: underline;
        }
        .muted {
          color: #64748b;
          font-weight: 500;
        }
        .order-footer {
          border-top: 1px solid rgba(226, 232, 240, 0.8);
          padding-top: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .doc-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #0b6cf2;
          text-decoration: none;
          font-weight: 700;
        }
        .doc-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .orders-head {
            padding: 20px;
          }
          .orders-head h1 {
            font-size: 24px;
          }
          .orders-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
