import { supabase } from "@/integrations/supabase/client";
import { terbilang } from "./terbilang";
import { logAudit } from "./audit";

/**
 * Auto-create a DRAFT receipt linked to a newly created invoice.
 * Idempotent: if a receipt with this invoice_id already exists, returns it.
 */
export async function autoCreateReceiptForInvoice(params: {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  amount: number;
}) {
  const { data: existing } = await supabase
    .from("receipts").select("id").eq("invoice_id", params.invoice_id).maybeSingle();
  if (existing) return existing.id;

  const { data: numData, error: ne } = await supabase.rpc("next_receipt_number", { _date: params.invoice_date });
  if (ne) throw ne;
  const { data: user } = await supabase.auth.getUser();

  const payload = {
    receipt_number: numData as string,
    receipt_date: params.invoice_date,
    received_from: params.customer_name,
    amount: params.amount,
    amount_in_words: terbilang(params.amount),
    for_payment: `Pembayaran invoice ${params.invoice_number}`,
    payment_method: "Transfer",
    status: "draft" as const,
    invoice_id: params.invoice_id,
    receipt_type: "otomatis",
    created_by: user.user?.id ?? null,
  };
  const { data: created, error } = await supabase.from("receipts").insert(payload).select().single();
  if (error) throw error;
  await logAudit({
    entity_type: "receipt", entity_id: created.id, entity_label: created.receipt_number,
    action: "create", details: { auto: true, invoice: params.invoice_number },
  });
  return created.id;
}