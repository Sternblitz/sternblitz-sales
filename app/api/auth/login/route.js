import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Bitte E-Mail und Passwort angeben." },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ ok: true, session: data.session });
  } catch (e) {
    console.error("/api/auth/login", e);
    return NextResponse.json(
      { error: "Login fehlgeschlagen." },
      { status: 500 }
    );
  }
}
