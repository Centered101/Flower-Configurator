import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const cookieStore = await cookies();
  const session = await verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!session) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบผู้ดูแลร้าน" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("admin_users")
      .select("id, username, display_name, role")
      .eq("username", session.username)
      .maybeSingle();

    return NextResponse.json({
      id: data?.id,
      username: session.username,
      displayName: data?.display_name || session.username,
      role: data?.role || session.role
    });
  } catch {
    return NextResponse.json({
      username: session.username,
      displayName: session.username,
      role: session.role
    });
  }
}
