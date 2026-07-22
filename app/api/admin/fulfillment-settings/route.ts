import { NextResponse } from "next/server";
import { readFulfillmentSettings, saveFulfillmentSettings } from "@/lib/fulfillment-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readFulfillmentSettings());
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const settings = await saveFulfillmentSettings(body);

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "บันทึกวิธีรับสินค้าไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
