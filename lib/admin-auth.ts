const ADMIN_SESSION_COOKIE = "flower_admin_session";
const encoder = new TextEncoder();

export type AdminRole = "owner" | "superadmin" | "admin";

type AdminSessionPayload = {
  username: string;
  role: AdminRole;
  exp: number;
};

function base64UrlEncode(input: string | Uint8Array) {
  const bytes = typeof input === "string" ? encoder.encode(input) : input;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(input: string) {
  const padded = input.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function getFirstEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return "";
}

function getSecret() {
  return getFirstEnvValue("ADMIN_SESSION_SECRET", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY") || "dev-admin-session-secret";
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createAdminSessionToken(username: string, role: AdminRole = "admin") {
  const payload: AdminSessionPayload = {
    username,
    role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign("HMAC", await getSigningKey(), encoder.encode(encodedPayload));

  return `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyAdminSessionToken(token?: string) {
  if (!token) return null;

  const [encodedPayload, encodedSignature] = token.split(".");
  if (!encodedPayload || !encodedSignature) return null;

  const isValid = await crypto.subtle.verify(
    "HMAC",
    await getSigningKey(),
    base64UrlDecode(encodedSignature),
    encoder.encode(encodedPayload)
  );
  if (!isValid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as AdminSessionPayload;
    if (!payload.username || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      ...payload,
      role: payload.role ?? "admin"
    };
  } catch {
    return null;
  }
}

export { ADMIN_SESSION_COOKIE };
