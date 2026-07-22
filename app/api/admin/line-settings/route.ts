import { NextResponse } from "next/server";
import { readPublicLineSettings, saveLineSettings } from "@/lib/line-settings";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await readPublicLineSettings());
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as {
      channelAccessToken?: string;
      adminGroupId?: string;
    };

    if (!body.adminGroupId?.trim()) {
      return NextResponse.json({ error: "กรุณากรอก LINE Group ID" }, { status: 400 });
    }

    const settings = await saveLineSettings({
      channelAccessToken: body.channelAccessToken,
      adminGroupId: body.adminGroupId
    });

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "บันทึกการตั้งค่า LINE ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
