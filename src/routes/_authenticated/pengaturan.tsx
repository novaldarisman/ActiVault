import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan — Nova Invoice" }] }),
  component: PengaturanPage,
});

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin_keuangan: "Admin Keuangan",
  owner: "Owner",
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground mt-1">Profil & preferensi akun</p>
      </div>
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Profil Akun</h2>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} disabled />
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <div className="flex flex-wrap gap-2">
            {roles.length === 0 ? (
              <span className="text-sm text-muted-foreground">Tidak ada role</span>
            ) : (
              roles.map((r) => (
                <Badge key={r} variant="secondary">
                  {ROLE_LABELS[r] ?? r}
                </Badge>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}