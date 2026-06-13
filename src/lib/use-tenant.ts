import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTenant() {
  return useQuery({
    queryKey: ["my-tenant"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;

      const { data: roles } = await supabase.from("user_roles").select("role, tenant_id").eq("user_id", u.user.id);
      const isPlatformAdmin = (roles ?? []).some((r: any) => r.role === "platform_super_admin");
      if (isPlatformAdmin) return null;

      const tenantId = (roles?.[0] as any)?.tenant_id;
      if (!tenantId) return null;

      const { data: tenant } = await supabase.from("tenants" as any).select("*").eq("id", tenantId).single();
      return tenant as any;
    },
    staleTime: 5 * 60 * 1000,
  });
}