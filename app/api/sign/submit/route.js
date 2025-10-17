// app/api/sign/submit/route.js
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";

// ---------- Helpers ----------
function dataUrlToUint8(signaturePng) {
  const base64 = (signaturePng || "").split(",").pop() || "";
  const bin = Buffer.from(base64, "base64");
  return new Uint8Array(bin);
}

// Entfernt Emojis/Symbole, die Helvetica WinAnsi nicht rendern kann
function toPlain(text = "") {
  return String(text).replace(
    /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F9FF}\u{2600}-\u{27BF}]/gu,
    ""
  );
}

function labelFor(opt) {
  // keine Stern-Emojis verwenden → WinAnsi-safe
  return opt === "123"
    ? "1-3 Sterne löschen"
    : opt === "12"
    ? "1-2 Sterne löschen"
    : opt === "1"
    ? "1 Stern löschen"
    : "Individuelle Löschungen";
}

function chosenCount(selectedOption, counts) {
  if (!counts) return null;
  if (selectedOption === "123") return counts.c123 ?? null;
  if (selectedOption === "12") return counts.c12 ?? null;
  if (selectedOption === "1") return counts.c1 ?? null;
  return null;
}

function safeFileBase(v, fallback = "kunde") {
  const s = (v || "").toString().trim().replace(/[^a-z0-9_-]+/gi, "_");
  return s || fallback;
}

function cleanMailbox(v) {
  if (!v) return "";
  return String(v).trim().replace(/^["']+|["']+$/g, "");
}
function isMailboxLike(v) {
  return /^[^<>@\s]+@[^<>@\s]+$/.test(v) || /<[^<>@\s]+@[^<>@\s]+>/.test(v);
}

// ---------- PDF ----------
async function buildPdf(p, sigBytes) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const { height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const draw = (txt, opts) => page.drawText(toPlain(txt), opts);

  let y = height - 70;

  draw("Auftragsbestätigung Sternblitz", {
    x: 50,
    y,
    font: bold,
    size: 20,
    color: rgb(0, 0, 0),
  });

  y -= 20;
  draw(
    "Hiermit bestätige ich den Auftrag zur Löschung meiner negativen Google-Bewertungen.",
    { x: 50, y, font, size: 11, color: rgb(0, 0, 0) }
  );

  y -= 25;
  for (const bullet of [
    "Fixpreis: 299 € (einmalig)",
    "Zahlung erst nach Löschung (von mind. 90 % der Bewertungen)",
    "Dauerhafte Entfernung",
  ]) {
    draw("• " + bullet, { x: 50, y, font, size: 11, color: rgb(0, 0, 0) });
    y -= 16;
  }

  y -= 10;
  draw("Zusammenfassung", { x: 50, y, font: bold, size: 12, color: rgb(0, 0, 0) });
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
    draw(`${k}:`, { x: 50, y, font: bold, size: 10, color: rgb(0, 0, 0) });
    draw(String(v ?? "—"), { x: 180, y, font, size: 10, color: rgb(0, 0, 0) });
    y -= 14;
  }

  // gewählte Option + Zahl
  const picked = chosenCount(p.selectedOption, p.counts);
  y -= 6;
  draw("Gewählte Löschung:", {
    x: 50,
    y,
    font: bold,
    size: 10,
    color: rgb(0, 0, 0),
  });
  draw(
    `${labelFor(p.selectedOption)}${
      picked != null ? ` — Anzahl: ${Number(picked).toLocaleString("de-DE")}` : ""
    }`,
    { x: 180, y, font, size: 10, color: rgb(0, 0, 0) }
  );
  y -= 14;

  if (p.counts) {
    const c123 = Number(p.counts.c123 ?? 0).toLocaleString("de-DE");
    const c12 = Number(p.counts.c12 ?? 0).toLocaleString("de-DE");
    const c1 = Number(p.counts.c1 ?? 0).toLocaleString("de-DE");
    draw("Zähler gesamt:", { x: 50, y, font: bold, size: 10, color: rgb(0, 0, 0) });
    draw(`1-3: ${c123}   |   1-2: ${c12}   |   1: ${c1}`, {
      x: 180,
      y,
      font,
      size: 10,
      color: rgb(0, 0, 0),
    });
    y -= 14;
  }

  y -= 12;
  draw("Unterschrift:", { x: 50, y, font: bold, size: 11, color: rgb(0, 0, 0) });
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
    color: rgb(0, 0, 0),
  });

  return await pdf.save();
}

// ---------- Route ----------
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
      // optional: googleUrl, rep_code, source_account_id ...
    } = body || {};

    if (!googleProfile || !signaturePng) {
      return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    // PDF bauen
    const sigBytes = dataUrlToUint8(signaturePng);
    const pdfBytes = await buildPdf(
      {
        googleProfile,
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

    // Upload zu Supabase
    const sb = supabaseAdmin();
    const base = safeFileBase(firstName, "kunde");
    const fileName = `${Date.now()}_${base}.pdf`; // flach im Bucket

    const buffer = Buffer.from(pdfBytes);
    const { error: uploadErr } = await sb.storage
      .from("contracts") // Bucket muss existieren
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

    const { data: publicUrlData } = sb.storage.from("contracts").getPublicUrl(fileName);
    const pdfUrl = publicUrlData?.publicUrl;

    // Lead optional speichern (nicht kritisch, daher im try)
    try {
      await sb.from("leads").insert([
        {
          google_profile: googleProfile,
          selected_option: selectedOption,
          company,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          counts: counts ?? null,
          pdf_path: fileName,
          pdf_signed_url: pdfUrl,
          // rep_code, source_account_id hier später ergänzen
        },
      ]);
    } catch (e) {
      console.warn("Leads insert warn:", e?.message || e);
    }

    // --------- E-Mail via Resend ----------
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromRaw = process.env.RESEND_FROM;
    const replyToRaw = process.env.RESEND_REPLY_TO || "";
    const bccInternal = process.env.RESEND_INTERNAL_BCC || "";

    const from = cleanMailbox(fromRaw);
    const replyTo = cleanMailbox(replyToRaw);

    let emailId = null;
    let emailError = null;

    try {
      if (!resendApiKey) throw new Error("RESEND_API_KEY ist nicht gesetzt");
      if (!from || !isMailboxLike(from)) throw new Error("RESEND_FROM ist ungültig");
      // Fallback: wenn Kundene-Mail fehlt, an internen BCC senden (damit du Logs siehst)
      const toAddress = email && isMailboxLike(email) ? email : bccInternal;
      if (!toAddress) throw new Error("Keine gültige Empfängeradresse vorhanden");

      const resend = new Resend(resendApiKey);

      const subject = "Deine Auftragsbestätigung – Sternblitz";
      const text = `Danke für deine Unterschrift!
PDF-Link: ${pdfUrl}`;

      const html = `
        <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.55">
          <h2 style="margin:0 0 12px">Danke für deine Unterschrift!</h2>
          <p style="margin:0 0 12px">Deine Auftragsbestätigung ist als PDF angehängt. Du kannst sie zusätzlich hier öffnen:</p>
          <p style="margin:0 0 16px"><a href="${pdfUrl}" target="_blank">${pdfUrl}</a></p>
          <hr style="border:none;height:1px;background:#eee;margin:16px 0" />
          <p style="font-size:13px;color:#667085;margin:0">Sternblitz Auftragsservice</p>
        </div>
      `;

      const payload = {
        from,
        to: toAddress,
        subject,
        html,
        text,
        attachments: [
          {
            filename: fileName.split("/").pop() || "Auftrag.pdf",
            path: pdfUrl, // Direkt aus dem public Bucket
          },
        ],
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(bccInternal ? { bcc: bccInternal } : {}),
      };

      const { data, error } = await resend.emails.send(payload);
      if (error) throw error;
      emailId = data?.id || null;
    } catch (err) {
      console.error("Resend send error:", err);
      emailError = err?.message || String(err);
    }

    return NextResponse.json({ ok: true, pdfUrl, emailId, emailError });
  } catch (e) {
    console.error("sign/submit error:", e);
    return NextResponse.json({ error: e?.message || "Fehler" }, { status: 500 });
  }
}
