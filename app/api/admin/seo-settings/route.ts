import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { readSeoSettings, saveSeoSettings } from "@/lib/seo-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readSeoSettings());
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const settings = await saveSeoSettings(body);

    revalidatePath("/", "layout");

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "บันทึก Meta Tags ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
