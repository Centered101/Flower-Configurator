import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PaymentSettings = {
  promptPayId: string;
  accountName: string;
  qrImageUrl: string;
  updatedAt?: string;
};

const PAYMENT_SETTINGS_KEY = "payment_settings";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readEnvPaymentSettings(): PaymentSettings {
  return {
    promptPayId: process.env.PROMPTPAY_ID?.trim() || process.env.NEXT_PUBLIC_PROMPTPAY_ID?.trim() || "",
    accountName: process.env.PAYMENT_ACCOUNT_NAME?.trim() || process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NAME?.trim() || "",
    qrImageUrl: process.env.PAYMENT_QR_IMAGE_URL?.trim() || process.env.NEXT_PUBLIC_PAYMENT_QR_IMAGE_URL?.trim() || ""
  };
}

function parseSettings(value: string | null | undefined): Partial<PaymentSettings> {
  if (!value) return {};

  try {
    const data = JSON.parse(value) as Partial<PaymentSettings>;
    return {
      promptPayId: clean(data.promptPayId),
      accountName: clean(data.accountName),
      qrImageUrl: clean(data.qrImageUrl),
      updatedAt: clean(data.updatedAt) || undefined
    };
  } catch {
    return {};
  }
}

function assertOptionalPublicUrl(value: string) {
  if (!value) return;

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new Error("ลิงก์รูป QR ต้องเป็น URL ที่ขึ้นต้นด้วย http:// หรือ https://");
  }
}

export async function readPaymentSettings(): Promise<PaymentSettings> {
  const envSettings = readEnvPaymentSettings();

  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", PAYMENT_SETTINGS_KEY)
      .maybeSingle();
    const stored = parseSettings(data?.value);

    return {
      promptPayId: stored.promptPayId || envSettings.promptPayId,
      accountName: stored.accountName || envSettings.accountName,
      qrImageUrl: stored.qrImageUrl || envSettings.qrImageUrl,
      updatedAt: stored.updatedAt
    };
  } catch {
    return envSettings;
  }
}

export async function savePaymentSettings(input: {
  promptPayId: string;
  accountName?: string;
  qrImageUrl?: string;
}) {
  const next: PaymentSettings = {
    promptPayId: input.promptPayId.trim(),
    accountName: input.accountName?.trim() ?? "",
    qrImageUrl: input.qrImageUrl?.trim() ?? "",
    updatedAt: new Date().toISOString()
  };

  if (!next.promptPayId) {
    throw new Error("กรุณากรอกเลข PromptPay");
  }
  assertOptionalPublicUrl(next.qrImageUrl);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({
      key: PAYMENT_SETTINGS_KEY,
      value: JSON.stringify(next)
    }, { onConflict: "key" });

  if (error) {
    throw new Error(error.message);
  }

  return next;
}
