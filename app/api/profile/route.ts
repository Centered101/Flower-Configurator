import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfilePayload = {
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  lineId?: unknown;
  address?: unknown;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  line_id: string | null;
  address: string | null;
  updated_at: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function profileResponse(row: ProfileRow | null, fallback: {
  id: string;
  email?: string;
  metadata: Record<string, unknown>;
}) {
  const firstName = row?.first_name ?? text(fallback.metadata.first_name);
  const lastName = row?.last_name ?? text(fallback.metadata.last_name);
  const displayName = row?.display_name || text(fallback.metadata.display_name) || [firstName, lastName].filter(Boolean).join(" ");
  const lineId = row?.line_id || text(fallback.metadata.line_id) || text(fallback.metadata.lineId);

  return {
    id: fallback.id,
    email: fallback.email ?? "",
    displayName: displayName || fallback.email?.split("@")[0] || "ลูกค้า",
    firstName,
    lastName,
    phone: row?.phone ?? text(fallback.metadata.phone),
    lineId,
    address: row?.address ?? text(fallback.metadata.address),
    updatedAt: row?.updated_at ?? ""
  };
}

async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนดูโปรไฟล์" }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, display_name, first_name, last_name, phone, line_id, address, updated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json(profileResponse((data ?? null) as ProfileRow | null, {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata ?? {}
    }), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "โหลดโปรไฟล์ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนบันทึกโปรไฟล์" }, { status: 401 });

    const payload = await request.json().catch(() => ({})) as ProfilePayload;
    const firstName = text(payload.firstName);
    const lastName = text(payload.lastName);
    const phone = text(payload.phone);
    const lineId = text(payload.lineId);
    const address = text(payload.address);
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || user.email?.split("@")[0] || "ลูกค้า";
    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: displayName,
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
        line_id: lineId || null,
        address: address || null,
        role: "customer",
        updated_at: new Date().toISOString()
      }, { onConflict: "id" })
      .select("id, display_name, first_name, last_name, phone, line_id, address, updated_at")
      .single();

    if (error) throw error;

    const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata ?? {}),
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        phone,
        line_id: lineId,
        lineId,
        address
      }
    });

    if (metadataError) throw metadataError;

    return NextResponse.json(profileResponse(data as ProfileRow, {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata ?? {}
    }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "บันทึกโปรไฟล์ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
