import { supabase } from "@/integrations/supabase/client";
import type { ReviewPayload } from "@/lib/proofsync-types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string, name: string) {
  if (!UUID_RE.test(value)) throw new Error(`${name} inválido`);
  return value;
}

/** Public bucket: no signing needed, just the public URL for each storage path. */
function publicImageUrl(path: string) {
  return supabase.storage.from("deliverables").getPublicUrl(path).data.publicUrl;
}

export async function getReviewByToken(token: string): Promise<ReviewPayload | null> {
  assertUuid(token, "link");
  const { data: raw, error } = await supabase.rpc("get_review", { p_token: token });
  if (error) throw new Error(error.message);
  if (!raw) return null;

  const payload = raw as unknown as ReviewPayload;
  return {
    ...payload,
    versions: payload.versions.map((v) => ({
      ...v,
      image_url: publicImageUrl(v.image_url),
    })),
  };
}

export async function addPinByToken(input: {
  token: string;
  versionId: string;
  x: number;
  y: number;
  comment: string;
  authorName?: string;
}) {
  const token = assertUuid(input.token, "link");
  const versionId = assertUuid(input.versionId, "versão");
  const x = Math.min(100, Math.max(0, Number(input.x)));
  const y = Math.min(100, Math.max(0, Number(input.y)));
  const comment = input.comment.trim().slice(0, 2000);
  const authorName = (input.authorName ?? "Cliente").trim().slice(0, 120) || "Cliente";
  if (!comment) throw new Error("A nota não pode estar vazia");

  const { error } = await supabase.rpc("add_pin_by_token", {
    p_token: token,
    p_version_id: versionId,
    p_x: x,
    p_y: y,
    p_comment: comment,
    p_author: authorName,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function approveVersionByToken(input: {
  token: string;
  versionId: string;
  clientName: string;
}) {
  const token = assertUuid(input.token, "link");
  const versionId = assertUuid(input.versionId, "versão");
  const clientName = input.clientName.trim().slice(0, 200);
  if (!clientName) throw new Error("Indica o teu nome para aprovar");

  const { error } = await supabase.rpc("approve_version_by_token", {
    p_token: token,
    p_version_id: versionId,
    p_client_name: clientName,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}
