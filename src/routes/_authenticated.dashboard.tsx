import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Receipt, AlertCircle, TrendingUp, Users, CheckCircle2,
  ClipboardList, FileCheck2,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard — DocTiva" }] }),
  component: DashboardPage,
});

const fmtIDR = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(n));
const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8", terkirim: "#3b82f6", sebagian_dibayar: "#f59e0b",
  lunas: "#10b981", jatuh_tempo: "#ef4444", dibatalkan: "#71717a",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", terkirim: "Terkirim", sebagian_dibayar: "Sebagian Dibayar",
  lunas: "Lunas", jatuh_tempo: "Jatuh Tempo", dibatalkan: "Dibatalkan",
};
const ACTION_LABELS: Record<string, string> = {
  create: "Membuat", update: "Mengubah", delete: "Menghapus",
  download_pdf: "Unduh PDF", status_change: "Ubah status", duplicate: "Duplikasi",
};

function StatCard({ label, value, icon: Icon, hint, tone = "primary" }: {
  label: string; value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  tone?: "primary" | "accent" | "destructive" | "success" | "warning";
}) {
  const map: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
  };
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold tracking-tight mt-2">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${map[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function DashboardPage() {
  const qc = useQueryClient();

  // realtime invalidation
  useEffect(() => {
    const ch = supabase
      .channel("dashboard-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => qc.invalidateQueries({ queryKey: ["dashboard"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "receipts" }, () => qc.invalidateQueries({ queryKey: ["dashboard"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => qc.invalidateQueries({ queryKey: ["dashboard"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_logs" }, () => qc.invalidateQueries({ queryKey: ["dashboard-audit"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [inv, rec, cust] = await Promise.all([
        supabase.from("invoices").select("id, invoice_date, due_date, grand_total, status, invoice_number, customer:customers(nama_pelanggan,nama_perusahaan)").order("invoice_date", { ascending: false }),
        supabase.from("receipts").select("id, receipt_date, amount, status, receipt_number").order("receipt_date", { ascending: false }),
        supabase.from("customers").select("id, nama_pelanggan, status_aktif").order("created_at", { ascending: false }),
      ]);
      if (inv.error) throw inv.error;
      if (rec.error) throw rec.error;
      if (cust.error) throw cust.error;
      return { invoices: inv.data ?? [], receipts: rec.data ?? [], customers: cust.data ?? [] };
    },
  });

  const { data: auditFeed } = useQuery({
    queryKey: ["dashboard-audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
  });

  const invoices = data?.invoices ?? [];
  const receipts = data?.receipts ?? [];
  const customers = data?.customers ?? [];

  const totalInvoice = invoices.length;
  const totalKwitansi = receipts.length;
  const totalNilaiInvoice = invoices.reduce((a: number, b: any) => a + Number(b.grand_total ?? 0), 0);
  const invDraft = invoices.filter((i: any) => i.status === "draft").length;
  const invLunas = invoices.filter((i: any) => i.status === "lunas").length;
  const today = new Date().toISOString().slice(0, 10);
  const invJt = invoices.filter((i: any) => i.status === "jatuh_tempo" || (i.status !== "lunas" && i.status !== "dibatalkan" && i.due_date && i.due_date < today)).length;
  const kwFinal = receipts.filter((r: any) => r.status === "final").length;
  const kwDraft = receipts.filter((r: any) => r.status === "draft").length;

  // monthly aggregation last 12 months
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: format(d, "MMM yy", { locale: idLocale }) });
  }
  const monthlyInvoices = months.map((m) => ({
    month: m.label,
    jumlah: invoices.filter((i: any) => i.invoice_date?.startsWith(m.key)).length,
    nilai: invoices.filter((i: any) => i.invoice_date?.startsWith(m.key)).reduce((a: number, b: any) => a + Number(b.grand_total ?? 0), 0),
  }));
  const monthlyReceipts = months.map((m) => ({
    month: m.label,
    jumlah: receipts.filter((r: any) => r.receipt_date?.startsWith(m.key)).length,
  }));

  const statusDist = Object.keys(STATUS_LABELS).map((s) => ({
    name: STATUS_LABELS[s],
    value: invoices.filter((i: any) => i.status === s).length,
    color: STATUS_COLORS[s],
  })).filter((s) => s.value > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Ringkasan aktivitas DocTiva — diperbarui otomatis</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Total Invoice" value={totalInvoice} icon={FileText} />
        <StatCard label="Total Kwitansi" value={totalKwitansi} icon={Receipt} tone="accent" />
        <StatCard label="Nilai Invoice" value={fmtIDR(totalNilaiInvoice)} icon={TrendingUp} tone="success" hint="Semua waktu" />
        <StatCard label="Total Pelanggan" value={customers.length} icon={Users} />
        <StatCard label="Invoice Draft" value={invDraft} icon={ClipboardList} />
        <StatCard label="Invoice Lunas" value={invLunas} icon={CheckCircle2} tone="success" />
        <StatCard label="Invoice Jatuh Tempo" value={invJt} icon={AlertCircle} tone="destructive" />
        <StatCard label="Kwitansi Final" value={kwFinal} icon={FileCheck2} tone="success" />
        <StatCard label="Kwitansi Draft" value={kwDraft} icon={ClipboardList} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Invoice per Bulan (12 bulan terakhir)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyInvoices}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="jumlah" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Jumlah" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Kwitansi per Bulan (12 bulan terakhir)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyReceipts}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="jumlah" fill="#10b981" radius={[4, 4, 0, 0]} name="Jumlah" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Status Invoice</h2>
          {statusDist.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Belum ada invoice</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusDist.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="font-semibold mb-4">Aktivitas Terbaru</h2>
          {(auditFeed ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Belum ada aktivitas</p>
          ) : (
            <ul className="space-y-3">
              {(auditFeed ?? []).map((a: any) => (
                <li key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-secondary text-xs flex items-center justify-center shrink-0 font-semibold text-primary">
                    {(a.user_email ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">
                      <span className="font-medium">{a.user_email ?? "Sistem"}</span>{" "}
                      <span className="text-muted-foreground">{ACTION_LABELS[a.action] ?? a.action}</span>{" "}
                      <span className="text-xs uppercase text-muted-foreground">{a.entity_type}</span>{" "}
                      <span className="font-medium">{a.entity_label ?? ""}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("id-ID")}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Invoice Terbaru</h2>
          <Badge variant="secondary">{invoices.length} total</Badge>
        </div>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Belum ada invoice</p>
        ) : (
          <ul className="divide-y">
            {invoices.slice(0, 5).map((i: any) => (
              <li key={i.id} className="flex items-center justify-between py-3 text-sm gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{i.invoice_number}</p>
                  <p className="text-xs text-muted-foreground truncate">{i.customer?.nama_perusahaan || i.customer?.nama_pelanggan || "—"}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{fmtIDR(Number(i.grand_total))}</p>
                  <p className="text-xs"><span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: (STATUS_COLORS[i.status] ?? "#94a3b8") + "22", color: STATUS_COLORS[i.status] ?? "#475569" }}>{STATUS_LABELS[i.status] ?? i.status}</span></p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}