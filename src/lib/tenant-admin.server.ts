import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function createTenantAdmin(params: {
  email: string;
  password: string;
  full_name?: string;
  tenant_id: string;
  role?: string;
}) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: { full_name: params.full_name ?? "", tenant_id: params.tenant_id },
  });
  if (error) throw error;

  if (data?.user) {
    await (supabaseAdmin.from("user_roles") as any).insert({
      user_id: data.user.id,
      role: (params.role ?? "tenant_super_admin") as any,
      tenant_id: params.tenant_id,
    });
  }
  return data;
}

export async function resetTenantAdminPassword(tenantId: string, newPassword: string) {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const tu = (users?.users || []).filter(
    (u: any) => u.user_metadata?.tenant_id === tenantId
  );
  if (tu.length > 0) {
    await supabaseAdmin.auth.admin.updateUserById(tu[0].id, { password: newPassword });
    return true;
  }
  return false;
}

export async function deleteTenantUser(userId: string, tenantId: string) {
  await (supabaseAdmin.from("user_roles") as any).delete().eq("user_id", userId).eq("tenant_id", tenantId);
  await supabaseAdmin.auth.admin.deleteUser(userId);
}

export async function getTenantUsers(tenantId: string) {
  const { data: roles } = await (supabaseAdmin.from("user_roles") as any).select("user_id, role").eq("tenant_id", tenantId);
  if (!roles?.length) return [];
  const userIds = [...new Set(roles.map((r: any) => r.user_id))];
  const users: any[] = [];
  for (const uid of userIds as string[]) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
      if (data?.user) {
        users.push({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name ?? "",
          roles: roles.filter((r: any) => r.user_id === uid).map((r: any) => r.role),
          created_at: data.user.created_at,
        });
      }
    } catch {}
  }
  return users;
}