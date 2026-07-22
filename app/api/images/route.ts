import { NextResponse } from "next/server";
import { fetchImageFromUrl, processAndStoreImage } from "@/lib/image-processing";
import { getAdminSessionWithDatabaseRole } from "@/lib/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ALLOWED_BUCKETS = new Set(["gallery-images", "order-reference-images", "order-progress-images"]);
const ADMIN_ONLY_BUCKETS = new Set(["gallery-images", "order-progress-images"]);

function normalizeStorageFolder(value: FormDataEntryValue | null) {
  const folder = String(value ?? "uploads").trim().replace(/^\/+|\/+$/g, "") || "uploads";
  if (folder.includes("..") || !/^[a-z0-9/_-]+$/i.test(folder)) {
    throw new Error("path สำหรับจัดเก็บรูปภาพไม่ถูกต้อง");
  }

  return folder;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const outputFormat = formData.get("format") === "avif" ? "avif" : "webp";
    const bucket = String(formData.get("bucket") ?? "gallery-images").trim() || "gallery-images";
    const folder = normalizeStorageFolder(formData.get("folder"));
    const imageUrl = String(formData.get("imageUrl") ?? "").trim();
    const file = formData.get("file");

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: "bucket สำหรับจัดเก็บรูปภาพไม่ถูกต้อง" }, { status: 400 });
    }

    if (ADMIN_ONLY_BUCKETS.has(bucket)) {
      const supabase = createSupabaseAdminClient();
      const session = await getAdminSessionWithDatabaseRole(supabase);
      if (!session) {
        return NextResponse.json({ error: "กรุณาเข้าสู่ระบบผู้ดูแลร้านก่อนอัปโหลดรูปส่วนนี้" }, { status: 403 });
      }
    }

    if (imageUrl) {
      const downloaded = await fetchImageFromUrl(imageUrl);
      const result = await processAndStoreImage({ ...downloaded, outputFormat, bucket, folder });
      return NextResponse.json(result);
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "กรุณาอัปโหลดไฟล์รูปภาพหรือใส่ URL รูปภาพ" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await processAndStoreImage({
      buffer: Buffer.from(arrayBuffer),
      mimeType: file.type,
      originalName: file.name,
      outputFormat,
      bucket,
      folder
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ประมวลผลรูปภาพไม่สำเร็จ" },
      { status: 400 }
    );
  }
}
