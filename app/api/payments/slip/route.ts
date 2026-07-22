import { NextResponse } from "next/server";
import { processAndStoreImage } from "@/lib/image-processing";
import { decodeSlipQrPayload, type SlipVerificationResult, verifySlipPayload } from "@/lib/slip-verification";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/request-auth";
import { readPaymentSettings } from "@/lib/payment-settings";

export const runtime = "nodejs";

type OrderPaymentRow = {
  id: string;
  order_number: string;
  auth_user_id: string | null;
  deposit_amount: number | string;
  payment_status: string;
};

function normalizeStoragePart(value: string) {
  return value.replace(/[^a-z0-9_-]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

async function verifyWithProvider(input: {
  qrPayload: string;
  orderNumber: string;
  expectedAmount: number;
  promptPayId: string;
}) {
  const endpoint = process.env.SLIP_VERIFY_API_URL?.trim();
  if (!endpoint || !input.qrPayload) return null;

  const apiKey = process.env.SLIP_VERIFY_API_KEY?.trim();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({
      qrPayload: input.qrPayload,
      orderNumber: input.orderNumber,
      expectedAmount: input.expectedAmount,
      promptPayId: input.promptPayId
    })
  });

  const data = await response.json().catch(() => null) as {
    valid?: boolean;
    amount?: number | string;
    receiverMatched?: boolean;
    message?: string;
    transactionRef?: string;
  } | null;

  if (!response.ok) {
    return {
      status: "awaiting_review",
      message: data?.message ?? "ผู้ให้บริการตรวจสลิปตอบกลับไม่สำเร็จ กรุณาให้ผู้ดูแลร้านตรวจสอบ",
      qrPayload: input.qrPayload,
      parsedAmount: undefined,
      receiverTarget: data?.transactionRef,
      receiverMatched: null
    } satisfies SlipVerificationResult;
  }

  const amount = Number(data?.amount);
  const amountMatched = Number.isFinite(amount) && Math.abs(Number(amount.toFixed(2)) - Number(input.expectedAmount.toFixed(2))) <= 0.01;
  const receiverMatched = data?.receiverMatched !== false;
  const isPaid = data?.valid === true && amountMatched && receiverMatched;

  return {
    status: isPaid ? "paid" : "failed",
    message: data?.message ?? (isPaid ? "ตรวจสลิปผ่านผู้ให้บริการสำเร็จ" : "สลิปไม่ตรงกับยอดหรือบัญชีรับเงิน"),
    qrPayload: input.qrPayload,
    parsedAmount: Number.isFinite(amount) ? amount : undefined,
    receiverTarget: data?.transactionRef,
    receiverMatched
  } satisfies SlipVerificationResult;
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนอัปโหลดสลิป" }, { status: 401 });
    }

    const formData = await request.formData();
    const orderNumber = String(formData.get("orderNumber") ?? "").trim();
    const file = formData.get("file");

    if (!orderNumber) {
      return NextResponse.json({ error: "ไม่พบเลขคำสั่งซื้อ" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "กรุณาอัปโหลดรูปสลิป" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, auth_user_id, deposit_amount, payment_status")
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

    if (orderRow.payment_status === "paid") {
      return NextResponse.json({ error: "คำสั่งซื้อนี้ชำระมัดจำแล้ว" }, { status: 409 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const expectedAmount = Number(orderRow.deposit_amount);
    const paymentSettings = await readPaymentSettings();
    const promptPayId = paymentSettings.promptPayId;
    const qrPayload = await decodeSlipQrPayload(buffer).catch(() => "");
    const providerVerification = await verifyWithProvider({ qrPayload, orderNumber, expectedAmount, promptPayId });
    const verification = providerVerification ?? verifySlipPayload({
      payload: qrPayload,
      expectedAmount,
      promptPayId
    });
    const storedSlip = await processAndStoreImage({
      buffer,
      mimeType: file.type,
      originalName: file.name,
      bucket: "payment-slips",
      folder: `${normalizeStoragePart(user.id)}/${normalizeStoragePart(orderNumber)}`
    });
    const paymentStatus = verification.status === "paid"
      ? "paid"
      : verification.status === "failed" ? "failed" : "awaiting_slip_review";
    const paymentRecordStatus = verification.status === "paid"
      ? "paid"
      : verification.status === "failed" ? "failed" : "awaiting_review";
    const now = new Date().toISOString();

    const { error: paymentError } = await supabase.from("payment_records").insert({
      order_id: orderRow.id,
      payment_method: "promptpay",
      amount: verification.parsedAmount ?? expectedAmount,
      payment_type: "deposit",
      slip_url: storedSlip.url,
      slip_path: storedSlip.path,
      status: paymentRecordStatus,
      verification_message: verification.message,
      verified_amount: verification.parsedAmount ?? null,
      qr_payload: verification.qrPayload ?? null,
      receiver_target: verification.receiverTarget ?? null,
      receiver_matched: verification.receiverMatched,
      metadata: {
        image: storedSlip,
        expectedAmount,
        uploadedBy: user.id
      }
    });

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: paymentStatus,
        order_status: verification.status === "paid" ? "design_confirmed" : "awaiting_payment",
        updated_at: now
      })
      .eq("id", orderRow.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      paymentStatus,
      slip: storedSlip,
      verification: {
        status: paymentRecordStatus,
        message: verification.message,
        parsedAmount: verification.parsedAmount,
        receiverMatched: verification.receiverMatched
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ตรวจสอบสลิปไม่สำเร็จ" },
      { status: 400 }
    );
  }
}
