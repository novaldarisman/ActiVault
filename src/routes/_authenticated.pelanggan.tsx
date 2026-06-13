// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Loader2, Users, Upload } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { PelangganImportDialog } from "@/components/pelanggan/ImportDialog";

type Customer = Tables<"customers">;

export const Route = createFileRoute("/_authenticated/pelanggan")({
  head: () => ({ meta: [{ title: "Pelanggan — DocTiva" }] }),
  component: PelangganPage,
});

type FormState = {
  nama_pelanggan: string;
  nama_perusahaan: string;
  alamat: string;
  email: string;
  telepon: string;
  npwp: string;
  pic: string;
  catatan: string;
  status_aktif: boolean;
};

const empty: FormState = {
  nama_pelanggan: "",
  nama_perusahaan: "",
  alamat: "",
  email: "",
  telepon: "",
  npwp: "",
  pic: "",
  catatan: "",
  status_aktif: true,
};

function PelangganPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const payload = {
        ...form,
        nama_perusahaan: form.nama_perusahaan || null,
        alamat: form.alamat || null,
        email: form.email || null,
        telepon: form.telepon || null,
        npwp: form.npwp || null,
        pic: form.pic || null,
        catatan: form.catatan || null,
      };
      if (editing) {
        const { error } = await supabase.from("customers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: tid } = await supabase.rpc("get_my_tenant_id");
        const { error } = await supabase
          .from("customers")
          .insert({ ...payload, tenant_id: tid, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success(editing ? "Pelanggan diperbarui" : "Pelanggan ditambahkan");
      setOpen(false);
      setEditing(null);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Pelanggan dihapus");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      nama_pelanggan: c.nama_pelanggan,
      nama_perusahaan: c.nama_perusahaan ?? "",
      alamat: c.alamat ?? "",
      email: c.email ?? "",
      telepon: c.telepon ?? "",
      npwp: c.npwp ?? "",
      pic: c.pic ?? "",
      catatan: c.catatan ?? "",
      status_aktif: c.status_aktif,
    });
    setOpen(true);
  };

  const q = search.toLowerCase();
  const filtered = (customers ?? []).filter(
    (c) =>
      c.nama_pelanggan.toLowerCase().includes(q) ||
      (c.nama_perusahaan ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.pic ?? "").toLowerCase().includes(q),
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Pelanggan</h1>
          <p className="text-muted-foreground mt-1">Kelola data master pelanggan perusahaan</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Pelanggan
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2" /> Impor
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, perusahaan, email, atau PIC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium">
              {customers?.length === 0 ? "Belum ada pelanggan" : "Tidak ada hasil"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {customers?.length === 0
                ? "Tambahkan pelanggan pertama Anda untuk memulai"
                : "Coba kata kunci pencarian lain"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Perusahaan</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nama_pelanggan}</TableCell>
                  <TableCell className="text-muted-foreground">{c.nama_perusahaan ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.telepon ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.pic ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.status_aktif ? "default" : "secondary"}>
                      {c.status_aktif ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(c.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pelanggan" : "Tambah Pelanggan"}</DialogTitle>
            <DialogDescription>Isi data pelanggan dengan lengkap.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2"
          >
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nama">Nama Pelanggan *</Label>
              <Input
                id="nama"
                required
                value={form.nama_pelanggan}
                onChange={(e) => setForm({ ...form, nama_pelanggan: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perusahaan">Nama Perusahaan</Label>
              <Input
                id="perusahaan"
                value={form.nama_perusahaan}
                onChange={(e) => setForm({ ...form, nama_perusahaan: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pic">PIC</Label>
              <Input
                id="pic"
                value={form.pic}
                onChange={(e) => setForm({ ...form, pic: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telepon">Nomor Telepon</Label>
              <Input
                id="telepon"
                value={form.telepon}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="npwp">NPWP</Label>
              <Input
                id="npwp"
                value={form.npwp}
                onChange={(e) => setForm({ ...form, npwp: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="alamat">Alamat</Label>
              <Textarea
                id="alamat"
                rows={2}
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="catatan">Catatan</Label>
              <Textarea
                id="catatan"
                rows={2}
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-xl border p-4">
              <div>
                <Label htmlFor="status" className="font-medium">Status Aktif</Label>
                <p className="text-xs text-muted-foreground">Nonaktifkan untuk menyembunyikan dari daftar transaksi</p>
              </div>
              <Switch
                id="status"
                checked={form.status_aktif}
                onCheckedChange={(v) => setForm({ ...form, status_aktif: v })}
              />
            </div>
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pelanggan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data pelanggan akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {importOpen && (
        <PelangganImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={() => qc.invalidateQueries({ queryKey: ["customers"] })}
          existing={(customers ?? []).map((c) => ({ nama_pelanggan: c.nama_pelanggan, email: c.email }))}
        />
      )}
    </div>
  );
}