import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { requireAuthJwt } from "../middlewares/auth.js";
import type { AuthenticatedRequest } from "../middlewares/auth.js";

const router = Router();

const sendSchema = z.object({
  to:           z.string().email().max(300),
  designName:   z.string().max(200),
  clientName:   z.string().max(200).optional().nullable(),
  designerName: z.string().max(200).optional().nullable(),
  quoteNumber:  z.string().max(40),
  grandTotal:   z.number().nonnegative(),
  message:      z.string().max(1000).optional().nullable(),
  pdfBase64:    z.string().max(10_000_000),
});

function escHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function smtpConfigured(): boolean {
  return !!(process.env["SMTP_HOST"] && process.env["SMTP_USER"] && process.env["SMTP_PASS"]);
}

async function sendWithNodemailer(opts: {
  to: string; subject: string; html: string;
  pdfBase64: string; designName: string; quoteNumber: string;
}): Promise<void> {
  const nodemailer = (await import("nodemailer")).default;
  const transporter = nodemailer.createTransport({
    host:   process.env["SMTP_HOST"],
    port:   parseInt(process.env["SMTP_PORT"] ?? "587"),
    secure: process.env["SMTP_SECURE"] === "true",
    auth:   { user: process.env["SMTP_USER"], pass: process.env["SMTP_PASS"] },
  });
  const from      = process.env["SMTP_FROM"] ?? process.env["SMTP_USER"];
  const pdfBuffer = Buffer.from(opts.pdfBase64, "base64");
  await transporter.sendMail({
    from, to: opts.to, subject: opts.subject, html: opts.html,
    attachments: [{ filename: `alveo-quote-${opts.quoteNumber}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
  });
}

function buildEmailHtml(opts: {
  designName: string; clientName?: string | null; designerName?: string | null;
  designerEmail: string; quoteNumber: string; grandTotal: number; message?: string | null;
}): string {
  const usd   = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const safeDesignName   = escHtml(opts.designName);
  const safeClientName   = escHtml(opts.clientName);
  const safeDesignerName = escHtml(opts.designerName ?? opts.designerEmail);
  const safeQuoteNumber  = escHtml(opts.quoteNumber);
  const safeMessage      = escHtml(opts.message);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background:#f7f4ef;color:#2d2823;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ef;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e0d5;">
        <tr>
          <td style="background:#2d2823;padding:28px 36px;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#f5ede1;letter-spacing:0.05em;font-family:Georgia,serif;">ALVÉO</p>
            <p style="margin:4px 0 0;font-size:11px;color:#b4a494;letter-spacing:0.12em;text-transform:uppercase;">Design Quotation</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 36px;">
            ${safeClientName ? `<p style="margin:0 0 20px;font-size:15px;color:#2d2823;">Dear <strong>${safeClientName}</strong>,</p>` : "<p style='margin:0 0 20px;font-size:15px;'>Hello,</p>"}
            <p style="margin:0 0 20px;font-size:14px;color:#5a5045;line-height:1.6;">
              ${safeMessage ? safeMessage : `Please find attached your design quotation for <strong>${safeDesignName}</strong>. The PDF contains a full cost breakdown including materials, labour, and all accessories.`}
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ef;border-radius:8px;border:1px solid #e8e0d5;margin:0 0 24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;font-size:11px;color:#9a8a78;letter-spacing:0.1em;text-transform:uppercase;">Design</p>
                  <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#2d2823;">${safeDesignName}</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:20px;">
                        <p style="margin:0 0 2px;font-size:11px;color:#9a8a78;text-transform:uppercase;letter-spacing:0.08em;">Quote #</p>
                        <p style="margin:0;font-size:13px;font-weight:600;color:#2d2823;font-family:monospace;">${safeQuoteNumber}</p>
                      </td>
                      <td style="padding-right:20px;">
                        <p style="margin:0 0 2px;font-size:11px;color:#9a8a78;text-transform:uppercase;letter-spacing:0.08em;">Date</p>
                        <p style="margin:0;font-size:13px;color:#2d2823;">${today}</p>
                      </td>
                      <td>
                        <p style="margin:0 0 2px;font-size:11px;color:#9a8a78;text-transform:uppercase;letter-spacing:0.08em;">Estimated Total</p>
                        <p style="margin:0;font-size:20px;font-weight:700;color:#2d2823;font-family:Georgia,serif;">${usd(opts.grandTotal)}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#5a5045;line-height:1.6;">The attached PDF contains the full line-item breakdown. This quote is valid for <strong>30 days</strong>.</p>
            <p style="margin:0;font-size:13px;color:#5a5045;line-height:1.6;">Please don't hesitate to reach out with any questions.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #e8e0d5;background:#faf8f5;">
            <p style="margin:0;font-size:12px;color:#9a8a78;">Sent by ${safeDesignerName} via <strong>Alvéo Design Platform</strong></p>
            <p style="margin:4px 0 0;font-size:11px;color:#b4a494;">Estimates exclude applicable taxes and permit fees. Actual pricing confirmed on signed order.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── POST /quotes/send ────────────────────────────────────────────────────────
// requireAuthJwt enforces a valid JWT Bearer token and populates req.userEmail
router.post("/quotes/send", requireAuthJwt, async (req: Request, res: Response) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { to, designName, clientName, designerName, quoteNumber, grandTotal, message, pdfBase64 } = parsed.data;
  const designerEmail = (req as AuthenticatedRequest).userEmail;

  if (!smtpConfigured()) {
    res.json({ sent: false, fallback: true, reason: "SMTP not configured" });
    return;
  }

  try {
    const html = buildEmailHtml({ designName, clientName, designerName, designerEmail, quoteNumber, grandTotal, message });
    await sendWithNodemailer({
      to,
      subject: `Your Alvéo Design Quote — ${designName} (${quoteNumber})`,
      html, pdfBase64, designName, quoteNumber,
    });
    res.json({ sent: true });
  } catch (err) {
    console.error("[quotes/send] error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

export default router;
