// app/api/sign/submit/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getResend } from "@/lib/resendClient";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

// --- utils ---
function dataUrlToUint8(signaturePng) {
  const base64 = (signaturePng || "").split(",").pop() || "";
  const bin = Buffer.from(base64, "base64");
  return new Uint8Array(bin);
}
function toWinAnsi(text = "") {
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
  const picked = chosenCount(p.selectedOption, p.counts);
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

// --- API handler ---
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
      counts,        // { c123, c12, c1 }
      rep_code,      // optional (zuordnung)
      source_account_id, // optional
    } = body || {};

    if (!googleProfile || !signaturePng || !email) {
      return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    // 1) PDF bauen
    const sigBytes = dataUrlToUint8(signaturePng);
    const pdfBytes = await buildPdf(
      { googleProfile, selectedOption, company, firstName, lastName, email, phone, counts },
      sigBytes
    );

    // 2) Hochladen
    const sb = supabaseAdmin();
    const safeBase = (firstName || "kunde").toString().trim().replace(/[^a-z0-9_-]+/gi, "_") || "kunde";
    const fileName = `${Date.now()}_${safeBase}.pdf`;
    const buffer = Buffer.from(pdfBytes);

    const { error: uploadErr } = await sb
      .storage
      .from("contracts")
      .upload(fileName, buffer, { contentType: "application/pdf", upsert: false });

    if (uploadErr) {
      console.error("Supabase upload error:", uploadErr);
      return NextResponse.json({ error: uploadErr.message || "Upload fehlgeschlagen" }, { status: 500 });
    }
    const { data: pub } = sb.storage.from("contracts").getPublicUrl(fileName);
    const pdfUrl = pub?.publicUrl;

    // 3) Lead/Order-ähnlichen Datensatz sichern (leichtgewichtige leads-Tabelle)
    const picked = chosenCount(selectedOption, counts);
    try {
      await sb.from("leads").insert([{
        google_profile: googleProfile,
        google_url: null,
        selected_option: selectedOption,
        counts: counts ?? null,
        company,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        custom_notes: null,
        pdf_path: fileName,
        pdf_signed_url: pdfUrl,
        rep_code: rep_code ?? null,
        source_account_id: source_account_id ?? null,
      }]);
    } catch (e) {
      console.warn("Leads insert warn:", e?.message || e);
    }

    // 4) E-Mail mit Resend schicken (Kunde + optional BCC intern)
    try {
      const resend = getResend();
      const from = process.env.RESEND_FROM;
      const replyTo = process.env.RESEND_REPLY_TO || undefined;

      const subject = "Deine Auftragsbestätigung – Sternblitz";
      const prettyOption = labelFor(selectedOption);
      const pickedText = picked != null ? ` (Entfernte: ${Number(picked).toLocaleString("de-DE")})` : "";

      const html = `
        <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
          <h2>Danke für deine Unterschrift, ${firstName || ""}!</h2>
          <p>Hier ist deine Auftragsbestätigung als PDF:</p>
          <p><a href="${pdfUrl}" style="font-weight:700">PDF herunterladen</a></p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
          <p><strong>Zusammenfassung</strong></p>
          <ul>
            <li>Google-Profil: ${googleProfile}</li>
            <li>Option: ${prettyOption}${pickedText}</li>
            <li>Firma/Kontakt: ${company || "—"} / ${firstName || ""} ${lastName || ""}</li>
            <li>E-Mail: ${email}</li>
            <li>Telefon: ${phone || "—"}</li>
          </ul>
          <p>Bei Fragen einfach auf diese E-Mail antworten – wir sind für dich da.</p>
          <p>— Dein Sternblitz Team</p>
        </div>
      `;
      const text =
        `Danke für deine Unterschrift!\n\n` +
        `PDF: ${pdfUrl}\n\n` +
        `Google-Profil: ${googleProfile}\n` +
        `Option: ${prettyOption}${pickedText}\n` +
        `Kontakt: ${company || "—"} / ${firstName || ""} ${lastName || ""}\n` +
        `E-Mail: ${email}\nTelefon: ${phone || "—"}\n`;

      await resend.emails.send({
        from,
        to: email,
        subject,
        html,
        text,
        reply_to: replyTo,
        // bcc: "intern@sternblitz.de" // optional
      });
    } catch (e) {
      console.warn("Resend warn:", e?.message || e);
      // E-Mail-Fehler blockiert nicht den Abschluss
    }

    return NextResponse.json({ ok: true, pdfUrl });
  } catch (e) {
    console.error("sign/submit error:", e);
    return NextResponse.json({ error: e?.message || "Fehler" }, { status: 500 });
  }
}
