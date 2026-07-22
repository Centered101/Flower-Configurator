import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminConfig } from "@/lib/supabase/config";

export function createSupabaseAdminClient() {
  const { url, serviceKey } = getSupabaseAdminConfig();

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
