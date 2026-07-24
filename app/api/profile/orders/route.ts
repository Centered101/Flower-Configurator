import { NextResponse } from "next/server";
import { defaultConfig } from "@/lib/configurator";
import { sortOrdersByOrderNumber } from "@/lib/orders";
import { createPaymentSlipDisplayUrl } from "@/lib/payment-slip-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ConfiguratorState, CustomerOrder, OrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  auth_user_id: string | null;
  order_number: string;
  customer_name: string;
  phone: string;
  line_id: string;
  email: string | null;
  pickup_method: string;
  pickup_date: string;
  pickup_time: string;
  pickup_location: string;
  estimated_delivery_date: string | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  tracking_url: string | null;
  subtotal: number | string | null;
  total: number | string | null;
  deposit_amount: number | string | null;
  payment_status: CustomerOrder["paymentStatus"];
  order_status: OrderStatus;
  production_score: number | string | null;
  customer_note: string | null;
  created_at: string;
  updated_at: string;
};

type OrderItemRow = {
  order_id: string;
  customization_json: unknown;
};

type PaymentRow = {
  order_id: string;
  amount: number | string | null;
  slip_url: string | null;
  slip_path: string | null;
  status: "pending" | "awaiting_review" | "paid" | "failed" | "refunded";
  verification_message: string | null;
  verified_amount: number | string | null;
  created_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function toTime(value: string) {
  return String(value ?? "").slice(0, 5);
}

function getConfig(item?: OrderItemRow): ConfiguratorState {
  const json = item?.customization_json;
  if (isRecord(json) && isRecord(json.config)) {
    return { ...defaultConfig, ...json.config } as ConfiguratorState;
  }

  return defaultConfig;
}

function getSourceItem(item?: OrderItemRow) {
  const json = item?.customization_json;
  return isRecord(json) && isRecord(json.sourceItem) ? json.sourceItem as CustomerOrder["sourceItem"] : undefined;
}

async function mapOrder(row: OrderRow, item?: OrderItemRow, payment?: PaymentRow): Promise<CustomerOrder> {
  const total = toNumber(row.total);
  const depositAmount = toNumber(row.deposit_amount);
  const slipUrl = payment ? await createPaymentSlipDisplayUrl({
    slipPath: payment.slip_path,
    fallbackUrl: payment.slip_url
  }) : "";

  return {
    id: row.id,
    authUserId: row.auth_user_id ?? undefined,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    phone: row.phone,
    lineId: row.line_id,
    email: row.email ?? undefined,
    pickupMethod: row.pickup_method,
    pickupDate: row.pickup_date,
    pickupTime: toTime(row.pickup_time),
    pickupLocation: row.pickup_location,
    estimatedDeliveryDate: row.estimated_delivery_date ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    trackingCarrier: row.tracking_carrier ?? undefined,
    trackingUrl: row.tracking_url ?? undefined,
    note: row.customer_note ?? undefined,
    subtotal: toNumber(row.subtotal),
    total,
    depositAmount,
    productionScore: toNumber(row.production_score, 1),
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    config: getConfig(item),
    sourceItem: getSourceItem(item),
    paymentSlip: payment && (slipUrl || payment.slip_path) ? {
      url: slipUrl,
      path: payment.slip_path ?? payment.slip_url ?? "",
      amount: toNumber(payment.amount),
      parsedAmount: payment.verified_amount === null ? undefined : toNumber(payment.verified_amount),
      status: payment.status === "paid" ? "paid" : payment.status === "failed" ? "failed" : "awaiting_review",
      message: payment.verification_message ?? "",
      uploadedAt: payment.created_at
    } : undefined,
    createdAt: row.created_at
  };
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนดูคำสั่งซื้อ" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const orderSelect = "id, auth_user_id, order_number, customer_name, phone, line_id, email, pickup_method, pickup_date, pickup_time, pickup_location, estimated_delivery_date, tracking_number, tracking_carrier, tracking_url, subtotal, total, deposit_amount, payment_status, order_status, production_score, customer_note, created_at, updated_at";
    const [byUser, byEmail] = await Promise.all([
      admin
        .from("orders")
        .select(orderSelect)
        .eq("auth_user_id", authData.user.id)
        .order("created_at", { ascending: false }),
      authData.user.email
        ? admin
          .from("orders")
          .select(orderSelect)
          .eq("email", authData.user.email)
          .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null })
    ]);

    if (byUser.error) throw byUser.error;
    if (byEmail.error) throw byEmail.error;

    const orderMap = new Map<string, OrderRow>();
    for (const row of [...(byUser.data ?? []), ...(byEmail.data ?? [])] as OrderRow[]) {
      orderMap.set(row.id, row);
    }

    const orders = Array.from(orderMap.values());
    const orderIds = orders.map((order) => order.id);

    const [itemsResult, paymentsResult] = orderIds.length ? await Promise.all([
      admin
        .from("order_items")
        .select("order_id, customization_json")
        .in("order_id", orderIds),
      admin
        .from("payment_records")
        .select("order_id, amount, slip_url, slip_path, status, verification_message, verified_amount, created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false })
    ]) : [
      { data: [], error: null },
      { data: [], error: null }
    ];

    if (itemsResult.error) throw itemsResult.error;
    if (paymentsResult.error) throw paymentsResult.error;

    const itemByOrderId = new Map<string, OrderItemRow>();
    for (const item of (itemsResult.data ?? []) as OrderItemRow[]) {
      if (!itemByOrderId.has(item.order_id)) itemByOrderId.set(item.order_id, item);
    }

    const paymentByOrderId = new Map<string, PaymentRow>();
    for (const payment of (paymentsResult.data ?? []) as PaymentRow[]) {
      if (!paymentByOrderId.has(payment.order_id)) paymentByOrderId.set(payment.order_id, payment);
    }

    const mappedOrders = await Promise.all(orders.map((order) => mapOrder(order, itemByOrderId.get(order.id), paymentByOrderId.get(order.id))));

    return NextResponse.json(sortOrdersByOrderNumber(mappedOrders), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "โหลดคำสั่งซื้อไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
