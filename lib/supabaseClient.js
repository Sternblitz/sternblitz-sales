// lib/supabaseClient.js
"use client";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

let client;
export function supabase() {
  if (!client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    client = createClientComponentClient({
      supabaseUrl,
      supabaseKey: supabaseAnonKey,
    });
  }
  return client;
}
