import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getAdminSessionWithDatabaseRole } from "@/lib/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type OrderRow = {
  id: string;
  auth_user_id: string | null;
  order_number: string;
  customer_name: string;
  phone: string;
  line_id: string;
  email: string | null;
  total: number | string | null;
  deposit_amount: number | string | null;
  payment_status: string;
  order_status: string;
  pickup_method: string;
  pickup_date: string;
  pickup_time: string;
  estimated_delivery_date: string | null;
  created_at: string;
  updated_at: string;
};

type CustomerSummary = {
  id: string;
  authUserId?: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  lineId: string;
  address: string;
  source: "auth" | "order";
  orderCount: number;
  totalSpent: number;
  depositTotal: number;
  lastOrderAt: string;
  createdAt: string;
  lastSignInAt: string;
  latestOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    depositAmount: number;
    paymentStatus: string;
    orderStatus: string;
    fulfillment: string;
    createdAt: string;
  }>;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getMetadata(user: User) {
  return user.user_metadata as Record<string, unknown>;
}

function getProfileName(profile?: ProfileRow, user?: User, order?: OrderRow) {
  const metadata = user ? getMetadata(user) : {};
  const firstName = profile?.first_name?.trim() || asString(metadata.first_name);
  const lastName = profile?.last_name?.trim() || asString(metadata.last_name);
  const joinedName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    joinedName ||
    profile?.display_name?.trim() ||
    asString(metadata.display_name) ||
    order?.customer_name?.trim() ||
    user?.email?.split("@")[0] ||
    "ลูกค้า"
  );
}

function makeFallbackId(row: Pick<OrderRow, "email" | "phone" | "line_id">) {
  return `order:${row.email?.toLowerCase() || row.phone || row.line_id || crypto.randomUUID()}`;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function getCustomerKey(order: OrderRow) {
  if (order.auth_user_id) return order.auth_user_id;
  if (order.email) return `email:${normalizeKey(order.email)}`;
  if (order.phone) return `phone:${order.phone.replace(/\D/g, "")}`;
  return makeFallbackId(order);
}

function fulfillmentText(order: OrderRow) {
  if (order.estimated_delivery_date || order.pickup_method.includes("จัดส่ง")) {
    return `จัดส่งประมาณ ${order.estimated_delivery_date ?? order.pickup_date}`;
  }

  return `${order.pickup_method} ${order.pickup_date} ${String(order.pickup_time).slice(0, 5)}`;
}

async function getProfiles(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, first_name, last_name, phone, address, created_at, updated_at");

  if (error) return [] as ProfileRow[];
  return (data ?? []) as ProfileRow[];
}

async function getOrders(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, auth_user_id, order_number, customer_name, phone, line_id, email, total, deposit_amount, payment_status, order_status, pickup_method, pickup_date, pickup_time, estimated_delivery_date, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OrderRow[];
}

async function getAuthUsers(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (error) return [] as User[];
  return data.users ?? [];
}

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const session = await getAdminSessionWithDatabaseRole(supabase);

    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบผู้ดูแลร้าน" }, { status: 403 });
    }

    const [profiles, users, orders] = await Promise.all([
      getProfiles(supabase),
      getAuthUsers(supabase),
      getOrders(supabase)
    ]);

    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const userById = new Map(users.map((user) => [user.id, user]));
    const customers = new Map<string, CustomerSummary>();

    function ensureCustomer(key: string, input: { user?: User; profile?: ProfileRow; order?: OrderRow }) {
      const metadata = input.user ? getMetadata(input.user) : {};
      const profile = input.profile;
      const order = input.order;
      const authUserId = input.user?.id ?? profile?.id ?? order?.auth_user_id ?? undefined;
      const firstName = profile?.first_name?.trim() || asString(metadata.first_name);
      const lastName = profile?.last_name?.trim() || asString(metadata.last_name);
      const email = input.user?.email?.trim() || order?.email?.trim() || "";
      const phone = profile?.phone?.trim() || asString(metadata.phone) || order?.phone?.trim() || "";
      const lineId = asString(metadata.line_id) || asString(metadata.lineId) || order?.line_id?.trim() || "";
      const address = profile?.address?.trim() || asString(metadata.address);
      const createdAt = input.user?.created_at ?? profile?.created_at ?? order?.created_at ?? "";
      const lastSignInAt = input.user?.last_sign_in_at ?? "";

      if (!customers.has(key)) {
        customers.set(key, {
          id: key,
          authUserId,
          displayName: getProfileName(profile, input.user, order),
          firstName,
          lastName,
          email,
          phone,
          lineId,
          address,
          source: input.user || profile ? "auth" : "order",
          orderCount: 0,
          totalSpent: 0,
          depositTotal: 0,
          lastOrderAt: "",
          createdAt,
          lastSignInAt,
          latestOrders: []
        });
      }

      const customer = customers.get(key)!;
      customer.authUserId = customer.authUserId || authUserId;
      customer.firstName = customer.firstName || firstName;
      customer.lastName = customer.lastName || lastName;
      customer.email = customer.email || email;
      customer.phone = customer.phone || phone;
      customer.lineId = customer.lineId || lineId;
      customer.address = customer.address || address;
      customer.lastSignInAt = customer.lastSignInAt || lastSignInAt;
      if (customer.displayName === "ลูกค้า" || customer.displayName === customer.email.split("@")[0]) {
        customer.displayName = getProfileName(profile, input.user, order);
      }

      return customer;
    }

    for (const user of users) {
      ensureCustomer(user.id, { user, profile: profileById.get(user.id) });
    }

    for (const profile of profiles) {
      ensureCustomer(profile.id, { user: userById.get(profile.id), profile });
    }

    for (const order of orders) {
      const key = getCustomerKey(order);
      const customer = ensureCustomer(key, {
        user: order.auth_user_id ? userById.get(order.auth_user_id) : undefined,
        profile: order.auth_user_id ? profileById.get(order.auth_user_id) : undefined,
        order
      });

      customer.orderCount += 1;
      customer.totalSpent += Number(order.total ?? 0);
      customer.depositTotal += Number(order.deposit_amount ?? 0);
      customer.lastOrderAt = customer.lastOrderAt && customer.lastOrderAt > order.created_at ? customer.lastOrderAt : order.created_at;
      customer.latestOrders.push({
        id: order.id,
        orderNumber: order.order_number,
        total: Number(order.total ?? 0),
        depositAmount: Number(order.deposit_amount ?? 0),
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        fulfillment: fulfillmentText(order),
        createdAt: order.created_at
      });
    }

    const result = Array.from(customers.values())
      .map((customer) => ({
        ...customer,
        latestOrders: customer.latestOrders
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 5)
      }))
      .sort((a, b) => (
        (b.lastOrderAt || b.createdAt || "").localeCompare(a.lastOrderAt || a.createdAt || "")
      ));

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "โหลดข้อมูลลูกค้าไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
