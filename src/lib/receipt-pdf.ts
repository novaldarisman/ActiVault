import jsPDF from "jspdf";
import QRCode from "qrcode";
import { terbilang } from "./terbilang";
import type { AppSettings } from "./settings";
import { triggerDownload } from "./invoice-pdf";

export type ReceiptTemplate = "modern" | "classic" | "minimal";

export type PdfReceipt = {
  receipt_number: string;
  receipt_date: string;
  status: string;
  received_from: string;
  amount: number;
  amount_in_words?: string | null;
  for_payment?: string | null;
  payment_method?: string | null;
  receiver_name?: string | null;
  notes?: string | null;
};

const fmtIDR = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(n));
const fmtDate = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

const T: Record<ReceiptTemplate, { accent: [number, number, number] }> = {
  modern:  { accent: [16, 185, 129] },
  classic: { accent: [22, 78, 99] },
  minimal: { accent: [39, 39, 42] },
};

export async function buildReceiptPdf(
  r: PdfReceipt,
  settings?: AppSettings | null,
  template: ReceiptTemplate = "modern",
): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const accent = T[template].accent;
  const company = settings?.company_name ?? "DocTiva";
  const isDraft = r.status === "draft";

  if (template === "modern") {
    doc.setFillColor(...accent); doc.rect(0, 0, pageW, 32, "F");
    doc.setTextColor(255).setFont("helvetica", "bold").setFontSize(24).text("KWITANSI", 14, 20);
    doc.setFont("helvetica", "normal").setFontSize(10).text(company, pageW - 14, 14, { align: "right" });
    if (settings?.company_address) doc.setFontSize(8).text(settings.company_address.slice(0, 80), pageW - 14, 20, { align: "right" });
    doc.setTextColor(0);
  } else if (template === "classic") {
    doc.setDrawColor(...accent).setLineWidth(0.8);
    doc.rect(8, 8, pageW - 16, pageH - 16);
    doc.rect(10, 10, pageW - 20, pageH - 20);
    doc.setFont("times", "bold").setFontSize(26).setTextColor(...accent).text("KWITANSI", pageW / 2, 24, { align: "center" });
    doc.setFont("times", "normal").setFontSize(11).setTextColor(60).text(company, pageW / 2, 32, { align: "center" });
    doc.setTextColor(0);
  } else {
    doc.setFont("helvetica", "bold").setFontSize(20).text("Kwitansi", 14, 20);
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(120).text(company, pageW - 14, 18, { align: "right" });
    doc.setTextColor(0).setDrawColor(...accent).setLineWidth(0.4).line(14, 26, pageW - 14, 26);
  }

  if (settings?.company_logo_url?.startsWith("data:")) {
    try { doc.addImage(settings.company_logo_url, "PNG", 14, template === "modern" ? 38 : 32, 22, 22); } catch { /* ignore */ }
  }

  let y = 50;
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text(`No: ${r.receipt_number}`, pageW - 14, y, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Tanggal: ${fmtDate(r.receipt_date)}`, pageW - 14, y + 6, { align: "right" });

  y += 22;
  const labelW = 50;
  const valX = 14 + labelW;
  doc.setFont("helvetica", "bold").setFontSize(11);
  const fieldRow = (label: string, value: string, big = false) => {
    doc.setFont("helvetica", "bold").setFontSize(11).text(label, 14, y);
    doc.setFont("helvetica", big ? "bold" : "normal").setFontSize(big ? 13 : 11);
    const lines = doc.splitTextToSize(value, pageW - valX - 14);
    lines.forEach((l: string, i: number) => doc.text(l, valX, y + i * 6));
    doc.setDrawColor(220); doc.setLineDashPattern([0.6, 0.6], 0);
    doc.line(valX, y + 2 + (lines.length - 1) * 6, pageW - 14, y + 2 + (lines.length - 1) * 6);
    doc.setLineDashPattern([], 0);
    y += Math.max(10, lines.length * 6 + 4);
  };

  fieldRow("Sudah diterima dari", r.received_from);
  fieldRow("Uang sejumlah", r.amount_in_words || terbilang(r.amount));
  fieldRow("Untuk pembayaran", r.for_payment || "-");
  if (r.payment_method) fieldRow("Metode pembayaran", r.payment_method);

  y += 4;
  doc.setDrawColor(...accent).setLineWidth(0.6).roundedRect(14, y, 80, 18, 2, 2);
  doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(...accent);
  doc.text(fmtIDR(r.amount), 18, y + 12);
  doc.setTextColor(0);

  // Signature
  const sigY = y + 30;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(60);
  doc.text(`${settings?.company_address ? "" : ""}Penerima,`, pageW - 60, sigY);
  if (settings?.stamp_url?.startsWith("data:")) {
    try { doc.addImage(settings.stamp_url, "PNG", pageW - 60, sigY + 3, 26, 26); } catch { /* ignore */ }
  }
  if (settings?.signature_url?.startsWith("data:")) {
    try { doc.addImage(settings.signature_url, "PNG", pageW - 60, sigY + 5, 40, 22); } catch { /* ignore */ }
  }
  doc.setDrawColor(180).setLineWidth(0.3).line(pageW - 60, sigY + 30, pageW - 14, sigY + 30);
  doc.setTextColor(0).setFont("helvetica", "bold").setFontSize(10);
  doc.text(r.receiver_name || settings?.signer_name || "(……………………)", pageW - 60, sigY + 35);

  // QR
  try {
    const qrUrl = await QRCode.toDataURL(`${r.receipt_number}|${r.amount}|${r.receipt_date}`, { width: 200, margin: 0 });
    doc.addImage(qrUrl, "PNG", 14, sigY, 26, 26);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(120).text("Scan untuk verifikasi", 14, sigY + 29);
    doc.setTextColor(0);
  } catch { /* ignore */ }

  if (settings?.invoice_footer) {
    doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(120);
    doc.text(settings.invoice_footer, pageW / 2, pageH - 10, { align: "center" });
    doc.setTextColor(0);
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    if (isDraft) {
      doc.saveGraphicsState();
      // @ts-expect-error GState plugin
      doc.setGState(new doc.GState({ opacity: 0.12 }));
      doc.setFont("helvetica", "bold").setFontSize(110).setTextColor(...accent);
      doc.text("DRAFT", pageW / 2, pageH / 2, { align: "center", angle: 45 });
      doc.restoreGraphicsState();
      doc.setTextColor(0);
    }
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(140);
    doc.text(`Halaman ${p} dari ${totalPages}`, pageW - 14, pageH - 6, { align: "right" });
    doc.setTextColor(0);
  }

  return doc.output("blob");
}

export async function generateReceiptPdf(
  r: PdfReceipt,
  settings?: AppSettings | null,
  template: ReceiptTemplate = "modern",
) {
  const blob = await buildReceiptPdf(r, settings, template);
  triggerDownload(blob, `${r.receipt_number}.pdf`);
  return blob;
}