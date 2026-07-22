import { NextResponse } from "next/server";
import { buildAdminOrderFlexMessage, sendLineGroupFlexMessage } from "@/lib/line-notification";
import type { CustomerOrder } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
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
