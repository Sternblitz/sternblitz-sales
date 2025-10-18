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
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("redirect", pathname || "/dashboard");
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

// Middleware greift nur auf Dashboard und Sign
export const config = {
  matcher: ["/dashboard/:path*", "/sign"],
};
