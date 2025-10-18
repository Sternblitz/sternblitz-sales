"use client";

import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

type CreateBrowserClientOptions = {
  autoRefreshToken?: boolean;
  persistSession?: boolean;
};

let browserClient: SupabaseClient | undefined;

export function createBrowserSupabaseClient<Database = any>({
  autoRefreshToken = true,
  persistSession = true,
}: CreateBrowserClientOptions = {}): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set"
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken,
        persistSession,
      },
    });
  }

  return browserClient as SupabaseClient<Database>;
}
