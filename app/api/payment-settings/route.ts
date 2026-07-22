import { NextResponse } from "next/server";
import { readPaymentSettings } from "@/lib/payment-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readPaymentSettings());
}
