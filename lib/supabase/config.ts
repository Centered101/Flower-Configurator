function getFirstEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return "";
}

function normalizeSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" && url.hostname.endsWith(".supabase.co")) {
      url.protocol = "https:";
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    return value;
  }

  return value.replace(/\/$/, "");
}

export function getSupabasePublicConfig() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || "");
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || "";

  if (!url || !publishableKey) {
    throw new Error("Missing Supabase public config. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return { url, publishableKey };
}

export function getSupabaseAdminConfig() {
  const url = normalizeSupabaseUrl(getFirstEnvValue("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"));
  const serviceKey = getFirstEnvValue("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase admin config. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return { url, serviceKey };
}
