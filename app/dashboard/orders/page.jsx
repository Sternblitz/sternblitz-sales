import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabaseServerAuth";

export const dynamic = "force-dynamic";

const STATUS_LABELS = {
  draft: "Entwurf",
  in_progress: "In Bearbeitung",
  awaiting_signature: "Unterschrift offen",
  awaiting_payment: "Zahlung offen",
  done: "Abgeschlossen",
  cancelled: "Storniert",
};

const STATUS_OPTIONS = ["", ...Object.keys(STATUS_LABELS)];
const PAGE_SIZE = 10;

function sanitizeSearchTerm(term) {
  return term.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function formatDate(value) {
  if (!value) return "–";
  const date = new Date(value);
  return date.toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(order) {
  const payload = order?.simulator_payload;
  const amount =
    typeof payload === "number"
      ? payload
      : payload && typeof payload === "object"
      ? payload.total || payload.total_price || payload.price || payload.amount || null
      : null;

  if (typeof amount === "number" && Number.isFinite(amount)) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return "–";
}

function resolveAssignee(order) {
  const profile = order?.sales_rep;
  if (profile?.full_name) return profile.full_name;
  if (profile?.email) return profile.email;
  if (order?.sales_rep_id) return `${order.sales_rep_id.slice(0, 8)}…`;
  return "Unzugeordnet";
}

function buildStatusLabel(status) {
  if (!status) return "Unbekannt";
  return STATUS_LABELS[status] || status;
}

function applyFilters(query, statusFilter, queryParam) {
  let q = query;
  if (statusFilter) {
    q = q.eq("status", statusFilter);
  }
  if (queryParam) {
    const sanitized = sanitizeSearchTerm(queryParam);
    q = q.or(
      `business_name.ilike.%${sanitized}%,contact_name.ilike.%${sanitized}%,google_profile_url.ilike.%${sanitized}%`
    );
  }
  return q;
}

function buildHistoryArray(historyParam) {
  if (!historyParam || typeof historyParam !== "string") return [];
  return historyParam
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default async function OrdersPage({ searchParams }) {
  const supabase = supabaseServerAuth();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("orders/page auth error", userError);
  }

  if (!user) {
    redirect("/login?redirect=/dashboard/orders");
  }

  const statusParam = typeof searchParams?.status === "string" ? searchParams.status : "";
  const statusFilter = STATUS_OPTIONS.includes(statusParam) ? statusParam : "";
  const queryParam = typeof searchParams?.query === "string" ? searchParams.query.trim() : "";
  const after = typeof searchParams?.after === "string" ? searchParams.after : "";
  const before = typeof searchParams?.before === "string" ? searchParams.before : "";
  const history = buildHistoryArray(searchParams?.history);

  const filterQueryParams = {};
  if (statusFilter) filterQueryParams.status = statusFilter;
  if (queryParam) filterQueryParams.query = queryParam;

  let errorMessage = null;
  let orders = [];
  let hasMoreOlder = false;
  let hasMoreNewer = false;
  let nextCursor = null;
  let prevCursor = null;

  try {
    const baseSelect =
      "id, created_at, business_name, contact_name, status, payment_status, simulator_payload, sales_rep_id, team_id, sales_rep:profiles!orders_sales_rep_id_fkey(full_name,email)";

    const orderAscending = Boolean(before);
    let query = applyFilters(
      supabase
        .from("orders")
        .select(baseSelect)
        .order("created_at", { ascending: orderAscending })
        .limit(PAGE_SIZE + 1),
      statusFilter,
      queryParam
    );

    if (before) {
      query = query.gt("created_at", before);
    } else if (after) {
      query = query.lt("created_at", after);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    let rows = Array.isArray(data) ? data : [];

    if (before) {
      if (rows.length > PAGE_SIZE) {
        hasMoreNewer = true;
        rows = rows.slice(rows.length - PAGE_SIZE);
      }
      rows = rows.reverse();
    } else {
      if (rows.length > PAGE_SIZE) {
        hasMoreOlder = true;
        rows = rows.slice(0, PAGE_SIZE);
      }
      if (after) {
        hasMoreNewer = true;
      }
    }

    orders = rows;
    prevCursor = orders.length ? orders[0].created_at : null;
    nextCursor = orders.length ? orders[orders.length - 1].created_at : null;

    if (orders.length && !hasMoreOlder && nextCursor) {
      let olderQuery = applyFilters(
        supabase.from("orders").select("id", { count: "exact", head: true }),
        statusFilter,
        queryParam
      ).lt("created_at", nextCursor);
      if (before) {
        olderQuery = olderQuery.lte("created_at", nextCursor);
      }
      const { count: olderCount, error: olderError } = await olderQuery;
      if (!olderError && typeof olderCount === "number") {
        hasMoreOlder = olderCount > 0;
      }
    }

    if (orders.length && !hasMoreNewer && prevCursor) {
      const { count: newerCount, error: newerError } = await applyFilters(
        supabase.from("orders").select("id", { count: "exact", head: true }),
        statusFilter,
        queryParam
      ).gt("created_at", prevCursor);
      if (!newerError && typeof newerCount === "number") {
        hasMoreNewer = newerCount > 0;
      }
    }
  } catch (error) {
    console.error("orders/page fetch error", error);
    errorMessage = error?.message || "Beim Laden der Aufträge ist ein Fehler aufgetreten.";
  }

  const newerHistory = history.slice(0, -1);
  const newerCursor = history.length > 0 ? history[history.length - 1] : null;
  const olderHistory = nextCursor ? [...history, nextCursor].filter(Boolean) : history;

  return (
    <main className="orders-page" aria-labelledby="orders-heading">
      <section className="orders-header">
        <div>
          <h1 id="orders-heading">Meine Aufträge</h1>
          <p className="orders-subtitle">
            Überblick über alle Aufträge, sortiert nach Aktualität. Nutze Suche, Filter und Paginierung für die schnelle Navigation.
          </p>
        </div>
        <Link href="/dashboard" className="back-link">
          Zurück zum Dashboard
        </Link>
      </section>

      <form className="filters" role="search" aria-label="Aufträge filtern">
        <div className="filter-group">
          <label htmlFor="status" className="filter-label">
            Status
          </label>
          <select id="status" name="status" defaultValue={statusFilter} className="filter-input">
            <option value="">Alle Status</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="query" className="filter-label">
            Suche
          </label>
          <input
            id="query"
            name="query"
            type="search"
            placeholder="Firma, Ansprechpartner oder Google-Profil"
            defaultValue={queryParam}
            className="filter-input"
          />
        </div>

        <div className="filter-actions">
          <button type="submit" className="primary-btn">
            Anwenden
          </button>
          <Link href="/dashboard/orders" className="ghost-btn">
            Zurücksetzen
          </Link>
        </div>
      </form>

      {errorMessage && (
        <div role="alert" className="error-box">
          <strong>Fehler:</strong> {errorMessage}
        </div>
      )}

      {!errorMessage && orders.length === 0 ? (
        <div className="empty-state" role="status" aria-live="polite">
          <h2>Keine Aufträge gefunden</h2>
          <p>Passe deine Filter an oder lege einen neuen Auftrag an, um ihn hier zu verfolgen.</p>
          <Link href="/dashboard" className="primary-btn">
            Zur Übersicht
          </Link>
        </div>
      ) : (
        <div className="table-wrapper" role="region" aria-live="polite" aria-label="Auftragsliste">
          <table>
            <caption className="sr-only">Aufträge des aktuellen Accounts</caption>
            <thead>
              <tr>
                <th scope="col">Erstellt</th>
                <th scope="col">Titel</th>
                <th scope="col">Status</th>
                <th scope="col">Betrag</th>
                <th scope="col">Vertrieb</th>
                <th scope="col" className="actions-col">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{formatDate(order.created_at)}</td>
                  <td>
                    <span className="title-cell">
                      {order.business_name || order.contact_name || "Unbenannter Auftrag"}
                    </span>
                    {order.contact_name && order.business_name && (
                      <span className="title-sub">Kontakt: {order.contact_name}</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge status-${order.status || "unknown"}`}>
                      {buildStatusLabel(order.status)}
                    </span>
                  </td>
                  <td>{formatAmount(order)}</td>
                  <td>{resolveAssignee(order)}</td>
                  <td className="actions">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="primary-link"
                      aria-label={`Auftrag ${order.business_name || order.id} ansehen`}
                    >
                      Anzeigen
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!errorMessage && orders.length > 0 && (
        <nav className="pagination" aria-label="Seitennavigation">
          <div className="pagination-actions">
            <Link
              href={{
                pathname: "/dashboard/orders",
                query: {
                  ...filterQueryParams,
                  ...(hasMoreNewer && newerCursor
                    ? {
                        before: newerCursor,
                        ...(newerHistory.length > 0 ? { history: newerHistory.join(",") } : {}),
                      }
                    : {}),
                },
              }}
              aria-disabled={!hasMoreNewer || !newerCursor}
              className={`ghost-btn ${!hasMoreNewer || !newerCursor ? "is-disabled" : ""}`}
            >
              Neuere
            </Link>
            <Link
              href={{
                pathname: "/dashboard/orders",
                query: {
                  ...filterQueryParams,
                  ...(hasMoreOlder && nextCursor
                    ? {
                        after: nextCursor,
                        ...(olderHistory.length > 0 ? { history: olderHistory.join(",") } : {}),
                      }
                    : {}),
                },
              }}
              aria-disabled={!hasMoreOlder || !nextCursor}
              className={`ghost-btn ${!hasMoreOlder || !nextCursor ? "is-disabled" : ""}`}
            >
              Ältere
            </Link>
          </div>
        </nav>
      )}


    </main>
  );
}
