import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createTenantAdmin,
  resetTenantAdminPassword,
  deleteTenantUser,
  getTenantUsers,
} from "@/lib/tenant-admin.server";

export const updateTenantAdminFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      tenantId: z.string().uuid(),
      email: z.string().email().optional(),
      full_name: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Find tenant admin user
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const tenantUsers = (users?.users || []).filter(
      (u: any) => u.user_metadata?.tenant_id === data.tenantId
    );
    if (tenantUsers.length > 0) {
      const updates: any = {};
      if (data.email) updates.email = data.email;
      if (data.full_name) updates.user_metadata = { full_name: data.full_name, tenant_id: data.tenantId };
      await supabaseAdmin.auth.admin.updateUserById(tenantUsers[0].id, updates);
    }
    return true;
  });

export const createTenantAdminFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
      full_name: z.string().optional(),
      tenant_id: z.string().uuid(),
      role: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    return createTenantAdmin(data);
  });

export const resetTenantPasswordFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      tenantId: z.string().uuid(),
      newPassword: z.string().min(6),
    })
  )
  .handler(async ({ data }) => {
    return resetTenantAdminPassword(data.tenantId, data.newPassword);
  });

export const deleteTenantUserFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      tenantId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    return deleteTenantUser(data.userId, data.tenantId);
  });


export const getTenantIdFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({}))
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.rpc("get_my_tenant_id");
    return data as string | null;
  });

export const resetUserPasswordFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      newPassword: z.string().min(6),
    })
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.newPassword });
    return true;
  });

export const getTenantUsersFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ tenantId: z.string().uuid() }))
  .handler(async ({ data }) => {
    return getTenantUsers(data.tenantId);
  });