import { promises as fs } from "fs";
import path from "path";

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

const SETTINGS_PATH = path.join(process.cwd(), ".runtime", "line-settings.json");

function maskToken(token: string) {
  if (!token) return "";
  if (token.length <= 12) return "••••••••";
  return `${token.slice(0, 8)}••••••••${token.slice(-6)}`;
}

async function readStoredSettings(): Promise<LineSettings | null> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, "utf8");
    return JSON.parse(raw) as LineSettings;
  } catch {
    return null;
  }
}

export async function readLineSettings(): Promise<LineSettings> {
  const stored = await readStoredSettings();
  return {
    channelAccessToken: stored?.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
    adminGroupId: stored?.adminGroupId || process.env.LINE_ADMIN_GROUP_ID || "",
    updatedAt: stored?.updatedAt
  };
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
  const next: LineSettings = {
    channelAccessToken: input.channelAccessToken?.trim() || current.channelAccessToken,
    adminGroupId: input.adminGroupId.trim(),
    updatedAt: new Date().toISOString()
  };

  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2), "utf8");

  return readPublicLineSettings();
}
