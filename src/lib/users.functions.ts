import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Role = "super_admin" | "admin_keuangan" | "owner";

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: hanya Super Admin");
}

export const bootstrapSuperAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Check if any super_admin already exists
  const { data: existing, error: e1 } = await supabaseAdmin
    .from("user_roles").select("user_id").eq("role", "super_admin").limit(1);
  if (e1) throw new Error(e1.message);
  if (existing && existing.length > 0) return { created: false };

  const email = "superadmin@activa.id";
  const password = "12345!";

  // Create user (or get existing)
  const { data: createRes, error: cErr } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: "Super Admin" },
  });
  let userId = createRes?.user?.id;
  if (cErr && !userId) {
    // user might already exist - look it up
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    userId = list?.users.find((u) => u.email === email)?.id;
    if (!userId) throw new Error(cErr.message);
  }

  await supabaseAdmin.from("profiles").upsert({ id: userId!, full_name: "Super Admin", is_active: true });
  await supabaseAdmin.from("user_roles").upsert({ user_id: userId!, role: "super_admin" }, { onConflict: "user_id,role" });
  return { created: true };
});

export const listAppUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);
    const ids = list.users.map((u) => u.id);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("*").in("id", ids);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids);
    const pMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
    const rMap = new Map<string, string[]>();
    roles?.forEach((r) => {
      const arr = rMap.get(r.user_id) ?? [];
      arr.push(r.role);
      rMap.set(r.user_id, arr);
    });
    return list.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      full_name: pMap.get(u.id)?.full_name ?? "",
      is_active: pMap.get(u.id)?.is_active ?? true,
      roles: rMap.get(u.id) ?? [],
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));
  });

export const createAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; full_name: string; role: Role }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").upsert({ id: u.user!.id, full_name: data.full_name, is_active: true });
    await supabaseAdmin.from("user_roles").insert({ user_id: u.user!.id, role: data.role });
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, user_email: (context.claims as any).email ?? null,
      entity_type: "user", entity_id: u.user!.id, entity_label: data.email,
      action: "create", details: { role: data.role, full_name: data.full_name } as never,
    });
    return { id: u.user!.id };
  });

export const updateAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; email?: string; full_name?: string; role?: Role; is_active?: boolean; password?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updates: any = {};
    if (data.email) updates.email = data.email;
    if (data.password) updates.password = data.password;
    if (data.full_name !== undefined) updates.user_metadata = { full_name: data.full_name };
    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, updates);
      if (error) throw new Error(error.message);
    }
    if (data.full_name !== undefined || data.is_active !== undefined) {
      const p: any = {};
      if (data.full_name !== undefined) p.full_name = data.full_name;
      if (data.is_active !== undefined) p.is_active = data.is_active;
      await supabaseAdmin.from("profiles").update(p).eq("id", data.id);
    }
    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
      await supabaseAdmin.from("user_roles").insert({ user_id: data.id, role: data.role });
    }
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, user_email: (context.claims as any).email ?? null,
      entity_type: "user", entity_id: data.id, entity_label: data.email ?? null,
      action: "update", details: data as never,
    });
    return { ok: true };
  });

export const deleteAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // prevent deleting last super admin
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "super_admin");
    const isSuper = roles?.some((r) => r.user_id === data.id);
    if (isSuper && (roles?.length ?? 0) <= 1) throw new Error("Tidak dapat menghapus Super Admin terakhir");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, user_email: (context.claims as any).email ?? null,
      entity_type: "user", entity_id: data.id, action: "delete", details: null,
    });
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; password: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, user_email: (context.claims as any).email ?? null,
      entity_type: "user", entity_id: data.id, action: "update", details: { reset_password: true } as never,
    });
    return { ok: true };
  });