"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Mail, MapPin, Phone, RefreshCw, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";

type AdminCustomer = {
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

const paymentStatusLabels: Record<string, string> = {
  pending: "รอดำเนินการ",
  deposit_due: "รอมัดจำ",
  awaiting_slip_review: "รอตรวจสลิป",
  paid: "ชำระแล้ว",
  failed: "ชำระไม่ผ่าน",
  refunded: "คืนเงินแล้ว"
};

const orderStatusLabels: Record<string, string> = {
  pending_review: "รอตรวจสอบ",
  design_confirmed: "ยืนยันแบบแล้ว",
  awaiting_payment: "รอชำระเงิน",
  preparing_materials: "เตรียมวัสดุ",
  in_production: "กำลังผลิต",
  quality_check: "ตรวจคุณภาพ",
  ready: "พร้อมรับ",
  completed: "สำเร็จ",
  cancelled: "ยกเลิก"
};

function formatDateTime(value: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("th-TH-u-ca-gregory-nu-latn", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getLastFourPhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-4);
}

async function fetchCustomers() {
  const response = await fetch("/api/admin/customers", {
    cache: "no-store"
  });
  const result = await response.json() as AdminCustomer[] | { error?: string };

  if (!response.ok) {
    throw new Error("error" in result && result.error ? result.error : "โหลดข้อมูลลูกค้าไม่สำเร็จ");
  }

  return result as AdminCustomer[];
}

export function AdminCustomersManager() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadCustomers() {
    setIsLoading(true);
    try {
      const nextCustomers = await fetchCustomers();
      setCustomers(nextCustomers);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "โหลดข้อมูลลูกค้าไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return customers;

    return customers.filter((customer) => {
      const text = [
        customer.displayName,
        customer.firstName,
        customer.lastName,
        customer.email,
        customer.phone,
        customer.lineId,
        customer.address,
        ...customer.latestOrders.map((order) => order.orderNumber)
      ].join(" ").toLowerCase();

      return text.includes(keyword);
    });
  }, [customers, query]);

  const totalOrders = customers.reduce((sum, customer) => sum + customer.orderCount, 0);
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="ลูกค้าทั้งหมด" value={`${customers.length.toLocaleString("th-TH")} คน`} />
        <Metric label="คำสั่งซื้อทั้งหมด" value={`${totalOrders.toLocaleString("th-TH")} รายการ`} />
        <Metric label="ยอดรวมจากลูกค้า" value={`${totalRevenue.toLocaleString("th-TH")} บาท`} />
      </div>

      <div className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block">
            <span className="text-sm font-bold text-ink">ค้นหาลูกค้า</span>
            <span className="mt-2 flex items-center gap-2 rounded-soft border border-pink-100 bg-white px-4 py-3 focus-within:border-blossom">
              <Search size={18} className="text-blossom" aria-hidden="true" />
              <input
                suppressHydrationWarning
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ชื่อ เบอร์ อีเมล LINE ID หรือเลขคำสั่งซื้อ"
                className="min-w-0 flex-1 border-0 bg-transparent outline-none"
              />
            </span>
          </label>
          <button
            type="button"
            suppressHydrationWarning
            onClick={loadCustomers}
            disabled={isLoading}
            className="touch-target inline-flex items-center justify-center gap-2 rounded-soft bg-ink px-4 py-2 font-bold text-white transition hover:bg-blossom disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} aria-hidden="true" />
            รีเฟรช
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-bloom border border-pink-100 bg-white p-6 text-sm font-semibold text-zinc-600 shadow-sm">กำลังโหลดข้อมูลลูกค้า...</div>
      ) : filteredCustomers.length ? (
        <div className="grid gap-3">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              expanded={expandedId === customer.id}
              onToggle={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={customers.length ? "ไม่พบลูกค้าที่ค้นหา" : "ยังไม่มีลูกค้า"}
          message={customers.length ? "ลองค้นหาด้วยชื่อ เบอร์ อีเมล LINE ID หรือเลขคำสั่งซื้อ" : "เมื่อลูกค้าสมัครบัญชีหรือสั่งซื้อ รายชื่อจะแสดงที่หน้านี้"}
        />
      )}
    </section>
  );
}

function CustomerCard({
  customer,
  expanded,
  onToggle
}: {
  customer: AdminCustomer;
  expanded: boolean;
  onToggle: () => void;
}) {
  const phoneSuffix = getLastFourPhone(customer.phone);

  async function copyCustomer() {
    await navigator.clipboard.writeText([
      customer.displayName,
      customer.phone ? `เบอร์: ${customer.phone}` : "",
      customer.lineId ? `LINE ID: ${customer.lineId}` : "",
      customer.email ? `อีเมล: ${customer.email}` : "",
      customer.address ? `ที่อยู่: ${customer.address}` : ""
    ].filter(Boolean).join("\n"));
    toast.success("คัดลอกข้อมูลลูกค้าแล้ว");
  }

  return (
    <article className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)_auto] xl:items-start">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-blush text-blossom">
            <UserRound size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-ink">{customer.displayName}</h2>
            <p className="mt-1 text-sm font-semibold text-zinc-500">{customer.source === "auth" ? "บัญชีลูกค้า" : "ลูกค้าจากคำสั่งซื้อ"}</p>
            <p className="mt-2 text-sm text-zinc-500">สมัครเมื่อ {formatDateTime(customer.createdAt)}</p>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <ContactItem icon={Phone} label="เบอร์โทร" value={customer.phone || "-"} />
          <ContactItem icon={Mail} label="อีเมล" value={customer.email || "-"} />
          <ContactItem icon={UserRound} label="LINE ID" value={customer.lineId || "-"} />
          <ContactItem icon={MapPin} label="ที่อยู่" value={customer.address || "-"} wide />
        </dl>

        <div className="grid gap-2 xl:min-w-52">
          <div className="rounded-soft bg-blush/70 p-3">
            <p className="text-sm text-zinc-500">คำสั่งซื้อ</p>
            <p className="mt-1 text-xl font-bold text-ink">{customer.orderCount.toLocaleString("th-TH")} รายการ</p>
          </div>
          <div className="rounded-soft bg-blush/70 p-3">
            <p className="text-sm text-zinc-500">ยอดรวม</p>
            <p className="mt-1 text-xl font-bold text-blossom">{customer.totalSpent.toLocaleString("th-TH")} บาท</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          suppressHydrationWarning
          onClick={onToggle}
          className="touch-target inline-flex items-center justify-center rounded-soft border border-pink-200 bg-white px-4 py-2 font-bold text-ink transition hover:border-blossom hover:bg-blush"
        >
          {expanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
        </button>
        <button
          type="button"
          suppressHydrationWarning
          onClick={copyCustomer}
          className="touch-target inline-flex items-center justify-center gap-2 rounded-soft bg-blush px-4 py-2 font-bold text-ink transition hover:bg-blossom hover:text-white"
        >
          <Copy size={17} aria-hidden="true" />
          คัดลอกข้อมูล
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 rounded-soft border border-pink-100 bg-blush/45 p-4">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <Detail label="รหัสลูกค้าในระบบ" value={customer.authUserId || customer.id} />
            <Detail label="เข้าสู่ระบบล่าสุด" value={formatDateTime(customer.lastSignInAt)} />
            <Detail label="ออเดอร์ล่าสุด" value={formatDateTime(customer.lastOrderAt)} />
            <Detail label="ยอดมัดจำรวม" value={`${customer.depositTotal.toLocaleString("th-TH")} บาท`} />
          </div>

          <h3 className="mt-5 font-bold text-ink">คำสั่งซื้อล่าสุด</h3>
          {customer.latestOrders.length ? (
            <div className="mt-3 grid gap-2">
              {customer.latestOrders.map((order) => (
                <div key={order.id} className="grid gap-2 rounded-soft border border-pink-100 bg-white p-3 text-sm lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="break-all font-bold text-ink">{order.orderNumber}</p>
                    <p className="mt-1 text-zinc-600">{order.fulfillment}</p>
                  </div>
                  <div>
                    <p className="font-bold text-blossom">{order.total.toLocaleString("th-TH")} บาท</p>
                    <p className="text-zinc-500">{paymentStatusLabels[order.paymentStatus] ?? order.paymentStatus}</p>
                  </div>
                  <Link
                    href={`/track?order=${encodeURIComponent(order.orderNumber)}${phoneSuffix ? `&phone=${encodeURIComponent(phoneSuffix)}` : ""}`}
                    className="touch-target inline-flex items-center justify-center rounded-soft border border-pink-200 px-3 py-2 font-bold text-ink transition hover:border-blossom hover:bg-blush"
                  >
                    ดูสถานะ
                  </Link>
                  <p className="lg:col-span-3 text-xs font-semibold text-zinc-500">
                    {orderStatusLabels[order.orderStatus] ?? order.orderStatus} · สร้างเมื่อ {formatDateTime(order.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-soft border border-pink-100 bg-white p-3 text-sm text-zinc-600">ยังไม่มีคำสั่งซื้อจากลูกค้าคนนี้</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
    </article>
  );
}

function ContactItem({
  icon: Icon,
  label,
  value,
  wide = false
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
        <Icon size={16} className="text-blossom" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 break-words font-bold text-ink">{value}</dd>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-soft bg-white p-3">
      <p className="text-xs font-semibold text-zinc-500">{label}</p>
      <p className="mt-1 break-words font-bold text-ink">{value}</p>
    </div>
  );
}
