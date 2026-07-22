"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Eye, Loader2, RefreshCw, Search, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { CustomerOrder, OrderStatus } from "@/lib/types";

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
  latestPayment?: {
    id: string;
    amount: number;
    verifiedAmount?: number;
    status: "pending" | "awaiting_review" | "paid" | "failed" | "refunded";
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

type OrderDraft = {
  orderStatus: OrderStatus;
  paymentStatus: CustomerOrder["paymentStatus"];
  adminNote: string;
  trackingNumber: string;
  trackingCarrier: string;
  trackingUrl: string;
};

const statusLabels: Record<OrderStatus, string> = {
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

const paymentStatusLabels: Record<CustomerOrder["paymentStatus"], string> = {
  pending: "รอดำเนินการ",
  deposit_due: "รอมัดจำ",
  awaiting_slip_review: "รอตรวจสลิป",
  paid: "ชำระแล้ว",
  failed: "ชำระไม่ผ่าน",
  refunded: "คืนเงินแล้ว"
};

const paymentRecordLabels: Record<NonNullable<AdminOrder["latestPayment"]>["status"], string> = {
  pending: "รอดำเนินการ",
  awaiting_review: "รอผู้ดูแลตรวจ",
  paid: "ผ่านแล้ว",
  failed: "ไม่ผ่าน",
  refunded: "คืนเงินแล้ว"
};

const orderStatusOptions = Object.entries(statusLabels) as Array<[OrderStatus, string]>;
const paymentStatusOptions = Object.entries(paymentStatusLabels) as Array<[CustomerOrder["paymentStatus"], string]>;

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

function fulfillmentText(order: AdminOrder) {
  if (order.estimatedDeliveryDate || order.pickupMethod.includes("จัดส่ง")) {
    return `จัดส่งประมาณ ${order.estimatedDeliveryDate || order.pickupDate}`;
  }

  return `${order.pickupMethod} ${order.pickupDate} ${order.pickupTime}`;
}

function createDraft(order: AdminOrder): OrderDraft {
  return {
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    adminNote: order.adminNote,
    trackingNumber: order.trackingNumber,
    trackingCarrier: order.trackingCarrier,
    trackingUrl: order.trackingUrl
  };
}

async function fetchOrders() {
  const response = await fetch("/api/admin/orders", {
    cache: "no-store"
  });
  const result = await response.json() as AdminOrder[] | { error?: string };

  if (!response.ok) {
    throw new Error("error" in result && result.error ? result.error : "โหลดคำสั่งซื้อไม่สำเร็จ");
  }

  return result as AdminOrder[];
}

async function patchOrder(id: string, patch: Record<string, unknown>) {
  const response = await fetch("/api/admin/orders", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id, ...patch })
  });
  const result = await response.json().catch(() => null) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(result?.error ?? "อัปเดตคำสั่งซื้อไม่สำเร็จ");
  }
}

export function OrderTable() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, OrderDraft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadOrders() {
    setIsLoading(true);
    try {
      const nextOrders = await fetchOrders();
      setOrders(nextOrders);
      setDrafts(Object.fromEntries(nextOrders.map((order) => [order.id, createDraft(order)])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "โหลดคำสั่งซื้อไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return orders.filter((order) => {
      const statusMatches = statusFilter ? order.orderStatus === statusFilter || order.paymentStatus === statusFilter : true;
      if (!statusMatches) return false;
      if (!keyword) return true;

      return [
        order.orderNumber,
        order.customerName,
        order.phone,
        order.lineId,
        order.email,
        order.orderTitle
      ].join(" ").toLowerCase().includes(keyword);
    });
  }, [orders, query, statusFilter]);

  async function updateOrder(order: AdminOrder, patch: Record<string, unknown>, successMessage: string) {
    if (busyId) return;

    setBusyId(order.id);
    try {
      await patchOrder(order.id, patch);
      toast.success(successMessage);
      await loadOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "อัปเดตคำสั่งซื้อไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  async function approveSlip(order: AdminOrder) {
    await updateOrder(order, {
      paymentStatus: "paid",
      orderStatus: "design_confirmed",
      paymentRecordId: order.latestPayment?.id,
      paymentRecordStatus: "paid"
    }, "อนุมัติสลิปแล้ว");
  }

  async function rejectSlip(order: AdminOrder) {
    await updateOrder(order, {
      paymentStatus: "failed",
      orderStatus: "awaiting_payment",
      paymentRecordId: order.latestPayment?.id,
      paymentRecordStatus: "failed"
    }, "บันทึกว่าสลิปไม่ผ่านแล้ว");
  }

  async function saveDraft(order: AdminOrder) {
    const draft = drafts[order.id] ?? createDraft(order);
    await updateOrder(order, draft, "อัปเดตสถานะคำสั่งซื้อแล้ว");
  }

  function updateDraft(id: string, patch: Partial<OrderDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? createDraft(orders.find((order) => order.id === id)!)),
        ...patch
      }
    }));
  }

  if (isLoading) {
    return <div className="rounded-bloom border border-pink-100 bg-white p-6 text-sm font-semibold text-zinc-600">กำลังโหลดคำสั่งซื้อ...</div>;
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 rounded-bloom border border-pink-100 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_auto] lg:items-end">
        <label className="block">
          <span className="text-sm font-bold text-ink">ค้นหาคำสั่งซื้อ</span>
          <span className="mt-2 flex items-center gap-2 rounded-soft border border-pink-100 bg-white px-4 py-3 focus-within:border-blossom">
            <Search size={18} className="text-blossom" aria-hidden="true" />
            <input
              suppressHydrationWarning
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="เลขออเดอร์ ลูกค้า เบอร์โทร LINE ID หรือชื่อแบบ"
              className="min-w-0 flex-1 border-0 bg-transparent outline-none"
            />
          </span>
        </label>
        <label className="block">
          <span className="text-sm font-bold text-ink">สถานะ</span>
          <select
            suppressHydrationWarning
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="touch-target mt-2 w-full rounded-soft border border-pink-100 px-3 outline-none focus:border-blossom"
          >
            <option value="">ทุกสถานะ</option>
            {orderStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            {paymentStatusOptions.map(([value, label]) => <option key={value} value={value}>ชำระเงิน: {label}</option>)}
          </select>
        </label>
        <button
          type="button"
          suppressHydrationWarning
          onClick={loadOrders}
          disabled={Boolean(busyId)}
          className="touch-target inline-flex items-center justify-center gap-2 rounded-soft bg-ink px-4 py-2 font-bold text-white transition hover:bg-blossom disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={18} aria-hidden="true" />
          รีเฟรช
        </button>
      </div>

      {filteredOrders.length ? (
        <div className="grid gap-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              draft={drafts[order.id] ?? createDraft(order)}
              expanded={expandedId === order.id}
              busy={busyId === order.id}
              disabled={Boolean(busyId)}
              onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
              onDraftChange={(patch) => updateDraft(order.id, patch)}
              onApprove={() => approveSlip(order)}
              onReject={() => rejectSlip(order)}
              onSave={() => saveDraft(order)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-bloom border border-pink-100 bg-white p-6 text-sm text-zinc-600 shadow-sm">
          {orders.length ? "ไม่พบคำสั่งซื้อที่ค้นหา" : "ยังไม่มีออเดอร์ใน Supabase"}
        </div>
      )}
    </section>
  );
}

function OrderCard({
  order,
  draft,
  expanded,
  busy,
  disabled,
  onToggle,
  onDraftChange,
  onApprove,
  onReject,
  onSave
}: {
  order: AdminOrder;
  draft: OrderDraft;
  expanded: boolean;
  busy: boolean;
  disabled: boolean;
  onToggle: () => void;
  onDraftChange: (patch: Partial<OrderDraft>) => void;
  onApprove: () => void;
  onReject: () => void;
  onSave: () => void;
}) {
  const phoneSuffix = order.phone.replace(/\D/g, "").slice(-4);
  const hasSlip = Boolean(order.latestPayment?.slipUrl);
  const shouldReviewSlip = order.paymentStatus === "awaiting_slip_review" || order.latestPayment?.status === "awaiting_review";

  async function copyOrderNumber() {
    await navigator.clipboard.writeText(order.orderNumber);
    toast.success("คัดลอกเลขคำสั่งซื้อแล้ว");
  }

  return (
    <article className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-all text-lg font-bold text-ink">{order.orderNumber}</h2>
            {shouldReviewSlip ? <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-700">รอตรวจสลิป</span> : null}
            {order.paymentStatus === "paid" ? <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">ชำระแล้ว</span> : null}
          </div>
          <p className="mt-1 font-semibold text-ink">{order.customerName}</p>
          <p className="mt-1 text-sm text-zinc-600">{order.orderTitle} · {order.quantity.toLocaleString("th-TH")} ชิ้น · {order.productionScore.toLocaleString("th-TH")} คะแนน</p>
          <p className="mt-1 text-sm text-zinc-600">{fulfillmentText(order)}</p>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Info label="ยอดรวม" value={`${order.total.toLocaleString("th-TH")} บาท`} />
          <Info label="มัดจำ" value={`${order.depositAmount.toLocaleString("th-TH")} บาท`} />
          <Info label="สถานะงาน" value={statusLabels[order.orderStatus]} />
          <Info label="ชำระเงิน" value={paymentStatusLabels[order.paymentStatus]} />
        </dl>

        <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
          <button
            type="button"
            suppressHydrationWarning
            onClick={onToggle}
            disabled={disabled}
            className="touch-target inline-flex items-center gap-2 rounded-soft border border-pink-200 bg-white px-3 py-2 font-bold text-ink transition hover:border-blossom hover:bg-blush disabled:opacity-60"
          >
            <Eye size={17} aria-hidden="true" />
            {expanded ? "ซ่อน" : "ดู/ตรวจ"}
          </button>
          <button
            type="button"
            suppressHydrationWarning
            onClick={copyOrderNumber}
            disabled={disabled}
            className="touch-target inline-flex items-center gap-2 rounded-soft bg-blush px-3 py-2 font-bold text-ink transition hover:bg-blossom hover:text-white disabled:opacity-60"
          >
            <Copy size={17} aria-hidden="true" />
            คัดลอก
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 grid gap-4 rounded-soft border border-pink-100 bg-blush/35 p-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Detail label="เบอร์โทร" value={order.phone} />
              <Detail label="LINE ID" value={order.lineId} />
              <Detail label="อีเมล" value={order.email || "-"} />
              <Detail label="สถานที่รับ/ส่ง" value={order.pickupLocation} />
              {order.customerNote ? <Detail label="หมายเหตุลูกค้า" value={order.customerNote} wide /> : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-ink">สถานะงาน</span>
                <select
                  suppressHydrationWarning
                  value={draft.orderStatus}
                  onChange={(event) => onDraftChange({ orderStatus: event.target.value as OrderStatus })}
                  disabled={disabled}
                  className="touch-target mt-1 w-full rounded-soft border border-pink-100 px-3"
                >
                  {orderStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-bold text-ink">สถานะชำระเงิน</span>
                <select
                  suppressHydrationWarning
                  value={draft.paymentStatus}
                  onChange={(event) => onDraftChange({ paymentStatus: event.target.value as CustomerOrder["paymentStatus"] })}
                  disabled={disabled}
                  className="touch-target mt-1 w-full rounded-soft border border-pink-100 px-3"
                >
                  {paymentStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <Input label="ขนส่ง" value={draft.trackingCarrier} onChange={(value) => onDraftChange({ trackingCarrier: value })} disabled={disabled} />
              <Input label="เลขพัสดุ" value={draft.trackingNumber} onChange={(value) => onDraftChange({ trackingNumber: value })} disabled={disabled} />
              <Input label="ลิงก์ติดตามพัสดุ" value={draft.trackingUrl} onChange={(value) => onDraftChange({ trackingUrl: value })} disabled={disabled} wide />
              <label className="block md:col-span-2">
                <span className="text-sm font-bold text-ink">หมายเหตุผู้ดูแล</span>
                <textarea
                  suppressHydrationWarning
                  value={draft.adminNote}
                  onChange={(event) => onDraftChange({ adminNote: event.target.value })}
                  disabled={disabled}
                  className="mt-1 min-h-24 w-full rounded-soft border border-pink-100 p-3 outline-none focus:border-blossom"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                suppressHydrationWarning
                onClick={onSave}
                disabled={disabled}
                className="touch-target inline-flex items-center justify-center gap-2 rounded-soft bg-blossom px-4 py-2 font-bold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Truck size={18} aria-hidden="true" />}
                บันทึกสถานะ
              </button>
              <Link
                href={`/track?order=${encodeURIComponent(order.orderNumber)}${phoneSuffix ? `&phone=${encodeURIComponent(phoneSuffix)}` : ""}`}
                className="touch-target inline-flex items-center justify-center rounded-soft border border-pink-200 bg-white px-4 py-2 font-bold text-ink transition hover:border-blossom hover:bg-blush"
              >
                เปิดหน้าติดตาม
              </Link>
            </div>
          </section>

          <aside className="rounded-bloom border border-pink-100 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-ink">ตรวจสอบสลิป</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {order.latestPayment ? paymentRecordLabels[order.latestPayment.status] : "ยังไม่มีสลิป"}
                </p>
              </div>
              {order.latestPayment ? (
                <span className="rounded-full bg-blush px-3 py-1 text-xs font-bold text-blossom">
                  {order.latestPayment.amount.toLocaleString("th-TH")} บาท
                </span>
              ) : null}
            </div>

            {hasSlip && order.latestPayment ? (
              <div className="mt-4">
                <a href={order.latestPayment.slipUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-soft border border-pink-100 bg-blush">
                  <img
                    src={order.latestPayment.slipUrl}
                    alt={`สลิป ${order.orderNumber}`}
                    draggable={false}
                    onContextMenu={(event) => event.preventDefault()}
                    className="max-h-96 w-full select-none object-contain"
                  />
                </a>
                <div className="mt-3 grid gap-2 text-sm">
                  <Detail label="เวลาที่อัปโหลด" value={formatDateTime(order.latestPayment.createdAt)} />
                  <Detail label="ยอดที่อ่านได้" value={order.latestPayment.verifiedAmount ? `${order.latestPayment.verifiedAmount.toLocaleString("th-TH")} บาท` : "-"} />
                  <Detail label="บัญชีผู้รับตรงไหม" value={order.latestPayment.receiverMatched === null ? "ตรวจไม่ได้" : order.latestPayment.receiverMatched ? "ตรง" : "ไม่ตรง"} />
                  {order.latestPayment.verificationMessage ? <Detail label="ผลตรวจระบบ" value={order.latestPayment.verificationMessage} /> : null}
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-soft bg-blush/60 p-4 text-sm text-zinc-600">ลูกค้ายังไม่ได้อัปโหลดสลิปมัดจำ</p>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                suppressHydrationWarning
                onClick={onApprove}
                disabled={disabled || !hasSlip || order.paymentStatus === "paid"}
                className="touch-target rounded-soft bg-green-600 px-4 py-2 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                อนุมัติสลิป
              </button>
              <button
                type="button"
                suppressHydrationWarning
                onClick={onReject}
                disabled={disabled || !hasSlip || order.paymentStatus === "paid"}
                className="touch-target inline-flex items-center justify-center gap-2 rounded-soft bg-red-50 px-4 py-2 font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <XCircle size={17} aria-hidden="true" />
                สลิปไม่ผ่าน
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-soft bg-blush/60 p-3">
      <dt className="text-xs font-semibold text-zinc-500">{label}</dt>
      <dd className="mt-1 font-bold text-ink">{value}</dd>
    </div>
  );
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <dt className="text-xs font-semibold text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words font-bold text-ink">{value}</dd>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  disabled,
  wide = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "block md:col-span-2" : "block"}>
      <span className="text-sm font-bold text-ink">{label}</span>
      <input
        suppressHydrationWarning
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="touch-target mt-1 w-full rounded-soft border border-pink-100 px-3 outline-none focus:border-blossom disabled:bg-blush disabled:text-zinc-500"
      />
    </label>
  );
}
