import { promises as fs } from "fs";
import path from "path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type LineSettings = {
  channelAccessToken: string;
  adminGroupId: string;
  updatedAt?: string;
};

export type PublicLineSettings = {
  hasChannelAccessToken: boolean;
  maskedChannelAccessToken: string;
  adminGroupId: string;
  updatedAt?: string;
};

const LINE_SETTINGS_KEY = "line_settings";
const LEGACY_SETTINGS_PATH = path.join(process.cwd(), ".runtime", "line-settings.json");
const LINE_BOT_INFO_ENDPOINT = "https://api.line.me/v2/bot/info";
const LINE_RECIPIENT_ID_PATTERN = /^[UCR][A-Za-z0-9_-]{8,120}$/;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanChannelAccessToken(value: unknown) {
  const token = clean(value)
    .replace(/^authorization:\s*/i, "")
    .replace(/^bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");

  return token;
}

function cleanLineRecipientId(value: unknown) {
  return clean(value)
    .replace(/^to:\s*/i, "")
    .replace(/^recipient:\s*/i, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
}

function looksLikeLineRecipientId(value: string) {
  return LINE_RECIPIENT_ID_PATTERN.test(value);
}

function looksLikeChannelAccessToken(value: string) {
  return value.length >= 80 || /[+/=]/.test(value);
}

function maskToken(token: string) {
  if (!token) return "";
  if (token.length <= 12) return "••••••••";
  return `${token.slice(0, 8)}••••••••${token.slice(-6)}`;
}

function readEnvLineSettings(): LineSettings {
  return {
    channelAccessToken: cleanChannelAccessToken(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    adminGroupId: cleanLineRecipientId(process.env.LINE_ADMIN_GROUP_ID)
  };
}

async function readLegacyFileSettings(): Promise<Partial<LineSettings>> {
  try {
    const raw = await fs.readFile(LEGACY_SETTINGS_PATH, "utf8");
    return parseSettings(raw);
  } catch {
    return {};
  }
}

function parseSettings(value: string | null | undefined): Partial<LineSettings> {
  if (!value) return {};

  try {
    const data = JSON.parse(value) as Partial<LineSettings>;
    return {
      channelAccessToken: cleanChannelAccessToken(data.channelAccessToken),
      adminGroupId: cleanLineRecipientId(data.adminGroupId),
      updatedAt: clean(data.updatedAt) || undefined
    };
  } catch {
    return {};
  }
}

async function validateLineChannelAccessToken(token: string) {
  const response = await fetch(LINE_BOT_INFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (response.ok) return;

  const detail = await response.text().catch(() => "");
  if (response.status === 401) {
    throw new Error("LINE Channel access token ไม่ถูกต้อง หมดอายุ หรือไม่ใช่ token ของ Messaging API กรุณาสร้าง token ใหม่จาก LINE Developers แล้วลองอีกครั้ง");
  }

  throw new Error(`ตรวจสอบ LINE Channel access token ไม่สำเร็จ (${response.status}) ${detail}`);
}

function assertLineRecipientId(recipientId: string) {
  if (looksLikeLineRecipientId(recipientId)) return;

  if (looksLikeChannelAccessToken(recipientId)) {
    throw new Error("ช่องรหัสผู้รับ LINE ดูเหมือนเป็น Channel access token กรุณาสลับค่า: token ใส่ช่องรหัสเชื่อมต่อ LINE และรหัสผู้รับต้องขึ้นต้นด้วย U, C หรือ R");
  }

  if (!/^[UCR]/.test(recipientId)) {
    throw new Error("รหัสผู้รับ LINE ต้องเป็น User ID, Group ID หรือ Room ID ที่ขึ้นต้นด้วย U, C หรือ R ไม่ใช่ LINE ID ที่ใช้ค้นหาเพื่อน");
  }

  throw new Error("รหัสผู้รับ LINE มีรูปแบบไม่ถูกต้อง กรุณาคัดลอก ID แบบเต็มจาก LINE Developers/Webhook แล้วลองอีกครั้ง");
}

export async function readLineSettings(): Promise<LineSettings> {
  const envSettings = readEnvLineSettings();
  const legacySettings = await readLegacyFileSettings();

  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", LINE_SETTINGS_KEY)
      .maybeSingle();
    const stored = parseSettings(data?.value);

    return {
      channelAccessToken: stored.channelAccessToken || legacySettings.channelAccessToken || envSettings.channelAccessToken,
      adminGroupId: stored.adminGroupId || legacySettings.adminGroupId || envSettings.adminGroupId,
      updatedAt: stored.updatedAt || legacySettings.updatedAt
    };
  } catch {
    return {
      channelAccessToken: legacySettings.channelAccessToken || envSettings.channelAccessToken,
      adminGroupId: legacySettings.adminGroupId || envSettings.adminGroupId,
      updatedAt: legacySettings.updatedAt
    };
  }
}

export async function readPublicLineSettings(): Promise<PublicLineSettings> {
  const settings = await readLineSettings();

  return {
    hasChannelAccessToken: Boolean(settings.channelAccessToken),
    maskedChannelAccessToken: maskToken(settings.channelAccessToken),
    adminGroupId: settings.adminGroupId,
    updatedAt: settings.updatedAt
  };
}

export async function saveLineSettings(input: {
  channelAccessToken?: string;
  adminGroupId: string;
}) {
  const current = await readLineSettings();
  const incomingToken = cleanChannelAccessToken(input.channelAccessToken);
  const incomingGroupId = cleanLineRecipientId(input.adminGroupId);

  if (incomingToken && looksLikeLineRecipientId(incomingToken) && looksLikeChannelAccessToken(incomingGroupId)) {
    throw new Error("ดูเหมือนใส่ค่า LINE สลับช่อง: ช่องรหัสเชื่อมต่อ LINE ต้องเป็น token ยาว ๆ และช่องรหัสผู้รับต้องขึ้นต้นด้วย U, C หรือ R");
  }

  if (incomingToken) {
    await validateLineChannelAccessToken(incomingToken);
  }

  const next: LineSettings = {
    channelAccessToken: incomingToken || current.channelAccessToken,
    adminGroupId: incomingGroupId,
    updatedAt: new Date().toISOString()
  };

  if (!next.channelAccessToken) {
    throw new Error("กรุณากรอก LINE Channel access token");
  }

  if (!next.adminGroupId) {
    throw new Error("กรุณากรอกรหัสผู้รับ LINE");
  }

  assertLineRecipientId(next.adminGroupId);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({
      key: LINE_SETTINGS_KEY,
      value: JSON.stringify(next)
    }, { onConflict: "key" });

  if (error) {
    throw new Error(error.message);
  }

  return readPublicLineSettings();
}
