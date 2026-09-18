// PIN gate for the creator dashboard, replacing Supabase Auth accounts.
// Not real security: this is plain source code, so anyone inspecting the
// site can read it. It only keeps casual visitors from stumbling into the
// dashboard. Hardcoded (not an env var) so the PIN works right after a push,
// with no GitHub Actions configuration step required.
export const DASHBOARD_PIN = "040221";
export const DASHBOARD_UNLOCKED_KEY = "proofsync_dashboard_unlocked";
