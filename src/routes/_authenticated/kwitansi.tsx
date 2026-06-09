import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/kwitansi")({
  head: () => ({ meta: [{ title: "Kwitansi — Nova Invoice" }] }),
  component: KwitansiPage,
});

function KwitansiPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight mb-1">Kwitansi</h1>
      <p className="text-muted-foreground mb-6">Modul kwitansi</p>
      <Card className="p-16 flex flex-col items-center justify-center text-center">
        <Receipt className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold">Segera hadir</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">Pembuatan kwitansi akan tersedia pada Phase berikutnya.</p>
      </Card>
    </div>
  );
}