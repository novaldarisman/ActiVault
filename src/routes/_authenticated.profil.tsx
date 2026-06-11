import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMyRoles } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/profil")({
  ssr: false,
  head: () => ({ meta: [{ title: "Profil Saya — DocTiva" }] }),
  component: ProfilPage,
});

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", admin_keuangan: "Admin Keuangan", owner: "Owner",
};

function ProfilPage() {
  const { data: me, refetch } = useMyRoles();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", u.user.id).maybeSingle();
      setFullName(p?.full_name ?? "");
    })();
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sesi tidak ditemukan");
      if (email !== u.user.email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
      }
      const { error: pErr } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", u.user.id);
      if (pErr) throw pErr;
      await supabase.auth.updateUser({ data: { full_name: fullName } });
      toast.success("Profil disimpan");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally { setSavingProfile(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) return toast.error("Password baru minimal 8 karakter");
    if (newPw !== confirmPw) return toast.error("Konfirmasi password tidak sesuai");
    setSavingPw(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.email) throw new Error("Sesi tidak ditemukan");
      // verify old password by re-authenticating
      const { error: vErr } = await supabase.auth.signInWithPassword({ email: u.user.email, password: oldPw });
      if (vErr) throw new Error("Password lama salah");
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("Password diperbarui");
      setOldPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah password");
    } finally { setSavingPw(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Profil Saya</h1>
        <p className="text-muted-foreground mt-1">Kelola data akun dan keamanan</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Informasi Akun</h2>
          <div className="flex gap-1">
            {(me?.roles ?? []).map((r) => (
              <Badge key={r} variant="secondary">{ROLE_LABELS[r] ?? r}</Badge>
            ))}
          </div>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="space-y-2"><Label>Nama Lengkap</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <Button type="submit" disabled={savingProfile}>
            {savingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan Profil
          </Button>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Ubah Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div className="space-y-2"><Label>Password Lama</Label>
            <Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Password Baru</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} /></div>
          <div className="space-y-2"><Label>Konfirmasi Password Baru</Label>
            <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required /></div>
          <Button type="submit" disabled={savingPw}>
            {savingPw && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Ubah Password
          </Button>
        </form>
      </Card>
    </div>
  );
}