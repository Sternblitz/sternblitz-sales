// middleware.js
import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

const PROTECTED_PREFIXES = ["/dashboard", "/sign"];

export async function middleware(req) {
  const url = new URL(req.url);
  const res = NextResponse.next();

  // Ist die Route geschützt?
  const isProtected = PROTECTED_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"));
  if (!isProtected) return res;

  // Supabase-User aus Cookies lesen
  const supabase = createMiddlewareClient({ req, res });
  const { data: { user } } = await supabase.auth.getUser();

  // Wenn NICHT eingeloggt -> auf /login schicken (oder auf / umleiten, falls du keine Login-Seite willst)
  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", url.pathname + url.search); // später zurück
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/sign/:path*",
    "/dashboard/:path*",
  ],
};
