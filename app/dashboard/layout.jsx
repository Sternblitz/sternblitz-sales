// app/dashboard/layout.jsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardLayout({ children }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const redirectTarget = "/login?redirect=/dashboard";
    let unsub = null;
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase().auth.getSession();
        if (!isMounted) return;
        if (error || !data?.session) {
          router.replace(redirectTarget);
          return;
        }
        setReady(true);
        const { data: listener } = supabase().auth.onAuthStateChange((_, session) => {
          if (!session) {
            if (isMounted) {
              setReady(false);
            }
            router.replace(redirectTarget);
          }
        });
        unsub = () => listener.subscription.unsubscribe();
      } catch (e) {
        if (!isMounted) return;
        router.replace(redirectTarget);
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
      unsub?.();
    };
  }, [router]);

  if (!ready) return null;
  return children;
}
