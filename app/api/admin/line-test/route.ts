import { NextResponse } from "next/server";
import { getAdminSessionWithDatabaseRole } from "@/lib/admin-session";
import { BRAND_NAME } from "@/lib/brand";
import { sendLineGroupMessage } from "@/lib/line-notification";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = createSupabaseAdminClient();
    const session = await getAdminSessionWithDatabaseRole(supabase);
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบผู้ดูแลร้าน" }, { status: 403 });
    }

    await sendLineGroupMessage([
      `ทดสอบแจ้งเตือนจาก ${BRAND_NAME}`,
      "",
      "หากเห็นข้อความนี้ แสดงว่าผู้รับ LINE เชื่อมต่อสำเร็จ"
    ].join("\n"));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "ทดสอบส่ง LINE ไม่สำเร็จ"
      },
      { status: 200 }
    );
  }
}
