import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!cached) cached = createBrowserClient(url as string, anonKey as string);
  return cached;
}

// Rückwärtskompatibler Export (viele Stellen im Code importieren `supabase` direkt).
export const supabase = getSupabaseBrowserClient();
