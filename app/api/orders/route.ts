import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserFromRequest } from "@/lib/supabase/request-auth";
import type { CustomerOrder } from "@/lib/types";

export const runtime = "nodejs";

function toDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("วันที่รับสินค้าไม่ถูกต้อง");
  }
  return value;
}

function toTime(value: string) {
  if (value === "จัดส่ง") return "00:00";
  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw new Error("เวลารับสินค้าไม่ถูกต้อง");
  }
  return value;
}

function assertOrderPayload(order: CustomerOrder) {
  if (!order?.id || !order.orderNumber || !order.customerName || !order.phone || !order.lineId) {
    throw new Error("ข้อมูลคำสั่งซื้อไม่ครบ");
  }

  if (!order.authUserId) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนสั่งซื้อ" }, { status: 401 });
    }

    const order = await request.json() as CustomerOrder;
    assertOrderPayload(order);

    if (order.authUserId !== user.id) {
      return NextResponse.json({ error: "บัญชีผู้ใช้ไม่ตรงกับคำสั่งซื้อ" }, { status: 403 });
    }

    const supabase = createSupabaseAdminClient();
    const orderRow = {
      id: order.id,
      auth_user_id: user.id,
      order_number: order.orderNumber,
      customer_name: order.customerName,
      phone: order.phone,
      line_id: order.lineId,
      email: order.email || user.email || null,
      pickup_method: order.pickupMethod,
      pickup_date: toDate(order.pickupDate),
      pickup_time: toTime(order.pickupTime),
      pickup_location: order.pickupLocation,
      estimated_delivery_date: order.estimatedDeliveryDate ? toDate(order.estimatedDeliveryDate) : null,
      tracking_number: order.trackingNumber ?? null,
      tracking_carrier: order.trackingCarrier ?? null,
      tracking_url: order.trackingUrl ?? null,
      subtotal: order.subtotal,
      total: order.total,
      deposit_amount: order.depositAmount,
      payment_status: order.paymentStatus,
      order_status: order.orderStatus,
      production_score: order.productionScore,
      customer_note: order.note ?? null,
      updated_at: new Date().toISOString()
    };

    const { error: orderError } = await supabase
      .from("orders")
      .upsert(orderRow, { onConflict: "id" });

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    await supabase.from("order_items").delete().eq("order_id", order.id);

    const quantity = Math.max(1, Number(order.config.quantity || 1));
    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: order.id,
      quantity,
      unit_price: Number((order.total / quantity).toFixed(2)),
      line_total: order.total,
      customization_json: {
        config: order.config,
        sourceItem: order.sourceItem ?? null
      }
    });

    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, orderId: order.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "บันทึกคำสั่งซื้อไม่สำเร็จ" },
      { status: 400 }
    );
  }
}
