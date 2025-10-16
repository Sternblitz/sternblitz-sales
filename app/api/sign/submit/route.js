import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

function dataUrlToUint8(signaturePng) {
  const base64 = signaturePng.split(",").pop() || "";
  const bin = Buffer.from(base64, "base64");
  return new Uint8Array(bin);
}

async function buildPdf(p, sigBytes) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const { height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = height - 70;
  page.drawText("Auftragsbestätigung Sternblitz", {
    x: 50, y, font: bold, size: 20, color: rgb(0, 0, 0),
  });

  y -= 20;
  page.drawText("Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.", {
    x: 50, y, font, size: 11, color: rgb(0, 0, 0),
  });

  y -= 25;
  const bullets = [
    "Fixpreis: 299 € (einmalig)",
    "Zahlung erst nach Löschung (von mind. 90 % der Bewertungen)",
    "Dauerhafte Entfernung",
  ];
  for (const b of bullets) {
    page.drawText("• " + b, { x: 50, y, font, size: 11 });
    y -= 16;
  }

  y -= 10;
  page.drawText("Zusammenfassung", { x: 50, y, font: bold, size: 12 });
  y -= 16;

  const lines = [
    ["Google-Profil", p.googleProfile],
    ["Bewertungen", p.selectedOption],
    ["Firma", p.company],
    ["Vorname", p.firstName],
    ["Nachname", p.lastName],
    ["E-Mail", p.email],
    ["Telefon", p.phone],
  ];
  for (const [k, v] of lines) {
    page.drawText(`${k}:`, { x: 50, y, font: bold, size: 10 });
    page.drawText(String(v || "—"), { x: 160, y, font, size: 10 });
    y -= 14;
  }

  y -= 12;
  page.drawText("Unterschrift:", { x: 50, y, font: bold, size: 11 });
  y -= 100;
  if (sigBytes?.length) {
    const png = await pdf.embedPng(sigBytes);
    page.drawImage(png, { x: 50, y, width: 200, height: 100 });
  }

  y -= 20;
  page.drawText(`Datum: ${new Date().toLocaleString("de-DE")}`, { x: 50, y, font, size: 10 });

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
    } = body;

    if (!googleProfile || !signaturePng)
      return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });

    const sigBytes = dataUrlToUint8(signaturePng);
    const pdfBytes = await buildPdf(body, sigBytes);

    const fileName = `${Date.now()}_${firstName || "kunde"}.pdf`;

    // Supabase Upload
    const { data, error } = await supabase()
      .storage.from("contracts")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase()
      .storage.from("contracts")
      .getPublicUrl(fileName);

    // Optional: Lead speichern (wenn du schon Tabelle „leads“ hast)
    await supabase().from("leads").insert([
      {
        google_profile: googleProfile,
        selected_option: selectedOption,
        company,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        pdf_path: fileName,
        pdf_url: publicUrlData.publicUrl,
      },
    ]);

    return NextResponse.json({
      ok: true,
      pdfUrl: publicUrlData.publicUrl,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Fehler" }, { status: 500 });
  }
}
