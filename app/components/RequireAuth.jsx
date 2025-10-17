"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RequireAuth({ children }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const sb = supabase();
        const { data } = await sb.auth.getUser();
        if (!data?.user) {
          router.replace("/login");
          return;
        }
        if (mounted) setOk(true);
      } catch {
        router.replace("/login");
      }
    };

    check();
    // zusätzlich: Session-Listener (Logout/Login Wechsel)
    const { data: sub } = supabase().auth.onAuthStateChange((_e, session) => {
      if (!session?.user) router.replace("/login");
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [router]);

  if (!ok) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "#64748b" }}>
        Wird geladen …
      </div>
    );
  }
  return children;
}
