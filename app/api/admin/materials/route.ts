import { NextResponse } from "next/server";
import { getAdminSessionWithDatabaseRole } from "@/lib/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminMaterial } from "@/lib/admin-data";

type MaterialRow = {
  id: string;
  name: string;
  color: string | null;
  quantity: number | string | null;
  unit: string | null;
  alert_threshold: number | string | null;
  unit_cost: number | string | null;
  supplier: string | null;
  status: string | null;
};

function toNumber(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function mapMaterial(row: MaterialRow): AdminMaterial {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? "",
    stock: toNumber(row.quantity),
    unit: row.unit ?? "ชิ้น",
    alertAt: toNumber(row.alert_threshold),
    cost: toNumber(row.unit_cost),
    supplier: row.supplier ?? "",
    status: row.status ?? "active"
  };
}

function isUuid(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
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
    .from("materials")
    .select("id, name, color, quantity, unit, alert_threshold, unit_cost, supplier, status")
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map((item) => mapMaterial(item as MaterialRow)));
}

export async function POST(request: Request) {
  const { supabase, response } = await requireAdmin();
  if (response) return response;

  const payload = await request.json() as Partial<AdminMaterial>;
  if (!payload.name?.trim()) {
    return NextResponse.json({ error: "กรุณาใส่ชื่อวัสดุ" }, { status: 400 });
  }

  const id = isUuid(payload.id) ? payload.id as string : crypto.randomUUID();
  const row = {
    id,
    name: payload.name.trim(),
    color: payload.color?.trim() ?? "",
    quantity: toNumber(payload.stock),
    unit: payload.unit?.trim() || "ชิ้น",
    alert_threshold: toNumber(payload.alertAt),
    unit_cost: toNumber(payload.cost),
    supplier: payload.supplier?.trim() ?? "",
    status: payload.status?.trim() || "active",
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("materials")
    .upsert(row, { onConflict: "id" })
    .select("id, name, color, quantity, unit, alert_threshold, unit_cost, supplier, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapMaterial(data as MaterialRow));
}

export async function DELETE(request: Request) {
  const { supabase, response } = await requireAdmin();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ไม่พบรหัสวัสดุที่ต้องการลบ" }, { status: 400 });
  }

  const { error } = await supabase
    .from("materials")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
