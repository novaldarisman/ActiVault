import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/platform/audit")({
  head: () => ({ meta: [{ title: "Audit Platform \u2014 DocTiva" }] }),
  component: PlatformAuditPage,
});

const ACTIONS = ["create", "update", "delete", "activate", "deactivate", "import"];

function PlatformAuditPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["platform-audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 15000,
  });

  const entityTypes = [...new Set((logs ?? []).map((l: any) => l.entity_type))] as string[];

  const filtered = (logs ?? []).filter((log: any) => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (entityFilter !== "all" && log.entity_type !== entityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return [log.entity_label, log.entity_type, log.user_email, log.action]
        .some((v: any) => (v ?? "").toLowerCase().includes(q));
    }
    return true;
  });

  const actionBadge = (action: string) => {
    const map: Record<string, string> = {
      create: "bg-emerald-100 text-emerald-700",
      update: "bg-blue-100 text-blue-700",
      delete: "bg-red-100 text-red-700",
      activate: "bg-emerald-100 text-emerald-700",
      deactivate: "bg-amber-100 text-amber-700",
      import: "bg-violet-100 text-violet-700",
    };
    return map[action] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Platform</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Seluruh aktivitas platform: pembuatan tenant, perubahan, dan lainnya
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari aktivitas..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger><SelectValue placeholder="Filter Aksi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Aksi</SelectItem>
              {ACTIONS.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger><SelectValue placeholder="Filter Entitas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Entitas</SelectItem>
              {entityTypes.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Shield className="mx-auto h-8 w-8 mb-2 opacity-30" />
            Belum ada aktivitas platform
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Waktu</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Entitas</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Pengguna</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <Badge className={"text-xs " + actionBadge(log.action)}>{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.entity_type}</TableCell>
                  <TableCell className="text-sm font-medium max-w-[200px] truncate">
                    {log.entity_label ?? "\u2014"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.user_email ?? "system"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <p className="text-xs text-muted-foreground text-right">
        Menampilkan maksimal 200 log terbaru
      </p>
    </div>
  );
}