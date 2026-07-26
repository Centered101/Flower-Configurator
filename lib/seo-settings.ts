import { cache } from "react";
import { BRAND_NAME, CREATOR_NAME, SITE_URL } from "@/lib/brand";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SeoSettings = {
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string;
  siteUrl: string;
  canonicalPath: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImageUrl: string;
  themeColor: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  updatedAt?: string;
};

const SEO_SETTINGS_KEY = "seo_settings";
const DEFAULT_DESCRIPTION = "ออกแบบและพรีออเดอร์ดอกไม้ลวดกำมะหยี่แบบกำหนดเอง";
const DEFAULT_KEYWORDS = [
  BRAND_NAME,
  CREATOR_NAME,
  "centered101",
  "ดอกไม้ลวดกำมะหยี่",
  "พรีออเดอร์ดอกไม้",
  "ออกแบบดอกไม้",
  "custom flower configurator"
].join(", ");

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function fallbackSettings(): SeoSettings {
  return {
    siteTitle: BRAND_NAME,
    siteDescription: DEFAULT_DESCRIPTION,
    siteKeywords: DEFAULT_KEYWORDS,
    siteUrl: SITE_URL,
    canonicalPath: "/",
    ogTitle: BRAND_NAME,
    ogDescription: DEFAULT_DESCRIPTION,
    ogImageUrl: "/favicon.png",
    twitterTitle: BRAND_NAME,
    twitterDescription: DEFAULT_DESCRIPTION,
    twitterImageUrl: "/favicon.png",
    themeColor: "#F48FB1",
    robotsIndex: true,
    robotsFollow: true
  };
}

function parseBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function parseSettings(value: string | null | undefined): Partial<SeoSettings> {
  if (!value) return {};

  try {
    const data = JSON.parse(value) as Partial<SeoSettings>;
    return {
      siteTitle: clean(data.siteTitle),
      siteDescription: clean(data.siteDescription),
      siteKeywords: clean(data.siteKeywords),
      siteUrl: clean(data.siteUrl),
      canonicalPath: clean(data.canonicalPath),
      ogTitle: clean(data.ogTitle),
      ogDescription: clean(data.ogDescription),
      ogImageUrl: clean(data.ogImageUrl),
      twitterTitle: clean(data.twitterTitle),
      twitterDescription: clean(data.twitterDescription),
      twitterImageUrl: clean(data.twitterImageUrl),
      themeColor: clean(data.themeColor),
      robotsIndex: parseBoolean(data.robotsIndex, true),
      robotsFollow: parseBoolean(data.robotsFollow, true),
      updatedAt: clean(data.updatedAt) || undefined
    };
  } catch {
    return {};
  }
}

function assertHttpUrl(value: string, label: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid protocol");
  } catch {
    throw new Error(`${label} ต้องเป็น URL ที่ขึ้นต้นด้วย http:// หรือ https://`);
  }
}

function assertPathOrHttpUrl(value: string, label: string) {
  if (value.startsWith("/")) return;
  assertHttpUrl(value, label);
}

function assertHexColor(value: string) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error("สีแถบบราวเซอร์ต้องเป็นรหัสสีแบบ #RRGGBB");
  }
}

function normalizeKeywords(value: string) {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .join(", ");
}

export function keywordsToArray(value: string) {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

async function readSeoSettingsUncached(): Promise<SeoSettings> {
  const fallback = fallbackSettings();

  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", SEO_SETTINGS_KEY)
      .maybeSingle();
    const stored = parseSettings(data?.value);

    return {
      siteTitle: stored.siteTitle || fallback.siteTitle,
      siteDescription: stored.siteDescription || fallback.siteDescription,
      siteKeywords: stored.siteKeywords || fallback.siteKeywords,
      siteUrl: stored.siteUrl || fallback.siteUrl,
      canonicalPath: stored.canonicalPath || fallback.canonicalPath,
      ogTitle: stored.ogTitle || stored.siteTitle || fallback.ogTitle,
      ogDescription: stored.ogDescription || stored.siteDescription || fallback.ogDescription,
      ogImageUrl: stored.ogImageUrl || fallback.ogImageUrl,
      twitterTitle: stored.twitterTitle || stored.ogTitle || stored.siteTitle || fallback.twitterTitle,
      twitterDescription: stored.twitterDescription || stored.ogDescription || stored.siteDescription || fallback.twitterDescription,
      twitterImageUrl: stored.twitterImageUrl || stored.ogImageUrl || fallback.twitterImageUrl,
      themeColor: stored.themeColor || fallback.themeColor,
      robotsIndex: parseBoolean(stored.robotsIndex, fallback.robotsIndex),
      robotsFollow: parseBoolean(stored.robotsFollow, fallback.robotsFollow),
      updatedAt: stored.updatedAt
    };
  } catch {
    return fallback;
  }
}

export const readSeoSettings = cache(readSeoSettingsUncached);

export async function saveSeoSettings(input: Partial<SeoSettings>) {
  const fallback = fallbackSettings();
  const next: SeoSettings = {
    siteTitle: clean(input.siteTitle),
    siteDescription: clean(input.siteDescription),
    siteKeywords: normalizeKeywords(clean(input.siteKeywords)),
    siteUrl: clean(input.siteUrl) || fallback.siteUrl,
    canonicalPath: clean(input.canonicalPath) || "/",
    ogTitle: clean(input.ogTitle),
    ogDescription: clean(input.ogDescription),
    ogImageUrl: clean(input.ogImageUrl) || fallback.ogImageUrl,
    twitterTitle: clean(input.twitterTitle),
    twitterDescription: clean(input.twitterDescription),
    twitterImageUrl: clean(input.twitterImageUrl),
    themeColor: clean(input.themeColor) || fallback.themeColor,
    robotsIndex: parseBoolean(input.robotsIndex, true),
    robotsFollow: parseBoolean(input.robotsFollow, true),
    updatedAt: new Date().toISOString()
  };

  if (!next.siteTitle) throw new Error("กรุณากรอกชื่อเว็บไซต์");
  if (!next.siteDescription) throw new Error("กรุณากรอกคำอธิบายเว็บไซต์");
  if (!next.ogTitle) next.ogTitle = next.siteTitle;
  if (!next.ogDescription) next.ogDescription = next.siteDescription;
  if (!next.twitterTitle) next.twitterTitle = next.ogTitle;
  if (!next.twitterDescription) next.twitterDescription = next.ogDescription;
  if (!next.twitterImageUrl) next.twitterImageUrl = next.ogImageUrl;

  assertHttpUrl(next.siteUrl, "ลิงก์เว็บไซต์");
  assertPathOrHttpUrl(next.canonicalPath, "ลิงก์หลักของหน้า");
  assertPathOrHttpUrl(next.ogImageUrl, "รูปเวลาแชร์ลิงก์");
  assertPathOrHttpUrl(next.twitterImageUrl, "รูปเวลาแชร์ใน X");
  assertHexColor(next.themeColor);

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({
      key: SEO_SETTINGS_KEY,
      value: JSON.stringify(next)
    }, { onConflict: "key" });

  if (error) throw new Error(error.message);
  return next;
}
