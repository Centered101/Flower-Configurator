import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken, type AdminRole } from "@/lib/admin-auth";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

function normalizeRole(role?: string): AdminRole {
  if (role === "owner" || role === "superadmin" || role === "admin") return role;
  return "admin";
}

export async function getAdminSessionWithDatabaseRole(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const cookieStore = await cookies();
  const session = await verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
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
