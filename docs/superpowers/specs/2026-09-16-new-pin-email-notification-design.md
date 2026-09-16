# Design: Email notification on new feedback pin

## Context

ProofSync is now a static SPA (see the GitHub Pages design doc) — the browser
can never hold a secret email-provider API key, so notifying the creator
about client feedback has to happen entirely inside Supabase.

## Goal

When a client adds a feedback pin on the public review page, email the
deliverable's creator so they don't have to keep checking the dashboard.

## Design

- **Trigger**: a Supabase Database Webhook on `public.feedback_pins`, event
  `INSERT`, target: the `notify-new-pin` Edge Function. Configured via the
  Supabase Dashboard (Database → Webhooks) rather than a SQL migration,
  because this project's `SUPABASE_URL` points at a Lovable Cloud proxy
  domain rather than the standard `<ref>.supabase.co` host, and guessing the
  exact Edge Function invocation URL for a SQL trigger risks silently
  pointing at the wrong host. The dashboard picks the correct URL from a
  function picker, so it can't be wrong.
- **Edge Function** `supabase/functions/notify-new-pin/index.ts` (Deno):
  1. Reads the webhook payload's `record` (the new `feedback_pins` row).
  2. Uses the service-role client (Supabase auto-injects `SUPABASE_URL` and
     `SUPABASE_SERVICE_ROLE_KEY` into every Edge Function — no extra secret
     needed for this part) to join `versions → deliverables → projects →
     profiles` and get the creator's email, the deliverable title, and the
     deliverable id.
  3. Sends an email via the Resend API (`RESEND_API_KEY`, a secret the user
     sets manually — Resend keys can't be created from here) with:
     - Subject: `Nova nota em "<deliverable title>"`
     - Body: the pin's author name and comment, plus a link to
       `<SITE_URL>/deliverables/<deliverable_id>` (`SITE_URL` is a second
       secret, defaulting to `https://migueldossantoscosta.github.io/approve-pixel-flow`
       in code if unset).
  4. Any failure (missing creator email, Resend error) is logged and the
     function still returns 200 — a failed notification must never affect
     the client's ability to leave feedback.

## Non-goals

- No notification on version approval (deferred — only new-pin was chosen).
- No retry/queue for failed sends; Resend failures are logged only.
- No in-app notification center — email only.

## Manual steps only the user can do

1. Create a free Resend account and API key.
2. Deploy the function: `supabase functions deploy notify-new-pin` (needs
   Supabase CLI login — I don't have credentials to do this myself).
3. Set secrets: `supabase secrets set RESEND_API_KEY=... SITE_URL=...`.
4. Create the Database Webhook in the Supabase Dashboard pointing at the
   deployed function.
5. Verify a sending domain in Resend, or keep the sandbox `onboarding@resend.dev`
   sender for now (fine for low-volume personal use, but sandbox sending is
   rate-limited and only delivers to the Resend account owner's own verified
   email in test mode — worth verifying a real domain before relying on this
   for real clients).
