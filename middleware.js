import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // Nur /dashboard und /sign schützen
  const protectedPaths = ["/dashboard", "/sign"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (!isProtected) {
    // Login & andere Seiten bleiben unberührt
    return res;
  }

  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session && isProtected) {
    // Kein redirect-Parameter mehr — nur simpler Login-Redirect
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

// Middleware greift nur auf Dashboard und Sign
export const config = {
  matcher: ["/dashboard/:path*", "/sign"],
};
