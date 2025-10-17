// middleware.js
import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req) {
  const res = NextResponse.next();
  const url = req.nextUrl;
  const { pathname, search } = url;

  // Seiten, die Login benötigen
  const protectedPrefixes = ["/dashboard", "/sign"];
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

  // Supabase-Session lesen (Edge-sicher)
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 1) Nicht eingeloggt, aber geschützte Seite -> auf Login
  if (!session && isProtected) {
    const redirectTo = `${pathname}${search || ""}`;
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", redirectTo);
    return NextResponse.redirect(loginUrl);
  }

  // 2) Eingeloggt und auf /login -> nach Dashboard
  if (session && pathname === "/login") {
    const dashUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(dashUrl);
  }

  // 3) Alles andere normal ausliefern
  return res;
}

// WICHTIG: /login mitmatchen, aber die Logik oben verhindert die Schleife
export const config = {
  matcher: ["/login", "/dashboard/:path*", "/sign"],
};
