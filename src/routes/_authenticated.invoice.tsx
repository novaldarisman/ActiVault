import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Pencil, Trash2, Loader2, FileText, Eye, Copy, Download, Trash,
} from "lucide-react";
import { toast } from "sonner";
import type { Tables, Database } from "@/integrations/supabase/types";
import { terbilang } from "@/lib/terbilang";
import { buildInvoicePdf, triggerDownload, type InvoiceTemplate } from "@/lib/invoice-pdf";
import { useSettings } from "@/lib/settings";
import { archivePdf } from "@/lib/archive";
import { logAudit } from "@/lib/audit";

type Customer = Tables<"customers">;
type Invoice = Tables<"invoices">;
type InvoiceItem = Tables<"invoice_items">;
type Status = Database["public"]["Enums"]["invoice_status"];

export const Route = createFileRoute("/_authenticated/invoice")({
  head: () => ({ meta: [{ title: "Invoice — Nova Invoice" }] }),
  component: InvoicePage,
});

const STATUS: { value: Status; label: string; tone: string }[] = [
  { value: "draft", label: "Draft", tone: "bg-muted text-muted-foreground" },
  { value: "terkirim", label: "Terkirim", tone: "bg-blue-100 text-blue-700" },
  { value: "sebagian_dibayar", label: "Sebagian Dibayar", tone: "bg-amber-100 text-amber-700" },
  { value: "lunas", label: "Lunas", tone: "bg-emerald-100 text-emerald-700" },
  { value: "jatuh_tempo", label: "Jatuh Tempo", tone: "bg-red-100 text-red-700" },
  { value: "dibatalkan", label: "Dibatalkan", tone: "bg-zinc-200 text-zinc-700" },
];
const statusMeta = (s: Status) => STATUS.find((x) => x.value === s) ?? STATUS[0];

const fmtIDR = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(n));
const fmtDate = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

type ItemForm = {
  description: string; qty: number; unit: string; price: number;
  discount_percent: number; tax_percent: number;
};
const emptyItem = (): ItemForm => ({ description: "", qty: 1, unit: "pcs", price: 0, discount_percent: 0, tax_percent: 11 });

function computeItem(it: ItemForm) {
  const gross = it.qty * it.price;
  const disc = gross * (it.discount_percent / 100);
  const net = gross - disc;
  const tax = net * (it.tax_percent / 100);
  return { gross, disc, net, tax, subtotal: net + tax };
}

function InvoicePage() {
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("nama_pelanggan");
      if (error) throw error;
      return data as Customer[];
    },
  });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, customer:customers(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (Invoice & { customer: Customer })[];
    },
  });

  const customerById = useMemo(() => {
    const m = new Map<string, Customer>();
    (customers ?? []).forEach((c) => m.set(c.id, c));
    return m;
  }, [customers]);

  const filtered = (invoices ?? []).filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (customerFilter !== "all" && inv.customer_id !== customerFilter) return false;
    if (dateFrom && inv.invoice_date < dateFrom) return false;
    if (dateTo && inv.invoice_date > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${inv.invoice_number} ${inv.customer?.nama_pelanggan ?? ""} ${inv.customer?.nama_perusahaan ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const target = (invoices ?? []).find((i) => i.id === id);
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
      await logAudit({ entity_type: "invoice", entity_id: id, entity_label: target?.invoice_number, action: "delete" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice dihapus");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const target = (invoices ?? []).find((i) => i.id === id);
      const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
      if (error) throw error;
      await logAudit({ entity_type: "invoice", entity_id: id, entity_label: target?.invoice_number, action: "status_change", details: { status } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Status diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (inv: Invoice) => { setEditing(inv); setFormOpen(true); };

  const duplicate = async (inv: Invoice) => {
    try {
      const { data: items, error: ie } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id).order("position");
      if (ie) throw ie;
      const { data: numData, error: ne } = await supabase.rpc("next_invoice_number", { _date: todayISO() });
      if (ne) throw ne;
      const { data: user } = await supabase.auth.getUser();
      const { data: newInv, error: e1 } = await supabase.from("invoices").insert({
        invoice_number: numData as string,
        customer_id: inv.customer_id,
        invoice_date: todayISO(),
        due_date: addDays(todayISO(), 14),
        status: "draft",
        subtotal: inv.subtotal,
        discount_total: inv.discount_total,
        tax_total: inv.tax_total,
        grand_total: inv.grand_total,
        notes: inv.notes,
        created_by: user.user?.id,
      }).select().single();
      if (e1) throw e1;
      if (items && items.length) {
        const { error: e2 } = await supabase.from("invoice_items").insert(
          (items as InvoiceItem[]).map((it, i) => ({
            invoice_id: newInv.id, description: it.description, qty: it.qty, unit: it.unit,
            price: it.price, discount_percent: it.discount_percent, tax_percent: it.tax_percent,
            subtotal: it.subtotal, position: i,
          })),
        );
        if (e2) throw e2;
      }
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Invoice diduplikasi: ${newInv.invoice_number}`);
      await logAudit({ entity_type: "invoice", entity_id: newInv.id, entity_label: newInv.invoice_number, action: "duplicate", details: { from: inv.invoice_number } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const downloadPdf = async (inv: Invoice & { customer: Customer }) => {
    try {
      const { data: items, error } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id).order("position");
      if (error) throw error;
      const blob = await buildInvoicePdf({
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        status: inv.status,
        subtotal: Number(inv.subtotal),
        discount_total: Number(inv.discount_total),
        tax_total: Number(inv.tax_total),
        grand_total: Number(inv.grand_total),
        notes: inv.notes,
        customer: inv.customer,
        items: (items as InvoiceItem[]).map((it) => ({
          description: it.description,
          qty: Number(it.qty),
          unit: it.unit,
          price: Number(it.price),
          discount_percent: Number(it.discount_percent),
          tax_percent: Number(it.tax_percent),
          subtotal: Number(it.subtotal),
        })),
      }, settings, (settings?.invoice_template as InvoiceTemplate) ?? "modern");
      triggerDownload(blob, `${inv.invoice_number}.pdf`);
      try {
        await archivePdf({ doc_type: "invoice", doc_number: inv.invoice_number, entity_id: inv.id, date: inv.invoice_date, blob });
      } catch (e) { console.warn("archive failed", e); }
      await logAudit({ entity_type: "invoice", entity_id: inv.id, entity_label: inv.invoice_number, action: "download_pdf" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Invoice</h1>
          <p className="text-muted-foreground mt-1">Kelola invoice perusahaan</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Buat Invoice
        </Button>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nomor invoice / pelanggan..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger><SelectValue placeholder="Pelanggan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Pelanggan</SelectItem>
            {(customers ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nama_pelanggan}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium">{invoices?.length === 0 ? "Belum ada invoice" : "Tidak ada hasil"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {invoices?.length === 0 ? "Buat invoice pertama Anda" : "Coba sesuaikan filter pencarian"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => {
                const sm = statusMeta(inv.status);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>
                      <div className="font-medium">{inv.customer?.nama_pelanggan}</div>
                      {inv.customer?.nama_perusahaan && (
                        <div className="text-xs text-muted-foreground">{inv.customer.nama_perusahaan}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(inv.invoice_date)}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(inv.due_date)}</TableCell>
                    <TableCell className="text-right font-medium">{fmtIDR(Number(inv.grand_total))}</TableCell>
                    <TableCell>
                      <Select value={inv.status} onValueChange={(v) => statusMutation.mutate({ id: inv.id, status: v as Status })}>
                        <SelectTrigger className="h-8 w-[150px] border-0 p-0 [&>svg]:hidden">
                          <Badge className={`${sm.tone} font-normal`} variant="secondary">{sm.label}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setPreviewId(inv.id)} title="Preview"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(inv)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => duplicate(inv)} title="Duplikasi"><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => downloadPdf(inv)} title="Download PDF"><Download className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(inv.id)} className="text-destructive hover:text-destructive" title="Hapus"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {formOpen && (
        <InvoiceFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          editing={editing}
          customers={customers ?? []}
        />
      )}

      {previewId && (
        <InvoicePreviewDialog
          id={previewId}
          onClose={() => setPreviewId(null)}
          customerById={customerById}
          onDownload={downloadPdf}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus invoice?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan. Invoice dan seluruh itemnya akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InvoiceFormDialog({
  open, onClose, editing, customers,
}: {
  open: boolean; onClose: () => void; editing: Invoice | null; customers: Customer[];
}) {
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState<string>(editing?.customer_id ?? "");
  const [invoiceDate, setInvoiceDate] = useState<string>(editing?.invoice_date ?? todayISO());
  const [dueDate, setDueDate] = useState<string>(editing?.due_date ?? addDays(todayISO(), 14));
  const [status, setStatus] = useState<Status>(editing?.status ?? "draft");
  const [notes, setNotes] = useState<string>(editing?.notes ?? "");
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);
  const [loadingItems, setLoadingItems] = useState(!!editing);

  useQuery({
    queryKey: ["invoice_items_form", editing?.id],
    enabled: !!editing,
    queryFn: async () => {
      const { data, error } = await supabase.from("invoice_items").select("*").eq("invoice_id", editing!.id).order("position");
      if (error) throw error;
      const rows = (data as InvoiceItem[]).map<ItemForm>((it) => ({
        description: it.description, qty: Number(it.qty), unit: it.unit ?? "pcs",
        price: Number(it.price), discount_percent: Number(it.discount_percent), tax_percent: Number(it.tax_percent),
      }));
      setItems(rows.length ? rows : [emptyItem()]);
      setLoadingItems(false);
      return data;
    },
  });

  const totals = useMemo(() => {
    let sub = 0, disc = 0, tax = 0;
    items.forEach((it) => {
      const c = computeItem(it);
      sub += c.gross; disc += c.disc; tax += c.tax;
    });
    const grand = sub - disc + tax;
    return { sub, disc, tax, grand };
  }, [items]);

  const updateItem = (i: number, patch: Partial<ItemForm>) => {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  };
  const removeItem = (i: number) => setItems((prev) => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error("Pilih pelanggan terlebih dahulu");
      if (items.some((it) => !it.description.trim())) throw new Error("Setiap item harus memiliki deskripsi");
      const { data: user } = await supabase.auth.getUser();

      const itemRows = items.map((it, i) => {
        const c = computeItem(it);
        return {
          description: it.description, qty: it.qty, unit: it.unit || null,
          price: it.price, discount_percent: it.discount_percent, tax_percent: it.tax_percent,
          subtotal: c.subtotal, position: i,
        };
      });

      if (editing) {
        const { error: e1 } = await supabase.from("invoices").update({
          customer_id: customerId, invoice_date: invoiceDate, due_date: dueDate,
          status, notes: notes || null,
          subtotal: totals.sub, discount_total: totals.disc, tax_total: totals.tax, grand_total: totals.grand,
        }).eq("id", editing.id);
        if (e1) throw e1;
        const { error: e2 } = await supabase.from("invoice_items").delete().eq("invoice_id", editing.id);
        if (e2) throw e2;
        const { error: e3 } = await supabase.from("invoice_items").insert(itemRows.map((r) => ({ ...r, invoice_id: editing.id })));
        if (e3) throw e3;
      } else {
        const { data: numData, error: ne } = await supabase.rpc("next_invoice_number", { _date: invoiceDate });
        if (ne) throw ne;
        const { data: newInv, error: e1 } = await supabase.from("invoices").insert({
          invoice_number: numData as string,
          customer_id: customerId, invoice_date: invoiceDate, due_date: dueDate,
          status, notes: notes || null,
          subtotal: totals.sub, discount_total: totals.disc, tax_total: totals.tax, grand_total: totals.grand,
          created_by: user.user?.id,
        }).select().single();
        if (e1) throw e1;
        const { error: e2 } = await supabase.from("invoice_items").insert(itemRows.map((r) => ({ ...r, invoice_id: newInv.id })));
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(editing ? "Invoice diperbarui" : "Invoice dibuat");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.invoice_number}` : "Buat Invoice Baru"}</DialogTitle>
          <DialogDescription>{editing ? "Perbarui informasi invoice" : "Nomor invoice akan dibuat otomatis (INV-YYYYMM-XXXX)"}</DialogDescription>
        </DialogHeader>

        {loadingItems ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-5 py-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label>Pelanggan *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Pilih pelanggan" /></SelectTrigger>
                  <SelectContent>
                    {customers.filter((c) => c.status_aktif || c.id === customerId).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nama_pelanggan}{c.nama_perusahaan ? ` — ${c.nama_perusahaan}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal Invoice *</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Jatuh Tempo *</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base">Item Invoice</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setItems((p) => [...p, emptyItem()])}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah Item
                </Button>
              </div>
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left p-2 min-w-[200px]">Deskripsi</th>
                      <th className="text-right p-2 w-20">Qty</th>
                      <th className="text-left p-2 w-20">Satuan</th>
                      <th className="text-right p-2 w-32">Harga</th>
                      <th className="text-right p-2 w-20">Disk %</th>
                      <th className="text-right p-2 w-20">PPN %</th>
                      <th className="text-right p-2 w-32">Subtotal</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => {
                      const c = computeItem(it);
                      return (
                        <tr key={i} className="border-t">
                          <td className="p-1.5"><Input value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} placeholder="Deskripsi item" /></td>
                          <td className="p-1.5"><Input type="number" min={0} step="0.01" value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} className="text-right" /></td>
                          <td className="p-1.5"><Input value={it.unit} onChange={(e) => updateItem(i, { unit: e.target.value })} /></td>
                          <td className="p-1.5"><Input type="number" min={0} step="0.01" value={it.price} onChange={(e) => updateItem(i, { price: Number(e.target.value) })} className="text-right" /></td>
                          <td className="p-1.5"><Input type="number" min={0} max={100} step="0.01" value={it.discount_percent} onChange={(e) => updateItem(i, { discount_percent: Number(e.target.value) })} className="text-right" /></td>
                          <td className="p-1.5"><Input type="number" min={0} max={100} step="0.01" value={it.tax_percent} onChange={(e) => updateItem(i, { tax_percent: Number(e.target.value) })} className="text-right" /></td>
                          <td className="p-1.5 text-right font-medium">{fmtIDR(c.subtotal)}</td>
                          <td className="p-1.5">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)} disabled={items.length === 1} className="text-destructive">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Label className="mt-3 block">Catatan</Label>
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan..." />
              </div>
              <Card className="p-4 space-y-2 bg-muted/30">
                <Row label="Subtotal" val={fmtIDR(totals.sub)} />
                <Row label="Diskon" val={`- ${fmtIDR(totals.disc)}`} />
                <Row label="PPN" val={fmtIDR(totals.tax)} />
                <div className="border-t pt-2 mt-2">
                  <Row label="Grand Total" val={fmtIDR(totals.grand)} bold />
                </div>
                <p className="text-xs text-muted-foreground italic pt-2 border-t">
                  Terbilang: {terbilang(totals.grand)}
                </p>
              </Card>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, val, bold }: { label: string; val: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold text-base" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{val}</span>
    </div>
  );
}

function InvoicePreviewDialog({
  id, onClose, customerById, onDownload,
}: {
  id: string; onClose: () => void;
  customerById: Map<string, Customer>;
  onDownload: (inv: Invoice & { customer: Customer }) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data: inv, error } = await supabase.from("invoices").select("*").eq("id", id).single();
      if (error) throw error;
      const { data: items, error: e2 } = await supabase.from("invoice_items").select("*").eq("invoice_id", id).order("position");
      if (e2) throw e2;
      return { inv: inv as Invoice, items: items as InvoiceItem[] };
    },
  });

  const customer = data ? customerById.get(data.inv.customer_id) : null;
  const sm = data ? statusMeta(data.inv.status) : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        {isLoading || !data ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-2xl">{data.inv.invoice_number}</DialogTitle>
                  <DialogDescription>Detail Invoice</DialogDescription>
                </div>
                {sm && <Badge className={`${sm.tone} font-normal`} variant="secondary">{sm.label}</Badge>}
              </div>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-6 py-2">
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Ditagihkan kepada</p>
                <p className="font-semibold">{customer?.nama_perusahaan || customer?.nama_pelanggan}</p>
                {customer?.nama_perusahaan && <p className="text-sm">a.n {customer.nama_pelanggan}</p>}
                {customer?.alamat && <p className="text-sm text-muted-foreground">{customer.alamat}</p>}
                {customer?.telepon && <p className="text-sm text-muted-foreground">{customer.telepon}</p>}
                {customer?.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
                {customer?.npwp && <p className="text-sm text-muted-foreground">NPWP: {customer.npwp}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm"><span className="text-muted-foreground">Tanggal: </span>{fmtDate(data.inv.invoice_date)}</p>
                <p className="text-sm"><span className="text-muted-foreground">Jatuh Tempo: </span>{fmtDate(data.inv.due_date)}</p>
              </div>
            </div>

            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">Deskripsi</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-right p-2">Harga</th>
                    <th className="text-right p-2">Disk</th>
                    <th className="text-right p-2">PPN</th>
                    <th className="text-right p-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="p-2">{it.description}</td>
                      <td className="p-2 text-right">{Number(it.qty)} {it.unit ?? ""}</td>
                      <td className="p-2 text-right">{fmtIDR(Number(it.price))}</td>
                      <td className="p-2 text-right">{Number(it.discount_percent)}%</td>
                      <td className="p-2 text-right">{Number(it.tax_percent)}%</td>
                      <td className="p-2 text-right font-medium">{fmtIDR(Number(it.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-1.5 text-sm">
                <Row label="Subtotal" val={fmtIDR(Number(data.inv.subtotal))} />
                <Row label="Diskon" val={`- ${fmtIDR(Number(data.inv.discount_total))}`} />
                <Row label="PPN" val={fmtIDR(Number(data.inv.tax_total))} />
                <div className="border-t pt-2 mt-2">
                  <Row label="Grand Total" val={fmtIDR(Number(data.inv.grand_total))} bold />
                </div>
                <p className="text-xs italic text-muted-foreground pt-2 border-t">
                  Terbilang: {terbilang(Number(data.inv.grand_total))}
                </p>
              </div>
            </div>

            {data.inv.notes && (
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs uppercase text-muted-foreground mb-1">Catatan</p>
                <p className="text-sm whitespace-pre-wrap">{data.inv.notes}</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Tutup</Button>
              <Button onClick={() => customer && onDownload({ ...data.inv, customer })}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}