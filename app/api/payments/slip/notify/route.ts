import { NextResponse } from "next/server";
import { buildSlipUploadedFlexMessage, sendLineGroupFlexMessage } from "@/lib/line-notification";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/request-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderPaymentRow = {
  id: string;
  order_number: string;
  auth_user_id: string | null;
  customer_name: string;
  phone: string;
  line_id: string | null;
  deposit_amount: number | string;
};

type PaymentRecordRow = {
  id: string;
  amount: number | string;
  status: "pending" | "awaiting_review" | "paid" | "failed" | "refunded";
  slip_url: string | null;
  slip_path: string | null;
  verification_message: string | null;
  metadata: Record<string, unknown> | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนส่งสลิปให้ร้านตรวจ" }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as { orderNumber?: string } | null;
    const orderNumber = body?.orderNumber?.trim();
    if (!orderNumber) {
      return NextResponse.json({ error: "ไม่พบเลขคำสั่งซื้อ" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, auth_user_id, customer_name, phone, line_id, deposit_amount")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: "ไม่พบคำสั่งซื้อนี้ในระบบ" }, { status: 404 });
    }

    const orderRow = order as OrderPaymentRow;
    if (orderRow.auth_user_id !== user.id) {
      return NextResponse.json({ error: "คำสั่งซื้อนี้ไม่ใช่ของบัญชีที่เข้าสู่ระบบ" }, { status: 403 });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payment_records")
      .select("id, amount, status, slip_url, slip_path, verification_message, metadata")
      .eq("order_id", orderRow.id)
      .not("slip_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    if (!payment) {
      return NextResponse.json({ error: "กรุณาอัปโหลดสลิปก่อนส่งให้ร้านตรวจ" }, { status: 400 });
    }

    const paymentRow = payment as PaymentRecordRow;
    const metadata = isObject(paymentRow.metadata) ? paymentRow.metadata : {};
    if (typeof metadata.lineNotifiedAt === "string") {
      return NextResponse.json({
        ok: true,
        skipped: true,
        notifiedAt: metadata.lineNotifiedAt
      });
    }

    await sendLineGroupFlexMessage(buildSlipUploadedFlexMessage({
      orderNumber: orderRow.order_number,
      customerName: orderRow.customer_name,
      phone: orderRow.phone,
      lineId: orderRow.line_id ?? "",
      amount: Number(paymentRow.amount),
      expectedAmount: Number(orderRow.deposit_amount),
      paymentStatus: paymentRow.status === "paid" || paymentRow.status === "failed" ? paymentRow.status : "awaiting_review",
      verificationMessage: paymentRow.verification_message ?? "รอผู้ดูแลร้านตรวจสอบสลิป",
      slipUrl: paymentRow.slip_url ?? "",
      slipPath: paymentRow.slip_path ?? ""
    }));

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("payment_records")
      .update({
        metadata: {
          ...metadata,
          lineNotifiedAt: now,
          lineNotifiedOrderNumber: orderRow.order_number
        }
      })
      .eq("id", paymentRow.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, skipped: false, notifiedAt: now });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ส่งสลิปให้ร้านตรวจไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
