import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

const ADMIN_LOGIN_PATH = "/admin/login";

function getSafeRedirectPath(pathname: string, search: string) {
  const nextPath = `${pathname}${search}`;
  return nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/admin";
}

function isProtectedAdminApi(pathname: string, method: string) {
  if (pathname === "/api/admin/login") return false;
  if (pathname.startsWith("/api/admin/")) return true;
  if (pathname === "/api/configurator-catalog" && method !== "GET") return true;
  return false;
}

export async function updateSupabaseSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminPage = pathname.startsWith("/admin") && pathname !== ADMIN_LOGIN_PATH;
  const isAdminLoginPage = pathname === ADMIN_LOGIN_PATH;
  const isProtectedApi = isProtectedAdminApi(pathname, request.method);
  const adminSession = await verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);

  if (!adminSession && (isAdminPage || isProtectedApi)) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบผู้ดูแลร้าน" }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ADMIN_LOGIN_PATH;
    loginUrl.searchParams.set("redirect", getSafeRedirectPath(pathname, request.nextUrl.search));
    return NextResponse.redirect(loginUrl);
  }

  if (adminSession && isAdminLoginPage) {
    const redirectTo = request.nextUrl.searchParams.get("redirect");
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = redirectTo?.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/admin";
    adminUrl.search = "";
    return NextResponse.redirect(adminUrl);
  }

  return NextResponse.next({ request });
}
