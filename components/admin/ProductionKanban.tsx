"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { getStoredOrders } from "@/lib/orders";
import type { CustomerOrder, OrderStatus } from "@/lib/types";

const columns: { title: string; statuses: OrderStatus[] }[] = [
  { title: "รอตรวจสอบ", statuses: ["pending_review"] },
  { title: "รอผลิต", statuses: ["design_confirmed", "awaiting_payment", "preparing_materials"] },
  { title: "กำลังผลิต", statuses: ["in_production"] },
  { title: "ตรวจสอบ", statuses: ["quality_check"] },
  { title: "พร้อมรับ", statuses: ["ready"] }
];

function getFulfillmentText(order: CustomerOrder) {
  if (order.estimatedDeliveryDate || order.pickupMethod.includes("จัดส่ง")) {
    return `ส่ง ${order.estimatedDeliveryDate ?? order.pickupDate}`;
  }

  return order.pickupDate;
}

export function ProductionKanban() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  useEffect(() => {
    setOrders(getStoredOrders());
  }, []);

  const groupedOrders = useMemo(() => columns.map((column) => ({
    ...column,
    orders: orders.filter((order) => column.statuses.includes(order.orderStatus))
  })), [orders]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {groupedOrders.map((column) => (
        <section key={column.title} className="min-h-52 rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-ink">{column.title}</h3>
            <span className="rounded-full bg-blush px-3 py-1 text-xs font-bold text-blossom">{column.orders.length} งาน</span>
          </div>
          <div className="mt-4 space-y-3">
            {column.orders.length ? column.orders.map((order) => (
              <article key={order.id} className="rounded-bloom border border-pink-100 bg-blush/55 p-4 text-sm shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="break-all font-bold text-ink">{order.orderNumber}</p>
                    <p className="mt-1 text-xs font-semibold text-blossom">{column.title}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-ink shadow-sm">{order.productionScore} คะแนน</span>
                </div>
                <div className="mt-3 grid gap-2 rounded-soft bg-white/80 p-3 text-zinc-700">
                  <div className="flex items-center justify-between gap-3">
                    <span>กำหนดรับ/ส่ง</span>
                    <span className="font-semibold text-ink">{getFulfillmentText(order)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>ลูกค้า</span>
                    <span className="font-semibold text-ink">{order.customerName}</span>
                  </div>
                </div>
              </article>
            )) : <EmptyState title="ยังไม่มีงาน" message="เมื่อมีออเดอร์จริง งานจะแสดงในช่องนี้" />}
          </div>
        </section>
      ))}
    </div>
  );
}
