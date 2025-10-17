// lib/supabaseServerAuth.js
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

export function supabaseServerAuth() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name) { return cookieStore.get(name)?.value; },
      set() {}, // Next managt das
      remove() {},
    },
  });
}
