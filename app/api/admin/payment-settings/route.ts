import { NextResponse } from "next/server";
import { readPaymentSettings, savePaymentSettings } from "@/lib/payment-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readPaymentSettings());
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as {
      promptPayId?: string;
      accountName?: string;
      qrImageUrl?: string;
    };

    const settings = await savePaymentSettings({
      promptPayId: body.promptPayId ?? "",
      accountName: body.accountName,
      qrImageUrl: body.qrImageUrl
    });

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "บันทึกการตั้งค่า PromptPay ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
