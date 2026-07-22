import { NextResponse } from "next/server";
import { getAdminSessionWithDatabaseRole } from "@/lib/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminGalleryItem } from "@/lib/admin-data";

type GalleryRow = {
  id: string;
  title: string;
  image_url: string | null;
  image_path?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  image_format?: string | null;
  image_size?: number | null;
  flower?: string | null;
  color?: string | null;
  color_slug?: string | null;
  bouquet_size?: string | null;
  price: number | string | null;
  production_score?: number | string | null;
  configuration_json?: Record<string, unknown> | null;
};

function mapGalleryItem(row: GalleryRow): AdminGalleryItem {
  const metadata = row.configuration_json ?? {};
  const hasImage = Boolean(row.image_url);

  return {
    id: row.id,
    title: row.title,
    flower: row.flower ?? (typeof metadata.flower === "string" ? metadata.flower : ""),
    color: row.color ?? row.color_slug ?? (typeof metadata.color === "string" ? metadata.color : ""),
    size: row.bouquet_size ?? (typeof metadata.size === "string" ? metadata.size : ""),
    price: Number(row.price ?? 0),
    productionScore: Math.max(1, Number(row.production_score ?? metadata.productionScore ?? 1)),
    image: hasImage ? {
      url: row.image_url ?? "",
      path: row.image_path ?? (typeof metadata.imagePath === "string" ? metadata.imagePath : row.image_url ?? ""),
      width: Number(row.image_width ?? metadata.imageWidth ?? 0),
      height: Number(row.image_height ?? metadata.imageHeight ?? 0),
      format: row.image_format === "avif" ? "avif" : "webp",
      size: Number(row.image_size ?? metadata.imageSize ?? 0)
    } : undefined
  };
}

function isUuid(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function createGalleryRow(payload: Partial<AdminGalleryItem>) {
  const id = isUuid(payload.id) ? payload.id as string : crypto.randomUUID();
  const flower = payload.flower?.trim() ?? "";
  const color = payload.color?.trim() ?? "";
  const size = payload.size?.trim() ?? "";
  const productionScore = Math.max(1, Number(payload.productionScore ?? 1));

  return {
    id,
    title: payload.title?.trim() ?? "",
    image_url: payload.image?.url ?? null,
    image_path: payload.image?.path ?? null,
    image_width: payload.image?.width ?? null,
    image_height: payload.image?.height ?? null,
    image_format: payload.image?.format ?? null,
    image_size: payload.image?.size ?? null,
    flower,
    color,
    color_slug: color,
    bouquet_size: size,
    price: Number(payload.price ?? 0),
    production_score: productionScore,
    configuration_json: {
      flower,
      color,
      size,
      productionScore,
      imagePath: payload.image?.path,
      imageWidth: payload.image?.width,
      imageHeight: payload.image?.height,
      imageSize: payload.image?.size
    },
    is_public: true
  };
}

async function requireAdmin() {
  const supabase = createSupabaseAdminClient();
  const session = await getAdminSessionWithDatabaseRole(supabase);

  if (!session) {
    return { supabase, response: NextResponse.json({ error: "กรุณาเข้าสู่ระบบผู้ดูแลร้าน" }, { status: 403 }) };
  }

  return { supabase, response: null };
}

export async function GET() {
  const { supabase, response } = await requireAdmin();
  if (response) return response;

  const { data, error } = await supabase
    .from("gallery_items")
    .select("id, title, image_url, image_path, image_width, image_height, image_format, image_size, flower, color, color_slug, bouquet_size, price, production_score, configuration_json")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map((item) => mapGalleryItem(item as GalleryRow)));
}

export async function POST(request: Request) {
  const { supabase, response } = await requireAdmin();
  if (response) return response;

  const payload = await request.json() as Partial<AdminGalleryItem>;
  if (!payload.title?.trim()) {
    return NextResponse.json({ error: "กรุณาใส่ชื่อผลงาน" }, { status: 400 });
  }

  const row = createGalleryRow(payload);
  const { data, error } = await supabase
    .from("gallery_items")
    .upsert(row, { onConflict: "id" })
    .select("id, title, image_url, image_path, image_width, image_height, image_format, image_size, flower, color, color_slug, bouquet_size, price, production_score, configuration_json")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapGalleryItem(data as GalleryRow));
}

export async function DELETE(request: Request) {
  const { supabase, response } = await requireAdmin();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ไม่พบรหัสผลงานที่ต้องการลบ" }, { status: 400 });
  }

  const { error } = await supabase
    .from("gallery_items")
    .update({ is_public: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
