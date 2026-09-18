# Design: Remove Supabase entirely, store everything in the browser

## Context

Supabase (Postgres RLS, Storage, Auth, Edge Functions) has been the source of
repeated friction: manual SQL migrations, dashboard clicks, auth rate limits,
a service-role key the static SPA can never hold. The user explicitly chose
to drop the backend entirely rather than keep fighting it or swap to another
BaaS with the same class of problems.

## Accepted trade-off

**The public review link (`/review/<share_token>`) can no longer be shared
with an actual client on another device or browser.** All data now lives in
IndexedDB, scoped to one browser profile. Opening the link elsewhere shows
"link not found" because there is nothing to fetch it from. The route stays
in the app (useful to preview the client-facing UI in the same browser), but
it is not a real collaboration feature anymore — the whole app is now a
single-browser personal tool.

Consequences accepted along with this:
- Email notification on new pins (the just-built `notify-new-pin` Edge
  Function) is removed — sending email fundamentally requires a server to
  hold the provider API key, which no longer exists.
- The PIN gate (`src/routes/auth.tsx` / `dashboard-lock.ts`) stays as-is per
  explicit request, even though it no longer protects shared data — each
  browser already only ever sees its own local data.
- Clearing site data, using a different browser, or a different device loses
  everything. There is no backup/export built in (out of scope unless asked).

## Data layer

Replace all `supabase.from(...)` / `supabase.storage` / `supabase.rpc(...)`
calls with a single `src/lib/local-db.ts` module wrapping the browser's
native IndexedDB — no new dependency. Four object stores mirror the old
Postgres tables (`projects`, `deliverables`, `versions`, `feedback_pins`);
`profiles` disappears (no accounts). A version's image is stored as a `Blob`
directly on its record — IndexedDB structured-clones Blobs natively — and
turned into a display URL with `URL.createObjectURL` on read.

Every function the UI currently calls on `review.functions.ts` and inline
`supabase.from(...)` calls gets a same-named local equivalent, so route
components change only their import and a few call sites, not their JSX.

## What gets deleted

- `supabase/` (migrations, the storage-bucket policies, the edge function)
- `src/integrations/supabase/` (client, generated types, cron helper)
- `@supabase/supabase-js` dependency
- The `SUPABASE_*`/`VITE_SUPABASE_*` env vars and GitHub Actions build vars —
  only `VITE_DASHBOARD_PIN` remains, which also simplifies the CI workflow.

## Testing plan

Same as the earlier SPA work: `bun run build` + local dev server, walk
through PIN → create project → add deliverable → upload a version → open the
review link *in the same browser* → add a pin → approve. Confirm nothing
references Supabase anymore (`grep -r supabase src`).
