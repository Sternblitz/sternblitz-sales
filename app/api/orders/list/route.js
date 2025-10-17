// app/api/orders/list/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { supabaseServerAuth } from "@/lib/supabaseServerAuth";

export const runtime = "nodejs"; // Storage + Service Role benötigen Node Runtime

const toISO = (value) => new Date(value).toISOString();
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

async function resolveRole(user) {
  const rawRole = user?.user_metadata?.role;
  const normalized = typeof rawRole === "string" ? rawRole.toLowerCase() : null;
  if (normalized) {
    return normalized;
  }

  try {
    const { data, error } = await supabaseAdmin()
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    const profileRole = typeof data?.role === "string" ? data.role.toLowerCase() : null;
    return profileRole || "sales";
  } catch (e) {
    return "sales";
  }
}

function timeFilter(range) {
  if (range === "today") {
    const gte = startOfToday();
    const lt = new Date(gte);
    lt.setDate(lt.getDate() + 1);
    return { gte: toISO(gte), lt: toISO(lt) };
  }
  if (range === "yesterday") {
    return { gte: toISO(startOfYesterday()), lt: toISO(startOfToday()) };
  }
  if (range === "7d") {
    return { gte: toISO(startOfNDaysAgo(6)), lt: toISO(new Date()) };
  }
  return {};
}

export async function GET(req) {
  try {
    const authClient = supabaseServerAuth();
    const { data: userResult, error: userError } = await authClient.auth.getUser();
    if (userError) throw userError;
    const user = userResult?.user;
    if (!user) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }

    const effectiveRole = await resolveRole(user);
    const role = ["admin", "team_lead", "sales"].includes(effectiveRole)
      ? effectiveRole
      : "sales";

    const { searchParams } = new URL(req.url);
    const range = (searchParams.get("range") || "all").toString();
    const { gte, lt } = timeFilter(range);

    let query = supabaseAdmin()
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
          pdf_path,
          pdf_signed_url,
          source_account_id
        `
      )
      .order("created_at", { ascending: false })
      .limit(300);

    if (gte && lt) {
      query = query.gte("created_at", gte).lt("created_at", lt);
    }

    if (role !== "admin") {
      query = query.eq("source_account_id", user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ rows: data ?? [] });
  } catch (e) {
    console.error("orders/list error:", e);
    return NextResponse.json({ error: e?.message || "Fehler" }, { status: 500 });
  }
}
