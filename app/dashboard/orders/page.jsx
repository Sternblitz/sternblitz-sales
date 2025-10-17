"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const ranges = [
  { key: "today", label: "Heute" },
  { key: "yesterday", label: "Gestern" },
  { key: "7d", label: "Letzte 7 Tage" },
  { key: "all", label: "Alle" },
];

export default function OrdersPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [range, setRange] = useState("7d");

  // Zeitraum berechnen
  const { fromISO } = useMemo(() => {
    const now = new Date();
    let from = null;

    if (range === "today") {
      const d = new Date(now); d.setHours(0,0,0,0);
      from = d;
    } else if (range === "yesterday") {
      const d = new Date(now); d.setDate(d.getDate() - 1); d.setHours(0,0,0,0);
      from = d;
    } else if (range === "7d") {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      from = d;
    } else {
      from = null; // alle
    }

    return { fromISO: from ? from.toISOString() : null };
  }, [range]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const sb = supabase();

        // eingeloggter User
        const { data: u } = await sb.auth.getUser();
        const userId = u?.user?.id || null;
        if (!userId) {
          setMe(null);
          setRows([]);
          setLoading(false);
          return;
        }
        setMe(u.user);

        // Query auf leads – gefiltert über source_account_id und Zeitraum
        let q = sb
          .from("leads")
          .select(
            "id, created_at, google_profile, selected_option, counts, company, first_name, last_name, email, phone, pdf_path, pdf_signed_url"
          )
          .eq("source_account_id", userId)
          .order("created_at", { ascending: false });

        if (fromISO) q = q.gte("created_at", fromISO);

        const { data, error } = await q;
        if (error) throw error;
        if (!mounted) return;
        setRows(data || []);
      } catch (e) {
        console.error(e);
        if (mounted) setRows([]);
      } finally {
        mounted && setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [fromISO]);

  const fmt = (iso) => new Date(iso).toLocaleString("de-DE");
  const labelFor = (opt) =>
    opt === "123" ? "1–3 ⭐"
    : opt === "12" ? "1–2 ⭐"
    : opt === "1"   ? "1 ⭐"
    : "Individuell";

  return (
    <section>
      <header className="head">
        <h1>Meine Aufträge</h1>
        <div className="filters">
          {ranges.map(r => (
            <button
              key={r.key}
              className={`chip ${range === r.key ? "on" : ""}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="card">Lade…</div>
      ) : rows.length === 0 ? (
        <div className="card">Keine Aufträge im gewählten Zeitraum.</div>
      ) : (
        <div className="table card">
          <div className="thead">
            <div>Datum</div>
            <div>Google-Profil</div>
            <div>Auswahl</div>
            <div>Kunde</div>
            <div>PDF</div>
          </div>
          <div className="tbody">
            {rows.map((r) => {
              // ausgewählte Stückzahl
              const cnt =
                r.selected_option === "123" ? r.counts?.c123 :
                r.selected_option === "12"  ? r.counts?.c12  :
                r.selected_option === "1"   ? r.counts?.c1   : null;

              const pdfUrl = r.pdf_signed_url || (
                r.pdf_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/contracts/${r.pdf_path}` : null
              );

              return (
                <div key={r.id} className="tr">
                  <div>{fmt(r.created_at)}</div>
                  <div title={r.google_profile} className="ellipsis">
                    {r.google_profile || "—"}
                  </div>
                  <div>
                    <b>{labelFor(r.selected_option)}</b>
                    {Number.isFinite(cnt) ? ` · ${cnt} St.` : ""}
                  </div>
                  <div className="ellipsis">
                    {r.company || "—"} · {r.first_name} {r.last_name}
                  </div>
                  <div>
                    {pdfUrl ? (
                      <a className="btn small" href={pdfUrl} target="_blank" rel="noreferrer">
                        PDF öffnen
                      </a>
                    ) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        .head{
          display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px
        }
        h1{margin:0;font-size:22px;font-weight:900}
        .filters{display:flex;gap:8px;flex-wrap:wrap}
        .chip{
          height:34px;padding:0 12px;border-radius:999px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-weight:700
        }
        .chip.on{border-color:#0b6cf2;background:#eef5ff;color:#0b6cf2}
        .card{
          background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 12px 28px rgba(2,6,23,.06);
          padding:14px
        }
        .table .thead,.table .tr{
          display:grid;grid-template-columns:200px 1fr 180px 1fr 120px;gap:12px;align-items:center
        }
        .table .thead{font-weight:800;color:#334155;padding-bottom:8px;border-bottom:1px solid #eef2f7}
        .table .tbody .tr{padding:10px 0;border-bottom:1px solid #f3f4f6}
        .ellipsis{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .btn.small{
          display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 10px;border-radius:10px;
          background:#0b6cf2;color:#fff;text-decoration:none;font-weight:800;border:1px solid rgba(11,108,242,.3)
        }
        @media (max-width: 900px){
          .table .thead,.table .tr{grid-template-columns:160px 1fr 150px 1fr 110px}
        }
        @media (max-width: 680px){
          .table .thead,.table .tr{grid-template-columns:140px 1fr 120px}
          .table .thead :nth-child(4), .table .thead :nth-child(5),
          .table .tr :nth-child(4), .table .tr :nth-child(5){display:none}
        }
      `}</style>
    </section>
  );
}
