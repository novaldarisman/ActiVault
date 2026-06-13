import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createTenantAdminFn, resetTenantPasswordFn, getTenantUsersFn, deleteTenantUserFn, resetUserPasswordFn, updateTenantAdminFn } from "@/lib/api/tenant.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Building2, Search, Upload, Download, Users, UserPlus, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/platform/tenants")({
  head: () => ({ meta: [{ title: "Tenant Management \u2014 DocTiva" }] }),
  component: TenantManagementPage,
});

const TENANT_TYPES = ["Perusahaan", "Pelatihan", "Sekolah", "Organisasi", "Lainnya"];

function TenantManagementPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("Perusahaan");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userDialogTenantId, setUserDialogTenantId] = useState<string>("");
  const [userDialogTenantName, setUserDialogTenantName] = useState<string>("");
  const [userForm, setUserForm] = useState({ full_name: "", email: "", password: "" });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: userCounts } = useQuery({
    queryKey: ["tenant-user-counts"],
    queryFn: async () => {
      const map: Record<string, number> = {};
      for (const t of (tenants ?? [])) {
        try { const r = await supabase.from("user_roles" as any).select("*", { count: "exact", head: true }).eq("tenant_id", t.id); map[t.id] = r.count ?? 0; } catch { map[t.id] = 0; }
      }
      return map;
    },
    enabled: !!tenants,
  });

  const filtered = (tenants ?? []).filter((t: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [t.name, t.company_name, t.email].some((v: any) => (v ?? "").toLowerCase().includes(q));
  });

  const resetForm = () => {
    setName(""); setType("Perusahaan"); setCompanyName("");
    setEmail(""); setPhone(""); setAddress("");
    setAdminFullName(""); setAdminEmail(""); setAdminPassword("");
  };

  const openCreate = () => { resetForm(); setEditing(null); setFormOpen(true); };
  const openEdit = async (t: any) => {
    setEditing(t);
    setName(t.name); setType(t.type); setCompanyName(t.company_name ?? "");
    setEmail(t.email ?? ""); setPhone(t.phone ?? ""); setAddress(t.address ?? "");
    setAdminFullName(""); setAdminEmail(""); setAdminPassword("");
    try {
      const users = await getTenantUsersFn({ data: { tenantId: t.id } });
      const admin = (users as any[]).find((u: any) => u.roles.includes("tenant_super_admin"));
      if (admin) {
        setAdminFullName(admin.full_name || "");
        setAdminEmail(admin.email || "");
      }
    } catch {}
    setFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Nama tenant wajib diisi");
      if (editing) {
        const { error } = await supabase.from("tenants" as any).update({
          name, type, company_name: companyName || null,
          email: email || null, phone: phone || null, address: address || null,
        }).eq("id", editing.id);
        if (error) throw error;
        if (adminEmail || adminFullName) {
          try {
            await updateTenantAdminFn({ data: { tenantId: editing.id, email: adminEmail, full_name: adminFullName } });
          } catch (e) { console.warn("update admin failed", e); }
        }
        if (adminPassword) {
          try {
            await resetTenantPasswordFn({ data: { tenantId: editing.id, newPassword: adminPassword } });
          } catch (e) { console.warn("reset password failed", e); }
        }
        await supabase.from("platform_audit_logs" as any).insert({
          entity_type: "tenant", entity_id: editing.id, entity_label: name, action: "update",
        });
      } else {
        const { data, error } = await supabase.from("tenants" as any).insert({
          name, type, company_name: companyName || null,
          email: email || null, phone: phone || null, address: address || null,
          is_active: true, activated_at: new Date().toISOString(),
        }).select().single();
        if (error) throw error;
        await supabase.from("app_settings" as any).insert({
          tenant_id: (data as any).id, company_name: companyName || name,
        });
        if (adminEmail && adminPassword) {
          try {
            await createTenantAdminFn({ data: { email: adminEmail, password: adminPassword, full_name: adminFullName, tenant_id: (data as any).id, role: "tenant_super_admin" } });
            toast.success("Tenant & admin berhasil dibuat. Email: " + adminEmail);
          } catch (e: any) { toast.warning("Admin gagal dibuat: " + e.message); }
        }
        await supabase.from("platform_audit_logs" as any).insert({
          entity_type: "tenant", entity_id: (data as any).id, entity_label: name, action: "create",
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast.success(editing ? "Tenant diperbarui" : "Tenant dibuat"); setFormOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });


  const toggleMutation = useMutation({
    mutationFn: async (t: any) => {
      await supabase.from("tenants" as any).update({ is_active: !t.is_active }).eq("id", t.id);
      await supabase.from("platform_audit_logs" as any).insert({
        entity_type: "tenant", entity_id: t.id, entity_label: t.name, action: t.is_active ? "deactivate" : "activate",
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast.success("Status tenant diubah"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteId) return;
      await supabase.from("tenants" as any).delete().eq("id", deleteId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast.success("Tenant dihapus"); setDeleteId(null); },
    onError: (e: Error) => toast.error(e.message),
  });


  const downloadTemplateXlsx = () => {
    const headers = ["Nama Tenant", "Jenis", "Perusahaan", "Email Tenant", "Telepon", "Alamat", "Admin Nama", "Admin Email", "Admin Password"];
    const sampleData = [
      ["PT Activa", "Perusahaan", "PT Activa Indonesia", "activa@example.com", "021-123456", "Jl. Sudirman No.1, Jakarta", "Budi Santoso", "budi@activa.id", "pass123"],
      ["SMK Ekonomika", "Sekolah", "SMK Ekonomika Jakarta", "", "", "Jl. Pendidikan No.5, Bandung", "Ani Wijaya", "ani@sekolah.id", "pass123"],
      ["Batch Pelatihan 1", "Pelatihan", "", "", "", "", "Instruktur A", "instruktur@training.id", "pass123"],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    ws["!cols"] = headers.map((_, i) => ({ wch: [20, 14, 28, 28, 16, 30, 20, 28, 16][i] || 15 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Import Tenant");
    XLSX.writeFile(wb, "template-import-tenant.xlsx");
  };
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const isCSV = file.name.endsWith(".csv");
        let rows: any[];
        if (isCSV) {
          const csvText = data as string;
          const wb = XLSX.read(csvText, { type: "string" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(sheet) as any[];
        } else {
          const wb = XLSX.read(data, { type: "binary" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(sheet) as any[];
        }
        const parsed = rows.map((r: any) => ({
          name: String(r["Nama Tenant"] || r["nama_tenant"] || r["name"] || ""),
          type: String(r["Jenis"] || r["jenis"] || r["type"] || "Perusahaan"),
          company_name: String(r["Perusahaan"] || r["perusahaan"] || r["company_name"] || ""),
          email: String(r["Email Tenant"] || r["Email"] || r["email_tenant"] || r["email"] || ""),
          phone: String(r["Telepon"] || r["telepon"] || r["phone"] || ""),
          address: String(r["Alamat"] || r["alamat"] || r["address"] || ""),
          admin_full_name: String(r["Admin Nama"] || r["admin_nama"] || r["admin_full_name"] || ""),
          admin_email: String(r["Admin Email"] || r["admin_email"] || ""),
          admin_password: String(r["Admin Password"] || r["admin_password"] || "123456"),
        })).filter((r: any) => r.name && r.name.length > 0);
        if (parsed.length === 0) {
          toast.error("Tidak ada data valid. Pastikan kolom Nama Tenant terisi.");
          return;
        }
        setImportPreview(parsed);
      } catch (err) { toast.error("Gagal membaca file. Gunakan format Excel (.xlsx) atau CSV."); }
    };
    if (file.name.endsWith(".csv")) {
      reader.readAsText(file, "UTF-8");
    } else {
      reader.readAsBinaryString(file);
    }
    e.target.value = "";
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      let success = 0; let failed = 0;
      for (const row of importPreview) {
        try {
          const { data: tenant } = await supabase.from("tenants" as any).insert({
            name: row.name, type: row.type, company_name: row.company_name || null,
            email: row.email || null, phone: row.phone || null, address: row.address || null,
            is_active: true, activated_at: new Date().toISOString(),
          }).select().single();
          if (tenant && row.admin_email && row.admin_password) {
            await supabase.from("app_settings" as any).insert({ tenant_id: (tenant as any).id, company_name: row.company_name || row.name });
            try {
              await createTenantAdminFn({ data: { email: row.admin_email, password: row.admin_password, full_name: row.admin_full_name, tenant_id: (tenant as any).id, role: "tenant_super_admin" } });
            } catch {}
          }
          success++;
        } catch { failed++; }
      }
      return { success, failed };
    },
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast.success(r.success + " tenant berhasil diimport" + (r.failed > 0 ? ", " + r.failed + " gagal" : ""));
      setImportOpen(false); setImportPreview([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });


  // ===== TENANT USER MANAGEMENT =====
  const { data: tenantUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["tenant-users", userDialogTenantId],
    queryFn: async () => {
      if (!userDialogTenantId) return [];
      return getTenantUsersFn({ data: { tenantId: userDialogTenantId } });
    },
    enabled: userDialogOpen && !!userDialogTenantId,
  });

  const addUserMutation = useMutation({
    mutationFn: async () => {
      if (!userForm.email || !userForm.password) throw new Error("Email dan password wajib diisi");
      await createTenantAdminFn({ data: { email: userForm.email, password: userForm.password, full_name: userForm.full_name, tenant_id: userDialogTenantId, role: "admin_keuangan" } });
    },
    onSuccess: () => { refetchUsers(); setUserForm({ full_name: "", email: "", password: "" }); toast.success("Pengguna ditambahkan"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await deleteTenantUserFn({ data: { userId, tenantId: userDialogTenantId } });
    },
    onSuccess: () => { refetchUsers(); toast.success("Pengguna dihapus"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetUserPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!resetPassword || resetPassword.length < 6) throw new Error("Password minimal 6 karakter");
      await resetUserPasswordFn({ data: { userId, newPassword: resetPassword } });
    },
    onSuccess: () => {
      toast.success("Password berhasil direset");
      setResetUserId(null);
      setResetPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola seluruh perusahaan dan organisasi</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Import Tenant
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Tenant
          </Button>
        </div>
      </div>
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari tenant..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Tenant</TableHead>
                <TableHead>Perusahaan</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Pengguna</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[170px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    <Building2 className="mx-auto h-8 w-8 mb-2 opacity-30" />
                    Belum ada tenant. Klik &ldquo;Tambah Tenant&rdquo; untuk memulai.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.company_name ?? "\u2014"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{t.type}</Badge></TableCell>
                    <TableCell className="text-sm">{t.email ?? "\u2014"}</TableCell>
                    <TableCell className="text-sm">{userCounts?.[t.id] ?? 0}</TableCell>
                    <TableCell>
                      <Badge className={"text-xs " + (t.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                        {t.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="Kelola Pengguna" onClick={() => { setUserDialogTenantId(t.id); setUserDialogTenantName(t.name); setUserDialogOpen(true); }}>
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title={t.is_active ? "Nonaktifkan" : "Aktifkan"} onClick={() => toggleMutation.mutate(t)}>
                          <span className="text-xs">{t.is_active ? "\u2715" : "\u2713"}</span>
                        </Button>
                        <Button variant="ghost" size="icon" title="Hapus" onClick={() => setDeleteId(t.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) setFormOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Tenant" : "Tambah Tenant Baru"}</DialogTitle>
            <DialogDescription>{editing ? "Edit data tenant, perbarui admin, atau reset password" : "Buat tenant dan admin secara otomatis"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4 py-2">
            <div>
              <Label>Nama Tenant *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: PT Activa" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jenis</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TENANT_TYPES.map((tt) => (<SelectItem key={tt} value={tt}>{tt}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nama Perusahaan</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Telepon</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            </div>
            <div><Label>Alamat</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>

            <div className="border rounded-md p-4 space-y-3 bg-muted/20">
              <p className="text-sm font-medium">{editing ? "Edit Admin" : "Tenant Super Admin"}</p>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nama Lengkap</Label><Input value={adminFullName} onChange={(e) => setAdminFullName(e.target.value)} /></div>
                <div><Label>Email</Label><Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} /></div>
              </div>
              <div><Label>{editing ? "Password Baru" : "Password"}</Label><Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Min. 6 karakter" /></div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editing ? "Simpan" : "Buat Tenant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={(o) => { if (!o) { setImportOpen(false); setImportPreview([]); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Tenant</DialogTitle>
            <DialogDescription>
              Upload file Excel (.xlsx) atau CSV. Kolom wajib: Nama Tenant, Admin Email, Admin Password
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {importPreview.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Pilih file Excel (.xlsx) untuk mengimport tenant</p>
                <Button type="button" variant="outline" size="sm" onClick={downloadTemplateXlsx}>
                <Download className="h-4 w-4 mr-1" /> Download Template (.xlsx)
              </Button>
              <p className="text-xs text-muted-foreground mt-2">File Excel siap pakai — buka, isi data, upload kembali. Admin Email & Password wajib diisi.</p>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
                  <Upload className="h-4 w-4" /> Pilih File
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
                </label>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{importPreview.length} tenant siap diimport</p>
                  <Button variant="outline" size="sm" onClick={() => setImportPreview([])}>Batal</Button>
                </div>
                <div className="border rounded-md max-h-[350px] overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Nama Tenant</TableHead><TableHead>Jenis</TableHead><TableHead>Perusahaan</TableHead><TableHead>Admin Email</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {importPreview.map((row: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-sm">{row.name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{row.type}</Badge></TableCell>
                          <TableCell className="text-sm max-w-[150px] truncate">{row.company_name || "\u2014"}</TableCell>
                          <TableCell className="text-sm">{row.admin_email || <span className="text-red-500 text-xs">wajib diisi</span>}</TableCell>
                          <TableCell>{row.admin_email ? <Badge className="text-xs bg-emerald-100 text-emerald-700">Siap</Badge> : <Badge className="text-xs bg-red-100 text-red-700">Butuh Email</Badge>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportPreview([]); }}>Tutup</Button>
            <Button onClick={() => importMutation.mutate()} disabled={importPreview.length === 0 || importMutation.isPending}>
              {importMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Import {importPreview.length} Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
      {/* User Management Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={(o) => { if (!o) { setUserDialogOpen(false); setEditingUserId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kelola Pengguna - {userDialogTenantName}</DialogTitle>
            <DialogDescription>Tambah, lihat, dan hapus pengguna tenant ini</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Add User Form */}
            <div className="border rounded-md p-4 bg-muted/20 space-y-3">
              <p className="text-sm font-medium flex items-center gap-1"><UserPlus className="h-4 w-4" /> Tambah Pengguna</p>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Nama</Label><Input value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} placeholder="Nama lengkap" /></div>
                <div><Label className="text-xs">Email *</Label><Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="email@domain.com" /></div>
                <div><Label className="text-xs">Password *</Label><Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Min. 6 karakter" /></div>
              </div>
              <Button size="sm" onClick={() => addUserMutation.mutate()} disabled={addUserMutation.isPending}>
                {addUserMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                <UserPlus className="h-3 w-3 mr-1" /> Tambah
              </Button>
            </div>

            {/* User List */}
            <div>
              <p className="text-sm font-medium mb-2">Daftar Pengguna ({tenantUsers?.length ?? 0})</p>
              {!tenantUsers || tenantUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">Belum ada pengguna</p>
              ) : (
                <div className="border rounded-md max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead className="w-[140px]"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {tenantUsers.map((u: any) => (
                        <React.Fragment key={u.id}>
                        <TableRow>
                          <TableCell className="font-medium text-sm">{u.full_name || "\u2014"}</TableCell>
                          <TableCell className="text-sm">{u.email}</TableCell>
                          <TableCell>
                            {(u.roles || []).map((r: string) => (
                              <Badge key={r} variant="outline" className="text-xs mr-1">{r}</Badge>
                            ))}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                            <Button variant="ghost" size="icon" title="Reset Password" onClick={() => { setResetUserId(resetUserId === u.id ? null : u.id); setResetPassword(""); }}>
                              <KeyRound className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Hapus" onClick={() => deleteUserMutation.mutate(u.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {resetUserId === u.id && (
                        <TableRow>
                          <TableCell colSpan={4} className="bg-muted/20">
                            <div className="flex items-center gap-2 py-1">
                              <Label className="text-xs shrink-0">Password Baru:</Label>
                              <Input type="password" className="h-8 text-sm w-48" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Min. 6 karakter" />
                              <Button size="sm" onClick={() => resetUserPasswordMutation.mutate(u.id)} disabled={resetUserPasswordMutation.isPending}>
                                {resetUserPasswordMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                Simpan
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setResetUserId(null); setResetPassword(""); }}>Batal</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setUserDialogOpen(false); setEditingUserId(null); }}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

{/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua data tenant (pelanggan, invoice, dokumen, pengguna) akan ikut terhapus. Tindakan ini tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
