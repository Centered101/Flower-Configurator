import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminProduct } from "@/lib/admin-data";

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

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, base_price, production_score, image_url, image_path, image_width, image_height, image_format, image_size")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []).map((item) => mapProduct(item as ProductRow)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "โหลดสินค้าไม่สำเร็จ" }, { status: 500 });
  }
}
