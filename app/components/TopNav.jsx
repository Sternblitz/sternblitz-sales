"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TopNav() {
  const router = useRouter();

  const handleLogout = () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
      router.push("/"); // zurück zur Startseite
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <>
      <nav className="sb-topnav" role="navigation" aria-label="Hauptnavigation">
        <div className="inner">
          {/* Logo */}
          <Link href="/dashboard" className="brand" aria-label="Sternblitz – zurück zum Dashboard">
            <img
              src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ad4679902a5d278c4cf0bc_Group%202085662922-p-500.png"
              alt="Sternblitz"
              className="logo"
            />
          </Link>

          {/* Actions */}
          <div className="actions">
            <Link href="/dashboard/orders" className="btn primary">
              Meine Aufträge
            </Link>
            <button type="button" className="btn ghost" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* spacer (damit Content nicht hinter der Topbar liegt) */}
      <div className="sb-topnav-spacer" />

      <style jsx>{`
        .sb-topnav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: saturate(1.1) blur(8px);
          border-bottom: 1px solid #eef2ff;
        }
        .sb-topnav-spacer {
          height: 64px; /* gleiche Höhe wie nav */
        }
        .inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .logo {
          height: 40px;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.08));
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 36px;
          padding: 0 14px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.18s ease, filter 0.18s ease;
          border: 1px solid transparent;
        }
        .btn.primary {
          background: #0b6cf2;
          color: #fff;
          border-color: #0b6cf2;
          box-shadow: 0 4px 12px rgba(11, 108, 242, 0.25);
        }
        .btn.primary:hover {
          transform: translateY(-1px);
          filter: brightness(1.03);
          box-shadow: 0 6px 16px rgba(11, 108, 242, 0.35);
        }
        .btn.ghost {
          background: #f3f4f6;
          color: #0f172a;
          border-color: #e5e7eb;
        }
        .btn.ghost:hover {
          transform: translateY(-1px);
          filter: brightness(1.03);
          box-shadow: 0 6px 16px rgba(2, 6, 23, 0.08);
        }

        /* Tablet */
        @media (max-width: 900px) {
          .sb-topnav-spacer { height: 60px; }
          .logo { height: 36px; }
          .btn { height: 34px; padding: 0 12px; font-size: 13px; }
        }

        /* Mobile */
        @media (max-width: 640px) {
          .inner {
            gap: 8px;
          }
          .logo {
            height: 32px;
          }
          .actions {
            gap: 8px;
          }
          .btn {
            height: 32px;
            padding: 0 10px;
            font-size: 12.5px;
            border-radius: 9px;
          }
          /* bei sehr schmalen Displays: Buttons umbrechen */
          @supports (gap: 8px) {
            .actions {
              flex-wrap: wrap;
              justify-content: flex-end;
            }
          }
        }
      `}</style>
    </>
  );
}
