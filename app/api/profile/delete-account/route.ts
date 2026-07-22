import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LocalOrderPayload = {
  orderNumber?: string;
  paymentStatus?: string;
};

async function recordDeletionRequest(input: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  userId: string;
  email?: string;
  status: "self_deleted" | "requires_review";
  hasPaidOrder: boolean;
  localOrders: LocalOrderPayload[];
  reason?: string;
}) {
  const { error } = await input.admin.from("data_deletion_requests").insert({
    user_id: input.userId,
    email: input.email ?? null,
    request_type: input.status === "self_deleted" ? "self_delete" : "admin_review",
    status: input.status,
    reason: input.reason ?? null,
    has_paid_order: input.hasPaidOrder,
    metadata: {
      local_orders: input.localOrders
    },
    resolved_at: input.status === "self_deleted" ? new Date().toISOString() : null
  });

  if (
    error &&
    error.code !== "42P01" &&
    error.code !== "PGRST205" &&
    !error.message.toLowerCase().includes("data_deletion_requests")
  ) {
    throw error;
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนลบบัญชี" }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({})) as { orders?: LocalOrderPayload[] };
  const localOrders = Array.isArray(payload.orders) ? payload.orders : [];
  const hasPaidLocalOrder = localOrders.some((order) => order.paymentStatus === "paid");
  const admin = createSupabaseAdminClient();
  const email = authData.user.email;

  if (hasPaidLocalOrder) {
    await recordDeletionRequest({
      admin,
      userId: authData.user.id,
      email,
      status: "requires_review",
      hasPaidOrder: true,
      localOrders,
      reason: "พบคำสั่งซื้อที่ชำระเงินแล้วในข้อมูลฝั่งลูกค้า"
    });

    return NextResponse.json({
      error: "บัญชีนี้มีคำสั่งซื้อที่ชำระเงินแล้ว จึงยังลบบัญชีไม่ได้ กรุณาติดต่อร้าน"
    }, { status: 409 });
  }

  if (email) {
    const { data: paidOrders, error: paidOrdersError } = await admin
      .from("orders")
      .select("id")
      .eq("email", email)
      .eq("payment_status", "paid")
      .limit(1);

    if (paidOrdersError) {
      return NextResponse.json({ error: paidOrdersError.message }, { status: 500 });
    }

    if ((paidOrders ?? []).length > 0) {
      await recordDeletionRequest({
        admin,
        userId: authData.user.id,
        email,
        status: "requires_review",
        hasPaidOrder: true,
        localOrders,
        reason: "พบคำสั่งซื้อที่ชำระเงินแล้วในฐานข้อมูล"
      });

      return NextResponse.json({
        error: "บัญชีนี้มีคำสั่งซื้อที่ชำระเงินแล้ว จึงยังลบบัญชีไม่ได้ กรุณาติดต่อร้าน"
      }, { status: 409 });
    }
  }

  await recordDeletionRequest({
    admin,
    userId: authData.user.id,
    email,
    status: "self_deleted",
    hasPaidOrder: false,
    localOrders
  });

  const { error: deleteError } = await admin.auth.admin.deleteUser(authData.user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
