"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TopNav() {
  const router = useRouter();

  const handleLogout = () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
      router.push("/");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <>
      <nav className="sb-topnav">
        <div className="inner">
          {/* Logo */}
          <Link href="/dashboard" className="brand">
            <img
              src="https://cdn.prod.website-files.com/6899bdb7664b4bd2cbd18c82/68ad4679902a5d278c4cf0bc_Group%202085662922-p-500.png"
              alt="Sternblitz"
              className="logo"
            />
          </Link>

          {/* Buttons rechts */}
          <div className="actions">
            <Link href="/dashboard/orders" className="btn orders">
              📄 Meine Aufträge
            </Link>

            <button type="button" className="btn logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="spacer" />

      <style jsx>{`
        /* ——— Container ——— */
        .sb-topnav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px) saturate(1.2);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
        }
        .spacer {
          height: 70px;
        }
        .inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* ——— Logo ——— */
        .logo {
          height: 44px;
          width: auto;
          object-fit: contain;
          transition: transform 0.2s ease;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.08));
        }
        .logo:hover {
          transform: scale(1.04);
        }

        /* ——— Button-Bereich ——— */
        .actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* ——— Buttons ——— */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          height: 40px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 14.5px;
          letter-spacing: 0.2px;
          text-decoration: none;
          cursor: pointer;
          border: none;
          transition: all 0.18s ease;
        }

        /* Hauptbutton */
        .btn.orders {
          background: linear-gradient(135deg, #ffffff 0%, #f3f7ff 100%);
          border: 1px solid rgba(11, 108, 242, 0.25);
          color: #0b6cf2;
          box-shadow: 0 6px 18px rgba(11, 108, 242, 0.18);
          font-weight: 800;
        }
        .btn.orders:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(11, 108, 242, 0.25);
          filter: brightness(1.05);
        }
        .btn.orders:active {
          transform: translateY(0);
          filter: brightness(0.98);
        }

        /* Logout: dezent, elegant */
        .btn.logout {
          background: #f5f5f7;
          color: #111;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
          font-weight: 600;
        }
        .btn.logout:hover {
          background: #e8e8ea;
          transform: translateY(-1px);
        }

        /* ——— Responsive ——— */
        @media (max-width: 900px) {
          .logo {
            height: 38px;
          }
          .btn {
            height: 36px;
            padding: 0 14px;
            font-size: 13.5px;
          }
        }

        @media (max-width: 640px) {
          .inner {
            padding: 10px 14px;
          }
          .logo {
            height: 32px;
          }
          .actions {
            gap: 8px;
          }
          .btn {
            height: 34px;
            padding: 0 12px;
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
}
