// app/api/sign/submit/route.js
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/** ---------- helpers ---------- */

function dataUrlToUint8(signaturePng) {
  const base64 = (signaturePng || "").split(",").pop() || "";
  const bin = Buffer.from(base64, "base64");
  return new Uint8Array(bin);
}

// Entfernt Emojis/Symbole, die die WinAnsi-Schrift nicht zeichnen kann
function toWinAnsi(text = "") {
  return String(text).replace(
    /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F9FF}\u{2600}-\u{27BF}]/gu,
    ""
  );
}

function labelFor(opt) {
  // KEINE ⭐ mehr im PDF-Text, damit WinAnsi nicht crasht
  return opt === "123" ? "1–3 Sterne löschen"
    : opt === "12"     ? "1–2 Sterne löschen"
    : opt === "1"      ? "1 Stern löschen"
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
  const page = pdf.addPage([595, 842]); // A4
  const { height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const draw = (txt, opts) => page.drawText(toWinAnsi(txt), opts);

  let y = height - 70;
  draw("Auftragsbestätigung Sternblitz", { x: 50, y, font: bold, size: 20, color: rgb(0,0,0) });

  y -= 22;
  draw("Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.", {
    x: 50, y, font, size: 11, color: rgb(0,0,0)
  });

  y -= 25;
  for (const b of [
    "Fixpreis: 299 € (einmalig)",
    "Zahlung erst nach Löschung (von mind. 90 % der Bewertungen)",
    "Dauerhafte Entfernung",
  ]) {
    draw("• " + b, { x: 50, y, font, size: 11, color: rgb(0,0,0) });
    y -= 16;
  }

  y -= 12;
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

  const picked = chosenCount(p.selectedOption, p.counts);
  y -= 6;
  draw("Gewählte Löschung:", { x: 50, y, font: bold, size: 10, color: rgb(0,0,0) });
  draw(
    `${labelFor(p.selectedOption)}${picked != null ? ` — Anzahl: ${Number(picked).toLocaleString("de-DE")}` : ""}`,
    { x: 180, y, font, size: 10, color: rgb(0,0,0) }
  );
  y -= 14;

  if (p.counts) {
    const c123 = Number(p.counts.c123 ?? 0).toLocaleString("de-DE");
    const c12  = Number(p.counts.c12  ?? 0).toLocaleString("de-DE");
    const c1   = Number(p.counts.c1   ?? 0).toLocaleString("de-DE");
    draw("Zähler gesamt:", { x: 50, y, font: bold, size: 10, color: rgb(0,0,0) });
    draw(`1–3: ${c123}   |   1–2: ${c12}   |   1: ${c1}`, { x: 180, y, font, size: 10, color: rgb(0,0,0) });
    y -= 14;
  }

  y -= 10;
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

function sanitizeEmailField(v) {
  return (v || "").trim().replace(/\s+/g, " "); // kill CR/LF & double spaces
}

// quick format check (simplified, reicht für Resend)
function isEmailOrNameAddr(v) {
  if (!v) return false;
  const s = sanitizeEmailField(v);
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ||               // email@domain
    /^[^<>]+<[^<>@]+@[^<>@]+\.[^<>@]+>$/.test(s)          // Name <email@domain>
  );
}

/** ---------- route ---------- */

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
      counts, // { c123, c12, c1 }
    } = body || {};

    if (!googleProfile || !signaturePng) {
      return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    // PDF erstellen
    const sigBytes = dataUrlToUint8(signaturePng);
    const pdfBytes = await buildPdf(
      { googleProfile, selectedOption, company, firstName, lastName, email, phone, counts },
      sigBytes
    );

    // Supabase: Upload
    const sb = supabaseAdmin();
    const safeBase = (firstName || "kunde").toString().trim().replace(/[^a-z0-9_-]+/gi, "_") || "kunde";
    const fileName = `${Date.now()}_${safeBase}.pdf`;
    const buffer = Buffer.from(pdfBytes);

    const { error: uploadErr } = await sb.storage.from("contracts")
      .upload(fileName, buffer, { contentType: "application/pdf", upsert: false });

    if (uploadErr) {
      console.error("Supabase upload error:", uploadErr);
      return NextResponse.json({ error: uploadErr.message || "Upload fehlgeschlagen" }, { status: 500 });
    }

    const { data: pub } = sb.storage.from("contracts").getPublicUrl(fileName);
    const pdfUrl = pub?.publicUrl;

    // Optional: Lead protokollieren (falls Tabelle existiert)
    try {
      await sb.from("leads").insert([{
        google_profile: googleProfile,
        selected_option: selectedOption,
        company,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        counts: counts ?? null,
        pdf_path: fileName,
        pdf_signed_url: pdfUrl ?? null,
      }]);
    } catch (e) {
      console.warn("leads insert warn:", e?.message || e);
    }

    // E-Mail schicken (Resend)
    const resend = new Resend(process.env.RESEND_API_KEY);
    const FROM = sanitizeEmailField(process.env.RESEND_FROM);
    const REPLY_TO = sanitizeEmailField(process.env.RESEND_REPLY_TO);

    // Falls Domain noch nicht verifiziert ist oder From/ReplyTo invalid → nicht crashen
    let mailResult = { sent: false };
    if (email && isEmailOrNameAddr(FROM)) {
      const attach = String(process.env.EMAIL_ATTACH_PDF || "").toLowerCase() === "true";
      const subject = "Deine Auftragsbestätigung – Sternblitz";
      const previewText = "Danke für deine Unterschrift. Hier ist deine Bestätigung.";
      const intro = `Hallo ${firstName || ""}`.trim() || "Hallo";

      const html = `
        <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.55;color:#0f172a">
          <p style="margin:0 0 12px">${intro},</p>
          <p style="margin:0 0 12px">
            danke für deine Unterschrift! Wir starten jetzt mit der Entfernung der ausgewählten Bewertungen.
          </p>
          <p style="margin:0 0 12px">
            <b>Auswahl:</b> ${toWinAnsi(labelFor(selectedOption))}${
              counts ? ` · Gesamt: 1–3: ${counts.c123 ?? 0} | 1–2: ${counts.c12 ?? 0} | 1: ${counts.c1 ?? 0}` : ""
            }
          </p>
          <p style="margin:0 0 12px">
            Deine Auftragsbestätigung (PDF) findest du hier:<br/>
            <a href="${pdfUrl}" target="_blank" rel="noopener" style="color:#0b6cf2">${pdfUrl}</a>
          </p>
          <p style="margin:16px 0 0">Viele Grüße<br/>Sternblitz Auftragsservice</p>
        </div>
      `;

      const text = [
        `${intro},`,
        "",
        "Danke für deine Unterschrift! Wir starten jetzt mit der Entfernung der ausgewählten Bewertungen.",
        `Auswahl: ${labelFor(selectedOption)}${
          counts ? ` · Gesamt: 1–3: ${counts.c123 ?? 0} | 1–2: ${counts.c12 ?? 0} | 1: ${counts.c1 ?? 0}` : ""
        }`,
        "",
        `PDF: ${pdfUrl}`,
        "",
        "Viele Grüße",
        "Sternblitz Auftragsservice",
      ].join("\n");

      const payload = {
        from: FROM,
        to: email,
        subject,
        html,
        text,
        headers: { "X-Entity-Ref-ID": fileName }, // optionale Nachverfolgung
        ...(isEmailOrNameAddr(REPLY_TO) ? { reply_to: REPLY_TO } : {}),
        ...(attach
          ? { attachments: [{ filename: fileName, content: pdfBytes, contentType: "application/pdf" }] }
          : {}),
      };

      try {
        const sent = await resend.emails.send(payload);
        mailResult = { sent: true, id: sent?.id || null };
      } catch (err) {
        console.warn("Resend send warn:", err?.message || err);
      }
    } else {
      console.warn("E-Mail übersprungen: invalid FROM or missing recipient.");
    }

    return NextResponse.json({
      ok: true,
      pdfUrl,
      email: { sent: mailResult.sent },
    });
  } catch (e) {
    console.error("sign/submit error:", e);
    return NextResponse.json({ error: e?.message || "Fehler" }, { status: 500 });
  }
}
