import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Search, Download, Trash2, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { getArchiveSignedUrl } from "@/lib/archive";

type Doc = Tables<"document_archives">;

export const Route = createFileRoute("/_authenticated/arsip")({
  head: () => ({ meta: [{ title: "Arsip — DocTiva" }] }),
  component: ArsipPage,
});

const fmtDate = (s: string) => new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtSize = (n?: number | null) => !n ? "-" : n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;

function ArsipPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: docs, isLoading } = useQuery({
    queryKey: ["document_archives"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_archives").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Doc[];
    },
  });

  const filtered = (docs ?? []).filter((d) => {
    if (typeFilter !== "all" && d.doc_type !== typeFilter) return false;
    if (search && !`${d.doc_number} ${d.file_name} ${d.created_by_email ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: async (d: Doc) => {
      await supabase.storage.from("documents").remove([d.storage_path]);
      const { error } = await supabase.from("document_archives").delete().eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["document_archives"] }); toast.success("Arsip dihapus"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const download = async (d: Doc) => {
    try {
      const url = await getArchiveSignedUrl(d.storage_path);
      window.open(url, "_blank");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Arsip Internal</h1>
        <p className="text-muted-foreground mt-1">PDF Invoice & Kwitansi yang telah diarsipkan</p>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nomor / file / pembuat..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Tipe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="invoice">Invoice</SelectItem>
            <SelectItem value="receipt">Kwitansi</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <Archive className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium">{docs?.length === 0 ? "Belum ada arsip" : "Tidak ada hasil"}</p>
            <p className="text-sm text-muted-foreground mt-1">PDF akan terarsip otomatis saat diunduh.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipe</TableHead>
                <TableHead>Nomor</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pembuat</TableHead>
                <TableHead className="text-right">Ukuran</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Badge variant="secondary" className={d.doc_type === "invoice" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}>
                      {d.doc_type === "invoice" ? "Invoice" : "Kwitansi"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{d.doc_number}</TableCell>
                  <TableCell className="text-muted-foreground"><FileText className="h-3.5 w-3.5 inline mr-1.5" />{d.file_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{d.storage_path}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(d.created_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{d.created_by_email ?? "-"}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmtSize(d.size_bytes)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => download(d)} title="Download"><Download className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(d)} className="text-destructive hover:text-destructive" title="Hapus"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}