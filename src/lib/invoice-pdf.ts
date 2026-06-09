import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { terbilang } from "./terbilang";

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

export function generateInvoicePdf(inv: PdfInvoice) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("INVOICE", 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Nova Invoice", pageW - 14, 14, { align: "right" });
  doc.setTextColor(120);
  doc.text("Internal Invoicing System", pageW - 14, 19, { align: "right" });
  doc.setTextColor(0);

  // Meta
  doc.setFontSize(10);
  doc.text(`No. Invoice : ${inv.invoice_number}`, 14, 32);
  doc.text(`Tanggal     : ${fmtDate(inv.invoice_date)}`, 14, 38);
  doc.text(`Jatuh Tempo : ${fmtDate(inv.due_date)}`, 14, 44);
  doc.text(`Status      : ${inv.status.replace(/_/g, " ").toUpperCase()}`, 14, 50);

  // Customer
  doc.setFont("helvetica", "bold");
  doc.text("Ditagihkan kepada:", pageW - 14, 32, { align: "right" });
  doc.setFont("helvetica", "normal");
  let cy = 38;
  const c = inv.customer;
  doc.text(c.nama_perusahaan || c.nama_pelanggan, pageW - 14, cy, { align: "right" }); cy += 5;
  if (c.nama_perusahaan) { doc.text(`a.n ${c.nama_pelanggan}`, pageW - 14, cy, { align: "right" }); cy += 5; }
  if (c.alamat) {
    doc.splitTextToSize(c.alamat, 80).forEach((l: string) => { doc.text(l, pageW - 14, cy, { align: "right" }); cy += 5; });
  }
  if (c.telepon) { doc.text(c.telepon, pageW - 14, cy, { align: "right" }); cy += 5; }
  if (c.email) { doc.text(c.email, pageW - 14, cy, { align: "right" }); cy += 5; }
  if (c.npwp) { doc.text(`NPWP: ${c.npwp}`, pageW - 14, cy, { align: "right" }); cy += 5; }

  const tableY = Math.max(cy, 62) + 4;

  autoTable(doc, {
    startY: tableY,
    head: [["#", "Deskripsi", "Qty", "Satuan", "Harga", "Disk %", "PPN %", "Subtotal"]],
    body: inv.items.map((it, i) => [
      String(i + 1),
      it.description,
      fmt(it.qty),
      it.unit || "-",
      fmt(it.price),
      fmt(it.discount_percent),
      fmt(it.tax_percent),
      fmt(it.subtotal),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      2: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
  });

  // Totals
  // @ts-expect-error lastAutoTable from plugin
  const afterY = (doc.lastAutoTable?.finalY ?? tableY) + 6;
  const rightX = pageW - 14;
  const labelX = pageW - 70;
  let ty = afterY;
  doc.setFontSize(10);
  const row = (label: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, labelX, ty);
    doc.text(val, rightX, ty, { align: "right" });
    ty += 6;
  };
  row("Subtotal", fmt(inv.subtotal));
  row("Diskon", `- ${fmt(inv.discount_total)}`);
  row("PPN", fmt(inv.tax_total));
  doc.setDrawColor(200);
  doc.line(labelX, ty - 4, rightX, ty - 4);
  row("GRAND TOTAL", `Rp ${fmt(inv.grand_total)}`, true);

  // Terbilang
  ty += 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  const tb = `Terbilang: ${terbilang(inv.grand_total)}`;
  doc.splitTextToSize(tb, pageW - 28).forEach((l: string) => { doc.text(l, 14, ty); ty += 5; });

  if (inv.notes) {
    ty += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Catatan:", 14, ty); ty += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.splitTextToSize(inv.notes, pageW - 28).forEach((l: string) => { doc.text(l, 14, ty); ty += 5; });
  }

  doc.save(`${inv.invoice_number}.pdf`);
}