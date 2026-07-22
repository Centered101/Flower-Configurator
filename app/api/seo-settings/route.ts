import { NextResponse } from "next/server";
import { readSeoSettings } from "@/lib/seo-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readSeoSettings());
}
