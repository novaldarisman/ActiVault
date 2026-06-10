import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { terbilang } from "./terbilang";
import type { AppSettings } from "./settings";

export type InvoiceTemplate = "modern" | "classic" | "minimal";

export type PdfInvoice = {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  notes?: string | null;
  customer: {
    nama_pelanggan: string;
    nama_perusahaan?: string | null;
    alamat?: string | null;
    email?: string | null;
    telepon?: string | null;
    npwp?: string | null;
  };
  items: Array<{
    description: string;
    qty: number;
    unit?: string | null;
    price: number;
    discount_percent: number;
    tax_percent: number;
    subtotal: number;
  }>;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

const TEMPLATES: Record<InvoiceTemplate, { accent: [number, number, number]; label: string }> = {
  modern:  { accent: [15, 23, 42],   label: "MODERN" },
  classic: { accent: [22, 78, 99],   label: "CLASSIC" },
  minimal: { accent: [39, 39, 42],   label: "MINIMAL" },
};

export async function buildInvoicePdf(
  inv: PdfInvoice,
  settings?: AppSettings | null,
  template: InvoiceTemplate = "modern",
): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const accent = TEMPLATES[template].accent;
  const company = settings?.company_name ?? "Nova Invoice";
  const isDraft = inv.status === "draft";

  // === Header band ===
  if (template === "modern") {
    doc.setFillColor(...accent);
    doc.rect(0, 0, pageW, 28, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold").setFontSize(22).text("INVOICE", 14, 18);
    doc.setFont("helvetica", "normal").setFontSize(10).text(company, pageW - 14, 14, { align: "right" });
    if (settings?.company_address) {
      doc.setFontSize(8).text(splitOneLine(settings.company_address), pageW - 14, 20, { align: "right" });
    }
    doc.setTextColor(0);
  } else if (template === "classic") {
    doc.setDrawColor(...accent); doc.setLineWidth(0.8);
    doc.rect(8, 8, pageW - 16, pageH - 16);
    doc.rect(10, 10, pageW - 20, pageH - 20);
    doc.setFont("times", "bold").setFontSize(24).setTextColor(...accent);
    doc.text("INVOICE", pageW / 2, 22, { align: "center" });
    doc.setFont("times", "normal").setFontSize(11).setTextColor(60);
    doc.text(company, pageW / 2, 30, { align: "center" });
    doc.setTextColor(0);
  } else {
    doc.setFont("helvetica", "bold").setFontSize(18).text("Invoice", 14, 18);
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(120);
    doc.text(company, pageW - 14, 14, { align: "right" });
    doc.setTextColor(0);
    doc.setDrawColor(...accent); doc.setLineWidth(0.4);
    doc.line(14, 24, pageW - 14, 24);
  }

  // Logo
  if (settings?.company_logo_url && settings.company_logo_url.startsWith("data:")) {
    try { doc.addImage(settings.company_logo_url, "PNG", 14, template === "modern" ? 32 : 28, 24, 24); } catch { /* ignore */ }
  }

  // === Meta block ===
  const metaY = template === "classic" ? 42 : 36;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold").text("No. Invoice", 44, metaY);
  doc.setFont("helvetica", "normal").text(`: ${inv.invoice_number}`, 70, metaY);
  doc.setFont("helvetica", "bold").text("Tanggal", 44, metaY + 6);
  doc.setFont("helvetica", "normal").text(`: ${fmtDate(inv.invoice_date)}`, 70, metaY + 6);
  doc.setFont("helvetica", "bold").text("Jatuh Tempo", 44, metaY + 12);
  doc.setFont("helvetica", "normal").text(`: ${fmtDate(inv.due_date)}`, 70, metaY + 12);
  doc.setFont("helvetica", "bold").text("Status", 44, metaY + 18);
  doc.setFont("helvetica", "normal").text(`: ${inv.status.replace(/_/g, " ").toUpperCase()}`, 70, metaY + 18);

  // Customer
  const c = inv.customer;
  doc.setFont("helvetica", "bold").setFontSize(10).text("Ditagihkan kepada:", pageW - 14, metaY, { align: "right" });
  doc.setFont("helvetica", "normal");
  let cy = metaY + 6;
  doc.text(c.nama_perusahaan || c.nama_pelanggan, pageW - 14, cy, { align: "right" }); cy += 5;
  if (c.nama_perusahaan) { doc.text(`a.n ${c.nama_pelanggan}`, pageW - 14, cy, { align: "right" }); cy += 5; }
  if (c.alamat) doc.splitTextToSize(c.alamat, 80).forEach((l: string) => { doc.text(l, pageW - 14, cy, { align: "right" }); cy += 5; });
  if (c.telepon) { doc.text(c.telepon, pageW - 14, cy, { align: "right" }); cy += 5; }
  if (c.email) { doc.text(c.email, pageW - 14, cy, { align: "right" }); cy += 5; }
  if (c.npwp) { doc.text(`NPWP: ${c.npwp}`, pageW - 14, cy, { align: "right" }); cy += 5; }

  const tableY = Math.max(cy, metaY + 28) + 4;

  autoTable(doc, {
    startY: tableY,
    margin: { left: 14, right: 14 },
    head: [["#", "Deskripsi", "Qty", "Satuan", "Harga", "Disk %", "PPN %", "Subtotal"]],
    body: inv.items.map((it, i) => [
      String(i + 1), it.description, fmt(it.qty), it.unit || "-",
      fmt(it.price), fmt(it.discount_percent), fmt(it.tax_percent), fmt(it.subtotal),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: accent, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 }, 2: { halign: "right" },
      4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" },
    },
  });

  // @ts-expect-error lastAutoTable plugin
  const afterY = (doc.lastAutoTable?.finalY ?? tableY) + 6;
  const rightX = pageW - 14;
  const labelX = pageW - 70;
  let ty = afterY;
  doc.setFontSize(10);
  const row = (label: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, labelX, ty); doc.text(val, rightX, ty, { align: "right" }); ty += 6;
  };
  row("Subtotal", fmt(inv.subtotal));
  row("Diskon", `- ${fmt(inv.discount_total)}`);
  row("PPN", fmt(inv.tax_total));
  doc.setDrawColor(180); doc.line(labelX, ty - 4, rightX, ty - 4);
  doc.setTextColor(...accent);
  row("GRAND TOTAL", `Rp ${fmt(inv.grand_total)}`, true);
  doc.setTextColor(0);

  ty += 2;
  doc.setFont("helvetica", "italic").setFontSize(9);
  doc.splitTextToSize(`Terbilang: ${terbilang(inv.grand_total)}`, pageW - 28).forEach((l: string) => { doc.text(l, 14, ty); ty += 5; });

  if (inv.notes) {
    ty += 3;
    doc.setFont("helvetica", "bold").setFontSize(10).text("Catatan:", 14, ty); ty += 5;
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.splitTextToSize(inv.notes, pageW - 28).forEach((l: string) => { doc.text(l, 14, ty); ty += 4.5; });
  }

  // Bank info
  if (settings?.bank_name) {
    ty += 4;
    doc.setFont("helvetica", "bold").setFontSize(10).text("Pembayaran via Transfer:", 14, ty); ty += 5;
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text(`${settings.bank_name}  •  ${settings.bank_account_number ?? "-"}  •  a.n ${settings.bank_account_name ?? "-"}`, 14, ty); ty += 5;
  }

  // Signature & stamp
  const sigY = Math.max(ty + 6, pageH - 60);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(60);
  doc.text("Hormat kami,", pageW - 60, sigY);
  if (settings?.stamp_url?.startsWith("data:")) {
    try { doc.addImage(settings.stamp_url, "PNG", pageW - 60, sigY + 3, 26, 26); } catch { /* ignore */ }
  }
  if (settings?.signature_url?.startsWith("data:")) {
    try { doc.addImage(settings.signature_url, "PNG", pageW - 60, sigY + 5, 40, 22); } catch { /* ignore */ }
  }
  doc.setDrawColor(180); doc.line(pageW - 60, sigY + 30, pageW - 14, sigY + 30);
  doc.setTextColor(0).setFont("helvetica", "bold").setFontSize(10);
  doc.text(settings?.signer_name ?? "(……………………)", pageW - 60, sigY + 35);

  // QR code (validation)
  try {
    const qrUrl = await QRCode.toDataURL(`${inv.invoice_number}|${inv.grand_total}|${inv.invoice_date}`, { width: 200, margin: 0 });
    doc.addImage(qrUrl, "PNG", 14, sigY, 24, 24);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(120);
    doc.text("Scan untuk verifikasi", 14, sigY + 27);
    doc.setTextColor(0);
  } catch { /* ignore */ }

  // Footer
  if (settings?.invoice_footer) {
    doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(120);
    doc.text(settings.invoice_footer, pageW / 2, pageH - 10, { align: "center" });
    doc.setTextColor(0);
  }

  // Watermark Draft + page numbers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    if (isDraft) {
      doc.saveGraphicsState();
      // @ts-expect-error GState in plugin
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

function splitOneLine(s: string) {
  return s.replace(/\s+/g, " ").slice(0, 80);
}

// Back-compat helper kept for any old callers.
export async function generateInvoicePdf(
  inv: PdfInvoice,
  settings?: AppSettings | null,
  template: InvoiceTemplate = "modern",
) {
  const blob = await buildInvoicePdf(inv, settings, template);
  triggerDownload(blob, `${inv.invoice_number}.pdf`);
  return blob;
}

export function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}