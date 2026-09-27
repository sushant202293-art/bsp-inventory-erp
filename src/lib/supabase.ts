import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing VITE_SUPABASE_URL environment variable");
}

if (!supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_ANON_KEY environment variable");
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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
