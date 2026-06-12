import { supabase } from "@/integrations/supabase/client";

export async function archivePdf(params: {
  doc_type: string;
  doc_number: string;
  entity_id?: string | null;
  date: string; // ISO date
  blob: Blob;
}) {
  const d = new Date(params.date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const folder = params.doc_type;
  const fileName = `${params.doc_number}.pdf`;
  const storagePath = `${folder}/${year}/${String(month).padStart(2, "0")}/${fileName}`;

  const { error: upErr } = await supabase.storage
    .from("documents")
    .upload(storagePath, params.blob, { upsert: true, contentType: "application/pdf" });
  if (upErr) throw upErr;

  const { data: u } = await supabase.auth.getUser();
  await supabase.from("document_archives").insert({
    doc_type: params.doc_type,
    doc_number: params.doc_number,
    entity_id: params.entity_id ?? null,
    file_name: fileName,
    storage_path: storagePath,
    year,
    month,
    size_bytes: params.blob.size,
    created_by: u.user?.id ?? null,
    created_by_email: u.user?.email ?? null,
  });
  return storagePath;
}

export async function getArchiveSignedUrl(storage_path: string, expiresIn = 60 * 10) {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storage_path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
