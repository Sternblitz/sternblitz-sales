// app/api/sign/submit/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

// ---- Helpers -------------------------------------------------
function dataUrlToUint8(signaturePng) {
  const base64 = (signaturePng || "").split(",").pop() || "";
  const bin = Buffer.from(base64, "base64");
  return new Uint8Array(bin);
}

// Nur ASCII/WinAnsi-sichere Zeichen (Emojis entfernen)
function sanitize(text = "") {
  return String(text).replace(
    /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F9FF}\u{2600}-\u{27BF}]/gu,
    ""
  );
}

// Deine UI-Option → DB-Enum
function mapRemovalOption(opt) {
  if (opt === "123") return "remove_1_to_3";
  if (opt === "12")  return "remove_1_to_2";
  if (opt === "1")   return "remove_ones";
  return "individual";
}

// Schöner Label-Text ohne Emojis
function optionLabel(opt) {
  if (opt === "123") return "1–3 Sterne löschen";
  if (opt === "12")  return "1–2 Sterne löschen";
  if (opt === "1")   return "1 Stern löschen";
  return "Individuelle Löschungen";
}

function pickedCount(selectedOption, counts) {
  if (!counts) return null;
  if (selectedOption === "123") return counts.c123 ?? null;
  if (selectedOption === "12")  return counts.c12  ?? null;
  if (selectedOption === "1")   return counts.c1   ?? null;
  return null;
}

// PDF Generator (A4, simpel & robust)
async function buildPdf(p, sigBytes) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const { height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const draw = (txt, opts) => page.drawText(sanitize(txt), opts);

  let y = height - 70;
  draw("Auftragsbestätigung Sternblitz", { x: 50, y, font: bold, size: 20, color: rgb(0,0,0) });

  y -= 20;
  draw("Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.", { x: 50, y, font, size: 11, color: rgb(0,0,0) });

  y -= 25;
  for (const b of [
    "Fixpreis: 299 € (einmalig)",
    "Zahlung erst nach Löschung (von mind. 90 % der Bewertungen)",
    "Dauerhafte Entfernung"
  ]) {
    draw("• " + b, { x: 50, y, font, size: 11, color: rgb(0,0,0) });
    y -= 16;
  }

  y -= 10;
  draw("Zusammenfassung", { x: 50, y, font: bold, size: 12, color: rgb(0,0,0) });
  y -= 16;

  const lines = [
    ["Google-Profil", p.googleProfile],
    ["Bewertungen", optionLabel(p.selectedOption)],
    ["Firma", p.company],
    ["Vorname", p.firstName],
    ["Nachname", p.lastName],
    ["E-Mail", p.email],
    ["Telefon", p.phone]
  ];

  for (const [k, v] of lines) {
    draw(`${k}:`, { x: 50, y, font: bold, size: 10, color: rgb(0,0,0) });
    draw(String(v ?? "—"), { x: 180, y, font, size: 10, color: rgb(0,0,0) });
    y -= 14;
  }

  const picked = pickedCount(p.selectedOption, p.counts);
  y -= 6;
  draw("Gewählte Löschung:", { x: 50, y, font: bold, size: 10, color: rgb(0,0,0) });
  draw(`${optionLabel(p.selectedOption)}${picked != null ? ` — Entfernte: ${Number(picked).toLocaleString("de-DE")}` : ""}`, { x: 180, y, font, size: 10, color: rgb(0,0,0) });
  y -= 14;

  if (p.counts) {
    const c123 = Number(p.counts.c123 ?? 0).toLocaleString("de-DE");
    const c12  = Number(p.counts.c12  ?? 0).toLocaleString("de-DE");
    const c1   = Number(p.counts.c1   ?? 0).toLocaleString("de-DE");
    draw("Zähler gesamt:", { x: 50, y, font: bold, size: 10, color: rgb(0,0,0) });
    draw(`1–3: ${c123}   |   1–2: ${c12}   |   1: ${c1}`, { x: 180, y, font, size: 10, color: rgb(0,0,0) });
    y -= 14;
  }

  y -= 12;
  draw("Unterschrift:", { x: 50, y, font: bold, size: 11, color: rgb(0,0,0) });
  y -= 100;

  if (sigBytes?.length) {
    const png = await pdf.embedPng(sigBytes);
    page.drawImage(png, { x: 50, y, width: 200, height: 100 });
  }

  y -= 20;
  draw(`Datum: ${new Date().toLocaleString("de-DE")}`, { x: 50, y, font, size: 10, color: rgb(0,0,0) });

  return await pdf.save();
}

// ---- Route ---------------------------------------------------
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      // Pflicht aus dem Step
      googleProfile,
      googleUrl,
      selectedOption,      // "123" | "12" | "1" | "custom"
      counts,              // { c123, c12, c1 }
      company,
      firstName,
      lastName,
      email,
      phone,
      customNotes,
      signaturePng,
      // Zuordnung (optional, wenn Sales eingeloggt)
      salesRepId,          // uuid aus auth.users / profiles.id
      teamId,              // optional – kann Trigger/Server später setzen
      repCode,             // falls du ?rep=XYZ in der URL hast
      // FYI (optional)
      ipAddress,
      deviceInfo
    } = body || {};

    if (!googleProfile || !signaturePng) {
      return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    // 1) Order anlegen (erst mal ohne URLs, damit wir IDs haben)
    const sb = supabaseAdmin();
    const { data: orderInsert, error: orderErr } = await sb
      .from("orders")
      .insert([{
        business_name: company || null,
        google_profile_url: googleUrl || null,
        contact_name: [firstName, lastName].filter(Boolean).join(" ") || null,
        contact_email: email || null,
        contact_phone: phone || null,

        simulator_payload: counts ? { counts } : null,
        selected_option: mapRemovalOption(selectedOption),
        individual_notes: customNotes || null,

        ip_address: ipAddress || null,
        device_info: deviceInfo || null,

        sales_rep_id: salesRepId || null,
        team_id: teamId || null,

        status: "in_progress",
        payment_status: "uninitialized",

        referral_code_used: repCode || null
      }])
      .select("id")
      .single();

    if (orderErr) {
      console.error(orderErr);
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }

    const orderId = orderInsert.id;

    // 2) Dateien erzeugen & hochladen
    const sigBytes = dataUrlToUint8(signaturePng);
    const pdfBytes = await buildPdf(
      { googleProfile, selectedOption, company, firstName, lastName, email, phone, counts },
      sigBytes
    );

    const pdfBuffer = Buffer.from(pdfBytes);
    const { error: upPdfErr } = await sb.storage.from("contracts").upload(
      `orders/${orderId}.pdf`,
      pdfBuffer,
      { contentType: "application/pdf", upsert: true }
    );
    if (upPdfErr) {
      console.error(upPdfErr);
      return NextResponse.json({ error: upPdfErr.message }, { status: 500 });
    }

    const { error: upSigErr } = await sb.storage.from("signatures").upload(
      `orders/${orderId}.png`,
      Buffer.from(sigBytes),
      { contentType: "image/png", upsert: true }
    );
    if (upSigErr) {
      console.error(upSigErr);
      // nicht fatal – wir fahren fort, aber loggen
    }

    // 3) (Optional) Public/Signed URL erstellen – hier Public-URL (falls Bucket public ist)
    const { data: pdfPub } = sb.storage.from("contracts").getPublicUrl(`orders/${orderId}.pdf`);
    const contract_pdf_url = pdfPub?.publicUrl || null;

    // 4) Order aktualisieren (URLs + signed_at)
    const { error: updErr } = await sb
      .from("orders")
      .update({
        contract_pdf_url,
        signature_url: upSigErr ? null : `signatures/orders/${orderId}.png`,
        signed_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (updErr) {
      console.error(updErr);
      // kein Hard-Stop
    }

    // 5) Event loggen
    await sb.from("order_events").insert([{
      order_id: orderId,
      event_type: "created",
      data: { selectedOption, counts, repCode, salesRepId }
    }]);

    return NextResponse.json({
      ok: true,
      orderId,
      pdfUrl: contract_pdf_url
    });

  } catch (e) {
    console.error("sign/submit error:", e);
    return NextResponse.json({ error: e?.message || "Fehler" }, { status: 500 });
  }
}
