import Link from "next/link";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseServer";
import "./styles.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RANGE_OPTIONS = [
  { value: "", label: "Alle" },
  { value: "today", label: "Heute" },
  { value: "yesterday", label: "Gestern" },
  { value: "7d", label: "Letzte 7 Tage" },
];

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

function toISO(date) {
  return date.toISOString();
}

function parseCounts(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("orders: counts parse failed", error);
    return null;
  }
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatCounts(counts) {
  if (!counts) return "—";
  const { c123, c12, c1 } = counts;
  return [c123, c12, c1]
    .map((val, idx) => {
      if (!Number.isFinite(val)) return null;
      const label = idx === 0 ? "123" : idx === 1 ? "12" : "1";
      return `${label}: ${val}`;
    })
    .filter(Boolean)
    .join(" · ") || "—";
}

function OrdersTable({ rows }) {
  if (!rows?.length) {
    return <p className="orders-empty">Keine Aufträge gefunden.</p>;
  }

  return (
    <div className="orders-table-wrapper">
      <table className="orders-table">
        <thead>
          <tr>
            <th>Erstellt</th>
            <th>Kunde</th>
            <th>Kontakt</th>
            <th>Paket</th>
            <th>Dokumente</th>
            <th>Quelle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const counts = parseCounts(row.counts);
            return (
              <tr key={row.id}>
                <td>{formatDate(row.created_at)}</td>
                <td>
                  <div className="orders-cell-main">{row.company || "—"}</div>
                  <div className="orders-cell-sub">{row.google_profile || ""}</div>
                  {row.google_url ? (
                    <a
                      href={row.google_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="orders-link"
                    >
                      Google Profil
                    </a>
                  ) : null}
                </td>
                <td>
                  <div className="orders-cell-main">
                    {[row.first_name, row.last_name].filter(Boolean).join(" ") || "—"}
                  </div>
                  <div className="orders-cell-sub">{row.email || ""}</div>
                  <div className="orders-cell-sub">{row.phone || ""}</div>
                </td>
                <td>
                  <div className="orders-cell-main">{row.selected_option || "—"}</div>
                  <div className="orders-cell-sub">{formatCounts(counts)}</div>
                </td>
                <td>
                  {row.pdf_path ? (
                    <div className="orders-cell-main">{row.pdf_path}</div>
                  ) : (
                    <div className="orders-cell-main">—</div>
                  )}
                  {row.pdf_signed_url ? (
                    <a
                      href={row.pdf_signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="orders-link"
                    >
                      Signierter Link
                    </a>
                  ) : null}
                </td>
                <td>
                  <div className="orders-cell-main">{row.source_account_id || "—"}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function loadOrders(rangeParam) {
  const searchRange = RANGE_OPTIONS.some((opt) => opt.value === rangeParam)
    ? rangeParam
    : "";

  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return { rows: [], role: null, error: authError.message };
  }

  if (!user) {
    return { rows: [], role: null, error: "Nicht eingeloggt" };
  }

  let role = user.user_metadata?.role ?? null;
  let adminClient;

  try {
    adminClient = supabaseAdmin();
  } catch (error) {
    return { rows: [], role: null, error: error.message };
  }

  if (!role) {
    try {
      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!profileError && profile?.role) {
        role = profile.role;
      }
    } catch (error) {
      console.warn("orders: profile lookup failed", error);
    }
  }

  if (!role) role = "sales";

  let query = adminClient
    .from("leads")
    .select(
      `id, created_at, google_profile, google_url, company, first_name, last_name, email, phone, selected_option, counts, pdf_path, pdf_signed_url, source_account_id`
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (searchRange === "today") {
    const gte = startOfToday();
    const lt = new Date(gte);
    lt.setDate(lt.getDate() + 1);
    query = query
      .gte("created_at", toISO(gte))
      .lt("created_at", toISO(lt));
  } else if (searchRange === "yesterday") {
    query = query
      .gte("created_at", toISO(startOfYesterday()))
      .lt("created_at", toISO(startOfToday()));
  } else if (searchRange === "7d") {
    query = query
      .gte("created_at", toISO(startOfNDaysAgo(6)))
      .lt("created_at", toISO(new Date()));
  }

  if (role === "sales" || role === "team_lead") {
    query = query.eq("source_account_id", user.id);
  }

  const { data: rows, error } = await query;
  if (error) {
    return { rows: [], role, error: error.message };
  }

  return { rows: rows ?? [], role, range: searchRange };
}

export default async function OrdersPage({ searchParams }) {
  const range = typeof searchParams?.range === "string" ? searchParams.range : "";
  const { rows, role, error, range: activeRange } = await loadOrders(range);

  return (
    <main className="orders-page">
      <header className="orders-header">
        <div>
          <h1>Aufträge</h1>
          {role ? <p className="orders-role">Rolle: {role}</p> : null}
        </div>
        <nav className="orders-filters" aria-label="Zeitraum filtern">
          {RANGE_OPTIONS.map((option) => {
            const isActive = option.value === (activeRange ?? "");
            const href = option.value
              ? `/dashboard/orders?range=${option.value}`
              : "/dashboard/orders";
            return (
              <Link
                key={option.value || "all"}
                href={href}
                className={`orders-filter ${isActive ? "active" : ""}`}
              >
                {option.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {error ? (
        <div className="orders-error">Fehler beim Laden: {error}</div>
      ) : (
        <OrdersTable rows={rows} />
      )}
    </main>
  );
}
