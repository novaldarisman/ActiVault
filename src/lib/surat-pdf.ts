import jsPDF from "jspdf";

export type DocumentPdfInput = {
  documentNumber: string;
  documentDate: string;
  title: string;
  docTypeName: string;
  content: string;
  companyName: string;
  companyAddress: string;
  customerName: string;
};

export async function buildDocumentPdf(input: DocumentPdfInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  const addWrappedText = (text: string, x: number, w: number, fontSize: number, options?: { bold?: boolean; align?: "left" | "center" | "right" }) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", options?.bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, w);
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = margin; }
      const xPos = options?.align === "center" ? pageW / 2 : options?.align === "right" ? pageW - x : x;
      doc.text(line, xPos, y, { align: options?.align ?? "left" });
      y += fontSize * 0.45;
    }
  };

  const addLine = () => {
    if (y > 270) { doc.addPage(); y = margin; }
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  // Header
  addWrappedText(input.companyName, margin, pageW - 2 * margin, 16, { bold: true, align: "center" });
  if (input.companyAddress) {
    addWrappedText(input.companyAddress, margin, pageW - 2 * margin, 9, { align: "center" });
  }
  y += 3;
  addLine();

  // Document type & number
  addWrappedText(input.docTypeName, margin, pageW - 2 * margin, 12, { bold: true, align: "center" });
  y += 1;
  addWrappedText("No: " + input.documentNumber, margin, pageW - 2 * margin, 10, { align: "center" });
  y += 2;

  // Info bar
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const infoLines = [
    "Tanggal: " + input.documentDate,
    input.customerName ? "Kepada: " + input.customerName : null,
  ].filter(Boolean) as string[];
  for (const line of infoLines) {
    doc.text(line, margin, y);
    y += 5;
  }
  y += 3;
  addLine();

  // Title
  addWrappedText(input.title, margin, pageW - 2 * margin, 13, { bold: true, align: "center" });
  y += 3;

  // Content - strip HTML tags for plain text
  const plainContent = input.content.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "");
  const paragraphs = plainContent.split("\n").filter((p) => p.trim());
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  for (const para of paragraphs) {
    if (y > 270) { doc.addPage(); y = margin; }
    const lines = doc.splitTextToSize(para.trim(), pageW - 2 * margin);
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 5;
    }
    y += 2;
  }

  return doc.output("blob");
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}