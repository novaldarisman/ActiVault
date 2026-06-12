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
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, Pencil, Trash2, Loader2, FileText,
  Eye, Copy, Download, FilePlus, Settings2,
} from "lucide-react";
import { toast } from "sonner";
import type { Tables, Database } from "@/integrations/supabase/types";
import { archivePdf } from "@/lib/archive";
import { buildDocumentPdf, triggerDownload } from "@/lib/surat-pdf";
import { logAudit } from "@/lib/audit";
import { useMyRoles } from "@/lib/use-role";

type DocType = Tables<"document_types">;
type Document = Tables<"documents">;
type DocTemplate = Tables<"document_templates">;
type Customer = Tables<"customers">;
type DocStatus = Database["public"]["Enums"]["document_status"];

export const Route = createFileRoute("/_authenticated/surat")({
  head: () => ({ meta: [{ title: "Surat Menyurat \u2014 DocTiva" }] }),
  component: SuratPage,
});

const STATUS: { value: DocStatus; label: string; tone: string }[] = [
  { value: "draft", label: "Draft", tone: "bg-muted text-muted-foreground" },
  { value: "aktif", label: "Aktif", tone: "bg-emerald-100 text-emerald-700" },
  { value: "selesai", label: "Selesai", tone: "bg-blue-100 text-blue-700" },
  { value: "berakhir", label: "Berakhir", tone: "bg-amber-100 text-amber-700" },
  { value: "dibatalkan", label: "Dibatalkan", tone: "bg-red-100 text-red-700" },
];
const statusMeta = (s: DocStatus) => STATUS.find((x) => x.value === s) ?? STATUS[0];

const fmtDate = (s: string) => new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const todayISO = () => { const d = new Date(); return d.toISOString().slice(0, 10); };

const PLACEHOLDERS = [
  { key: "nomor_dokumen", label: "Nomor Dokumen" },
  { key: "judul_dokumen", label: "Judul Dokumen" },
  { key: "tanggal_dokumen", label: "Tanggal Dokumen" },
  { key: "tanggal_mulai", label: "Tanggal Mulai" },
  { key: "tanggal_berakhir", label: "Tanggal Berakhir" },
  { key: "status_dokumen", label: "Status Dokumen" },
  { key: "nama_perusahaan", label: "Nama Perusahaan" },
  { key: "alamat_perusahaan", label: "Alamat Perusahaan" },
  { key: "npwp_perusahaan", label: "NPWP Perusahaan" },
  { key: "email_perusahaan", label: "Email Perusahaan" },
  { key: "telepon_perusahaan", label: "Telepon Perusahaan" },
  { key: "nama_pelanggan", label: "Nama Pelanggan" },
  { key: "nama_perusahaan_pelanggan", label: "Perusahaan Pelanggan" },
  { key: "alamat_pelanggan", label: "Alamat Pelanggan" },
  { key: "email_pelanggan", label: "Email Pelanggan" },
  { key: "telepon_pelanggan", label: "Telepon Pelanggan" },
  { key: "nama_pic", label: "Nama PIC" },
];

const PLACEHOLDER_FN: Record<string, (doc: any, cust?: Customer | null, settings?: any) => string> = {
  nomor_dokumen: (d) => d.document_number ?? "",
  judul_dokumen: (d) => d.title ?? "",
  tanggal_dokumen: (d) => d.document_date ? fmtDate(d.document_date) : "",
  tanggal_mulai: (d) => d.effective_date ? fmtDate(d.effective_date) : "",
  tanggal_berakhir: (d) => d.expiry_date ? fmtDate(d.expiry_date) : "",
  status_dokumen: (d) => statusMeta(d.status).label,
  nama_perusahaan: (_d, _c, s) => s?.company_name ?? "",
  alamat_perusahaan: (_d, _c, s) => s?.company_address ?? "",
  npwp_perusahaan: (_d, _c, s) => s?.company_npwp ?? "",
  email_perusahaan: (_d, _c, s) => s?.company_email ?? "",
  telepon_perusahaan: (_d, _c, s) => s?.company_phone ?? "",
  nama_pelanggan: (_d, c) => c?.nama_pelanggan ?? "",
  nama_perusahaan_pelanggan: (_d, c) => c?.nama_perusahaan ?? "",
  alamat_pelanggan: (_d, c) => c?.alamat ?? "",
  email_pelanggan: (_d, c) => c?.email ?? "",
  telepon_pelanggan: (_d, c) => c?.telepon ?? "",
  nama_pic: (_d, c) => c?.pic ?? "",
};

function applyPlaceholders(content: string, doc: any, cust?: Customer | null, settings?: any): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_m: string, key: string) => {
    const fn = PLACEHOLDER_FN[key];
    return fn ? fn(doc, cust, settings) : `{{${key}}}`;
  });
}

function SuratPage() {
  const qc = useQueryClient();
  const { data: me } = useMyRoles();
  const roles = me?.roles ?? [];
  const isSuperAdmin = roles.includes("super_admin");
  const canManage = roles.some((r) => ["super_admin", "owner", "admin_keuangan"].includes(r));
  const canDelete = roles.some((r) => ["super_admin", "owner"].includes(r));

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Document | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [templateOpen, setTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocTemplate | null>(null);
  const [templateTypeId, setTemplateTypeId] = useState<string>("");
  // ===== DATA QUERIES =====
  const { data: docTypes } = useQuery({
    queryKey: ["document_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_types").select("*").order("sort_order");
      if (error) throw error;
      return data as DocType[];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("status_aktif", true).order("nama_pelanggan");
      if (error) throw error;
      return data as Customer[];
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["document_templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_templates").select("*").order("name");
      if (error) throw error;
      return data as DocTemplate[];
    },
  });

  const { data: appSettings } = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").limit(1).single();
      if (error) return null;
      return data;
    },
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").order("document_date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Document[];
    },
  });

  // ===== FILTERED / SORTED LIST =====
  const filtered = useMemo(() => {
    if (!documents) return [];
    return documents.filter((d) => {
      if (typeFilter !== "all" && d.document_type_id !== typeFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const dt = docTypes?.find((t) => t.id === d.document_type_id);
        const cust = customers?.find((c) => c.id === d.customer_id);
        if (![
          d.document_number, d.title,
          dt?.name, cust?.nama_pelanggan, cust?.nama_perusahaan,
          d.created_by_email,
        ].some((v) => v?.toLowerCase().includes(q))) return false;
      }
      if (dateFrom && d.document_date < dateFrom) return false;
      if (dateTo && d.document_date > dateTo) return false;
      return true;
    });
  }, [documents, typeFilter, statusFilter, search, dateFrom, dateTo, docTypes, customers]);

  // ===== FORM STATE =====
  const [docTypeId, setDocTypeId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [documentDate, setDocumentDate] = useState(todayISO());
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<DocStatus>("draft");
  const [notes, setNotes] = useState("");

  // ===== TEMPLATE FORM STATE =====
  const [tplName, setTplName] = useState("");
  const [tplDescription, setTplDescription] = useState("");
  const [tplContent, setTplContent] = useState("");

  const resetForm = () => {
    setDocTypeId(""); setTemplateId("_none"); setTitle(""); setDocumentDate(todayISO());
    setEffectiveDate(""); setExpiryDate(""); setCustomerId(""); setContent("");
    setStatus("draft"); setNotes("");
  };

  const openCreate = () => { resetForm(); setEditing(null); setFormOpen(true); };
  const openEdit = (doc: Document) => {
    setEditing(doc);
    setDocTypeId(doc.document_type_id);
    setTemplateId(doc.template_id ?? "_none");
    setTitle(doc.title);
    setDocumentDate(doc.document_date);
    setEffectiveDate(doc.effective_date ?? "");
    setExpiryDate(doc.expiry_date ?? "");
    setCustomerId(doc.customer_id ?? "");
    setContent(doc.content);
    setStatus(doc.status);
    setNotes(doc.notes ?? "");
    setFormOpen(true);
  };
  const openDuplicate = (doc: Document) => {
    openEdit(doc);
    setEditing(null);
  };
  const onClose = () => { resetForm(); setFormOpen(false); setTemplateOpen(false); };

  // Get filtered templates for selected doc type
  const typeTemplates = useMemo(() => {
    if (!templates) return [];
    if (!docTypeId) return templates;
    return templates.filter((t) => t.document_type_id === docTypeId);
  }, [templates, docTypeId]);

  // Get selected document type
  const selectedDocType = useMemo(() => docTypes?.find((t) => t.id === docTypeId), [docTypes, docTypeId]);

  // Get selected customer
  const selectedCustomer = useMemo(() => customers?.find((c) => c.id === customerId), [customers, customerId]);

  // Get selected template
  const selectedTemplate = useMemo(() => templates?.find((t) => t.id === templateId), [templates, templateId]);

  // ===== SAVE MUTATION =====
  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await supabase.auth.getUser();
      if (!title.trim()) throw new Error("Judul dokumen wajib diisi");
      if (!docTypeId) throw new Error("Jenis dokumen wajib dipilih");

      if (editing) {
        const { error } = await supabase.from("documents").update({
          document_type_id: docTypeId, template_id: templateId === "_none" ? null : templateId || null,
          customer_id: customerId || null, title, document_date: documentDate,
          effective_date: effectiveDate || null, expiry_date: expiryDate || null,
          content, status, notes: notes || null,
        }).eq("id", editing.id);
        if (error) throw error;
        await logAudit({ entity_type: "document", entity_id: editing.id, entity_label: editing.document_number, action: "update" });
        if (editing.status !== status) {
          await supabase.from("document_status_histories").insert({
            document_id: editing.id, old_status: editing.status, new_status: status,
            changed_by: user.data.user?.id, changed_by_email: user.data.user?.email,
          });
        }
      } else {
        const docTypeSelected = docTypes?.find((t) => t.id === docTypeId);
        if (!docTypeSelected) throw new Error("Jenis dokumen tidak ditemukan");
        const { data: numData, error: ne } = await supabase.rpc("next_document_number", { _document_type_id: docTypeId, _date: documentDate });
        if (ne) throw ne;
        const { data: newDoc, error } = await supabase.from("documents").insert({
          document_number: numData as string,
          document_type_id: docTypeId, template_id: templateId === "_none" ? null : templateId || null,
          customer_id: customerId || null, title, document_date: documentDate,
          effective_date: effectiveDate || null, expiry_date: expiryDate || null,
          content, status, notes: notes || null,
          created_by: user.data.user?.id, created_by_email: user.data.user?.email,
          finalized_at: status !== "draft" ? new Date().toISOString() : null,
        }).select().single();
        if (error) throw error;
        await logAudit({ entity_type: "document", entity_id: newDoc.id, entity_label: newDoc.document_number, action: "create" });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success(editing ? "Dokumen diperbarui" : "Dokumen dibuat");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ===== DELETE MUTATION =====
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteId) return;
      const doc = documents?.find((d) => d.id === deleteId);
      const { error } = await supabase.from("documents").delete().eq("id", deleteId);
      if (error) throw error;
      if (doc) await logAudit({ entity_type: "document", entity_id: doc.id, entity_label: doc.document_number, action: "delete" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); toast.success("Dokumen dihapus"); setDeleteId(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  // ===== PDF DOWNLOAD =====
  const downloadPdf = async (doc: Document) => {
    try {
      const cust = customers?.find((c) => c.id === doc.customer_id);
      const tpl = doc.template_id ? templates?.find((t) => t.id === doc.template_id) : null;
      const htmlContent = tpl ? applyPlaceholders(tpl.content, doc, cust, appSettings) : applyPlaceholders(doc.content, doc, cust, appSettings);
      const docTypeItem = docTypes?.find((t) => t.id === doc.document_type_id);
      const blob = await buildDocumentPdf({
        documentNumber: doc.document_number,
        documentDate: fmtDate(doc.document_date),
        title: doc.title,
        docTypeName: docTypeItem?.name ?? "",
        content: htmlContent,
        companyName: appSettings?.company_name ?? "",
        companyAddress: appSettings?.company_address ?? "",
        customerName: cust?.nama_pelanggan ?? "",
      });
      triggerDownload(blob, `${doc.document_number}.pdf`);
      await archivePdf({
        doc_type: docTypeItem?.code ?? "document",
        doc_number: doc.document_number,
        entity_id: doc.id,
        date: doc.document_date,
        blob,
      });
      await logAudit({ entity_type: "document", entity_id: doc.id, entity_label: doc.document_number, action: "download_pdf" });
      toast.success("PDF diunduh dan diarsipkan");
    } catch (e) {
      toast.error("Gagal membuat PDF");
      console.error(e);
    }
  };

  // ===== TEMPLATE SAVE =====
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!tplName.trim()) throw new Error("Nama template wajib diisi");
      if (!templateTypeId && !editingTemplate) throw new Error("Pilih jenis dokumen");
      const user = await supabase.auth.getUser();
      const targetTypeId = editingTemplate ? editingTemplate.document_type_id : templateTypeId;

      if (editingTemplate) {
        const { error } = await supabase.from("document_templates").update({
          name: tplName, description: tplDescription || null,
          content: tplContent, version: editingTemplate.version + 1,
        }).eq("id", editingTemplate.id);
        if (error) throw error;
        await logAudit({ entity_type: "document_template", entity_id: editingTemplate.id, entity_label: tplName, action: "update" });
      } else {
        const { error } = await supabase.from("document_templates").insert({
          document_type_id: targetTypeId, name: tplName, description: tplDescription || null,
          content: tplContent, created_by: user.data.user?.id, created_by_email: user.data.user?.email,
        });
        if (error) throw error;
        await logAudit({ entity_type: "document_template", entity_label: tplName, action: "create" });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document_templates"] });
      toast.success(editingTemplate ? "Template diperbarui" : "Template dibuat");
      setEditingTemplate(null); setTemplateOpen(false);
      setTplName(""); setTplDescription(""); setTplContent(""); setTemplateTypeId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("document_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["document_templates"] }); toast.success("Template dihapus"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openTemplateEdit = (tpl: DocTemplate) => {
    setEditingTemplate(tpl);
    setTplName(tpl.name);
    setTplDescription(tpl.description ?? "");
    setTplContent(tpl.content);
    setTemplateOpen(true);
  };

  const openTemplateCreate = () => {
    setEditingTemplate(null);
    setTplName(""); setTplDescription(""); setTplContent(""); setTemplateTypeId("");
    setTemplateOpen(true);
  };


  // ===== RENDER =====
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Surat Menyurat</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola seluruh dokumen administrasi perusahaan
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openTemplateCreate}>
            <Settings2 className="h-4 w-4 mr-1" /> Template
          </Button>
          <Button size="sm" onClick={openCreate} disabled={!canManage}>
            <Plus className="h-4 w-4 mr-1" /> Buat Dokumen
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nomor, judul, pelanggan..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Jenis Dokumen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              {docTypes?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {STATUS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Dari" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Sampai" />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor Dokumen</TableHead>
                <TableHead>Judul</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-30" />
                    Belum ada dokumen. Klik &ldquo;Buat Dokumen&rdquo; untuk memulai.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((doc) => {
                  const dt = docTypes?.find((t) => t.id === doc.document_type_id);
                  const cust = customers?.find((c) => c.id === doc.customer_id);
                  const sm = statusMeta(doc.status);
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono text-sm">{doc.document_number}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{doc.title}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{dt?.name ?? "\u2014"}</Badge></TableCell>
                      <TableCell className="max-w-[160px] truncate">{cust?.nama_pelanggan ?? "\u2014"}</TableCell>
                      <TableCell className="text-sm">{fmtDate(doc.document_date)}</TableCell>
                      <TableCell><Badge className={`text-xs ${sm.tone}`}>{sm.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="Preview" onClick={() => setPreviewId(doc.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Download PDF" onClick={() => downloadPdf(doc)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          {canManage && (
                            <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(doc)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" title="Hapus" onClick={() => setDeleteId(doc.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ===== CREATE/EDIT DIALOG ===== */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.document_number}` : "Buat Dokumen Baru"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui informasi dokumen" : "Nomor dokumen akan dibuat otomatis berdasarkan jenis"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-5 py-2">
            {/* Row 1: Type, Template, Document Number preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Jenis Dokumen *</Label>
                <Select value={docTypeId} onValueChange={(v) => { setDocTypeId(v); setTemplateId("_none"); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis dokumen" /></SelectTrigger>
                  <SelectContent>
                    {docTypes?.filter((t) => t.is_active).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Pilih template (opsional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Tanpa Template</SelectItem>
                    {typeTemplates.filter((t) => t.is_active).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} (v{t.version})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Format Nomor</Label>
                <Input value={selectedDocType ? `${selectedDocType.number_prefix}-YYYYMM-XXXX` : "\u2014"} disabled className="text-muted-foreground font-mono text-sm" />
              </div>
            </div>

            {/* Row 2: Title, Customer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Judul Dokumen *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masukkan judul dokumen" required />
              </div>
              <div>
                <Label>Pelanggan / Mitra</Label>
                <Select value={customerId || "_none"} onValueChange={(v) => setCustomerId(v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih pelanggan (opsional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Tanpa Pelanggan</SelectItem>
                    {customers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nama_pelanggan}{c.nama_perusahaan ? ` (${c.nama_perusahaan})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCustomer && (
                  <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                    {selectedCustomer.nama_perusahaan && <p>Perusahaan: {selectedCustomer.nama_perusahaan}</p>}
                    {selectedCustomer.pic && <p>PIC: {selectedCustomer.pic}</p>}
                    {selectedCustomer.email && <p>Email: {selectedCustomer.email}</p>}
                    {selectedCustomer.telepon && <p>Telp: {selectedCustomer.telepon}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Tanggal Dokumen</Label>
                <Input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} />
              </div>
              <div>
                <Label>Tanggal Berlaku</Label>
                <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              </div>
              <div>
                <Label>Tanggal Berakhir (opsional)</Label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
            </div>

            {/* Row 4: Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as DocStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Catatan</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan internal (opsional)" />
              </div>
            </div>

            {/* Template content fill */}
            {selectedTemplate && (
              <div className="p-3 border rounded-md bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Template: {selectedTemplate.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => {
                    const resolved = applyPlaceholders(selectedTemplate.content, { document_number: "[AUTO]", title, document_date: documentDate, effective_date: effectiveDate, expiry_date: expiryDate, status }, selectedCustomer, appSettings);
                    setContent(resolved);
                  }}>
                    <Copy className="h-3 w-3 mr-1" /> Terapkan Template
                  </Button>
                </div>
              </div>
            )}

            {/* Content Editor */}
            <div>
              <Label>Konten Dokumen</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tulis isi dokumen di sini. Gunakan {{placeholder}} untuk data dinamis."
                className="min-h-[280px] font-mono text-sm"
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {PLACEHOLDERS.map((ph) => (
                  <Button
                    key={ph.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() => setContent((prev) => prev + ` {{${ph.key}}}`)}
                  >
                    {`{{${ph.key}}}`}
                  </Button>
                ))}
              </div>
            </div>


            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editing ? "Simpan Perubahan" : "Buat Dokumen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== PREVIEW DIALOG ===== */}
      <Dialog open={!!previewId} onOpenChange={(o) => { if (!o) setPreviewId(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Dokumen</DialogTitle>
          </DialogHeader>
          {previewId && (() => {
            const doc = documents?.find((d) => d.id === previewId);
            if (!doc) return <p className="text-muted-foreground">Dokumen tidak ditemukan</p>;
            const cust = customers?.find((c) => c.id === doc.customer_id);
            const dt = docTypes?.find((t) => t.id === doc.document_type_id);
            const tpl = doc.template_id ? templates?.find((t) => t.id === doc.template_id) : null;
            const tplContent = tpl?.content ?? doc.content;
            const resolved = applyPlaceholders(tplContent, doc, cust, appSettings);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nomor:</span> <span className="font-mono">{doc.document_number}</span></div>
                  <div><span className="text-muted-foreground">Tanggal:</span> {fmtDate(doc.document_date)}</div>
                  <div><span className="text-muted-foreground">Jenis:</span> {dt?.name ?? "\u2014"}</div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge className={`text-xs ${statusMeta(doc.status).tone}`}>{statusMeta(doc.status).label}</Badge></div>
                  {cust && (
                    <>
                      <div><span className="text-muted-foreground">Pelanggan:</span> {cust.nama_pelanggan}</div>
                      {cust.nama_perusahaan && <div><span className="text-muted-foreground">Perusahaan:</span> {cust.nama_perusahaan}</div>}
                    </>
                  )}
                </div>
                <div className="border rounded-lg p-6 bg-white min-h-[400px]">
                  <h2 className="text-lg font-bold mb-4 text-center">{doc.title}</h2>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: resolved.replace(/\n/g, "<br />") }}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setPreviewId(null)}>Tutup</Button>
                  <Button onClick={() => { downloadPdf(doc); setPreviewId(null); }}>
                    <Download className="h-4 w-4 mr-1" /> Download PDF
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ===== DELETE CONFIRMATION ===== */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Dokumen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dokumen yang dihapus tidak dapat dikembalikan. Data terkait (riwayat status, penandatangan) juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground">
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== TEMPLATE MANAGEMENT DIALOG ===== */}
      <Dialog open={templateOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Kelola Template"}</DialogTitle>
            <DialogDescription>
              Template digunakan sebagai dasar konten dokumen. Gunakan {"{{placeholder}}"} untuk data dinamis.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="list" className="w-full">
            <TabsList>
              <TabsTrigger value="list">Daftar Template</TabsTrigger>
              <TabsTrigger value="form">{editingTemplate ? "Edit Template" : "Template Baru"}</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4 pt-4">
              {!templates || templates.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Belum ada template. Buat template pertama Anda.</p>
              ) : (
                <div className="space-y-2">
                  {templates.map((tpl) => {
                    const dt = docTypes?.find((t) => t.id === tpl.document_type_id);
                    return (
                      <div key={tpl.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium text-sm">{tpl.name} <span className="text-xs text-muted-foreground">v{tpl.version}</span></p>
                          <p className="text-xs text-muted-foreground">{dt?.name ?? "\u2014"} {tpl.description && `\u00B7 ${tpl.description}`}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openTemplateEdit(tpl)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteTemplateMutation.mutate(tpl.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="form" className="space-y-4 pt-4">
              {!editingTemplate && (
                <div>
                  <Label>Jenis Dokumen *</Label>
                  <Select value={templateTypeId} onValueChange={setTemplateTypeId}>
                    <SelectTrigger><SelectValue placeholder="Pilih jenis dokumen" /></SelectTrigger>
                    <SelectContent>
                      {docTypes?.filter((t) => t.is_active).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editingTemplate && (
                <div className="text-sm text-muted-foreground">
                  Jenis Dokumen: <span className="font-medium">{docTypes?.find((t) => t.id === editingTemplate.document_type_id)?.name}</span>
                  <span className="ml-2 text-xs">(tidak dapat diubah)</span>
                </div>
              )}
              <div>
                <Label>Nama Template *</Label>
                <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Contoh: MOU Standar" />
              </div>
              <div>
                <Label>Deskripsi</Label>
                <Input value={tplDescription} onChange={(e) => setTplDescription(e.target.value)} placeholder="Deskripsi singkat template (opsional)" />
              </div>
              <div>
                <Label>Konten Template</Label>
                <Textarea
                  value={tplContent}
                  onChange={(e) => setTplContent(e.target.value)}
                  placeholder="Tulis konten template. Gunakan {{placeholder}} untuk data dinamis."
                  className="min-h-[250px] font-mono text-sm"
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {PLACEHOLDERS.map((ph) => (
                    <Button
                      key={ph.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-6"
                      onClick={() => setTplContent((prev) => prev + ` {{${ph.key}}}`)}
                    >
                      {`{{${ph.key}}}`}
                    </Button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setEditingTemplate(null); setTemplateOpen(false); }}>
                  Batal
                </Button>
                <Button onClick={() => saveTemplateMutation.mutate()} disabled={saveTemplateMutation.isPending}>
                  {saveTemplateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {editingTemplate ? "Simpan Template" : "Buat Template"}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
