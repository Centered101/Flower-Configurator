import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, verifyAdminSessionToken, type AdminRole } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function canManageAdmins(role: AdminRole) {
  return role === "owner" || role === "superadmin";
}

function canViewAdmins(role: AdminRole) {
  return role === "owner" || role === "superadmin" || role === "admin";
}

function normalizeRole(role?: string): AdminRole {
  if (role === "owner" || role === "superadmin" || role === "admin") return role;
  return "admin";
}

async function getAdminSession() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

async function getAdminSessionWithDatabaseRole(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const session = await getAdminSession();
  if (!session) return null;

  try {
    const { data } = await supabase
      .from("admin_users")
      .select("id, username, role, is_active")
      .eq("username", session.username)
      .maybeSingle();

    if (data?.is_active === false) return null;
    return {
      ...session,
      id: typeof data?.id === "string" ? data.id : undefined,
      username: typeof data?.username === "string" ? data.username : session.username,
      role: normalizeRole(data?.role ?? session.role)
    };
  } catch {
    return {
      ...session,
      id: undefined,
      role: normalizeRole(session.role)
    };
  }
}

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const session = await getAdminSessionWithDatabaseRole(supabase);
  if (!session || !canViewAdmins(session.role)) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบผู้ดูแลร้าน" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, username, display_name, role, is_active, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const payload = await request.json() as {
    id?: string;
    username?: string;
    displayName?: string;
    role?: string;
    password?: string;
    isActive?: boolean;
  };

  const supabase = createSupabaseAdminClient();
  const session = await getAdminSessionWithDatabaseRole(supabase);
  const isSelfEdit = Boolean(payload.id && session?.id && payload.id === session.id);

  if (!session || (!canManageAdmins(session.role) && !isSelfEdit)) {
    return NextResponse.json({ error: "เฉพาะ owner หรือ superadmin เท่านั้นที่จัดการผู้ดูแลได้" }, { status: 403 });
  }

  const role = isSelfEdit && !canManageAdmins(session.role) ? session.role : normalizeRole(payload.role);
  if (role === "owner" && session.role !== "owner") {
    return NextResponse.json({ error: "เฉพาะ owner เท่านั้นที่ตั้งสิทธิ์ owner ได้" }, { status: 403 });
  }

  if (!payload.username?.trim()) {
    return NextResponse.json({ error: "กรุณาใส่ชื่อผู้ใช้" }, { status: 400 });
  }

  if (!payload.id && !payload.password) {
    return NextResponse.json({ error: "กรุณาใส่รหัสผ่านสำหรับผู้ดูแลใหม่" }, { status: 400 });
  }

  if (isSelfEdit && payload.isActive === false) {
    return NextResponse.json({ error: "ไม่สามารถปิดใช้งานบัญชีตัวเองได้" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("upsert_admin_user", {
    p_id: payload.id || null,
    p_username: payload.username.trim(),
    p_display_name: payload.displayName?.trim() || payload.username.trim(),
    p_role: role,
    p_password: payload.password || null,
    p_is_active: isSelfEdit ? true : payload.isActive ?? true
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json(data);
  const savedUser = Array.isArray(data) ? data[0] as { username?: string; role?: AdminRole } | undefined : undefined;

  if (isSelfEdit && savedUser?.username) {
    response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSessionToken(savedUser.username, normalizeRole(savedUser.role ?? role)), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12
    });
  }

  return response;
}

export async function DELETE(request: Request) {
  const supabase = createSupabaseAdminClient();
  const session = await getAdminSessionWithDatabaseRole(supabase);

  if (!session || !canManageAdmins(session.role)) {
    return NextResponse.json({ error: "เฉพาะ owner หรือ superadmin เท่านั้นที่ลบผู้ดูแลได้" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ไม่พบรหัสผู้ดูแลที่ต้องการลบ" }, { status: 400 });
  }

  if (session.id === id) {
    return NextResponse.json({ error: "ไม่สามารถลบบัญชีตัวเองได้" }, { status: 400 });
  }

  const { data: target, error: targetError } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }

  if (!target) {
    return NextResponse.json({ error: "ไม่พบผู้ดูแลที่ต้องการลบ" }, { status: 404 });
  }

  if (target.role === "owner" && session.role !== "owner") {
    return NextResponse.json({ error: "เฉพาะ owner เท่านั้นที่ลบบัญชี owner ได้" }, { status: 403 });
  }

  const { error } = await supabase
    .from("admin_users")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
