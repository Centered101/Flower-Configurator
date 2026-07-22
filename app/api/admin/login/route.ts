import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, type AdminRole } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isFallbackAdmin(username: string, password: string) {
  const fallbackUsername = process.env.ADMIN_FALLBACK_USERNAME;
  const fallbackPassword = process.env.ADMIN_FALLBACK_PASSWORD;

  return Boolean(
    fallbackUsername &&
    fallbackPassword &&
    username === fallbackUsername &&
    password === fallbackPassword
  );
}

function getFallbackAdminRole(): AdminRole {
  const role = process.env.ADMIN_FALLBACK_ROLE;
  if (role === "owner" || role === "superadmin" || role === "admin") return role;
  return "owner";
}

async function createLoginResponse(username: string, role: AdminRole) {
  const response = NextResponse.json({ ok: true, username, role });
  response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSessionToken(username, role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  return response;
}

export async function POST(request: Request) {
  const { username, password } = await request.json() as { username?: string; password?: string };
  const normalizedUsername = username?.trim() ?? "";

  if (!normalizedUsername || !password) {
    return NextResponse.json({ error: "กรุณาใส่ชื่อผู้ใช้และรหัสผ่าน" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("verify_admin_login", {
      p_username: normalizedUsername,
      p_password: password
    });

    if (error) {
      throw error;
    }

    const admin = Array.isArray(data) ? data[0] : null;
    if (admin) {
      return createLoginResponse(admin.username, admin.role ?? "admin");
    }
  } catch {
    if (isFallbackAdmin(normalizedUsername, password)) {
      return createLoginResponse(normalizedUsername, getFallbackAdminRole());
    }

    return NextResponse.json({ error: "ยังเชื่อมต่อฐานข้อมูลผู้ดูแลไม่ได้ และข้อมูลสำรองไม่ถูกต้อง" }, { status: 503 });
  }

  if (isFallbackAdmin(normalizedUsername, password)) {
    return createLoginResponse(normalizedUsername, getFallbackAdminRole());
  }

  return NextResponse.json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
}
