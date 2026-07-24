import { NextResponse } from "next/server";
import sharp from "sharp";
import { verifySlipLineImageUrl } from "@/lib/slip-line-image";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseStoragePath(path: string) {
  const [bucket, ...parts] = path.split("/");
  const objectPath = parts.join("/");

  if (bucket !== "payment-slips" || !objectPath) {
    return null;
  }

  return { bucket, objectPath };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const verifiedPath = verifySlipLineImageUrl({
    path: url.searchParams.get("path") ?? "",
    expires: url.searchParams.get("expires") ?? "",
    signature: url.searchParams.get("signature") ?? ""
  });

  const storagePath = verifiedPath ? parseStoragePath(verifiedPath) : null;
  if (!storagePath) {
    return new NextResponse("ลิงก์รูปสลิปไม่ถูกต้องหรือหมดอายุแล้ว", { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(storagePath.bucket)
    .download(storagePath.objectPath);

  if (error || !data) {
    return new NextResponse("ไม่พบรูปสลิป", { status: 404 });
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const jpeg = await sharp(buffer, {
    failOn: "error",
    limitInputPixels: 36_000_000
  })
    .rotate()
    .resize({
      width: 1024,
      height: 1024,
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({ quality: 82 })
    .toBuffer();

  return new NextResponse(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=300"
    }
  });
}
