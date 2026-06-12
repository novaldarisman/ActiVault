import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

const COLS = [
  "Nama Pelanggan", "Nama Perusahaan", "Alamat", "Email", "Nomor Telepon",
  "NPWP", "PIC", "Catatan",
];

type Row = {
  raw: Record<string, any>;
  nama_pelanggan: string;
  nama_perusahaan: string | null;
  alamat: string | null;
  email: string | null;
  telepon: string | null;
  npwp: string | null;
  pic: string | null;
  catatan: string | null;
  errors: string[];
  duplicate?: boolean;
};

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PelangganImportDialog({
  open, onClose, onImported, existing,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  existing: { nama_pelanggan: string; email: string | null }[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([COLS, [
      "Budi Santoso", "PT Contoh Jaya", "Jl. Sudirman No. 1", "budi@contoh.id",
      "08123456789", "01.234.567.8-901.000", "Budi Santoso", "Pelanggan VIP",
    ]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pelanggan");
    XLSX.writeFile(wb, "template-pelanggan.xlsx");
  };

  const handleFile = async (f: File | null) => {
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
      const norm = data.map<Row>((d) => {
        const get = (k: string) => String(d[k] ?? "").trim();
        const r: Row = {
          raw: d,
          nama_pelanggan: get("Nama Pelanggan"),
          nama_perusahaan: get("Nama Perusahaan") || null,
          alamat: get("Alamat") || null,
          email: get("Email") || null,
          telepon: get("Nomor Telepon") || null,
          npwp: get("NPWP") || null,
          pic: get("PIC") || null,
          catatan: get("Catatan") || null,
          errors: [],
        };
        if (!r.nama_pelanggan) r.errors.push("Nama pelanggan kosong");
        if (r.email && !emailRx.test(r.email)) r.errors.push("Email tidak valid");
        const dup = existing.find((e) =>
          e.nama_pelanggan.toLowerCase() === r.nama_pelanggan.toLowerCase() ||
          (r.email && e.email?.toLowerCase() === r.email.toLowerCase())
        );
        if (dup) r.duplicate = true;
        return r;
      });
      setRows(norm);
    } catch (e) {
      toast.error("Gagal membaca file: " + (e as Error).message);
    }
  };

  const stats = {
    total: rows.length,
    valid: rows.filter((r) => r.errors.length === 0).length,
    failed: rows.filter((r) => r.errors.length > 0).length,
    duplicates: rows.filter((r) => r.duplicate).length,
  };

  const doImport = async () => {
    setBusy(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const toInsert: any[] = [];
      const toUpdate: any[] = [];
      const failed: any[] = [];
      for (const r of rows) {
        if (r.errors.length > 0) { failed.push({ nama: r.nama_pelanggan, errors: r.errors }); continue; }
        const payload = {
          nama_pelanggan: r.nama_pelanggan, nama_perusahaan: r.nama_perusahaan,
          alamat: r.alamat, email: r.email, telepon: r.telepon,
          npwp: r.npwp, pic: r.pic, catatan: r.catatan,
        };
        if (r.duplicate) {
          if (updateExisting) toUpdate.push(payload);
          else if (skipDuplicates) continue;
          else toInsert.push({ ...payload, created_by: user.user?.id });
        } else {
          toInsert.push({ ...payload, created_by: user.user?.id });
        }
      }

      let successRows = 0, updatedRows = 0;
      if (toInsert.length) {
        const { error, count } = await supabase.from("customers").insert(toInsert, { count: "exact" });
        if (error) throw error;
        successRows = count ?? toInsert.length;
      }
      for (const u of toUpdate) {
        const { error } = await supabase.from("customers").update(u)
          .eq("nama_pelanggan", u.nama_pelanggan);
        if (!error) updatedRows++;
      }

      await supabase.from("customer_import_logs").insert({
        imported_by: user.user?.id ?? null,
        imported_by_email: user.user?.email ?? null,
        total_rows: rows.length,
        success_rows: successRows,
        updated_rows: updatedRows,
        failed_rows: failed.length,
        details: { failed } as never,
      });
      await logAudit({
        entity_type: "customer", action: "create",
        entity_label: `Impor ${rows.length} baris`,
        details: { success: successRows, updated: updatedRows, failed: failed.length },
      });

      toast.success(`Impor selesai — ${successRows} ditambahkan, ${updatedRows} diperbarui, ${failed.length} gagal`);
      onImported();
      onClose();
      setRows([]);
    } catch (e) {
      toast.error("Gagal impor: " + (e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Impor Pelanggan</DialogTitle>
          <DialogDescription>Unggah file Excel (.xlsx) atau CSV pelanggan</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" /> Download Template
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          <Button type="button" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Pilih File
          </Button>
          {rows.length > 0 && (
            <Button type="button" variant="ghost" onClick={() => setRows([])}>Reset</Button>
          )}
        </div>

        {rows.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <Card className="p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-semibold">{stats.total}</p></Card>
              <Card className="p-3"><p className="text-xs text-emerald-700">Valid</p><p className="text-xl font-semibold text-emerald-700">{stats.valid}</p></Card>
              <Card className="p-3"><p className="text-xs text-amber-700">Duplikat</p><p className="text-xl font-semibold text-amber-700">{stats.duplicates}</p></Card>
              <Card className="p-3"><p className="text-xs text-destructive">Gagal</p><p className="text-xl font-semibold text-destructive">{stats.failed}</p></Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="p-3 flex items-center justify-between">
                <div><Label>Lewati duplikat</Label><p className="text-xs text-muted-foreground">Lewati baris yang sudah ada</p></div>
                <Switch checked={skipDuplicates} onCheckedChange={(v) => { setSkipDuplicates(v); if (v) setUpdateExisting(false); }} />
              </Card>
              <Card className="p-3 flex items-center justify-between">
                <div><Label>Perbarui yang ada</Label><p className="text-xs text-muted-foreground">Perbarui data pelanggan lama</p></div>
                <Switch checked={updateExisting} onCheckedChange={(v) => { setUpdateExisting(v); if (v) setSkipDuplicates(false); }} />
              </Card>
            </div>

            <Card className="overflow-hidden max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>{r.nama_pelanggan || <em className="text-destructive">kosong</em>}</TableCell>
                      <TableCell className="text-muted-foreground">{r.email ?? "—"}</TableCell>
                      <TableCell>
                        {r.errors.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-destructive text-xs">
                            <AlertCircle className="h-3.5 w-3.5" /> {r.errors.join(", ")}
                          </span>
                        ) : r.duplicate ? (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700">Duplikat</Badge>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Siap
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Tutup</Button>
          <Button type="button" onClick={doImport} disabled={busy || stats.valid + (updateExisting ? stats.duplicates : 0) === 0}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Impor Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}