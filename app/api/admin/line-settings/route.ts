import { NextResponse } from "next/server";
import { getAdminSessionWithDatabaseRole } from "@/lib/admin-session";
import { readPublicLineSettings, saveLineSettings } from "@/lib/line-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = createSupabaseAdminClient();
  const session = await getAdminSessionWithDatabaseRole(supabase);

  if (!session) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบผู้ดูแลร้าน" }, { status: 403 });
  }

  return null;
}

export async function GET() {
  const response = await requireAdmin();
  if (response) return response;

  return NextResponse.json(await readPublicLineSettings());
}

export async function PUT(request: Request) {
  try {
    const response = await requireAdmin();
    if (response) return response;

    const body = await request.json() as {
      channelAccessToken?: string;
      adminGroupId?: string;
    };

    if (!body.adminGroupId?.trim()) {
      return NextResponse.json({ error: "กรุณากรอกรหัสผู้รับ LINE" }, { status: 400 });
    }

    const settings = await saveLineSettings({
      channelAccessToken: body.channelAccessToken,
      adminGroupId: body.adminGroupId
    });

    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "บันทึกการตั้งค่า LINE ไม่สำเร็จ";
    const status = [
      "LINE",
      "token",
      "Group ID",
      "ผู้รับ",
      "สลับช่อง",
      "กรุณา"
    ].some((text) => message.includes(text)) ? 400 : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
