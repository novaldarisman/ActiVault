import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTenantId() {
  const { data } = useQuery({
    queryKey: ["my-tenant-id"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: roles } = await supabase.from("user_roles").select("tenant_id").eq("user_id", u.user.id).limit(1).single();
      return (roles as any)?.tenant_id as string | null;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data ?? null;
}