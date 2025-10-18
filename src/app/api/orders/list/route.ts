import { NextResponse } from "next/server";
import { computeDateRange, normalizeRange } from "@/lib/orders/range";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (!session) {
      return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = normalizeRange(searchParams.get("range"));

    const dateRange = computeDateRange(range);

    let query = supabase
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ rows: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
