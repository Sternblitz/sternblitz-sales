// app/api/sign/submit/route.js
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs"; // Node, nicht Edge

// -------- Helpers --------
function dataUrlToUint8(signaturePng) {
  const base64 = (signaturePng || "").split(",").pop() || "";
  const bin = Buffer.from(base64, "base64");
  return new Uint8Array(bin);
}

// WinAnsi kann keine Emojis/Symbole – filter raus
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

function safeFileBase(name) {
  return (name || "kunde").toString().trim().replace(/[^a-z0-9_-]+/gi, "_") || "kunde";
}

function makePromoCode(firstName = "", lastName = "") {
  const fn = (firstName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ln = (lastName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const firstL = ln.slice(0, 1);
  const lastL = ln.slice(-1);
  return `${fn}${firstL}${lastL}25`; // z.B. durimd25
}

function isValidFromOrReplyTo(s = "") {
  return (
    /^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(s) ||
    /^[^<>]+<[^<>\s@]+@[^<>\s@]+\.[^<>]+>$/.test(s)
  );
}

// -------- PDF --------
async function buildPdf(p, sigBytes) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const { height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const draw = (txt, opts) => page.drawText(toWinAnsi(txt), opts);

  let y = height - 70;
  draw("Auftragsbestätigung Sternblitz", { x: 50, y, font: bold, size: 20, color: rgb(0,0,0) });

  y -= 20;
  draw(
    "Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.",
    { x: 50, y, font, size: 11, color: rgb(0,0,0) }
  );

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

// -------- Handler --------
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
      counts, // {c123,c12,c1}
      // optional später: rep_code, source_account_id etc.
    } = body || {};

    if (!googleProfile || !signaturePng) {
      return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    // PDF
    const sigBytes = dataUrlToUint8(signaturePng);
    const pdfBytes = await buildPdf(
      { googleProfile, selectedOption, company, firstName, lastName, email, phone, counts },
      sigBytes
    );

    // Upload
    const sb = supabaseAdmin();
    const safeBase = safeFileBase(firstName);
    const fileName = `${Date.now()}_${safeBase}.pdf`;

    const { error: uploadErr } = await sb
      .storage
      .from("contracts")
      .upload(fileName, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) throw uploadErr;

    const { data: pub } = sb.storage.from("contracts").getPublicUrl(fileName);
    const pdfUrl = pub?.publicUrl;

    // Optional: lead speichern (nicht kritisch)
    try {
      const picked = chosenCount(selectedOption, counts);
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
        pdf_path: fileName,
        pdf_signed_url: pdfUrl,
        option_chosen_count: picked ?? null,
      }]);
    } catch (e) {
      console.warn("Leads insert warn:", e?.message || e);
    }

    // ------ E-Mail mit Resend ------
    const resend = new Resend(process.env.RESEND_API_KEY);
    const FROM = process.env.RESEND_FROM || "";
    const REPLY_TO = process.env.RESEND_REPLY_TO || "";
    const ATTACH = String(process.env.EMAIL_ATTACH_PDF || "").toLowerCase() === "true";

    const subject = "Deine Auftragsbestätigung – Sternblitz";
    const chosenLabel = labelFor(selectedOption);
    const c123 = Number(counts?.c123 ?? 0).toLocaleString("de-DE");
    const c12  = Number(counts?.c12  ?? 0).toLocaleString("de-DE");
    const c1   = Number(counts?.c1   ?? 0).toLocaleString("de-DE");
    const promo = makePromoCode(firstName, lastName);

    // Platzhalter Referral-Link – später echt befüllen
    const referralLink = `https://sternblitz.de/empfehlen?ref=DEMO`;

    const html = `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;color:#0f172a">
    <p>Hallo ${firstName || ""}!</p>

    <p>Danke für deinen Auftrag. Wir starten jetzt mit der Entfernung der ausgewählten Bewertungen.</p>

    <p><strong>Auswahl:</strong> ${chosenLabel}<br/>
       <strong>Gesamt:</strong> 1–3: ${c123} &nbsp;|&nbsp; 1–2: ${c12} &nbsp;|&nbsp; 1: ${c1}</p>

    <p>Deine Auftragsbestätigung (PDF) findest du hier:<br/>
      <a href="${pdfUrl}" target="_blank" rel="noopener" style="color:#0b6cf2">${pdfUrl}</a>
    </p>

    <p style="margin:20px 0 10px;font-weight:700">Freunde werben & sparen</p>
    <p>Empfehle Sternblitz weiter und erhalte pro erfolgreicher Empfehlung einen
       <strong>25€ Amazon-Gutschein</strong>. Deine Freunde sparen mit deinem persönlichen Code:</p>

    <div style="display:inline-block;padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#f7fafc">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#64748b">Promocode</div>
      <div style="font-size:18px;font-weight:800">${promo}</div>
      <div style="font-size:12px;color:#64748b">Nur 5× nutzbar in den nächsten 30 Tagen</div>
    </div>

    <p style="margin-top:10px">Teilen-Link (Platzhalter):<br/>
      <a href="${referralLink}" target="_blank" rel="noopener" style="color:#0b6cf2">${referralLink}</a>
    </p>

    <p style="color:#64748b;font-style:italic;margin-top:18px">(Dies ist eine automatische Mail)</p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>

    <div style="font-weight:800;margin-bottom:6px">Sternblitz</div>
    <div>📧 <a href="mailto:info@sternblitz.de" style="color:#0b6cf2;text-decoration:none">info@sternblitz.de</a></div>
    <div>🌐 <a href="https://sternblitz.de" style="color:#0b6cf2;text-decoration:none">sternblitz.de</a></div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
  </div>
    `.trim();

    const text =
      `Hallo ${firstName || ""}!\n\n` +
      `Danke für deinen Auftrag. Wir starten jetzt mit der Entfernung der ausgewählten Bewertungen.\n\n` +
      `Auswahl: ${chosenLabel}\n` +
      `Gesamt: 1–3: ${c123} | 1–2: ${c12} | 1: ${c1}\n\n` +
      `PDF: ${pdfUrl}\n\n` +
      `Freunde werben & sparen:\n` +
      `Promocode: ${promo} (5× nutzbar in 30 Tagen)\n` +
      `Teilen-Link: ${referralLink}\n\n` +
      `(Dies ist eine automatische Mail)\n\n` +
      `Sternblitz\n` +
      `info@sternblitz.de\n` +
      `sternblitz.de\n`;

    if (process.env.RESEND_API_KEY && isValidFromOrReplyTo(FROM)) {
      const mailPayload = {
        from: FROM,
        to: email,
        subject,
        html,
        text,
        headers: { "X-Entity-Ref-ID": fileName },
        ...(isValidFromOrReplyTo(REPLY_TO) ? { reply_to: REPLY_TO } : {}),
        ...(ATTACH
          ? {
              attachments: [
                {
                  filename: fileName,
                  content: Buffer.from(pdfBytes),
                  contentType: "application/pdf",
                },
              ],
            }
          : {}),
      };

      const { error: mailErr } = await resend.emails.send(mailPayload);
      if (mailErr) console.warn("Resend error:", mailErr);
    } else {
      console.warn("E-Mail nicht gesendet: RESEND_API_KEY/RESEND_FROM fehlt oder ist ungültig.");
    }

    return NextResponse.json({ ok: true, pdfUrl });
  } catch (e) {
    console.error("sign/submit error:", e);
    return NextResponse.json({ error: e?.message || "Fehler" }, { status: 500 });
  }
}
