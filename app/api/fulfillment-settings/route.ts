import { NextResponse } from "next/server";
import { readFulfillmentSettings } from "@/lib/fulfillment-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readFulfillmentSettings());
}
