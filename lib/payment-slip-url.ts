import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PAYMENT_SLIP_BUCKET = "payment-slips";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60 * 6;

function forceHttps(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" && url.hostname.endsWith(".supabase.co")) {
      url.protocol = "https:";
      return url.toString();
    }
  } catch {
    return value;
  }

  return value;
}

function parsePaymentSlipPath(value?: string | null) {
  const path = value?.trim().replace(/^\/+/, "") ?? "";
  if (!path || path.includes("..")) return null;

  const [bucket, ...parts] = path.split("/");
  const objectPath = parts.join("/");

  if (bucket !== PAYMENT_SLIP_BUCKET || !objectPath) return null;

  return { bucket, objectPath };
}

export async function createPaymentSlipDisplayUrl(input: {
  slipPath?: string | null;
  fallbackUrl?: string | null;
  ttlSeconds?: number;
}) {
  const parsed = parsePaymentSlipPath(input.slipPath);

  if (!parsed) {
    return input.fallbackUrl ? forceHttps(input.fallbackUrl) : "";
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.objectPath, input.ttlSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return input.fallbackUrl ? forceHttps(input.fallbackUrl) : "";
  }

  return forceHttps(data.signedUrl);
}
