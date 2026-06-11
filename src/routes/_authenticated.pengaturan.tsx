import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan — DocTiva" }] }),
  component: PengaturanPage,
});

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin_keuangan: "Admin Keuangan",
  owner: "Owner",
};

type AuditLog = Tables<"audit_logs">;
type Settings = Tables<"app_settings">;

const ACTION_LABELS: Record<string, string> = {
  create: "Membuat", update: "Mengubah", delete: "Menghapus",
  download_pdf: "Unduh PDF", status_change: "Ubah status", duplicate: "Duplikasi",
};

function PengaturanPage() {
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setEmail(u.user?.email ?? "");
      if (u.user) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
        setRoles((data ?? []).map((r) => r.role));
      }
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground mt-1">Profil, perusahaan, template PDF & audit trail</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Perusahaan</TabsTrigger>
          <TabsTrigger value="pdf">Template PDF</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="profile">Profil</TabsTrigger>
        </TabsList>

        <TabsContent value="company"><CompanyTab section="company" /></TabsContent>
        <TabsContent value="pdf"><CompanyTab section="pdf" /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
        <TabsContent value="profile">
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Profil Akun</h2>
            <div className="space-y-2"><Label>Email</Label><Input value={email} disabled /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex flex-wrap gap-2">
                {roles.length === 0
                  ? <span className="text-sm text-muted-foreground">Tidak ada role</span>
                  : roles.map((r) => <Badge key={r} variant="secondary">{ROLE_LABELS[r] ?? r}</Badge>)}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompanyTab({ section }: { section: "company" | "pdf" }) {
  const qc = useQueryClient();
  const { data: s, isLoading } = useSettings();
  const [form, setForm] = useState<Partial<Settings>>({});

  useEffect(() => { if (s) setForm(s); }, [s]);
  const set = (patch: Partial<Settings>) => setForm((p) => ({ ...p, ...patch }));

  const save = useMutation({
    mutationFn: async () => {
      if (!s) throw new Error("Settings belum dimuat");
      const { error } = await supabase.from("app_settings").update({
        company_name: form.company_name ?? s.company_name,
        company_logo_url: form.company_logo_url ?? null,
        company_address: form.company_address ?? null,
        company_npwp: form.company_npwp ?? null,
        company_email: form.company_email ?? null,
        company_phone: form.company_phone ?? null,
        bank_name: form.bank_name ?? null,
        bank_account_number: form.bank_account_number ?? null,
        bank_account_name: form.bank_account_name ?? null,
        invoice_footer: form.invoice_footer ?? null,
        default_tax_percent: form.default_tax_percent ?? 11,
        invoice_template: form.invoice_template ?? "modern",
        receipt_template: form.receipt_template ?? "modern",
        signature_url: form.signature_url ?? null,
        stamp_url: form.stamp_url ?? null,
        signer_name: form.signer_name ?? null,
      }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["app_settings"] }); toast.success("Pengaturan disimpan"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !s) return <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card className="p-6 space-y-5">
      {section === "company" ? (
        <>
          <h2 className="font-semibold text-lg">Informasi Perusahaan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-2">
              <Label>Logo</Label>
              <ImagePicker value={form.company_logo_url} onChange={(v) => set({ company_logo_url: v })} />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2"><Label>Nama Perusahaan *</Label><Input value={form.company_name ?? ""} onChange={(e) => set({ company_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={form.company_email ?? ""} onChange={(e) => set({ company_email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Telepon</Label><Input value={form.company_phone ?? ""} onChange={(e) => set({ company_phone: e.target.value })} /></div>
              <div className="md:col-span-2 space-y-2"><Label>Alamat</Label><Textarea rows={2} value={form.company_address ?? ""} onChange={(e) => set({ company_address: e.target.value })} /></div>
              <div className="space-y-2"><Label>NPWP</Label><Input value={form.company_npwp ?? ""} onChange={(e) => set({ company_npwp: e.target.value })} /></div>
              <div className="space-y-2"><Label>PPN Default (%)</Label><Input type="number" min={0} max={100} step="0.01" value={form.default_tax_percent ?? 11} onChange={(e) => set({ default_tax_percent: Number(e.target.value) })} /></div>
            </div>
          </div>
          <div className="border-t pt-5">
            <h2 className="font-semibold text-lg mb-4">Rekening Bank</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Nama Bank</Label><Input value={form.bank_name ?? ""} onChange={(e) => set({ bank_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Nomor Rekening</Label><Input value={form.bank_account_number ?? ""} onChange={(e) => set({ bank_account_number: e.target.value })} /></div>
              <div className="space-y-2"><Label>Atas Nama</Label><Input value={form.bank_account_name ?? ""} onChange={(e) => set({ bank_account_name: e.target.value })} /></div>
            </div>
          </div>
          <div className="border-t pt-5 space-y-2">
            <Label>Footer Invoice/Kwitansi</Label>
            <Textarea rows={2} value={form.invoice_footer ?? ""} onChange={(e) => set({ invoice_footer: e.target.value })} placeholder="Terima kasih atas kerja samanya." />
          </div>
        </>
      ) : (
        <>
          <h2 className="font-semibold text-lg">Template PDF</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Invoice</Label>
              <Select value={form.invoice_template ?? "modern"} onValueChange={(v) => set({ invoice_template: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern — header berwarna</SelectItem>
                  <SelectItem value="classic">Classic — bingkai elegan</SelectItem>
                  <SelectItem value="minimal">Minimal — bersih & ringkas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template Kwitansi</Label>
              <Select value={form.receipt_template ?? "modern"} onValueChange={(v) => set({ receipt_template: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern — header berwarna</SelectItem>
                  <SelectItem value="classic">Classic — bingkai elegan</SelectItem>
                  <SelectItem value="minimal">Minimal — bersih & ringkas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-t pt-5 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Tanda Tangan Digital</Label>
              <ImagePicker value={form.signature_url} onChange={(v) => set({ signature_url: v })} />
            </div>
            <div className="space-y-2">
              <Label>Stempel Digital</Label>
              <ImagePicker value={form.stamp_url} onChange={(v) => set({ stamp_url: v })} />
            </div>
            <div className="space-y-2">
              <Label>Nama Penandatangan</Label>
              <Input value={form.signer_name ?? ""} onChange={(e) => set({ signer_name: e.target.value })} placeholder="Direktur Keuangan" />
            </div>
          </div>
        </>
      )}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Simpan Pengaturan
        </Button>
      </div>
    </Card>
  );
}

function ImagePicker({ value, onChange }: { value?: string | null; onChange: (v: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const onFile = async (f: File | null) => {
    if (!f) return;
    if (f.size > 1024 * 1024) { toast.error("Maks 1 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(f);
  };
  return (
    <div className="rounded-xl border bg-muted/20 p-3 flex flex-col items-center gap-3">
      <div className="h-24 w-full rounded-lg bg-card border flex items-center justify-center overflow-hidden">
        {value ? <img src={value} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">Belum ada gambar</span>}
      </div>
      <div className="flex gap-2 w-full">
        <input type="file" accept="image/png,image/jpeg,image/svg+xml" hidden ref={ref} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => ref.current?.click()}>
          <Upload className="h-3.5 w-3.5 mr-1.5" /> Pilih
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function AuditTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as AuditLog[];
    },
  });
  return (
    <Card className="overflow-hidden">
      {isLoading ? (
        <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (data ?? []).length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">Belum ada aktivitas.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Aktivitas</TableHead>
              <TableHead>Entitas</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString("id-ID")}</TableCell>
                <TableCell>{l.user_email ?? "-"}</TableCell>
                <TableCell><Badge variant="secondary">{ACTION_LABELS[l.action] ?? l.action}</Badge></TableCell>
                <TableCell>
                  <span className="text-xs uppercase text-muted-foreground mr-2">{l.entity_type}</span>
                  <span className="font-medium">{l.entity_label ?? "-"}</span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.details ? JSON.stringify(l.details) : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}