import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, KeyRound, Trash2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import {
  listAppUsers, createAppUser, updateAppUser, deleteAppUser, resetUserPassword,
} from "@/lib/users.functions";

const ROLE_LABELS: Record<string, string> = {
  tenant_super_admin: "Tenant Super Admin",
  super_admin: "Super Admin", admin_keuangan: "Admin Keuangan", owner: "Owner",
};

type AppUser = {
  id: string; email: string; full_name: string; is_active: boolean;
  roles: string[]; created_at?: string; last_sign_in_at?: string | null;
};

export function UsersTab() {
  const qc = useQueryClient();
  const list = useServerFn(listAppUsers);
  const create = useServerFn(createAppUser);
  const update = useServerFn(updateAppUser);
  const remove = useServerFn(deleteAppUser);
  const resetPw = useServerFn(resetUserPassword);

  const { data, isLoading } = useQuery({ queryKey: ["app-users"], queryFn: () => list({}) });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

  const filtered: AppUser[] = ((data ?? []) as AppUser[]).filter((u) =>
    !search || `${u.email} ${u.full_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const createMut = useMutation({
    mutationFn: (d: any) => create({ data: d }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["app-users"] }); setOpen(false); toast.success("Pengguna dibuat"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (d: any) => update({ data: d }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["app-users"] }); setEditing(null); toast.success("Pengguna diperbarui"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (d: any) => remove({ data: d }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["app-users"] }); setDeleteTarget(null); toast.success("Pengguna dihapus"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const resetMut = useMutation({
    mutationFn: (d: any) => resetPw({ data: d }),
    onSuccess: () => { setResetTarget(null); toast.success("Password direset"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-lg">Manajemen Pengguna</h2>
          <p className="text-sm text-muted-foreground">Kelola akun, role, dan akses sistem DocTiva</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Tambah Pengguna</Button></DialogTrigger>
          <UserFormDialog title="Tambah Pengguna" onSubmit={(d) => createMut.mutate(d)} loading={createMut.isPending} requirePassword />
        </Dialog>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama atau email..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">Tidak ada pengguna</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.length === 0
                        ? <span className="text-xs text-muted-foreground">Tanpa role</span>
                        : u.roles.map((r) => <Badge key={r} variant="secondary">{ROLE_LABELS[r] ?? r}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? "default" : "secondary"}
                      className={u.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                      {u.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(u)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setResetTarget(u)} title="Reset password"><KeyRound className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(u)} className="text-destructive" title="Hapus"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {editing && (
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <UserFormDialog title="Edit Pengguna" user={editing}
            onSubmit={(d) => updateMut.mutate({ id: editing.id, ...d })}
            loading={updateMut.isPending} />
        </Dialog>
      )}

      {resetTarget && (
        <ResetPasswordDialog user={resetTarget} loading={resetMut.isPending}
          onCancel={() => setResetTarget(null)}
          onSubmit={(pw) => resetMut.mutate({ id: resetTarget.id, password: pw })} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <b>{deleteTarget?.email}</b> akan dihapus permanen. Jika ini Super Admin terakhir, penghapusan akan ditolak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMut.mutate({ id: deleteTarget.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserFormDialog({
  title, user, onSubmit, loading, requirePassword,
}: {
  title: string; user?: AppUser; loading: boolean; requirePassword?: boolean;
  onSubmit: (d: { email?: string; password?: string; full_name: string; role: string; is_active?: boolean }) => void;
}) {
  const [full_name, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState(user?.roles[0] ?? "owner");
  const [is_active, setActive] = useState(user?.is_active ?? true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password.length < 6) return toast.error("Password minimal 6 karakter");
    if (password && password !== confirm) return toast.error("Konfirmasi password tidak sesuai");
    if (requirePassword && !password) return toast.error("Password wajib diisi");
    onSubmit({
      full_name,
      email: user ? (email !== user.email ? email : undefined) : email,
      password: password || undefined,
      role,
      is_active: user ? is_active : undefined,
    });
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label>Nama Lengkap</Label>
          <Input value={full_name} onChange={(e) => setFullName(e.target.value)} required /></div>
        <div className="space-y-2"><Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="space-y-2"><Label>Password {!requirePassword && "(kosongkan jika tidak diubah)"}</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="space-y-2"><Label>Konfirmasi Password</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        <div className="space-y-2"><Label>Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tenant_super_admin">Tenant Super Admin</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin_keuangan">Admin Keuangan</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {user && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label>Status Aktif</Label>
              <p className="text-xs text-muted-foreground">Nonaktif tidak menghapus akun</p></div>
            <Switch checked={is_active} onCheckedChange={setActive} />
          </div>
        )}
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ResetPasswordDialog({
  user, onCancel, onSubmit, loading,
}: { user: AppUser; onCancel: () => void; onSubmit: (pw: string) => void; loading: boolean }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset Password — {user.email}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (pw.length < 6) return toast.error("Password minimal 6 karakter");
          if (pw !== confirm) return toast.error("Konfirmasi tidak sesuai");
          onSubmit(pw);
        }} className="space-y-4">
          <div className="space-y-2"><Label>Password Baru</Label>
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Konfirmasi Password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Reset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}