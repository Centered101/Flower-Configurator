import { NextResponse } from "next/server";
import { getAdminSessionWithDatabaseRole } from "@/lib/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DesignOptionMaterialLink } from "@/lib/admin-data";

const optionTypes: DesignOptionMaterialLink["optionType"][] = [
  "product_type",
  "flower_type",
  "color",
  "stem",
  "wrapping",
  "ribbon",
  "decoration"
];

type LinkRow = {
  id: string;
  option_type: DesignOptionMaterialLink["optionType"];
  option_id: string;
  material_id: string;
  quantity_per_unit: number | string | null;
};

function toNumber(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 1;
}

function mapLink(row: LinkRow): DesignOptionMaterialLink {
  return {
    id: row.id,
    optionType: row.option_type,
    optionId: row.option_id,
    materialId: row.material_id,
    quantityPerUnit: toNumber(row.quantity_per_unit)
  };
}

function normalizeLink(value: Partial<DesignOptionMaterialLink>) {
  const optionType = value.optionType;
  const optionId = value.optionId?.trim();
  const materialId = value.materialId?.trim();

  if (!optionType || !optionTypes.includes(optionType) || !optionId || !materialId) return null;

  return {
    option_type: optionType,
    option_id: optionId,
    material_id: materialId,
    quantity_per_unit: Math.max(0, toNumber(value.quantityPerUnit))
  };
}

function isNormalizedLink(value: ReturnType<typeof normalizeLink>): value is NonNullable<ReturnType<typeof normalizeLink>> {
  return Boolean(value);
}

function isMissingOptionalSchema(error: { message?: string } | null | undefined) {
  const message = (error?.message ?? "").toLowerCase();
  return message.includes("schema cache") || message.includes("does not exist") || message.includes("could not find");
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
    .from("design_option_materials")
    .select("id, option_type, option_id, material_id, quantity_per_unit")
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingOptionalSchema(error)) {
      return NextResponse.json([], { headers: { "x-schema-ready": "false" } });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map((item) => mapLink(item as LinkRow)), { headers: { "x-schema-ready": "true" } });
}

export async function PUT(request: Request) {
  const { supabase, response } = await requireAdmin();
  if (response) return response;

  const payload = await request.json() as Partial<DesignOptionMaterialLink>[];
  const rows = Array.isArray(payload)
    ? payload.map((item) => normalizeLink(item)).filter(isNormalizedLink)
    : [];

  const cleanup = await supabase
    .from("design_option_materials")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (cleanup.error) {
    if (isMissingOptionalSchema(cleanup.error)) {
      return NextResponse.json({ error: "ฐานข้อมูลยังไม่มีตาราง design_option_materials กรุณารัน supabase/schema.sql ก่อนผูกวัสดุกับตัวเลือก" }, { status: 400 });
    }

    return NextResponse.json({ error: cleanup.error.message }, { status: 500 });
  }

  if (!rows.length) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("design_option_materials")
    .insert(rows)
    .select("id, option_type, option_id, material_id, quantity_per_unit");

  if (error) {
    if (isMissingOptionalSchema(error)) {
      return NextResponse.json({ error: "ฐานข้อมูลยังไม่มีตาราง design_option_materials กรุณารัน supabase/schema.sql ก่อนผูกวัสดุกับตัวเลือก" }, { status: 400 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map((item) => mapLink(item as LinkRow)));
}
