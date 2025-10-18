"use client";

import { useEffect, useMemo, useState } from "react";

const RANGE_OPTIONS = [
  { value: "30d", label: "Letzte 30 Tage" },
  { value: "7d", label: "Letzte 7 Tage" },
  { value: "all", label: "Gesamter Zeitraum" },
];

const rangeLabelByKey = RANGE_OPTIONS.reduce((acc, curr) => {
  acc[curr.value] = curr.label;
  return acc;
}, {});

function formatDate(iso) {
  if (!iso) return "–";
  try {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatName(order) {
  const fn = order?.first_name || "";
  const ln = order?.last_name || "";
  return [fn, ln].filter(Boolean).join(" ") || "–";
}

function SummaryCard({ title, value, highlight = false }) {
  return (
    <div className={`summary-card ${highlight ? "highlight" : ""}`}>
      <p className="summary-title">{title}</p>
      <p className="summary-value">{value.toLocaleString("de-DE")}</p>
    </div>
  );
}

function OrderRow({ order }) {
  return (
    <article className="order-row">
      <header>
        <h4>{order.company || order.google_profile || "Unbenannter Auftrag"}</h4>
        <span className="order-date">{formatDate(order.created_at)}</span>
      </header>
      <div className="order-body">
        <div className="order-field">
          <span className="label">Kontakt</span>
          <span className="value">{formatName(order)}</span>
        </div>
        <div className="order-field">
          <span className="label">E-Mail</span>
          <span className="value">{order.email || "–"}</span>
        </div>
        <div className="order-field">
          <span className="label">Telefon</span>
          <span className="value">{order.phone || "–"}</span>
        </div>
        <div className="order-field">
          <span className="label">Produkt</span>
          <span className="value">{order.selected_option || "–"}</span>
        </div>
      </div>
      {order.google_url ? (
        <a className="order-link" href={order.google_url} target="_blank" rel="noreferrer">
          Google-Profil öffnen ↗
        </a>
      ) : null}
    </article>
  );
}

function MemberSection({ member, rangeLabel }) {
  return (
    <div className="member-section">
      <div className="member-header">
        <div>
          <p className="member-name">
            {member.profile.firstName || member.profile.lastName
              ? [member.profile.firstName, member.profile.lastName].filter(Boolean).join(" ")
              : "Unbekannter Vertrieb"}
            {member.isLead ? <span className="badge">Teamleiter</span> : null}
          </p>
          <p className="member-subtitle">{member.totalOrders} Aufträge im {rangeLabel}</p>
        </div>
      </div>
      {member.orders.length ? (
        <div className="member-orders">
          {member.orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <p className="member-empty">Keine Aufträge im ausgewählten Zeitraum.</p>
      )}
    </div>
  );
}

function TeamSection({ team, rangeLabel }) {
  return (
    <section className="team-section">
      <header className="team-header">
        <div>
          <h3>
            {team.lead?.firstName || team.lead?.lastName
              ? [team.lead?.firstName, team.lead?.lastName].filter(Boolean).join(" ")
              : "Team"}
          </h3>
          <p className="team-subtitle">{team.members.length} Vertriebler</p>
        </div>
        <div className="team-total">
          <span>{team.totalOrders.toLocaleString("de-DE")}</span>
          <span>Aufträge gesamt</span>
        </div>
      </header>
      <div className="team-members">
        {team.members.map((member) => (
          <MemberSection key={member.profile.id} member={member} rangeLabel={rangeLabel} />
        ))}
      </div>
    </section>
  );
}

export default function OrdersPage() {
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/list?range=${encodeURIComponent(range)}`, {
          signal: controller.signal,
          credentials: "include",
        });
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body?.error || "Unbekannter Fehler");
        }
        setPayload(body);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unbekannter Fehler");
        }
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [range, refreshKey]);

  const hierarchy = payload?.hierarchy;
  const showTeams = hierarchy?.teams?.length;
  const summary = payload?.totals || { all: 0, last7d: 0, last30d: 0, current: 0 };

  const ordersForList = useMemo(() => payload?.orders || [], [payload]);

  return (
    <div className="orders-page">
      <div className="orders-top">
        <div>
          <h1>Aufträge</h1>
          <p className="subtitle">Alle Deals auf einen Blick – filterbar nach Zeitraum.</p>
        </div>
        <div className="range-picker" role="group" aria-label="Zeitraum filtern">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`range-btn ${range === option.value ? "active" : ""}`}
              onClick={() => setRange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="summary-grid">
        <SummaryCard title="Alle Aufträge" value={summary.all || 0} />
        <SummaryCard title="Letzte 30 Tage" value={summary.last30d || 0} />
        <SummaryCard title="Letzte 7 Tage" value={summary.last7d || 0} />
        <SummaryCard
          title={`Aktuell (${rangeLabelByKey[range] || "Auswahl"})`}
          value={summary.current || 0}
          highlight
        />
      </div>

      {loading ? <p className="info">Lade Aufträge …</p> : null}
      {error ? (
        <div className="error-box">
          <p>Fehler beim Laden: {error}</p>
          <button type="button" onClick={() => setRefreshKey((key) => key + 1)}>
            Erneut versuchen
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          {showTeams ? (
            <div className="team-grid">
              {hierarchy.teams.map((team) => (
                <TeamSection key={team.id} team={team} rangeLabel={hierarchy.rangeLabel} />
              ))}
            </div>
          ) : null}

          {hierarchy?.unassigned?.length ? (
            <section className="team-section">
              <header className="team-header">
                <div>
                  <h3>Ohne Teamleiter</h3>
                  <p className="team-subtitle">
                    {hierarchy.unassigned.length} Vertriebler ohne Zuordnung
                  </p>
                </div>
              </header>
              <div className="team-members">
                {hierarchy.unassigned.map((member) => (
                  <MemberSection key={member.profile.id} member={member} rangeLabel={hierarchy.rangeLabel} />
                ))}
              </div>
            </section>
          ) : null}

          {!showTeams && !hierarchy?.unassigned?.length ? (
            <section className="team-section">
              <header className="team-header">
                <div>
                  <h3>Meine Aufträge</h3>
                  <p className="team-subtitle">
                    {ordersForList.length} Aufträge im {hierarchy?.rangeLabel || rangeLabelByKey[range]}
                  </p>
                </div>
              </header>
              <div className="team-members">
                <div className="member-section">
                  {ordersForList.length ? (
                    <div className="member-orders">
                      {ordersForList.map((order) => (
                        <OrderRow key={order.id} order={order} />
                      ))}
                    </div>
                  ) : (
                    <p className="member-empty">Keine Aufträge im ausgewählten Zeitraum.</p>
                  )}
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <style jsx>{`
        .orders-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 24px;
        }

        .orders-top {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          justify-content: space-between;
          align-items: center;
        }

        .orders-top h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
        }

        .subtitle {
          color: #475569;
          margin-top: 4px;
        }

        .range-picker {
          display: flex;
          gap: 8px;
        }

        .range-btn {
          border: 1px solid #cbd5f5;
          background: #ffffff;
          border-radius: 24px;
          padding: 8px 18px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .range-btn.active {
          background: #1f2937;
          color: #ffffff;
          border-color: #1f2937;
        }

        .summary-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }

        .summary-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .summary-card.highlight {
          background: linear-gradient(120deg, #0f172a, #1e293b);
          color: #ffffff;
        }

        .summary-title {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: inherit;
          opacity: 0.7;
          margin: 0;
        }

        .summary-value {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
        }

        .info {
          color: #475569;
        }

        .error-box {
          background: #fee2e2;
          color: #b91c1c;
          padding: 16px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .error-box button {
          background: #b91c1c;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          cursor: pointer;
        }

        .team-grid {
          display: grid;
          gap: 24px;
        }

        .team-section {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .team-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          flex-wrap: wrap;
        }

        .team-header h3 {
          font-size: 22px;
          margin: 0;
        }

        .team-subtitle {
          color: #64748b;
          margin: 4px 0 0;
        }

        .team-total {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          font-weight: 700;
          color: #0f172a;
        }

        .team-total span:first-child {
          font-size: 24px;
        }

        .team-members {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .member-section {
          background: #f8fafc;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .member-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .member-name {
          font-size: 18px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }

        .badge {
          background: #1f2937;
          color: #ffffff;
          border-radius: 999px;
          padding: 2px 10px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .member-subtitle {
          margin: 4px 0 0;
          color: #475569;
        }

        .member-orders {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .member-empty {
          margin: 0;
          color: #94a3b8;
        }

        .order-row {
          background: #ffffff;
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .order-row header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .order-row h4 {
          font-size: 16px;
          margin: 0;
        }

        .order-date {
          color: #64748b;
          font-size: 13px;
        }

        .order-body {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        }

        .order-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .order-field .label {
          font-size: 12px;
          text-transform: uppercase;
          color: #94a3b8;
          letter-spacing: 0.06em;
        }

        .order-field .value {
          font-weight: 600;
        }

        .order-link {
          font-size: 13px;
          color: #1d4ed8;
        }

        @media (max-width: 768px) {
          .orders-page {
            padding: 16px;
          }

          .orders-top h1 {
            font-size: 24px;
          }

          .team-section {
            padding: 16px;
          }

          .member-section {
            padding: 12px;
          }

          .order-row {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
}
