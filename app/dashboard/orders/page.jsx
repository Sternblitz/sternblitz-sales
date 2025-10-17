// app/dashboard/orders/page.jsx
"use client";

export default function OrdersPage() {
  return (
    <main style={{ maxWidth: 980, margin: "20px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>
        Meine Aufträge
      </h1>
      <p style={{ color: "#64748b", margin: 0 }}>
        Hier siehst du bald deine erfassten Aufträge mit Filter & Download.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#fff",
          boxShadow: "0 10px 24px rgba(2, 6, 23, .06)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: "#f8fafc",
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          📄 Übersicht folgt – Build ist wieder stabil.
        </div>
      </div>
    </main>
  );
}
