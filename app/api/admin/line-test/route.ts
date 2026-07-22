import { NextResponse } from "next/server";
import { BRAND_NAME } from "@/lib/brand";
import { sendLineGroupMessage } from "@/lib/line-notification";

export const runtime = "nodejs";

export async function POST() {
  try {
    await sendLineGroupMessage([
      `ทดสอบแจ้งเตือนจาก ${BRAND_NAME}`,
      "",
      "หากเห็นข้อความนี้ แสดงว่า LINE Group เชื่อมต่อสำเร็จ"
    ].join("\n"));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ทดสอบส่ง LINE ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
