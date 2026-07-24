import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_BUCKETS = [
  "gallery-images",
  "payment-slips",
  "order-reference-images",
  "order-progress-images"
];
const DEFAULT_MAX_AGE_DAYS = 7;
const PAGE_SIZE = 100;

function loadEnvFile(fileName) {
  try {
    const raw = readFileSync(resolve(process.cwd(), fileName), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // Env files are optional.
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const buckets = [];
  let shouldDelete = false;
  let maxAgeDays = DEFAULT_MAX_AGE_DAYS;

  for (const arg of args) {
    if (arg === "--delete") {
      shouldDelete = true;
    } else if (arg.startsWith("--max-age-days=")) {
      maxAgeDays = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--bucket=")) {
      buckets.push(arg.split("=")[1]);
    }
  }

  return {
    buckets: buckets.length ? buckets : DEFAULT_BUCKETS,
    shouldDelete,
    maxAgeDays: Number.isFinite(maxAgeDays) && maxAgeDays >= 0 ? maxAgeDays : DEFAULT_MAX_AGE_DAYS
  };
}

function normalizeSupabaseUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" && url.hostname.endsWith(".supabase.co")) {
      url.protocol = "https:";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

function getSupabaseClient() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function addStoragePath(target, value) {
  if (!value || typeof value !== "string") return;
  const text = value.trim();
  if (!text) return;

  try {
    const url = new URL(text);
    const match = /\/storage\/v1\/object\/(?:public|sign)\/([^/?#]+)\/([^?#]+)/.exec(url.pathname);
    if (match) {
      target.add(`${decodeURIComponent(match[1])}/${decodeURIComponent(match[2])}`);
      return;
    }
  } catch {
    // Not a URL; treat as storage path below.
  }

  for (const bucket of DEFAULT_BUCKETS) {
    if (text === bucket || text.startsWith(`${bucket}/`)) {
      target.add(text.replace(/^\/+/, ""));
      return;
    }
  }
}

function addStoragePathsFromValue(target, value) {
  if (!value) return;
  if (typeof value === "string") {
    addStoragePath(target, value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) addStoragePathsFromValue(target, item);
    return;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) addStoragePathsFromValue(target, item);
  }
}

async function addRows(supabase, usedPaths, table, select) {
  const { data, error } = await supabase.from(table).select(select);
  if (error) {
    console.warn(`ข้ามตาราง ${table}: ${error.message}`);
    return;
  }

  for (const row of data ?? []) addStoragePathsFromValue(usedPaths, row);
}

async function getUsedStoragePaths(supabase) {
  const usedPaths = new Set();

  await addRows(supabase, usedPaths, "products", "image_path, image_url");
  await addRows(supabase, usedPaths, "configurator_product_types", "image_path, image_url");
  await addRows(supabase, usedPaths, "gallery_items", "image_path, image_url, configuration_json");
  await addRows(supabase, usedPaths, "payment_records", "slip_path, slip_url");
  await addRows(supabase, usedPaths, "order_items", "customization_json");

  return usedPaths;
}

async function listBucketObjects(supabase, bucket, prefix = "") {
  const objects = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" }
    });

    if (error) throw new Error(`อ่าน bucket ${bucket} ไม่สำเร็จ: ${error.message}`);
    if (!data?.length) break;

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      const looksLikeFolder = !item.id && !item.metadata && !/\.[a-z0-9]+$/i.test(item.name);
      if (looksLikeFolder) {
        objects.push(...await listBucketObjects(supabase, bucket, path));
      } else {
        objects.push({
          bucket,
          objectPath: path,
          storagePath: `${bucket}/${path}`,
          createdAt: item.created_at || item.updated_at || item.last_accessed_at || "",
          size: Number(item.metadata?.size ?? 0)
        });
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return objects;
}

function isOldEnough(object, maxAgeDays) {
  if (maxAgeDays <= 0) return true;
  const createdAt = object.createdAt ? new Date(object.createdAt).getTime() : 0;
  if (!createdAt) return false;
  return createdAt <= Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
}

function formatBytes(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  const options = parseArgs();
  const supabase = getSupabaseClient();
  const usedPaths = await getUsedStoragePaths(supabase);
  const allObjects = [];

  for (const bucket of options.buckets) {
    allObjects.push(...await listBucketObjects(supabase, bucket));
  }

  const orphaned = allObjects.filter((object) => !usedPaths.has(object.storagePath) && isOldEnough(object, options.maxAgeDays));
  const totalBytes = orphaned.reduce((sum, object) => sum + object.size, 0);

  console.log(options.shouldDelete ? "โหมดลบจริง" : "โหมดตรวจสอบ ยังไม่ลบจริง");
  console.log(`ไฟล์ทั้งหมดที่ตรวจ: ${allObjects.length}`);
  console.log(`ไฟล์ที่ยังถูกอ้างอิงใน DB: ${usedPaths.size}`);
  console.log(`ไฟล์กำพร้าที่เก่ากว่า ${options.maxAgeDays} วัน: ${orphaned.length} (${formatBytes(totalBytes)})`);

  for (const object of orphaned) {
    console.log(`- ${object.storagePath} ${object.size ? `(${formatBytes(object.size)})` : ""}`);
  }

  if (!options.shouldDelete || !orphaned.length) return;

  const byBucket = new Map();
  for (const object of orphaned) {
    byBucket.set(object.bucket, [...(byBucket.get(object.bucket) ?? []), object.objectPath]);
  }

  for (const [bucket, paths] of byBucket.entries()) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw new Error(`ลบไฟล์ใน bucket ${bucket} ไม่สำเร็จ: ${error.message}`);
    console.log(`ลบ ${paths.length} ไฟล์จาก ${bucket} แล้ว`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
