import { createServerClient, type CookieOptions } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

type CookieStore = {
  get: (name: string) => { value: string } | string | undefined;
  set?: (cookie: { name: string; value: string } & CookieOptions) => void;
  delete?: (cookie: { name: string } & CookieOptions) => void;
  remove?: (name: string, options?: CookieOptions) => void;
};

type HeaderStore = {
  get: (name: string) => string | null | undefined;
};

type CreateServerSupabaseClientOptions = {
  cookieStore?: CookieStore;
  headerStore?: HeaderStore;
};

function readCookieValue(value: { value: string } | string | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value.value;
}

function applySetCookie(store: CookieStore | undefined, name: string, value: string, options: CookieOptions) {
  const target = store as any;
  if (typeof target?.set === "function") {
    target.set({ name, value, ...options });
  }
}

function applyDeleteCookie(store: CookieStore | undefined, name: string, options: CookieOptions) {
  const target = store as any;
  if (typeof target?.delete === "function") {
    target.delete({ name, ...options });
  } else if (typeof target?.remove === "function") {
    target.remove(name, options);
  }
}

export function createServerSupabaseClient<Database = any>({
  cookieStore,
  headerStore,
}: CreateServerSupabaseClientOptions = {}): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set"
    );
  }

  const resolvedCookies = cookieStore ?? cookies();
  const resolvedHeaders = headerStore ?? headers();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return readCookieValue(resolvedCookies.get(name));
      },
      set(name, value, options) {
        applySetCookie(resolvedCookies, name, value, options);
      },
      remove(name, options) {
        applyDeleteCookie(resolvedCookies, name, options);
      },
    },
    headers: {
      get(name) {
        const headerValue = resolvedHeaders.get(name);
        return headerValue ?? undefined;
      },
    },
  });
}
