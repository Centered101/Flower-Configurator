import { NextResponse } from "next/server";
import { getAdminSessionWithDatabaseRole } from "@/lib/admin-session";
import { buildAdminOrderFlexMessage, sendLineGroupFlexMessage } from "@/lib/line-notification";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CustomerOrder } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseAdminClient();
    const session = await getAdminSessionWithDatabaseRole(supabase);
    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบผู้ดูแลร้าน" }, { status: 403 });
    }

    const order = await request.json() as CustomerOrder;

    if (!order?.orderNumber || !order?.customerName || !order?.phone) {
      return NextResponse.json({ error: "ข้อมูลคำสั่งซื้อไม่ครบ" }, { status: 400 });
    }

    await sendLineGroupFlexMessage(buildAdminOrderFlexMessage(order));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ส่งแจ้งเตือน LINE ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
