import { NextResponse } from "next/server";
import { getAdminSessionWithDatabaseRole } from "@/lib/admin-session";
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

function isUuid(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function createProductRow(payload: Partial<AdminProduct>) {
  const id = isUuid(payload.id) ? payload.id as string : crypto.randomUUID();

  return {
    id,
    slug: `product-${id}`,
    name: payload.name?.trim() ?? "",
    description: payload.description?.trim() ?? "",
    base_price: Number(payload.basePrice ?? 0),
    base_quantity: 1,
    production_score: Math.max(1, Number(payload.productionScore ?? 1)),
    production_days: 1,
    image_url: payload.image?.url ?? null,
    image_path: payload.image?.path ?? null,
    image_width: payload.image?.width ?? null,
    image_height: payload.image?.height ?? null,
    image_format: payload.image?.format ?? null,
    image_size: payload.image?.size ?? null,
    is_active: true
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
    .from("products")
    .select("id, name, description, base_price, production_score, image_url, image_path, image_width, image_height, image_format, image_size")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map((item) => mapProduct(item as ProductRow)));
}

export async function POST(request: Request) {
  const { supabase, response } = await requireAdmin();
  if (response) return response;

  const payload = await request.json() as Partial<AdminProduct>;
  if (!payload.name?.trim()) {
    return NextResponse.json({ error: "กรุณาใส่ชื่อสินค้า" }, { status: 400 });
  }

  const row = createProductRow(payload);
  const { data, error } = await supabase
    .from("products")
    .upsert(row, { onConflict: "id" })
    .select("id, name, description, base_price, production_score, image_url, image_path, image_width, image_height, image_format, image_size")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapProduct(data as ProductRow));
}

export async function DELETE(request: Request) {
  const { supabase, response } = await requireAdmin();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ไม่พบรหัสสินค้าที่ต้องการลบ" }, { status: 400 });
  }

  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
