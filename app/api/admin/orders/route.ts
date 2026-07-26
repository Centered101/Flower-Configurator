import { NextResponse } from "next/server";
import { getAdminSessionWithDatabaseRole } from "@/lib/admin-session";
import { createPaymentSlipDisplayUrl } from "@/lib/payment-slip-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CustomerOrder, OrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const orderStatuses: OrderStatus[] = [
  "pending_review",
  "design_confirmed",
  "awaiting_payment",
  "preparing_materials",
  "in_production",
  "quality_check",
  "ready",
  "completed",
  "cancelled"
];

const paymentStatuses: CustomerOrder["paymentStatus"][] = [
  "pending",
  "deposit_due",
  "awaiting_slip_review",
  "paid",
  "failed",
  "refunded"
];

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
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

type OrderItemRow = {
  order_id: string;
  product_id: string | null;
  flower_type_id: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
  line_total: number | string | null;
  customization_json: unknown;
};

type ProductRow = {
  id: string;
  name: string | null;
};

type FlowerTypeRow = {
  id: string;
  slug: string | null;
  name_th: string | null;
  name_en: string | null;
};

type PaymentRow = {
  id: string;
  order_id: string;
  payment_method: string;
  amount: number | string | null;
  payment_type: string;
  slip_url: string | null;
  slip_path: string | null;
  status: "pending" | "awaiting_review" | "paid" | "failed" | "refunded";
  verification_message: string | null;
  verified_amount: number | string | null;
  qr_payload: string | null;
  receiver_target: string | null;
  receiver_matched: boolean | null;
  created_at: string;
};

type AdminOrder = {
  id: string;
  authUserId?: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  lineId: string;
  email: string;
  pickupMethod: string;
  pickupDate: string;
  pickupTime: string;
  pickupLocation: string;
  estimatedDeliveryDate: string;
  trackingNumber: string;
  trackingCarrier: string;
  trackingUrl: string;
  subtotal: number;
  total: number;
  depositAmount: number;
  productionScore: number;
  paymentStatus: CustomerOrder["paymentStatus"];
  orderStatus: OrderStatus;
  customerNote: string;
  adminNote: string;
  quantity: number;
  orderTitle: string;
  itemLink?: {
    sourceType: string;
    productId: string;
    productName: string;
    flowerTypeId: string;
    flowerTypeName: string;
    configProductType: string;
    configFlowerType: string;
    unitPrice: number;
    lineTotal: number;
  };
  sourceItem?: unknown;
  latestPayment?: {
    id: string;
    amount: number;
    verifiedAmount?: number;
    status: PaymentRow["status"];
    slipUrl: string;
    slipPath: string;
    verificationMessage: string;
    receiverMatched: boolean | null;
    qrPayload: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
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

function getOrderTitle(item?: OrderItemRow) {
  const json = item?.customization_json;
  if (isRecord(json) && isRecord(json.sourceItem)) {
    const title = json.sourceItem.title;
    if (typeof title === "string" && title.trim()) return title.trim();
  }

  if (isRecord(json) && isRecord(json.config)) {
    const productType = json.config.productType;
    if (typeof productType === "string" && productType.trim()) return productType.trim();
  }

  return "ออเดอร์ออกแบบเอง";
}

function getStringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function getItemLink(
  item: OrderItemRow | undefined,
  productById: Map<string, ProductRow>,
  flowerById: Map<string, FlowerTypeRow>
): AdminOrder["itemLink"] | undefined {
  if (!item) return undefined;

  const json = isRecord(item.customization_json) ? item.customization_json : {};
  const config = isRecord(json.config) ? json.config : {};
  const sourceItem = isRecord(json.sourceItem) ? json.sourceItem : {};
  const sourceType = getStringField(sourceItem, "sourceType") || (item.product_id ? "product" : "custom");
  const product = item.product_id ? productById.get(item.product_id) : undefined;
  const flower = item.flower_type_id ? flowerById.get(item.flower_type_id) : undefined;

  return {
    sourceType,
    productId: item.product_id ?? "",
    productName: product?.name?.trim() ?? "",
    flowerTypeId: item.flower_type_id ?? "",
    flowerTypeName: flower?.name_th?.trim() || flower?.name_en?.trim() || flower?.slug?.trim() || "",
    configProductType: getStringField(config, "productType"),
    configFlowerType: getStringField(config, "flowerType"),
    unitPrice: toNumber(item.unit_price),
    lineTotal: toNumber(item.line_total)
  };
}

async function mapOrder(
  row: OrderRow,
  item: OrderItemRow | undefined,
  payment: PaymentRow | undefined,
  productById: Map<string, ProductRow>,
  flowerById: Map<string, FlowerTypeRow>
): Promise<AdminOrder> {
  const json = isRecord(item?.customization_json) ? item.customization_json : {};
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
    email: row.email ?? "",
    pickupMethod: row.pickup_method,
    pickupDate: row.pickup_date,
    pickupTime: toTime(row.pickup_time),
    pickupLocation: row.pickup_location,
    estimatedDeliveryDate: row.estimated_delivery_date ?? "",
    trackingNumber: row.tracking_number ?? "",
    trackingCarrier: row.tracking_carrier ?? "",
    trackingUrl: row.tracking_url ?? "",
    subtotal: toNumber(row.subtotal),
    total: toNumber(row.total),
    depositAmount: toNumber(row.deposit_amount),
    productionScore: toNumber(row.production_score, 1),
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    customerNote: row.customer_note ?? "",
    adminNote: row.admin_note ?? "",
    quantity: Math.max(1, toNumber(item?.quantity, 1)),
    orderTitle: getOrderTitle(item),
    itemLink: getItemLink(item, productById, flowerById),
    sourceItem: isRecord(json) ? json.sourceItem : undefined,
    latestPayment: payment ? {
      id: payment.id,
      amount: toNumber(payment.amount),
      verifiedAmount: payment.verified_amount === null ? undefined : toNumber(payment.verified_amount),
      status: payment.status,
      slipUrl,
      slipPath: payment.slip_path ?? "",
      verificationMessage: payment.verification_message ?? "",
      receiverMatched: payment.receiver_matched,
      qrPayload: payment.qr_payload ?? "",
      createdAt: payment.created_at
    } : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function requireAdmin() {
  const supabase = createSupabaseAdminClient();
  const session = await getAdminSessionWithDatabaseRole(supabase);

  if (!session) {
    return { supabase, response: NextResponse.json({ error: "กรุณาเข้าสู่ระบบผู้ดูแลร้าน" }, { status: 403 }) };
  }

  return { supabase, response: null };
}

export async function GET() {
  try {
    const { supabase, response } = await requireAdmin();
    if (response) return response;

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, auth_user_id, order_number, customer_name, phone, line_id, email, pickup_method, pickup_date, pickup_time, pickup_location, estimated_delivery_date, tracking_number, tracking_carrier, tracking_url, subtotal, total, deposit_amount, payment_status, order_status, production_score, customer_note, admin_note, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    const orderRows = (orders ?? []) as OrderRow[];
    const orderIds = orderRows.map((order) => order.id);

    const [itemsResult, paymentsResult] = orderIds.length ? await Promise.all([
      supabase
        .from("order_items")
        .select("order_id, product_id, flower_type_id, quantity, unit_price, line_total, customization_json")
        .in("order_id", orderIds),
      supabase
        .from("payment_records")
        .select("id, order_id, payment_method, amount, payment_type, slip_url, slip_path, status, verification_message, verified_amount, qr_payload, receiver_target, receiver_matched, created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false })
    ]) : [
      { data: [], error: null },
      { data: [], error: null }
    ];

    if (itemsResult.error) {
      return NextResponse.json({ error: itemsResult.error.message }, { status: 500 });
    }

    if (paymentsResult.error) {
      return NextResponse.json({ error: paymentsResult.error.message }, { status: 500 });
    }

    const itemByOrderId = new Map<string, OrderItemRow>();
    const itemRows = (itemsResult.data ?? []) as OrderItemRow[];
    for (const item of itemRows) {
      if (!itemByOrderId.has(item.order_id)) itemByOrderId.set(item.order_id, item);
    }

    const productIds = Array.from(new Set(itemRows.map((item) => item.product_id).filter((id): id is string => Boolean(id))));
    const flowerIds = Array.from(new Set(itemRows.map((item) => item.flower_type_id).filter((id): id is string => Boolean(id))));
    const [productsResult, flowersResult] = await Promise.all([
      productIds.length ? supabase.from("products").select("id, name").in("id", productIds) : Promise.resolve({ data: [], error: null }),
      flowerIds.length ? supabase.from("flower_types").select("id, slug, name_th, name_en").in("id", flowerIds) : Promise.resolve({ data: [], error: null })
    ]);

    if (productsResult.error) {
      return NextResponse.json({ error: productsResult.error.message }, { status: 500 });
    }

    if (flowersResult.error) {
      return NextResponse.json({ error: flowersResult.error.message }, { status: 500 });
    }

    const productById = new Map(((productsResult.data ?? []) as ProductRow[]).map((product) => [product.id, product]));
    const flowerById = new Map(((flowersResult.data ?? []) as FlowerTypeRow[]).map((flower) => [flower.id, flower]));

    const paymentByOrderId = new Map<string, PaymentRow>();
    for (const payment of (paymentsResult.data ?? []) as PaymentRow[]) {
      if (!paymentByOrderId.has(payment.order_id)) paymentByOrderId.set(payment.order_id, payment);
    }

    const mappedOrders = await Promise.all(orderRows.map((order) => mapOrder(
      order,
      itemByOrderId.get(order.id),
      paymentByOrderId.get(order.id),
      productById,
      flowerById
    )));

    return NextResponse.json(mappedOrders, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "โหลดคำสั่งซื้อไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, response } = await requireAdmin();
    if (response) return response;

    const payload = await request.json() as {
      id?: string;
      orderStatus?: OrderStatus;
      paymentStatus?: CustomerOrder["paymentStatus"];
      paymentRecordStatus?: PaymentRow["status"];
      paymentRecordId?: string;
      adminNote?: string;
      trackingNumber?: string;
      trackingCarrier?: string;
      trackingUrl?: string;
    };

    if (!payload.id) {
      return NextResponse.json({ error: "ไม่พบคำสั่งซื้อที่ต้องการอัปเดต" }, { status: 400 });
    }

    if (payload.orderStatus && !orderStatuses.includes(payload.orderStatus)) {
      return NextResponse.json({ error: "สถานะคำสั่งซื้อไม่ถูกต้อง" }, { status: 400 });
    }

    if (payload.paymentStatus && !paymentStatuses.includes(payload.paymentStatus)) {
      return NextResponse.json({ error: "สถานะชำระเงินไม่ถูกต้อง" }, { status: 400 });
    }

    const orderPatch: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (payload.orderStatus) orderPatch.order_status = payload.orderStatus;
    if (payload.paymentStatus) orderPatch.payment_status = payload.paymentStatus;
    if (typeof payload.adminNote === "string") orderPatch.admin_note = payload.adminNote.trim();
    if (typeof payload.trackingNumber === "string") orderPatch.tracking_number = payload.trackingNumber.trim() || null;
    if (typeof payload.trackingCarrier === "string") orderPatch.tracking_carrier = payload.trackingCarrier.trim() || null;
    if (typeof payload.trackingUrl === "string") orderPatch.tracking_url = payload.trackingUrl.trim() || null;

    const { error: orderError } = await supabase
      .from("orders")
      .update(orderPatch)
      .eq("id", payload.id);

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    if (payload.paymentRecordId && payload.paymentRecordStatus) {
      const paymentPatch: Record<string, unknown> = {
        status: payload.paymentRecordStatus
      };

      if (payload.paymentRecordStatus === "paid") {
        paymentPatch.verification_message = "ผู้ดูแลร้านตรวจสลิปและอนุมัติแล้ว";
      } else if (payload.paymentRecordStatus === "failed") {
        paymentPatch.verification_message = "ผู้ดูแลร้านตรวจแล้ว สลิปไม่ผ่าน";
      }

      const { error: paymentError } = await supabase
        .from("payment_records")
        .update(paymentPatch)
        .eq("id", payload.paymentRecordId)
        .eq("order_id", payload.id);

      if (paymentError) {
        return NextResponse.json({ error: paymentError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "อัปเดตคำสั่งซื้อไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
