import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PAYMENT_SLIP_BUCKET = "payment-slips";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60 * 6;
const STORAGE_PATH_MARKERS = [
  "/storage/v1/object/sign/payment-slips/",
  "/storage/v1/object/public/payment-slips/",
  "/storage/v1/object/authenticated/payment-slips/"
];
const DEMO_IMAGE_HOSTS = new Set([
  "dummyimage.com",
  "placehold.co",
  "via.placeholder.com",
  "placeholder.com"
]);

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

function extractObjectPathFromStorageUrl(value: string) {
  try {
    const url = new URL(value);
    const marker = STORAGE_PATH_MARKERS.find((item) => url.pathname.includes(item));
    if (!marker) return "";

    const [, objectPath = ""] = url.pathname.split(marker);
    return decodeURIComponent(objectPath).replace(/^\/+/, "");
  } catch {
    return "";
  }
}

function isDemoPaymentSlipUrl(value?: string | null) {
  if (!value) return false;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return DEMO_IMAGE_HOSTS.has(hostname) || hostname.endsWith(".dummyimage.com") || hostname.endsWith(".placehold.co");
  } catch {
    return /dummyimage|placeholder|placehold\.co/i.test(value);
  }
}

function parsePaymentSlipPath(value?: string | null) {
  const path = value?.trim().replace(/^\/+/, "") ?? "";
  if (!path || path.includes("..")) return null;

  if (/^https?:\/\//i.test(path)) {
    const objectPath = extractObjectPathFromStorageUrl(path);
    return objectPath && !objectPath.includes("..") ? { bucket: PAYMENT_SLIP_BUCKET, objectPath } : null;
  }

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
  const parsed = parsePaymentSlipPath(input.slipPath) ?? parsePaymentSlipPath(input.fallbackUrl);

  if (!parsed) {
    return input.fallbackUrl && !isDemoPaymentSlipUrl(input.fallbackUrl) ? forceHttps(input.fallbackUrl) : "";
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.objectPath, input.ttlSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return input.fallbackUrl && !isDemoPaymentSlipUrl(input.fallbackUrl) ? forceHttps(input.fallbackUrl) : "";
  }

  return forceHttps(data.signedUrl);
}
