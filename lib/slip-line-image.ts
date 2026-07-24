import { createHmac, timingSafeEqual } from "crypto";
import { SITE_URL } from "@/lib/brand";

const SLIP_IMAGE_ROUTE = "/api/payments/slip-line-image";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 3;

function getSigningSecret() {
  return (
    process.env.SLIP_IMAGE_SIGNING_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()
    || ""
  );
}

function normalizeSlipPath(value: string) {
  const path = value.trim().replace(/^\/+/, "");
  if (!path || path.includes("..") || !path.startsWith("payment-slips/")) return "";
  return path;
}

function signSlipPath(path: string, expiresAt: number) {
  const secret = getSigningSecret();
  if (!secret) return "";

  return createHmac("sha256", secret)
    .update(`${path}.${expiresAt}`)
    .digest("hex");
}

export function createSlipLineImageUrl(slipPath?: string, ttlSeconds = DEFAULT_TTL_SECONDS) {
  if (!slipPath) return "";

  const path = normalizeSlipPath(slipPath);
  const secret = getSigningSecret();
  if (!path || !secret) return "";

  let baseUrl: URL;
  try {
    baseUrl = new URL(SITE_URL);
  } catch {
    return "";
  }

  if (baseUrl.protocol !== "https:") return "";

  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const url = new URL(SLIP_IMAGE_ROUTE, baseUrl.origin);
  url.searchParams.set("path", path);
  url.searchParams.set("expires", String(expiresAt));
  url.searchParams.set("signature", signSlipPath(path, expiresAt));

  return url.toString();
}

export function verifySlipLineImageUrl(input: {
  path: string;
  expires: string;
  signature: string;
}) {
  const path = normalizeSlipPath(input.path);
  const expiresAt = Number(input.expires);
  if (!path || !Number.isInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return "";
  }

  if (!/^[a-f0-9]{64}$/i.test(input.signature)) {
    return "";
  }

  const expected = signSlipPath(path, expiresAt);
  if (!expected) return "";

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(input.signature, "hex");
  if (expectedBuffer.length !== providedBuffer.length) return "";

  return timingSafeEqual(expectedBuffer, providedBuffer) ? path : "";
}
