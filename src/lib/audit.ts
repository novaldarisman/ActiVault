import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "download_pdf"
  | "status_change"
  | "duplicate";

export async function logAudit(params: {
  entity_type: string;
  entity_id?: string | null;
  entity_label?: string | null;
  action: AuditAction;
  details?: Record<string, unknown>;
}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      user_id: u.user?.id ?? null,
      user_email: u.user?.email ?? null,
      entity_type: params.entity_type,
      entity_id: params.entity_id ?? null,
      entity_label: params.entity_label ?? null,
      action: params.action,
      details: (params.details ?? null) as never,
    });
  } catch (e) {
    // never block UI on audit failure
    console.warn("audit log failed", e);
  }
}