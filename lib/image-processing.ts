import { lookup } from "dns/promises";
import { randomUUID } from "crypto";
import { isIP } from "net";
import path from "path";
import sharp from "sharp";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ProcessedImage = {
  url: string;
  path: string;
  width: number;
  height: number;
  format: "webp" | "avif";
  size: number;
};

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_DIMENSION = 6000;
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg"]);
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml"
]);

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/svg+xml": ".svg"
};

const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./
];

export function validateImageFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("นามสกุลไฟล์รูปภาพนี้ยังไม่รองรับ");
  }
  return extension;
}

function getImageExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return ALLOWED_EXTENSIONS.has(extension) ? extension : "";
}

export function validateImageMimeType(mimeType: string) {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  if (!ALLOWED_MIME_TYPES.has(normalized)) {
    throw new Error("ชนิดไฟล์รูปภาพนี้ยังไม่รองรับ");
  }
  return normalized;
}

export function assertSafeSvg(buffer: Buffer) {
  const text = buffer.toString("utf8");
  const unsafePatterns = [
    /<script[\s>]/i,
    /\son[a-z]+\s*=/i,
    /<foreignObject[\s>]/i,
    /javascript:/i,
    /data:text\/html/i,
    /xlink:href\s*=\s*["']\s*(https?:|file:|data:)/i,
    /href\s*=\s*["']\s*(https?:|file:|data:)/i
  ];

  if (unsafePatterns.some((pattern) => pattern.test(text))) {
    throw new Error("ไฟล์ SVG มีเนื้อหาที่ไม่ปลอดภัย");
  }
}

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    return PRIVATE_IPV4_RANGES.some((range) => range.test(address));
  }

  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:");
  }

  return true;
}

export async function assertSafeImageUrl(rawUrl: string) {
  let url: URL;
  const normalizedUrl = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  try {
    url = new URL(normalizedUrl);
  } catch {
    throw new Error("URL รูปภาพไม่ถูกต้อง");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("รองรับเฉพาะ URL แบบ HTTP หรือ HTTPS");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("ไม่อนุญาตให้ใช้ URL ภายในเครื่อง");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("ไม่อนุญาตให้ใช้ URL จากเครือข่ายภายใน");
  }

  return url;
}

export async function fetchImageFromUrl(rawUrl: string) {
  const url = await assertSafeImageUrl(rawUrl);
  const extensionFromUrl = getImageExtension(url.pathname);

  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/svg+xml"
    }
  });

  if (!response.ok) {
    throw new Error("ดาวน์โหลดรูปภาพจาก URL ไม่สำเร็จ");
  }

  const contentType = validateImageMimeType(response.headers.get("content-type") ?? "");
  const extension = extensionFromUrl || EXTENSION_BY_MIME_TYPE[contentType];
  if (!extension) {
    throw new Error("ชนิดไฟล์รูปภาพนี้ยังไม่รองรับ");
  }
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_SIZE) {
    throw new Error("ไฟล์รูปภาพมีขนาดใหญ่เกินไป");
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
    throw new Error("ไฟล์รูปภาพมีขนาดใหญ่เกินไป");
  }

  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: contentType,
    originalName: extensionFromUrl ? path.basename(url.pathname) : `remote-image${extension}`
  };
}

export async function processAndStoreImage(input: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  outputFormat?: "webp" | "avif";
  bucket?: string;
  folder?: string;
}): Promise<ProcessedImage> {
  if (input.buffer.byteLength > MAX_FILE_SIZE) {
    throw new Error("ไฟล์รูปภาพมีขนาดใหญ่เกินไป");
  }

  const extension = validateImageFileName(input.originalName);
  const mimeType = validateImageMimeType(input.mimeType);
  if (extension === ".svg" || mimeType === "image/svg+xml") {
    assertSafeSvg(input.buffer);
  }

  const outputFormat = input.outputFormat ?? "webp";
  const image = sharp(input.buffer, {
    failOn: "error",
    limitInputPixels: MAX_DIMENSION * MAX_DIMENSION
  });

  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("ขนาดรูปภาพไม่ถูกต้อง");
  }
  if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
    throw new Error("ขนาดกว้างหรือสูงของรูปภาพใหญ่เกินไป");
  }

  const transformed =
    outputFormat === "avif"
      ? await image.rotate().avif({ quality: 72 }).toBuffer()
      : await image.rotate().webp({ quality: 82 }).toBuffer();

  const finalMetadata = await sharp(transformed).metadata();
  const fileName = `${randomUUID()}.${outputFormat}`;
  const bucket = input.bucket || "gallery-images";
  const folder = (input.folder || "uploads").replace(/^\/+|\/+$/g, "") || "uploads";
  const objectPath = `${folder}/${fileName}`;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, transformed, {
      contentType: `image/${outputFormat}`,
      upsert: false
    });

  if (error) {
    throw new Error(`อัปโหลดรูปขึ้น Supabase Storage ไม่สำเร็จ: ${error.message}`);
  }

  const publicUrl = supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
  const signedUrl = bucket === "gallery-images"
    ? null
    : (await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 60)).data?.signedUrl ?? null;

  return {
    url: signedUrl ?? publicUrl,
    path: `${bucket}/${objectPath}`,
    width: finalMetadata.width ?? metadata.width,
    height: finalMetadata.height ?? metadata.height,
    format: outputFormat,
    size: transformed.byteLength
  };
}
