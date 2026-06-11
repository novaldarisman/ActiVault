import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Receipt, AlertCircle, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — DocTiva" }] }),
  component: DashboardPage,
});

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  accent?: "primary" | "accent" | "destructive";
}) {
  const iconBg =
    accent === "accent"
      ? "bg-accent/15 text-accent"
      : accent === "destructive"
      ? "bg-destructive/10 text-destructive"
      : "bg-primary/10 text-primary";
  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-semibold tracking-tight mt-2">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function DashboardPage() {
  const { data: customers } = useQuery({
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

  const customerCount = customers?.length ?? 0;
  const recent = customers?.slice(0, 5) ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Ringkasan aktivitas DocTiva</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Invoice" value={0} icon={FileText} hint="Belum ada data" />
        <StatCard label="Total Kwitansi" value={0} icon={Receipt} accent="accent" hint="Belum ada data" />
        <StatCard
          label="Invoice Belum Lunas"
          value={0}
          icon={AlertCircle}
          accent="destructive"
          hint="Belum ada data"
        />
        <StatCard
          label="Nilai Invoice Bulan Ini"
          value="Rp 0"
          icon={TrendingUp}
          hint={format(new Date(), "MMMM yyyy", { locale: idLocale })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Invoice Terbaru</h2>
              <p className="text-sm text-muted-foreground">5 invoice paling baru</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-2xl">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada invoice</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Modul invoice akan tersedia pada Phase berikutnya
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Pelanggan Terbaru</h2>
              <p className="text-sm text-muted-foreground">{customerCount} total</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada pelanggan</p>
          ) : (
            <ul className="space-y-3">
              {recent.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-primary">
                    {c.nama_pelanggan.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.nama_pelanggan}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.nama_perusahaan ?? "—"}
                    </p>
                  </div>
                  <Badge variant={c.status_aktif ? "default" : "secondary"} className="text-[10px]">
                    {c.status_aktif ? "Aktif" : "Nonaktif"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}