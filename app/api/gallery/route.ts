import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("gallery_items")
      .select("id, title, image_url, image_path, image_width, image_height, image_format, image_size, flower, color, color_slug, bouquet_size, price, production_score, configuration_json")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []).map((item) => mapGalleryItem(item as GalleryRow)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "โหลดผลงานไม่สำเร็จ" }, { status: 500 });
  }
}
