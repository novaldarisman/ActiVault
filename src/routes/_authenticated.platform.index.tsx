import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Building2, Users, FileText, Receipt, Archive, Loader2, TrendingUp, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform/")({
  head: () => ({ meta: [{ title: "Platform Dashboard \u2014 DocTiva" }] }),
  component: PlatformDashboard,
});

function PlatformDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const results: any = {};
      try { const r = await supabase.from("tenants" as any).select("*", { count: "exact", head: true }); results.totalTenants = r.count ?? 0; } catch {}
      try { const r = await supabase.from("tenants" as any).select("*", { count: "exact", head: true }).eq("is_active", true); results.activeTenants = r.count ?? 0; } catch {}
      try { const r = await supabase.from("profiles").select("*", { count: "exact", head: true }); results.totalUsers = r.count ?? 0; } catch {}
      try { const r = await supabase.from("invoices").select("*", { count: "exact", head: true }); results.totalInvoices = r.count ?? 0; } catch {}
      try { const r = await supabase.from("receipts").select("*", { count: "exact", head: true }); results.totalReceipts = r.count ?? 0; } catch {}
      try { const r = await supabase.from("documents").select("*", { count: "exact", head: true }); results.totalDocuments = r.count ?? 0; } catch {}
      try { const r = await supabase.from("tenants" as any).select("*").order("created_at", { ascending: false }).limit(5); results.recentTenants = r.data ?? []; } catch { results.recentTenants = []; }
      try {
        const r = await supabase.from("tenants" as any).select("type, id");
        const types: Record<string, number> = {};
        (r.data ?? []).forEach((t: any) => { types[t.type] = (types[t.type] ?? 0) + 1; });
        results.typeBreakdown = Object.entries(types).map(([name, count]) => ({ name, count }));
      } catch { results.typeBreakdown = []; }
      try { const r = await supabase.from("platform_audit_logs" as any).select("*").order("created_at", { ascending: false }).limit(10); results.recentAudit = r.data ?? []; } catch { results.recentAudit = []; }
      return results;
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const t = stats || {};
  const cards = [
    { title: "Total Tenant", value: t.totalTenants ?? 0, sub: (t.activeTenants ?? 0) + " aktif", icon: Building2, color: "text-blue-600" },
    { title: "Total Pengguna", value: t.totalUsers ?? 0, sub: "Seluruh tenant", icon: Users, color: "text-violet-600" },
    { title: "Total Invoice", value: t.totalInvoices ?? 0, sub: "Seluruh tenant", icon: FileText, color: "text-emerald-600" },
    { title: "Total Kwitansi", value: t.totalReceipts ?? 0, sub: "Seluruh tenant", icon: Receipt, color: "text-amber-600" },
    { title: "Total Dokumen", value: t.totalDocuments ?? 0, sub: "Surat menyurat", icon: Archive, color: "text-rose-600" },
    { title: "Jenis Tenant", value: (t.typeBreakdown || []).length, sub: "Kategori", icon: TrendingUp, color: "text-cyan-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Platform</h1>
        <p className="text-sm text-muted-foreground mt-1">Ringkasan seluruh tenant dan aktivitas platform DocTiva</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c: any) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={"h-5 w-5 " + c.color} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{c.value.toLocaleString("id-ID")}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium"><TrendingUp className="h-4 w-4 inline mr-2" />Distribusi Jenis Tenant</CardTitle></CardHeader>
          <CardContent>
            {(t.typeBreakdown || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={t.typeBreakdown || []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-12 text-sm">Belum ada data tenant</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium"><Activity className="h-4 w-4 inline mr-2" />Aktivitas Terbaru</CardTitle></CardHeader>
          <CardContent className="max-h-[270px] overflow-y-auto">
            {(t.recentAudit || []).length > 0 ? (
              <div className="space-y-2">
                {(t.recentAudit || []).map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 text-sm p-2 rounded-md hover:bg-muted/50">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{log.action} {log.entity_type}{log.entity_label ? " \u2014 " + log.entity_label : ""}</p>
                      <p className="text-xs text-muted-foreground">{(log.user_email || "system") + " \u00B7 " + new Date(log.created_at).toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-center text-muted-foreground py-12 text-sm">Belum ada aktivitas</p>}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium"><Building2 className="h-4 w-4 inline mr-2" />Tenant Terbaru</CardTitle></CardHeader>
        <CardContent>
          {(t.recentTenants || []).length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Perusahaan</TableHead><TableHead>Jenis</TableHead><TableHead>Status</TableHead><TableHead>Dibuat</TableHead></TableRow></TableHeader>
              <TableBody>
                {(t.recentTenants || []).map((tn: any) => (
                  <TableRow key={tn.id}>
                    <TableCell className="font-medium">{tn.name}</TableCell>
                    <TableCell>{tn.company_name || "\u2014"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{tn.type}</Badge></TableCell>
                    <TableCell><Badge className={"text-xs " + (tn.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>{tn.is_active ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(tn.created_at).toLocaleDateString("id-ID")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-center text-muted-foreground py-8 text-sm">Belum ada tenant</p>}
        </CardContent>
      </Card>
    </div>
  );
}

