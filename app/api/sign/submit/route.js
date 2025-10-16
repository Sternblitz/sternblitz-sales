// app/api/sign/submit/route.js
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs"; // Node (kein Edge)

//
// ------------------------ Helpers ------------------------
//

function dataUrlToUint8(signaturePng) {
  const base64 = (signaturePng || "").split(",").pop() || "";
  const bin = Buffer.from(base64, "base64");
  return new Uint8Array(bin);
}

// WinAnsi-sichere Texte (Emojis/Symbole entfernen)
function toWinAnsi(text = "") {
  return String(text).replace(
    /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F9FF}\u{2600}-\u{27BF}]/gu,
    ""
  );
}

// "123" | "12" | "1" | "custom" -> lesbares Label (ohne ⭐)
function labelFor(opt) {
  return opt === "123"
    ? "1–3 Sterne löschen"
    : opt === "12"
    ? "1–2 Sterne löschen"
    : opt === "1"
    ? "1 Stern löschen"
    : "Individuelle Löschungen";
}

// für orders.selected_option (enum)
function normalizeOption(opt) {
  return opt === "123"
    ? "remove_1_to_3"
    : opt === "12"
    ? "remove_1_to_2"
    : opt === "1"
    ? "remove_ones"
    : "individual";
}

function chosenCount(selectedOption, counts) {
  if (!counts) return null;
  if (selectedOption === "123") return counts.c123 ?? null;
  if (selectedOption === "12") return counts.c12 ?? null;
  if (selectedOption === "1") return counts.c1 ?? null;
  return null;
}

async function buildPdf(p, sigBytes) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const { height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const draw = (txt, opts) =>
    page.drawText(toWinAnsi(txt), { ...opts, color: rgb(0, 0, 0) });

  let y = height - 70;

  draw("Auftragsbestätigung Sternblitz", {
    x: 50,
    y,
    font: bold,
    size: 20,
  });

  y -= 20;
  draw(
    "Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.",
    { x: 50, y, font, size: 11 }
  );

  y -= 25;
  for (const b of [
    "Fixpreis: 299 € (einmalig)",
    "Zahlung erst nach Löschung (von mind. 90 % der Bewertungen)",
    "Dauerhafte Entfernung",
  ]) {
    draw("• " + b, { x: 50, y, font, size: 11 });
    y -= 16;
  }

  y -= 10;
  draw("Zusammenfassung", { x: 50, y, font: bold, size: 12 });
  y -= 16;

  const lines = [
    ["Google-Profil", p.googleProfile],
    ["Google-URL", p.googleUrl || "—"],
    ["Bewertungen", labelFor(p.selectedOption)],
    ["Firma", p.company || "—"],
    ["Vorname", p.firstName || "—"],
    ["Nachname", p.lastName || "—"],
    ["E-Mail", p.email || "—"],
    ["Telefon", p.phone || "—"],
  ];

  for (const [k, v] of lines) {
    draw(`${k}:`, { x: 50, y, font: bold, size: 10 });
    draw(String(v ?? "—"), { x: 180, y, font, size: 10 });
    y -= 14;
  }

  // Gewählte Option inkl. Menge
  const picked = chosenCount(p.selectedOption, p.counts);
  y -= 6;
  draw("Gewählte Löschung:", { x: 50, y, font: bold, size: 10 });
  draw(
    `${labelFor(p.selectedOption)}${
      picked != null ? ` — Anzahl: ${Number(picked).toLocaleString("de-DE")}` : ""
    }`,
    { x: 180, y, font, size: 10 }
  );
  y -= 14;

  // Kompakte Übersicht aller Zähler
  if (p.counts) {
    const c123 = Number(p.counts.c123 ?? 0).toLocaleString("de-DE");
    const c12 = Number(p.counts.c12 ?? 0).toLocaleString("de-DE");
    const c1 = Number(p.counts.c1 ?? 0).toLocaleString("de-DE");
    draw("Zähler gesamt:", { x: 50, y, font: bold, size: 10 });
    draw(`1–3: ${c123}   |   1–2: ${c12}   |   1: ${c1}`, {
      x: 180,
      y,
      font,
      size: 10,
    });
    y -= 14;
  }

  y -= 12;
  draw("Unterschrift:", { x: 50, y, font: bold, size: 11 });
  y -= 100;

  if (sigBytes?.length) {
    const png = await pdf.embedPng(sigBytes);
    page.drawImage(png, { x: 50, y, width: 200, height: 100 });
  }

  y -= 20;
  draw(`Datum: ${new Date().toLocaleString("de-DE")}`, {
    x: 50,
    y,
    font,
    size: 10,
  });

  return await pdf.save(); // Uint8Array
}

//
// ------------------------ Handler ------------------------
//

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      googleProfile,
      googleUrl, // <- wichtig für orders.google_profile_url
      selectedOption,
      company,
      firstName,
      lastName,
      email,
      phone,
      signaturePng,
      counts, // { c123, c12, c1 } optional
      // rep_code, source_account_id – später
    } = body || {};

    if (!googleProfile || !signaturePng) {
      return NextResponse.json(
        { error: "Ungültige Daten" },
        { status: 400 }
      );
    }

    // PDF generieren
    const sigBytes = dataUrlToUint8(signaturePng);
    const pdfBytes = await buildPdf(
      {
        googleProfile,
        googleUrl,
        selectedOption,
        company,
        firstName,
        lastName,
        email,
        phone,
        counts,
      },
      sigBytes
    );

    // Upload in Supabase Storage (Bucket: "contracts")
    const sb = supabaseAdmin();
    const safeBase =
      (firstName || "kunde").toString().trim().replace(/[^a-z0-9_-]+/gi, "_") ||
      "kunde";
    const fileName = `${Date.now()}_${safeBase}.pdf`;
    const buffer = Buffer.from(pdfBytes);

    const { error: uploadErr } = await sb.storage
      .from("contracts")
      .upload(fileName, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      console.error("Supabase upload error:", uploadErr);
      return NextResponse.json(
        { error: uploadErr.message || "Upload fehlgeschlagen" },
        { status: 500 }
      );
    }

    const { data: pub } = sb.storage.from("contracts").getPublicUrl(fileName);

    // Optional: in "leads" speichern (robust, ohne RLS-Probleme)
    try {
      await sb.from("leads").insert([
        {
          google_profile: googleProfile,
          google_url: googleUrl || null,
          selected_option: selectedOption,
          counts: counts ?? null,
          company,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          pdf_path: fileName,
          pdf_signed_url: pub.publicUrl,
          // rep_code, source_account_id später
        },
      ]);
    } catch (e) {
      console.warn("Leads-Insert Warnung:", e?.message || e);
    }

    // Optional: auch in "orders" schreiben (falls Schema aktiv)
    try {
      await sb.from("orders").insert([
        {
          business_name: company || null,
          google_profile_url: googleUrl || googleProfile, // NOT NULL im Schema
          contact_name: [firstName, lastName].filter(Boolean).join(" ") || null,
          contact_email: email || null,
          contact_phone: phone || null,
          selected_option: normalizeOption(selectedOption),
          individual_notes: null,
          contract_pdf_url: pub.publicUrl,
          signed_at: new Date().toISOString(),
          simulator_payload: counts ? { counts } : null,
          // status/payment_status bleiben Defaults
        },
      ]);
    } catch (e) {
      // Nicht fatal; nur loggen, wenn Tabelle/Enum nicht passt
      console.warn("Orders-Insert Warnung:", e?.message || e);
    }

    // E-Mail mit Resend (nicht blockierend bei Fehler)
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from =
        process.env.RESEND_FROM || "Sternblitz <onboarding@resend.dev>";
      const replyTo = process.env.RESEND_REPLY_TO || undefined;
      const bcc = process.env.RESEND_INTERNAL_BCC || undefined;

      const html = `
        <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#0f172a">
          <h2>Auftragsbestätigung – Sternblitz</h2>
          <p>Hallo ${toWinAnsi(
            [firstName, lastName].filter(Boolean).join(" ")
          ) || "Kunde"},</p>
          <p>vielen Dank! Ihre Auftragsbestätigung ist beigefügt. Sie können sie auch hier abrufen:</p>
          <p><a href="${pub.publicUrl}" target="_blank" style="color:#0b6cf2">PDF online öffnen</a></p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0"/>
          <p><b>Zusammenfassung</b></p>
          <ul>
            <li><b>Google-Profil:</b> ${toWinAnsi(googleProfile)}</li>
            <li><b>Google-URL:</b> ${googleUrl ? toWinAnsi(googleUrl) : "—"}</li>
            <li><b>Option:</b> ${toWinAnsi(labelFor(selectedOption))}</li>
            <li><b>Firma:</b> ${toWinAnsi(company || "—")}</li>
            <li><b>E-Mail:</b> ${toWinAnsi(email || "—")}</li>
            <li><b>Telefon:</b> ${toWinAnsi(phone || "—")}</li>
          </ul>
          <p>Bei Fragen können Sie einfach auf diese E-Mail antworten.</p>
          <p>Liebe Grüße<br/>Ihr Sternblitz Team</p>
        </div>
      `;

      const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
      const mailFileName = `${safeBase}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;

      await resend.emails.send({
        from,
        to: email || process.env.RESEND_FALLBACK_TO || "test@sternblitz.de",
        reply_to: replyTo,
        bcc,
        subject: "Ihre Auftragsbestätigung (Sternblitz)",
        html,
        attachments: [
          {
            filename: mailFileName,
            content: pdfBase64,
            contentType: "application/pdf",
          },
        ],
      });
    } catch (mailErr) {
      console.warn("Resend mail error:", mailErr?.message || mailErr);
    }

    return NextResponse.json({ ok: true, pdfUrl: pub.publicUrl });
  } catch (e) {
    console.error("sign/submit error:", e);
    return NextResponse.json({ error: e?.message || "Fehler" }, { status: 500 });
  }
}
