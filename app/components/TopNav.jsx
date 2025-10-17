"use client";

import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

export default function TopBar() {
  const onLogout = async () => {
    try {
      const sb = supabase();
      await sb.auth.signOut();
    } catch {}
    // zurück zur Startseite
    window.location.href = "/";
  };

  return (
    <header className="topbar" role="banner" aria-label="Sternblitz">
      <div className="inner">
        <div className="brand">
          <Image
            src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ad4679902a5d278c4cf0bc_Group%202085662922-p-500.png"
            alt="Sternblitz"
            width={150}
            height={36}
            priority
          />
        </div>

        <nav className="actions" aria-label="Hauptaktionen">
          {/* === BLAUER PILL-BUTTON === */}
          <Link href="/dashboard/orders" className="btn order">
            <span className="ico" aria-hidden>📄</span>
            <span>Meine Aufträge</span>
          </Link>

          {/* === DEZENTER LOGOUT PILL === */}
          <button type="button" className="btn logout" onClick={onLogout}>
            Logout
          </button>
        </nav>
      </div>

      <style jsx>{`
        .topbar{
          position: sticky; top: 0; z-index: 20;
          background: rgba(255,255,255,.96);
          backdrop-filter: blur(6px) saturate(1.05);
          border-bottom: 1px solid #eef2f7;
        }
        .inner{
          max-width: 1208px;
          margin: 0 auto;
          padding: 10px 12px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
        }
        .brand :global(img){
          height: 40px; width: auto; object-fit: contain;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,.06));
        }
        .actions{ display: flex; align-items: center; gap: 10px; }

        /* Gemeinsame Button-Basis */
        .btn{
          appearance: none;
          display: inline-flex; align-items: center; gap: 10px;
          padding: 10px 16px;
          border-radius: 999px;
          font-weight: 800;
          letter-spacing: .2px;
          line-height: 1;
          white-space: nowrap;
          box-shadow: 0 10px 24px rgba(0,0,0,.06);
          transition: transform .12s ease, box-shadow .18s ease, filter .18s ease, background .18s ease;
          border: 1px solid transparent;
          text-decoration: none; /* Link-Underline AUS */
          cursor: pointer;
          user-select: none;
        }
        .btn:focus{ outline: none; box-shadow: 0 0 0 3px rgba(11,108,242,.20); }

        /* Blauer Aufträge-Button (Premium Card) */
        .btn.order{
          color: #fff;
          background: linear-gradient(135deg, #3b82f6 0%, #0b6cf2 100%);
          border-color: rgba(11,108,242,.25);
        }
        .btn.order:hover{
          transform: translateY(-1px);
          filter: brightness(1.03);
          box-shadow: 0 14px 30px rgba(11,108,242,.28);
        }
        .btn.order:active{
          transform: translateY(0);
          filter: brightness(.98);
          box-shadow: 0 8px 18px rgba(11,108,242,.22);
        }
        .btn.order .ico{ font-size: 18px; line-height: 1; }

        /* Dezenter Logout-Button (wie bisher) */
        .btn.logout{
          color: #0b0b0b;
          background: linear-gradient(135deg, #ffffff 0%, #f7f9ff 100%);
          border-color: #e5e7eb;
        }
        .btn.logout:hover{
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(2,6,23,.10);
        }
        .btn.logout:active{
          transform: translateY(0);
          box-shadow: 0 8px 18px rgba(2,6,23,.08);
        }

        /* Responsive */
        @media (max-width: 640px){
          .btn{ padding: 9px 14px; }
          .brand :global(img){ height: 34px; }
        }
      `}</style>
    </header>
  );
}
