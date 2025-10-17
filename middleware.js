import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Nur Session prüfen, wenn wir wirklich im geschützten Bereich sind
  const { pathname, search } = req.nextUrl;
  const isProtected = pathname.startsWith("/dashboard");

  if (!isProtected) {
    // Login, Startseite etc. – nichts anfassen, keine Cookies schreiben
    return res;
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (!session && isProtected) {
    const loginUrl = new URL("/login", req.url);
    // optionales Rücksprungziel
    loginUrl.searchParams.set("redirect", `${pathname}${search || ""}`);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

// WICHTIG: nur Dashboard schützen
export const config = { matcher: ["/dashboard/:path*"] };
