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

          {/* Buttons */}
          <div className="actions">
            <Link href="/dashboard/orders" className="btn orders">
              <span className="label">Meine Aufträge</span>
              <span className="emoji">📄</span>
            </Link>

            <button type="button" className="btn logout" onClick={handleLogout}>
              <span className="label">Logout</span>
              <span className="emoji">🚪</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="sb-topnav-spacer" />

      <style jsx>{`
        .sb-topnav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: saturate(1.1) blur(8px);
          border-bottom: 1px solid #eef2ff;
          box-shadow: 0 8px 28px rgba(11, 108, 242, 0.05);
        }

        .sb-topnav-spacer {
          height: 68px;
        }

        .inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          align-items: center;
          text-decoration: none;
        }

        .logo {
          height: 42px;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.08));
          transition: transform 0.2s ease;
        }

        .logo:hover {
          transform: scale(1.04);
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 38px;
          padding: 0 18px;
          border-radius: 999px;
          font-weight: 800;
          letter-spacing: 0.2px;
          font-size: 14.5px;
          cursor: pointer;
          border: none;
          text-decoration: none;
          transition: transform 0.12s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .btn.orders {
          background: linear-gradient(135deg, #0b6cf2 0%, #3b82f6 100%);
          color: #fff;
          box-shadow: 0 8px 24px rgba(11, 108, 242, 0.35);
          border: 1px solid rgba(11, 108, 242, 0.1);
        }

        .btn.orders:hover {
          transform: translateY(-1px);
          filter: brightness(1.05);
          box-shadow: 0 10px 32px rgba(11, 108, 242, 0.45);
        }

        .btn.orders:active {
          transform: translateY(0);
          filter: brightness(0.98);
          box-shadow: 0 6px 16px rgba(11, 108, 242, 0.35);
        }

        .btn.logout {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          color: #0f172a;
          border: 1px solid #d1d5db;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
        }

        .btn.logout:hover {
          transform: translateY(-1px);
          filter: brightness(1.03);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.1);
        }

        .emoji {
          font-size: 16px;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .sb-topnav-spacer {
            height: 62px;
          }
          .logo {
            height: 38px;
          }
          .btn {
            height: 36px;
            font-size: 13.5px;
          }
        }

        @media (max-width: 640px) {
          .inner {
            padding: 10px 12px;
          }
          .btn {
            height: 34px;
            padding: 0 14px;
            border-radius: 12px;
            font-size: 13px;
          }
          .actions {
            gap: 8px;
          }
          .logo {
            height: 32px;
          }
        }
      `}</style>
    </>
  );
}
