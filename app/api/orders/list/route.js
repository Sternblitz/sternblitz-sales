// app/api/orders/list/route.js
import { NextResponse } from "next/server";
import { cookies as getCookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

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

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      throw new Error("Missing Supabase configuration");
    }

    const requestCookies = req.cookies ?? getCookies();
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        get(name) {
          const cookie = requestCookies.get?.(name);
          if (!cookie) return undefined;
          if (typeof cookie === "string") return cookie;
          return cookie.value;
        },
        set() {},
        remove() {},
      },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData?.user;
    if (!user) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role, team_id")
      .eq("id", user.id)
      .maybeSingle();

    const role = user.user_metadata?.role || profileData?.role || "sales";
    const teamId = profileData?.team_id || null;

    let q = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (gte && lt) {
      q = q.gte("created_at", toISO(gte)).lt("created_at", toISO(lt));
    }

    if (role === "sales") {
      q = q.eq("sales_rep_id", user.id);
    } else if (role === "team_lead") {
      if (teamId) {
        q = q.eq("team_id", teamId);
      } else {
        q = q.eq("sales_rep_id", user.id);
      }
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
