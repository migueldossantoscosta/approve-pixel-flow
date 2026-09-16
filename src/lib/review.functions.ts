import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ReviewPayload } from "@/lib/proofsync-types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string, name: string) {
  if (!UUID_RE.test(value)) throw new Error(`${name} inválido`);
  return value;
}

/** Publishable-key client: the token-scoped RPCs are granted to anon. */
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Signs storage paths so the client can see images without any account. */
async function signImages(paths: string[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const map = new Map<string, string>();
  await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabaseAdmin.storage
        .from("deliverables")
        .createSignedUrl(path, 60 * 60 * 4);
      if (data?.signedUrl) map.set(path, data.signedUrl);
    }),
  );
  return map;
}

export const getReviewByToken = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => ({ token: assertUuid(input.token, "link") }))
  .handler(async ({ data }): Promise<ReviewPayload | null> => {
    const { data: raw, error } = await publicClient().rpc("get_review", { p_token: data.token });
    if (error) throw new Error(error.message);
    if (!raw) return null;

    const payload = raw as unknown as ReviewPayload;
    const signed = await signImages(payload.versions.map((v) => v.image_url));
    return {
      ...payload,
      versions: payload.versions.map((v) => ({
        ...v,
        image_url: signed.get(v.image_url) ?? v.image_url,
      })),
    };
  });

export const addPinByToken = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      token: string;
      versionId: string;
      x: number;
      y: number;
      comment: string;
      authorName?: string;
    }) => ({
      token: assertUuid(input.token, "link"),
      versionId: assertUuid(input.versionId, "versão"),
      x: Math.min(100, Math.max(0, Number(input.x))),
      y: Math.min(100, Math.max(0, Number(input.y))),
      comment: input.comment.trim().slice(0, 2000),
      authorName: (input.authorName ?? "Cliente").trim().slice(0, 120) || "Cliente",
    }),
  )
  .handler(async ({ data }) => {
    if (!data.comment) throw new Error("A nota não pode estar vazia");
    const { error } = await publicClient().rpc("add_pin_by_token", {
      p_token: data.token,
      p_version_id: data.versionId,
      p_x: data.x,
      p_y: data.y,
      p_comment: data.comment,
      p_author: data.authorName,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const approveVersionByToken = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; versionId: string; clientName: string }) => ({
    token: assertUuid(input.token, "link"),
    versionId: assertUuid(input.versionId, "versão"),
    clientName: input.clientName.trim().slice(0, 200),
  }))
  .handler(async ({ data }) => {
    if (!data.clientName) throw new Error("Indica o teu nome para aprovar");
    const { error } = await publicClient().rpc("approve_version_by_token", {
      p_token: data.token,
      p_version_id: data.versionId,
      p_client_name: data.clientName,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
