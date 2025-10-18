// app/dashboard/layout.jsx
"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const fallbackName = (user) => {
  const meta = user?.user_metadata || {};
  return (
    meta.first_name ||
    meta.firstName ||
    meta.given_name ||
    (meta.name ? meta.name.split(" ")[0] : null) ||
    (user?.email ? user.email.split("@")[0] : "")
  );
};

export default function DashboardLayout({ children }) {
  const [ready, setReady] = useState(false);
  const [firstName, setFirstName] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let unsub;
    (async () => {
      const client = supabase();
      const { data } = await client.auth.getSession();
      if (!data?.session) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname || "/dashboard")}`);
        return;
      }
      setReady(true);

      const loadProfile = async () => {
        const { data: userData } = await client.auth.getUser();
        const user = userData?.user;
        if (!user) return;
        let name = fallbackName(user);
        try {
          const { data: profile } = await client
            .from("profiles")
            .select("first_name")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.first_name) name = profile.first_name;
        } catch {}
        setFirstName(name || "");
      };

      loadProfile();

      const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname || "/dashboard")}`);
        } else {
          loadProfile();
        }
      });
      unsub = () => sub.subscription.unsubscribe();
    })();
    return () => unsub?.();
  }, [router, pathname]);

  if (!ready) return null;

  return (
    <div className="dashboard-layout">
      <header className="dashboard-topbar" role="banner">
        <div className="topbar-brand">Sternblitz</div>
        {firstName ? <div className="topbar-greeting">Hallo {firstName}</div> : null}
      </header>
      <div className="dashboard-content" role="main">{children}</div>

      <style jsx>{`
        .dashboard-layout {
          min-height: 100vh;
          background: #eef2ff;
        }

        .dashboard-topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          font-weight: 600;
        }

        .topbar-brand {
          font-size: 18px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .topbar-greeting {
          font-size: 16px;
          color: #1f2937;
        }

        .dashboard-content {
          padding-top: 12px;
        }

        @media (max-width: 768px) {
          .dashboard-topbar {
            padding: 12px 16px;
          }

          .topbar-brand {
            font-size: 16px;
          }

          .topbar-greeting {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}
