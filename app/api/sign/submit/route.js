// app/api/sign/submit/route.js
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs"; // Node, nicht Edge

// ---------- Helpers ----------
function dataUrlToUint8(signaturePng) {
  const base64 = (signaturePng || "").split(",").pop() || "";
  const bin = Buffer.from(base64, "base64");
  return new Uint8Array(bin);
}

// WinAnsi: Emojis entfernen
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
  return `${fn}${firstL}${lastL}25`;
}

function isValidFromOrReplyTo(s = "") {
  return (
    /^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(s) ||
    /^[^<>]+<[^<>\s@]+@[^<>\s@]+\.[^<>]+>$/.test(s)
  );
}

function storageKeyFor(fileName, repCode) {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const folder = repCode ? `${yyyy}/${mm}/${repCode}` : `${yyyy}/${mm}`;
  return `${folder}/${fileName}`;
}

// ---------- PDF ----------
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
  draw("Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.", { x: 50, y, font, size: 11, color: rgb(0,0,0) });

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

  const picked = chosenCount(p.selectedOption, p.counts);
  y -= 6;
  draw("Gewählte Löschung:", { x: 50, y, font: bold, size: 10, color: rgb(0,0,0) });
  draw(
    `${labelFor(p.selectedOption)}${picked != null ? ` — Entfernte: ${Number(picked).toLocaleString("de-DE")}` : ""}`,
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

// ---------- Handler ----------
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
      counts,                 // { c123, c12, c1 }
      rep_code = null,        // neu: wird mitgespeichert
      source_account_id = null, // neu: wird mitgespeichert
    } = body || {};

    if (!googleProfile || !signaturePng) {
      return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    // 1) PDF bauen
    const sigBytes = dataUrlToUint8(signaturePng);
    const pdfBytes = await buildPdf(
      { googleProfile, selectedOption, company, firstName, lastName, email, phone, counts },
      sigBytes
    );

    // 2) Upload zu Supabase Storage (Bucket: contracts)
    const sb = supabaseAdmin();
    const safeBase = safeFileBase(firstName);
    const fileName = `${Date.now()}_${safeBase}.pdf`;
    const key = storageKeyFor(fileName, rep_code || undefined);

    const { error: uploadErr } = await sb.storage
      .from("contracts")
      .upload(key, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadErr) throw uploadErr;

    const { data: pub } = sb.storage.from("contracts").getPublicUrl(key);
    const pdfUrl = pub?.publicUrl || null;

    // 3) Lead speichern (leichtgewichtig)
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
        signature_png_path: null, // optional: separat speichern, falls gewünscht
        pdf_path: key,            // Storage-Key
        pdf_signed_url: pdfUrl,   // public URL (weil Bucket public)
        rep_code,                 // neu
        source_account_id,        // neu (z. B. supabase user id)
        option_chosen_count: picked ?? null,
      }]);
    } catch (e) {
      console.warn("Leads insert warn:", e?.message || e);
    }

    // 4) E-Mail via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const FROM = process.env.RESEND_FROM || "";
    const REPLY_TO = process.env.RESEND_REPLY_TO || "";
    const ATTACH = String(process.env.EMAIL_ATTACH_PDF || "").toLowerCase() === "true";

    const subject = "Deine Auftragsbestätigung – Sternblitz";

    const chosenLabel = labelFor(selectedOption);
    const selectedCount = Number(chosenCount(selectedOption, counts) ?? 0);
    const promo = makePromoCode(firstName, lastName);
    const referralLink = `https://sternblitz.de/empfehlen?ref=DEMO`; // Platzhalter
    const pdfLine = ATTACH
      ? "Deine Auftragsbestätigung (PDF) findest du im Anhang."
      : "Deine Auftragsbestätigung (PDF) wurde erstellt.";

    const html = `
      <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.58;color:#0f172a;background:#ffffff;padding:0;margin:0">
        <div style="max-width:640px;margin:0 auto;padding:28px 20px 8px">
          <h1 style="margin:0 0 10px;font-size:20px;letter-spacing:.2px">Hallo ${firstName || ""}!</h1>
          <p style="margin:0 0 16px">danke für deinen Auftrag. Wir starten jetzt mit der Entfernung der ausgewählten Bewertungen.</p>

          <div style="border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;margin:18px 0;background:#f9fbff">
            <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Google-Profil</div>
            <div style="font-weight:700">${googleProfile ? googleProfile : "—"}</div>
          </div>

          <div style="border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;margin:12px 0;background:#ffffff">
            <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Auswahl</div>
            <div style="font-weight:700">${chosenLabel} → ${Number.isFinite(selectedCount) ? selectedCount : "—"} Stück</div>
          </div>

          <p style="margin:16px 0">${pdfLine}</p>

          <div style="margin:26px 0 10px;font-weight:800;font-size:16px">Freunde werben & sparen</div>
          <p style="margin:0 0 12px">
            Teile Sternblitz mit Freund:innen – <strong>sie sparen 25&nbsp;€</strong> auf die Auftragspauschale
            und du erhältst für jede erfolgreiche Empfehlung einen <strong>25&nbsp;€ Amazon-Gutschein</strong>.
          </p>

          <div style="display:inline-block;padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;background:#f7fafc;margin-bottom:10px">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#64748b">Dein Promocode</div>
            <div style="font-size:20px;font-weight:900;letter-spacing:.6px">${promo}</div>
            <div style="font-size:12px;color:#64748b">Gültig 30 Tage · max. 5 Einlösungen</div>
          </div>

          <div style="margin:6px 0 22px;font-size:14px">
            Teilen-Link (Platzhalter):
            <a href="${referralLink}" target="_blank" rel="noopener" style="color:#0b6cf2;text-decoration:none">${referralLink}</a>
          </div>

          <p style="color:#64748b;font-style:italic;margin-top:6px">(Dies ist eine automatische Mail)</p>
        </div>

        <div style="max-width:640px;margin:0 auto;padding:0 20px 28px">
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:14px 0 18px"/>
          <table role="presentation" style="width:100%;border-collapse:collapse">
            <tr><td style="font-weight:900;padding:0 0 6px">Sternblitz Auftragsservice</td></tr>
            <tr><td style="padding:0 0 4px">📧 <a href="mailto:info@sternblitz.de" style="color:#0b6cf2;text-decoration:none">info@sternblitz.de</a></td></tr>
            <tr><td>🌐 <a href="https://sternblitz.de" style="color:#0b6cf2;text-decoration:none">sternblitz.de</a></td></tr>
          </table>
        </div>
      </div>
    `.trim();

    const text =
      `Hallo ${firstName || ""}!\n\n` +
      `Danke für deinen Auftrag. Wir starten jetzt mit der Entfernung der ausgewählten Bewertungen.\n\n` +
      `Google-Profil: ${googleProfile || "—"}\n` +
      `Auswahl: ${chosenLabel} → ${Number.isFinite(selectedCount) ? selectedCount : "—"} Stück\n\n` +
      `${pdfLine}\n\n` +
      `Freunde werben & sparen:\n` +
      `• Deine Freunde sparen 25 € auf die Auftragspauschale\n` +
      `• Du erhältst pro erfolgreicher Empfehlung einen 25 € Amazon-Gutschein\n` +
      `Promocode: ${promo} (30 Tage gültig, max. 5 Einlösungen)\n` +
      `Teilen-Link (Platzhalter): ${referralLink}\n\n` +
      `(Dies ist eine automatische Mail)\n\n` +
      `Sternblitz Auftragsservice\n` +
      `info@sternblitz.de · sternblitz.de\n`;

    if (process.env.RESEND_API_KEY && isValidFromOrReplyTo(process.env.RESEND_FROM || "")) {
      if (email) {
        const payload = {
          from: process.env.RESEND_FROM,
          to: email,
          subject,
          html,
          text,
          headers: { "X-Entity-Ref-ID": key },
          ...(isValidFromOrReplyTo(process.env.RESEND_REPLY_TO || "") ? { reply_to: process.env.RESEND_REPLY_TO } : {}),
          ...(ATTACH ? {
            attachments: [{
              filename: fileName,
              content: Buffer.from(pdfBytes),
              contentType: "application/pdf",
            }],
          } : {}),
        };
        const { error: mailErr } = await resend.emails.send(payload);
        if (mailErr) console.warn("Resend error:", mailErr);
      } else {
        console.warn("Kein Empfänger (email) angegeben – E-Mail übersprungen.");
      }
    } else {
      console.warn("E-Mail nicht gesendet: RESEND_API_KEY/RESEND_FROM fehlt oder ungültig.");
    }

    return NextResponse.json({ ok: true, pdfUrl, pdfPath: key });
  } catch (e) {
    console.error("sign/submit error:", e);
    return NextResponse.json({ error: e?.message || "Fehler" }, { status: 500 });
  }
}
