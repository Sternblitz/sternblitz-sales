// app/api/sign/submit/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs"; // Node, nicht Edge

function dataUrlToUint8(signaturePng) {
  const base64 = (signaturePng || "").split(",").pop() || "";
  const bin = Buffer.from(base64, "base64");
  return new Uint8Array(bin);
}
function toWinAnsi(text = "") {
  // Emojis und Symbols raus – WinAnsi sicher
  return String(text).replace(
    /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F9FF}\u{2600}-\u{27BF}]/gu,
    ""
  );
}

function labelFor(opt) {
  return opt === "123" ? "1–3 Sterne löschen"
       : opt === "12"  ? "1–2 Sterne löschen"
       : opt === "1"   ? "1 Stern löschen"
       : "Individuelle Löschungen";
}
function labelFor(opt) {
  return opt === "123" ? "1–3 ⭐ löschen"
       : opt === "12"  ? "1–2 ⭐ löschen"
       : opt === "1"   ? "1 ⭐ löschen"
       : "Individuelle Löschungen";
}

function chosenCount(selectedOption, counts) {
  if (!counts) return null;
  if (selectedOption === "123") return counts.c123 ?? null;
  if (selectedOption === "12")  return counts.c12  ?? null;
  if (selectedOption === "1")   return counts.c1   ?? null;
  return null;
}

async function buildPdf(p, sigBytes) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const { height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const draw = (txt, opts) => page.drawText(toWinAnsi(txt), opts);

  let y = height - 70;
  draw("Auftragsbestätigung Sternblitz", { x: 50, y, font: bold, size: 20, color: rgb(0,0,0) });

  y -= 20;
  draw("Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.",
       { x: 50, y, font, size: 11, color: rgb(0,0,0) });

  y -= 25;
  for (const b of [
    "Fixpreis: 299 € (einmalig)",
    "Zahlung erst nach Löschung (von mind. 90 % der Bewertungen)",
    "Dauerhafte Entfernung",
  ]) {
    draw("• " + b, { x: 50, y, font, size: 11, color: rgb(0,0,0) });
    y -= 16;
  }

  y -= 10;
  draw("Zusammenfassung", { x: 50, y, font: bold, size: 12, color: rgb(0,0,0) });
  y -= 16;

  const lines = [
    ["Google-Profil", p.googleProfile],
    ["Bewertungen", labelFor(p.selectedOption)],
    ["Firma", p.company],
    ["Vorname", p.firstName],
    ["Nachname", p.lastName],
    ["E-Mail", p.email],
    ["Telefon", p.phone],
  ];
  for (const [k, v] of lines) {
    draw(`${k}:`, { x: 50, y, font: bold, size: 10, color: rgb(0,0,0) });
    draw(String(v ?? "—"), { x: 180, y, font, size: 10, color: rgb(0,0,0) });
    y -= 14;
  }

  // gewählte Option + Zähler
  const picked = p.selectedOption === "123" ? p?.counts?.c123
               : p.selectedOption === "12"  ? p?.counts?.c12
               : p.selectedOption === "1"   ? p?.counts?.c1
               : null;

  y -= 6;
  draw("Gewählte Löschung:", { x: 50, y, font: bold, size: 10, color: rgb(0,0,0) });
  draw(`${labelFor(p.selectedOption)}${picked != null ? ` — Entfernte: ${Number(picked).toLocaleString("de-DE")}` : ""}`,
       { x: 180, y, font, size: 10, color: rgb(0,0,0) });
  y -= 14;

  if (p.counts) {
    const c123 = Number(p.counts.c123 ?? 0).toLocaleString("de-DE");
    const c12  = Number(p.counts.c12  ?? 0).toLocaleString("de-DE");
    const c1   = Number(p.counts.c1   ?? 0).toLocaleString("de-DE");
    draw("Zähler gesamt:", { x: 50, y, font: bold, size: 10, color: rgb(0,0,0) });
    // keine ⭐ mehr
    draw(`1–3: ${c123}   |   1–2: ${c12}   |   1: ${c1}`,
         { x: 180, y, font, size: 10, color: rgb(0,0,0) });
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

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      googleProfile,
      selectedOption,
      company,
      firstName,
      lastName,
      email,
      phone,
      signaturePng,
      counts, // { c123, c12, c1 } optional
    } = body || {};

    if (!googleProfile || !signaturePng) {
      return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    // PDF bauen (inkl. counts)
    const sigBytes = dataUrlToUint8(signaturePng);
    const pdfBytes = await buildPdf(
      { googleProfile, selectedOption, company, firstName, lastName, email, phone, counts },
      sigBytes
    );

    // Upload zu Supabase Storage (Server-Client!)
    const sb = supabaseAdmin();

    // Dateiname sicher machen (nur Buchstaben/Ziffern/Unterstrich/Minus)
    const safeBase = (firstName || "kunde").toString().trim().replace(/[^a-z0-9_-]+/gi, "_") || "kunde";
    const fileName = `${Date.now()}_${safeBase}.pdf`;

    const buffer = Buffer.from(pdfBytes);

    const { error: uploadErr } = await sb
      .storage
      .from("contracts")       // Bucket-Name genau so wie im Dashboard
      .upload(fileName, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      console.error("Supabase upload error:", uploadErr);
      return NextResponse.json({ error: uploadErr.message || "Upload fehlgeschlagen" }, { status: 500 });
    }

    const { data: pub } = sb.storage.from("contracts").getPublicUrl(fileName);
    const picked = chosenCount(selectedOption, counts);

    // Optional: in Tabelle "leads" persistieren (Spalten anlegen falls nicht da)
    try {
      await sb.from("leads").insert([{
        google_profile: googleProfile,
        selected_option: selectedOption,
        company,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        option_counts: counts ?? null,              // JSONB
        option_chosen_count: picked ?? null,        // INT
        pdf_path: fileName,
        pdf_url: pub.publicUrl,
      }]);
    } catch (e) {
      // Nicht fatal fürs PDF – nur loggen
      console.warn("Leads-Insert Warnung:", e?.message || e);
    }

    return NextResponse.json({ ok: true, pdfUrl: pub.publicUrl });
  } catch (e) {
    console.error("sign/submit error:", e);
    return NextResponse.json({ error: e?.message || "Fehler" }, { status: 500 });
  }
}
