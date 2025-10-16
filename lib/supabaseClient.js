import { createClient } from "@supabase/supabase-js";

let serverClient;

export function supabaseAdmin() {
  if (!serverClient) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error("Fehlende Supabase-Umgebungsvariablen für Server");
    }

    serverClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return serverClient;
}
