import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import styles from "./orders.module.css";
import { computeDateRange, normalizeRange, type RangeKey } from "@/lib/orders/range";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OrdersPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

type LeadRow = {
  id: string;
  created_at: string;
  google_profile: string | null;
  google_url: string | null;
  company: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  selected_option: string | null;
  counts: { c123?: number | null; c12?: number | null; c1?: number | null } | null;
  pdf_path: string | null;
  pdf_signed_url: string | null;
  sales_rep_id: string | null;
  team_id: string | null;
  source_account_id: string | null;
};

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "today", label: "Heute" },
  { key: "yesterday", label: "Gestern" },
  { key: "7d", label: "Letzte 7 Tage" },
];

export default function OrdersPage({ searchParams }: OrdersPageProps) {
  const range = normalizeRange(typeof searchParams?.range === "string" ? searchParams.range : undefined);

  return (
    <main className={styles.ordersPage}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Aufträge</h1>
          <p className={styles.sub}>Alle Aufträge, gefiltert durch deine Supabase-Rollen.</p>
        </div>
        <RangeFilters current={range} />
      </div>

      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersContent range={range} />
      </Suspense>
    </main>
  );
}

function RangeFilters({ current }: { current: RangeKey }) {
  return (
    <nav className={styles.rangeNav}>
      {RANGE_OPTIONS.map((option) => {
        const href = option.key === "all" ? "/dashboard/orders" : `/dashboard/orders?range=${option.key}`;
        const active = current === option.key;
        return (
          <Link
            key={option.key}
            href={href}
            className={active ? `${styles.chip} ${styles.chipActive}` : styles.chip}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

async function OrdersContent({ range }: { range: RangeKey }) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/login?redirect=/dashboard/orders`);
  }

  const dateRange = computeDateRange(range);

  let query = supabase
    .from("leads")
    .select<LeadRow>(
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
        pdf_path,
        pdf_signed_url,
        sales_rep_id,
        team_id,
        source_account_id
      `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (dateRange.gte) {
    query = query.gte("created_at", dateRange.gte);
  }

  if (dateRange.lt) {
    query = query.lt("created_at", dateRange.lt);
  }

  const { data, error } = await query;

  if (error) {
    return <ErrorState message={error.message} />;
  }

  const rows = (data ?? []) as LeadRow[];

  if (!rows.length) {
    return <EmptyState range={range} />;
  }

  return <OrdersTable rows={rows} />;
}

function OrdersTable({ rows }: { rows: LeadRow[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.ordersTable}>
        <thead>
          <tr>
            <th>Datum</th>
            <th>Kunde</th>
            <th>Auswahl</th>
            <th>Kontakt</th>
            <th>Zuordnung</th>
            <th>Dokument</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <div className={styles.cellMain}>{formatDate(row.created_at)}</div>
                <div className={styles.cellSub}>{formatTime(row.created_at)} · {row.id}</div>
              </td>
              <td>
                <div className={styles.cellMain}>
                  {row.company || `${row.first_name || ""} ${row.last_name || ""}`.trim() || "—"}
                </div>
                <div className={styles.cellSub}>{row.google_profile || row.google_url || "—"}</div>
              </td>
              <td>
                <div className={styles.cellMain}>{formatSelection(row.selected_option)}</div>
                <div className={styles.cellSub}>{formatCounts(row.counts)}</div>
              </td>
              <td>
                <div className={styles.cellMain}>{row.email || "—"}</div>
                <div className={styles.cellSub}>{row.phone || "—"}</div>
              </td>
              <td>
                <div className={styles.cellMain}>Sales: {row.sales_rep_id || "—"}</div>
                <div className={styles.cellSub}>Team: {row.team_id || "—"}</div>
                <div className={styles.cellSub}>Quelle: {row.source_account_id || "—"}</div>
              </td>
              <td>
                {row.pdf_signed_url ? (
                  <a className={styles.docLink} href={row.pdf_signed_url} target="_blank" rel="noreferrer">
                    PDF öffnen
                  </a>
                ) : (
                  <span className={styles.cellSub}>–</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonRow} />
      <div className={styles.skeletonRow} />
      <div className={styles.skeletonRow} />
    </div>
  );
}

function EmptyState({ range }: { range: RangeKey }) {
  const label = RANGE_OPTIONS.find((option) => option.key === range)?.label ?? "diesem Zeitraum";
  return (
    <div className={`${styles.state} ${styles.stateDefault}`}>
      <h2>Keine Aufträge</h2>
      <p>Für {label.toLowerCase()} sind aktuell keine Aufträge vorhanden.</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className={`${styles.state} ${styles.stateError}`}>
      <h2>Fehler beim Laden</h2>
      <p>{message}</p>
    </div>
  );
}

function formatSelection(value: string | null): string {
  switch (value) {
    case "123":
      return "1–3 Sterne";
    case "12":
      return "1–2 Sterne";
    case "1":
      return "1 Stern";
    default:
      return value || "—";
  }
}

function formatCounts(counts: LeadRow["counts"]): string {
  if (!counts) return "—";
  const parts: string[] = [];
  if (counts.c123 != null) parts.push(`1–3: ${counts.c123}`);
  if (counts.c12 != null) parts.push(`1–2: ${counts.c12}`);
  if (counts.c1 != null) parts.push(`1: ${counts.c1}`);
  return parts.length ? parts.join(" · ") : "—";
}

function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString("de-DE");
}

function formatTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
