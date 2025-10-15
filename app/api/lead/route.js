// app/api/lead/route.js
import { NextResponse } from "next/server";

// Minimaler In-Memory-Store als Platzhalter
// (in Prod -> DB oder KV; serverless: pro Invocation leer, reicht als Demo)
let _LEADS = [];

export async function POST(req) {
  try {
    const body = await req.json();

    // simple validation (kannst du mit zod härter machen)
    const {
      googleProfile,
      selectedOption,
      customCount,
      company,
      firstName,
      lastName,
      email,
      phone,
      submittedAt,
    } = body || {};

    if (!googleProfile || !selectedOption || !company || !firstName || !lastName || !email) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (selectedOption === "custom" && (!customCount || Number(customCount) <= 0)) {
      return NextResponse.json(
        { ok: false, error: "customCount required for option=custom" },
        { status: 400 }
      );
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const lead = {
      id,
      googleProfile,
      selectedOption,
      customCount: selectedOption === "custom" ? Number(customCount) : null,
      company,
      firstName,
      lastName,
      email,
      phone: phone || "",
      submittedAt: submittedAt || new Date().toISOString(),
      status: "received",
    };

    _LEADS.push(lead);

    // TODO (nächste Schritte):
    // - PDF generieren
    // - E-Mail versenden
    // - Status -> "awaiting-signature" etc.

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
