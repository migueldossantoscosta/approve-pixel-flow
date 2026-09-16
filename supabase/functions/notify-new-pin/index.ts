// Supabase Edge Function — triggered by a Database Webhook (INSERT on
// public.feedback_pins). Emails the deliverable's creator so they don't have
// to poll the dashboard for new client feedback.
//
// Required secrets (set with `supabase secrets set NAME=value`):
//   RESEND_API_KEY  — from https://resend.com/api-keys
// Optional secrets:
//   FROM_EMAIL      — defaults to "ProofSync <onboarding@resend.dev>"
//   SITE_URL        — defaults to the GitHub Pages deployment below
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the Supabase platform into every Edge Function; do not set them manually.

import { createClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_SITE_URL = "https://migueldossantoscosta.github.io/approve-pixel-flow";
const DEFAULT_FROM_EMAIL = "ProofSync <onboarding@resend.dev>";

type WebhookPayload = {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    version_id: string;
    comment: string;
    author_name: string;
  };
};

Deno.serve(async (req) => {
  try {
    const payload = (await req.json()) as WebhookPayload;
    const pin = payload.record;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("feedback_pins")
      .select(
        "comment, author_name, versions(version_number, deliverable_id, deliverables(title, projects(creator_id, profiles(email, full_name))))",
      )
      .eq("id", pin.id)
      .single();

    if (error || !data) {
      console.error("notify-new-pin: could not load pin context", error);
      return new Response("ok", { status: 200 });
    }

    const version = data.versions;
    const deliverable = version?.deliverables;
    const creator = deliverable?.projects?.profiles;

    if (!creator?.email) {
      console.error("notify-new-pin: no creator email found for pin", pin.id);
      return new Response("ok", { status: 200 });
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? DEFAULT_SITE_URL;
    const deliverableUrl = `${siteUrl}/deliverables/${version.deliverable_id}`;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("notify-new-pin: RESEND_API_KEY is not set");
      return new Response("ok", { status: 200 });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("FROM_EMAIL") ?? DEFAULT_FROM_EMAIL,
        to: creator.email,
        subject: `Nova nota em "${deliverable?.title ?? "um entregável"}"`,
        html: `
          <p><strong>${escapeHtml(data.author_name)}</strong> deixou uma nova nota na versão V${version?.version_number ?? "?"}:</p>
          <blockquote style="border-left:3px solid #ccc;padding-left:12px;margin-left:0;color:#333;">
            ${escapeHtml(data.comment)}
          </blockquote>
          <p><a href="${deliverableUrl}">Ver no painel</a></p>
        `,
      }),
    });

    if (!emailRes.ok) {
      console.error("notify-new-pin: Resend error", emailRes.status, await emailRes.text());
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("notify-new-pin: unexpected error", err);
    return new Response("ok", { status: 200 });
  }
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
