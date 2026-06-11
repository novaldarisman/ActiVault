import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "super_admin" | "admin_keuangan" | "owner";

export function useMyRoles() {
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { roles: [] as Role[], email: "", id: "" };
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      return {
        id: u.user.id,
        email: u.user.email ?? "",
        roles: (data ?? []).map((r) => r.role as Role),
      };
    },
  });
}

export function hasAccess(roles: Role[], allowed: Role[]) {
  return roles.some((r) => allowed.includes(r));
}