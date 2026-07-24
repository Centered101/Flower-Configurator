import type { AdminGalleryItem, AdminProduct } from "@/lib/admin-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  base_price: number | string | null;
  production_score: number | string | null;
  image_url?: string | null;
  image_path?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  image_format?: string | null;
  image_size?: number | null;
};

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

function mapProduct(row: ProductRow): AdminProduct {
  const hasImage = Boolean(row.image_url);

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    basePrice: Number(row.base_price ?? 0),
    productionScore: Math.max(1, Number(row.production_score ?? 1)),
    image: hasImage ? {
      url: row.image_url ?? "",
      path: row.image_path ?? row.image_url ?? "",
      width: Number(row.image_width ?? 0),
      height: Number(row.image_height ?? 0),
      format: row.image_format === "avif" ? "avif" : "webp",
      size: Number(row.image_size ?? 0)
    } : undefined
  };
}

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

export async function fetchHomeProducts(limit = 8): Promise<AdminProduct[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, base_price, production_score, image_url, image_path, image_width, image_height, image_format, image_size")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data ?? []).map((item) => mapProduct(item as ProductRow));
  } catch {
    return [];
  }
}

export async function fetchHomeGalleryItems(limit = 8): Promise<AdminGalleryItem[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("gallery_items")
      .select("id, title, image_url, image_path, image_width, image_height, image_format, image_size, flower, color, color_slug, bouquet_size, price, production_score, configuration_json")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data ?? []).map((item) => mapGalleryItem(item as GalleryRow));
  } catch {
    return [];
  }
}
