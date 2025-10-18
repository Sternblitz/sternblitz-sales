import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { supabaseServerAuth } from "@/lib/supabaseServerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const toISO = (d) => new Date(d).toISOString();

export async function GET(req) {
  try {
    const supabaseAuth = supabaseServerAuth();
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();
    if (userError) throw userError;
    if (!user) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }

    let role = user.user_metadata?.role || null;
    if (!role) {
      try {
        const { data: profile } = await supabaseAdmin()
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        role = profile?.role || null;
      } catch (profileError) {
        console.warn("orders/list role fetch failed", profileError);
      }
    }
    if (!role) role = "sales";

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

    let query = supabaseAdmin()
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
        source_account_id
      `)
      .order("created_at", { ascending: false })
      .limit(300);

    if (gte && lt) {
      query = query.gte("created_at", toISO(gte)).lt("created_at", toISO(lt));
    }

    if (role === "sales" || role === "team_lead") {
      query = query.eq("source_account_id", user.id);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    return NextResponse.json({ rows: rows || [] });
  } catch (error) {
    console.error("orders/list error", error);
    const status = error?.status ?? 500;
    const message = error?.message || "Fehler beim Laden der Aufträge";
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    return NextResponse.json({ error: message }, { status: safeStatus });
  }
}
