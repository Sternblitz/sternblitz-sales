import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("/api/auth/logout", e);
    return NextResponse.json(
      { error: "Logout fehlgeschlagen." },
      { status: 500 }
    );
  }
}
