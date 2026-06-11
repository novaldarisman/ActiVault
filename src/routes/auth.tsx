import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, FileCheck2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapSuperAdmin } from "@/lib/users.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Masuk — DocTiva" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const bootstrap = useServerFn(bootstrapSuperAdmin);

  useEffect(() => {
    bootstrap({}).catch(() => {});
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate, bootstrap]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        try {
          const { data: u } = await supabase.auth.getUser();
          if (u.user) {
            await supabase.from("audit_logs").insert({
              user_id: u.user.id, user_email: u.user.email, entity_type: "auth",
              action: "create", entity_label: "login",
            });
          }
        } catch {}
        toast.success("Berhasil masuk");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Link reset password telah dikirim");
        setMode("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            <div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center shadow-md">
              <FileCheck2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-3xl font-semibold tracking-tight">DocTiva</span>
          </div>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Smart Digital Administration
          </span>
        </div>

        <Card className="p-8 shadow-lg border-border/50">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "login" ? "Selamat datang" : "Reset password"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login"
                ? "Masuk untuk melanjutkan ke DocTiva"
                : "Kami akan kirim link reset ke email Anda"}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com" autoComplete="email"
              />
            </div>

            {mode === "login" && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password" type="password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                />
              </div>
            )}

            {mode === "login" && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                  <span className="text-muted-foreground">Ingat saya</span>
                </label>
                <button type="button" onClick={() => setMode("forgot")}
                  className="text-primary hover:underline">
                  Lupa password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "login" ? "Masuk" : "Kirim link reset"}
            </Button>

            {mode === "forgot" && (
              <Button type="button" variant="ghost" className="w-full"
                onClick={() => setMode("login")}>
                Kembali ke login
              </Button>
            )}
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Akun hanya dapat dibuat oleh Super Admin.
        </p>
      </div>
    </div>
  );
}
