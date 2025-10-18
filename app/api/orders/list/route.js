// app/api/orders/list/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Zeitraum-Helfer
function startOfToday() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function startOfYesterday() { const d = startOfToday(); d.setDate(d.getDate()-1); return d; }
function startOfNDaysAgo(n) { const d = startOfToday(); d.setDate(d.getDate()-n); return d; }
const toISO = (d) => new Date(d).toISOString();

export async function GET(req) {
  try {
    // 1) User aus Cookies lesen (KEIN Redirect, nur API)
    const cookieStore = cookies();
    const sbClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get: (key) => cookieStore.get(key)?.value,
        },
      }
    );
    const {
      data: { user },
      error: userErr,
    } = await sbClient.auth.getUser();
    if (userErr) throw userErr;
    if (!user) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }

    // 2) Rolle bestimmen
    let role = user.user_metadata?.role || null;

    if (!role) {
      try {
        const { data: prof } = await supabaseAdmin()
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        role = prof?.role || null;
      } catch {
        // Profile-Lookup ist optional
      }
    }

    if (!role) role = "sales"; // "admin" | "team_lead" | "sales"

    // 3) Zeitraumfilter aus Query
    const { searchParams } = new URL(req.url);
    const range = (searchParams.get("range") || "").toString();
    let gte = null;
    let lt = null;
    if (range === "today") {
      gte = startOfToday();
      lt = new Date(gte);
      lt.setDate(lt.getDate() + 1);
    } else if (range === "yesterday") {
      gte = startOfYesterday();
      lt = startOfToday();
    } else if (range === "7d") {
      gte = startOfNDaysAgo(6);
      lt = new Date();
    }

    // 4) Basis-Query
    const admin = supabaseAdmin();
    let q = admin
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
        pdf_signed_url,
        source_account_id,
        rep_code,
        option_chosen_count
      `)
      .order("created_at", { ascending: false })
      .limit(300);

    if (gte && lt) {
      q = q.gte("created_at", toISO(gte)).lt("created_at", toISO(lt));
    }

    // 5) Rollen-Scoping
    if (role === "sales" || role === "team_lead") {
      q = q.eq("source_account_id", user.id);
    }

    const { data: rows, error } = await q;
    if (error) throw error;

    return NextResponse.json({ rows: rows || [] });
  } catch (e) {
    console.error("orders/list error:", e);
    return NextResponse.json({ error: e?.message || "Fehler" }, { status: 500 });
  }
}
