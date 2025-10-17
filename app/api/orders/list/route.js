// app/api/orders/list/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

// helpers
function startOfToday() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function startOfYesterday() { const d = startOfToday(); d.setDate(d.getDate()-1); return d; }
function startOfNDaysAgo(n){ const d = startOfToday(); d.setDate(d.getDate()-n); return d; }
const toISO = (d) => new Date(d).toISOString();

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const range = (searchParams.get("range") || "all").toString(); // today|yesterday|7d|all

    // timeframe
    let gte = null, lt = null;
    if (range === "today") {
      gte = startOfToday(); lt = new Date(gte); lt.setDate(lt.getDate()+1);
    } else if (range === "yesterday") {
      gte = startOfYesterday(); lt = startOfToday();
    } else if (range === "7d") {
      gte = startOfNDaysAgo(6); lt = new Date();
    }

    const sb = supabaseAdmin();
    let q = sb
      .from("leads")
      .select(`
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
        pdf_signed_url
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (gte && lt) q = q.gte("created_at", toISO(gte)).lt("created_at", toISO(lt));

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
