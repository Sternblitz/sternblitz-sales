// lib/supabaseClient.js
"use client";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";

let client;

export function supabase() {
  if (!client) {
    client = createBrowserSupabaseClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
  }
  return client;
}
