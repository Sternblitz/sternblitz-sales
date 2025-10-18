import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("server supabase client only uses anon credentials", () => {
  const serverSource = readFileSync("src/lib/supabase/server.ts", "utf8");
  assert(!/SUPABASE_SERVICE_ROLE_KEY/.test(serverSource), "service role key should not be referenced");
  assert(/NEXT_PUBLIC_SUPABASE_ANON_KEY/.test(serverSource), "anon key must be used");
});

test("api routes rely on server client", () => {
  const ordersRoute = readFileSync("src/app/api/orders/list/route.ts", "utf8");
  assert(/createServerSupabaseClient/.test(ordersRoute), "orders API should use server Supabase client");
  const signRoute = readFileSync("src/app/api/sign/submit/route.ts", "utf8");
  assert(/createServerSupabaseClient/.test(signRoute), "sign API should use server Supabase client");
});
