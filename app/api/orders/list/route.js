// app/api/orders/list/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { supabaseServerAuth } from "@/lib/supabaseServerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Zeitraum-Helfer
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfYesterday = () => {
  const d = startOfToday();
  d.setDate(d.getDate() - 1);
  return d;
};
const startOfNDaysAgo = (n) => {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
};
const toISO = (d) => new Date(d).toISOString();

export async function GET(req) {
  try {
    const supabaseAuth = supabaseServerAuth();
    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser();
    if (userErr) throw userErr;
    if (!user) {
      return NextResponse.json(
        { error: "Nicht eingeloggt" },
        { status: 401 }
      );
    }

    // Rolle bestimmen
    let role = user.user_metadata?.role || null;
    if (!role) {
      try {
        const { data: prof } = await supabaseAdmin()
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        role = prof?.role || null;
      } catch (profileError) {
        console.error("orders/list profile lookup", profileError);
      }
    }
    if (!role) role = "sales";

    // Zeitraum aus Query lesen
    const { searchParams } = new URL(req.url);
    const range = (searchParams.get("range") || "all").toString();

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

    const admin = supabaseAdmin();
    let query = admin
      .from("leads")
      .select(
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
        custom_notes,
        pdf_path,
        pdf_signed_url,
        source_account_id
      `
      )
      .order("created_at", { ascending: false })
      .limit(300);

    if (gte && lt) {
      query = query.gte("created_at", toISO(gte)).lt("created_at", toISO(lt));
    }

    if (role === "sales" || role === "team_lead") {
      query = query.eq("source_account_id", user.id);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const rows = Array.isArray(data)
      ? data.map((row) => ({
          ...row,
          customNotes: row.customNotes ?? row.custom_notes ?? null,
        }))
      : [];

    return NextResponse.json({ ok: true, rows });
  } catch (e) {
    console.error("orders/list error", e);
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
