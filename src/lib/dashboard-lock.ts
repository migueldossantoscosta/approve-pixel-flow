// PIN gate for the creator dashboard, replacing Supabase Auth accounts.
// Not real security: VITE_DASHBOARD_PIN is baked into the public JS bundle at
// build time, so anyone inspecting the site's source can read it. It only
// keeps casual visitors from stumbling into the dashboard.
export const DASHBOARD_UNLOCKED_KEY = "proofsync_dashboard_unlocked";
