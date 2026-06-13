// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Loader2, Receipt as ReceiptIcon, Eye, Download, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import type { Tables, Database } from "@/integrations/supabase/types";
import { terbilang } from "@/lib/terbilang";
import { buildReceiptPdf, type ReceiptTemplate } from "@/lib/receipt-pdf";
import { triggerDownload } from "@/lib/invoice-pdf";
import { useSettings } from "@/lib/settings";
import { archivePdf } from "@/lib/archive";
import { logAudit } from "@/lib/audit";

type Receipt = Tables<"receipts">;
type Status = Database["public"]["Enums"]["receipt_status"];

export const Route = createFileRoute("/_authenticated/kwitansi")({
  head: () => ({ meta: [{ title: "Kwitansi — DocTiva" }] }),
  component: KwitansiPage,
});

const STATUS: { value: Status; label: string; tone: string }[] = [
  { value: "draft", label: "Draft", tone: "bg-muted text-muted-foreground" },
  { value: "final", label: "Final", tone: "bg-emerald-100 text-emerald-700" },
  { value: "dibatalkan", label: "Dibatalkan", tone: "bg-zinc-200 text-zinc-700" },
];
const statusMeta = (s: Status) => STATUS.find((x) => x.value === s) ?? STATUS[0];

const fmtIDR = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(n));
const fmtDate = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const todayISO = () => new Date().toISOString().slice(0, 10);

function KwitansiPage() {
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Receipt | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [finalizeTarget, setFinalizeTarget] = useState<Receipt | null>(null);

  const { data: receipts, isLoading } = useQuery({
    queryKey: ["receipts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("receipts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Receipt[];
    },
  });

  const filtered = (receipts ?? []).filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${r.receipt_number} ${r.received_from} ${r.for_payment ?? ""}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const target = (receipts ?? []).find((r) => r.id === id);
      const { error } = await supabase.from("receipts").delete().eq("id", id);
      if (error) throw error;
      await logAudit({ entity_type: "receipt", entity_id: id, entity_label: target?.receipt_number, action: "delete" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["receipts"] }); toast.success("Kwitansi dihapus"); setDeleteId(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const target = (receipts ?? []).find((r) => r.id === id);
      if (target?.status === "final" && status === "draft") {
        throw new Error("Kwitansi Final tidak dapat dikembalikan menjadi Draft");
      }
      const { error } = await supabase.from("receipts").update({ status }).eq("id", id);
      if (error) throw error;
      await logAudit({ entity_type: "receipt", entity_id: id, entity_label: target?.receipt_number, action: "status_change", details: { status } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["receipts"] }); toast.success("Status diperbarui"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const finalizeMutation = useMutation({
    mutationFn: async (r: Receipt) => {
      if (r.status === "final") throw new Error("Sudah final");
      const { error } = await supabase.from("receipts")
        .update({ status: "final", finalized_at: new Date().toISOString() }).eq("id", r.id);
      if (error) throw error;
      await logAudit({ entity_type: "receipt", entity_id: r.id, entity_label: r.receipt_number, action: "status_change", details: { status: "final", finalized: true } });
      // generate final PDF without watermark
      try {
        const refreshed: Receipt = { ...r, status: "final" };
        const blob = await buildReceiptPdf({
          receipt_number: refreshed.receipt_number, receipt_date: refreshed.receipt_date, status: "final",
          received_from: refreshed.received_from, amount: Number(refreshed.amount),
          amount_in_words: refreshed.amount_in_words, for_payment: refreshed.for_payment,
          payment_method: refreshed.payment_method, receiver_name: refreshed.receiver_name, notes: refreshed.notes,
        }, settings, (settings?.receipt_template as ReceiptTemplate) ?? "modern");
        await archivePdf({ doc_type: "receipt", doc_number: r.receipt_number, entity_id: r.id, date: r.receipt_date, blob });
      } catch (e) { console.warn("archive final failed", e); }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receipts"] });
      setFinalizeTarget(null);
      toast.success("Kwitansi difinalisasi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadPdf = async (r: Receipt) => {
    try {
      const blob = await buildReceiptPdf({
        receipt_number: r.receipt_number, receipt_date: r.receipt_date, status: r.status,
        received_from: r.received_from, amount: Number(r.amount),
        amount_in_words: r.amount_in_words, for_payment: r.for_payment,
        payment_method: r.payment_method, receiver_name: r.receiver_name, notes: r.notes,
      }, settings, (settings?.receipt_template as ReceiptTemplate) ?? "modern");
      triggerDownload(blob, `${r.receipt_number}.pdf`);
      try { await archivePdf({ doc_type: "receipt", doc_number: r.receipt_number, entity_id: r.id, date: r.receipt_date, blob }); } catch (e) { console.warn(e); }
      await logAudit({ entity_type: "receipt", entity_id: r.id, entity_label: r.receipt_number, action: "download_pdf" });
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Kwitansi</h1>
          <p className="text-muted-foreground mt-1">Kelola kwitansi penerimaan</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Buat Kwitansi
        </Button>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nomor / dari / keperluan..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <ReceiptIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium">{receipts?.length === 0 ? "Belum ada kwitansi" : "Tidak ada hasil"}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Diterima dari</TableHead>
                <TableHead>Untuk</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const sm = statusMeta(r.status);
                const isAuto = r.receipt_type === "otomatis";
                const isFinal = r.status === "final";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.receipt_number}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={isAuto ? "bg-blue-100 text-blue-700" : ""}>
                        {isAuto ? "Otomatis" : "Manual"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(r.receipt_date)}</TableCell>
                    <TableCell>{r.received_from}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">{r.for_payment}</TableCell>
                    <TableCell className="text-right font-medium">{fmtIDR(Number(r.amount))}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => statusMutation.mutate({ id: r.id, status: v as Status })} disabled={isFinal}>
                        <SelectTrigger className="h-8 w-[130px] border-0 p-0 [&>svg]:hidden">
                          <Badge className={`${sm.tone} font-normal`} variant="secondary">{sm.label}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      {!isFinal && r.status !== "dibatalkan" && (
                        <Button variant="ghost" size="icon" onClick={() => setFinalizeTarget(r)} title="Finalisasi" className="text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setPreviewId(r.id)} title="Preview"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setFormOpen(true); }} title="Edit" disabled={isFinal}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => downloadPdf(r)} title="Download PDF"><Download className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)} className="text-destructive hover:text-destructive" title="Hapus" disabled={isFinal}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {formOpen && (
        <ReceiptFormDialog open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} editing={editing} />
      )}
      {previewId && (
        <ReceiptPreviewDialog id={previewId} onClose={() => setPreviewId(null)} onDownload={downloadPdf} />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kwitansi?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!finalizeTarget} onOpenChange={(o) => !o && setFinalizeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalisasi kwitansi?</AlertDialogTitle>
            <AlertDialogDescription>
              Kwitansi <b>{finalizeTarget?.receipt_number}</b> akan ditandai <b>FINAL</b>. Setelah final,
              kwitansi tidak dapat dikembalikan ke Draft dan tidak dapat diubah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => finalizeTarget && finalizeMutation.mutate(finalizeTarget)}
              className="bg-emerald-600 text-white hover:bg-emerald-700">
              Finalisasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReceiptFormDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Receipt | null }) {
  const qc = useQueryClient();
  const [receiptType, setReceiptType] = useState<"manual" | "otomatis">(((editing?.receipt_type as "manual" | "otomatis") ?? "manual"));
  const [invoiceId, setInvoiceId] = useState<string | null>(editing?.invoice_id ?? null);
  const [receiptDate, setReceiptDate] = useState(editing?.receipt_date ?? todayISO());
  const [receivedFrom, setReceivedFrom] = useState(editing?.received_from ?? "");
  const [amount, setAmount] = useState<number>(Number(editing?.amount ?? 0));
  const [amountWords, setAmountWords] = useState(editing?.amount_in_words ?? "");
  const [forPayment, setForPayment] = useState(editing?.for_payment ?? "");
  const [paymentMethod, setPaymentMethod] = useState(editing?.payment_method ?? "Transfer");
  const [receiverName, setReceiverName] = useState(editing?.receiver_name ?? "");
  const [status, setStatus] = useState<Status>(editing?.status ?? "draft");
  const [notes, setNotes] = useState(editing?.notes ?? "");

  const autoWords = useMemo(() => terbilang(amount || 0), [amount]);

  const { data: invoiceOptions } = useQuery({
    queryKey: ["invoices-for-receipt"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices")
        .select("id, invoice_number, invoice_date, grand_total, customer:customers(nama_pelanggan, nama_perusahaan)")
        .order("invoice_date", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: receiptType === "otomatis",
  });

  const onPickInvoice = (id: string) => {
    setInvoiceId(id);
    const inv: any = (invoiceOptions ?? []).find((i: any) => i.id === id);
    if (!inv) return;
    const name = inv.customer?.nama_perusahaan || inv.customer?.nama_pelanggan || "—";
    setReceivedFrom(name);
    setAmount(Number(inv.grand_total));
    setAmountWords(terbilang(Number(inv.grand_total)));
    setForPayment(`Pembayaran invoice ${inv.invoice_number}`);
    setReceiptDate(inv.invoice_date);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!receivedFrom.trim()) throw new Error("Isi 'Sudah diterima dari'");
      if (!amount || amount <= 0) throw new Error("Nominal harus lebih dari 0");
      if (receiptType === "otomatis" && !invoiceId) throw new Error("Pilih invoice terlebih dahulu");
      const { data: user } = await supabase.auth.getUser();
      const payload = {
        receipt_date: receiptDate, received_from: receivedFrom, amount,
        amount_in_words: amountWords || autoWords,
        for_payment: forPayment || null, payment_method: paymentMethod || null,
        receiver_name: receiverName || null, status, notes: notes || null,
        invoice_id: receiptType === "otomatis" ? invoiceId : null,
        receipt_type: receiptType,
      };
      if (editing) {
        const { error } = await supabase.from("receipts").update(payload).eq("id", editing.id);
        if (error) throw error;
        await logAudit({ entity_type: "receipt", entity_id: editing.id, entity_label: editing.receipt_number, action: "update" });
      } else {
        const { data: numData, error: ne } = await supabase.rpc("next_receipt_number", { _date: receiptDate });
        if (ne) throw ne;
        const { data: tidData } = await supabase.rpc("get_my_tenant_id");
        const { data: created, error } = await supabase.from("receipts").insert({
          tenant_id: tidData,
                    ...payload, receipt_number: numData as string, created_by: user.user?.id,
        }).select().single();
        if (error) throw error;
        await logAudit({ entity_type: "receipt", entity_id: created.id, entity_label: created.receipt_number, action: "create" });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["receipts"] }); toast.success(editing ? "Kwitansi diperbarui" : "Kwitansi dibuat"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.receipt_number}` : "Buat Kwitansi Baru"}</DialogTitle>
          <DialogDescription>{editing ? "Perbarui informasi kwitansi" : "Nomor kwitansi akan dibuat otomatis (KW-YYYYMM-XXXX)"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jenis Kwitansi *</Label>
              <Select value={receiptType} onValueChange={(v) => { setReceiptType(v as any); if (v === "manual") setInvoiceId(null); }} disabled={!!editing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="otomatis">Otomatis dari Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {receiptType === "otomatis" && (
              <div className="space-y-2">
                <Label>Invoice Terkait *</Label>
                <Select value={invoiceId ?? ""} onValueChange={onPickInvoice} disabled={!!editing}>
                  <SelectTrigger><SelectValue placeholder="Pilih invoice" /></SelectTrigger>
                  <SelectContent>
                    {(invoiceOptions ?? []).map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.invoice_number} — {i.customer?.nama_perusahaan || i.customer?.nama_pelanggan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal *</Label>
              <Input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sudah diterima dari *</Label>
            <Input value={receivedFrom} onChange={(e) => setReceivedFrom(e.target.value)} placeholder="Nama / perusahaan" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nominal (Rp) *</Label>
              <Input type="number" min={0} step="1" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Transfer / Tunai / Cek" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Uang sejumlah (terbilang)</Label>
            <Textarea rows={2} value={amountWords} onChange={(e) => setAmountWords(e.target.value)} placeholder={autoWords} />
            <p className="text-xs text-muted-foreground">Kosongkan untuk pakai otomatis: <em>{autoWords}</em></p>
          </div>
          <div className="space-y-2">
            <Label>Untuk pembayaran</Label>
            <Textarea rows={2} value={forPayment} onChange={(e) => setForPayment(e.target.value)} placeholder="Keperluan / referensi invoice" />
          </div>
          <div className="space-y-2">
            <Label>Penerima</Label>
            <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Nama penerima" />
          </div>
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReceiptPreviewDialog({ id, onClose, onDownload }: { id: string; onClose: () => void; onDownload: (r: Receipt) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["receipt", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select("*, invoice:invoices(id, invoice_number)")
        .eq("id", id).single();
      if (error) throw error;
      return data as Receipt & { invoice?: { id: string; invoice_number: string } | null };
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        {isLoading || !data ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">{data.receipt_number}</DialogTitle>
              <DialogDescription>{fmtDate(data.receipt_date)} • {statusMeta(data.status).label}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-sm">
              <Field label="Sudah diterima dari" value={data.received_from} />
              {data.invoice && (
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Invoice Terkait</p>
                  <Link to="/invoice" className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline">
                    <FileText className="h-4 w-4" /> {data.invoice.invoice_number}
                  </Link>
                </div>
              )}
              <Field label="Uang sejumlah" value={data.amount_in_words || terbilang(Number(data.amount))} />
              <Field label="Untuk pembayaran" value={data.for_payment ?? "-"} />
              <Field label="Metode pembayaran" value={data.payment_method ?? "-"} />
              <div className="pt-3 border-t flex items-baseline justify-between">
                <span className="text-muted-foreground">Nominal</span>
                <span className="text-2xl font-bold">{fmtIDR(Number(data.amount))}</span>
              </div>
              {data.receiver_name && <Field label="Penerima" value={data.receiver_name} />}
              {data.notes && <Field label="Catatan" value={data.notes} />}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Tutup</Button>
              <Button onClick={() => onDownload(data)}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-medium whitespace-pre-wrap">{value}</p>
    </div>
  );
}
