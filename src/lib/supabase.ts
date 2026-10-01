import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Values still present in `.env.example`. Treated as "not configured" so a
 * freshly cloned project fails loudly and legibly instead of firing doomed
 * network requests at `example.supabase.co`.
 */
const PLACEHOLDER_URL = "https://your-project-id.supabase.co";
const PLACEHOLDER_KEY_MARKERS = ["your-anon-key-here", "your-publishable-key-here"];

function isPlaceholderUrl(url: string | undefined): boolean {
  return !url || url.trim() === "" || url.trim() === PLACEHOLDER_URL;
}

function isPlaceholderKey(key: string | undefined): boolean {
  if (!key) return true;
  const trimmed = key.trim().toLowerCase();
  return PLACEHOLDER_KEY_MARKERS.some((marker) => trimmed.includes(marker));
}

/**
 * True when real Supabase credentials are present. `main.tsx` renders a setup
 * screen instead of the app when this is false, so the project is never
 * unusable-but-silent.
 */
export const isSupabaseConfigured: boolean =
  !isPlaceholderUrl(supabaseUrl) && !isPlaceholderKey(supabaseAnonKey);

export const supabaseConfigError: string | null = isSupabaseConfigured
  ? null
  : isPlaceholderUrl(supabaseUrl)
    ? "VITE_SUPABASE_URL is missing or still set to the placeholder value."
    : "VITE_SUPABASE_ANON_KEY is missing or still set to the placeholder value.";

// The client must exist for the ~13 service modules that import it, so an
// unconfigured build gets an inert client rather than a module-level throw.
// It is never exercised: `main.tsx` short-circuits to the setup screen first.
export const supabase: SupabaseClient = createClient(
  supabaseUrl?.trim() || "http://localhost:54321",
  supabaseAnonKey?.trim() || "unconfigured-anon-key",
  {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "x-app-name": "BSP Inventory ERP",
    },
  },
});


/*
 * NOTE: this file previously exported a hand-written `Database` type
 * describing tables that do not exist in this project (`businesses`,
 * `invoices`, `payments`, `users`, ... all keyed on a `business_id`
 * column). Nothing imported it, and it did not match the real schema in
 * supabase/migrations/, so it only invited incorrect code.
 *
 * The client is intentionally left untyped until the real schema is
 * generated with:
 *   npx supabase gen types typescript --project-id <ref> > src/types/supabase.ts
 *
 * The hand-maintained row shapes used by the app live in
 * src/types/database.types.ts.
 */
