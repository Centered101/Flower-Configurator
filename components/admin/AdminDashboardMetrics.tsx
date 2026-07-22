"use client";

import { AlertTriangle, Banknote, CalendarCheck, Eye, Flower2, PackageCheck, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { getStoredOrders, listenForOrderUpdates } from "@/lib/orders";
import type { CustomerOrder } from "@/lib/types";

export function AdminDashboardMetrics() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  useEffect(() => {
    function syncOrders() {
      setOrders(getStoredOrders());
    }

    syncOrders();
    return listenForOrderUpdates(syncOrders);
  }, []);

  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const newOrders = orders.filter((order) => order.orderStatus === "pending_review").length;
    const unreadOrders = orders.filter((order) => !order.adminReadAt).length;
    const todayOrders = orders.filter((order) => order.pickupDate === today);
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
    const flowersToMake = todayOrders.reduce((sum, order) => sum + order.config.quantity, 0);
    const usedScore = todayOrders.reduce((sum, order) => sum + order.productionScore, 0);
    const remainingScore = Math.max(0, 12 - usedScore);

    return [
      { icon: <ShoppingBag />, label: "ออเดอร์ใหม่", value: `${newOrders}` },
      { icon: <Eye />, label: "ยังไม่อ่าน", value: `${unreadOrders}` },
      { icon: <CalendarCheck />, label: "งานที่ต้องทำวันนี้", value: `${todayOrders.length}` },
      { icon: <Banknote />, label: "รายได้วันนี้", value: `${todayRevenue.toLocaleString("th-TH")} บาท` },
      { icon: <Flower2 />, label: "จำนวนดอกที่ต้องผลิต", value: `${flowersToMake}` },
      { icon: <PackageCheck />, label: "คิวที่เหลือวันนี้", value: `${remainingScore} คะแนน` },
      { icon: <AlertTriangle />, label: "วัสดุใกล้หมด", value: "0 รายการ" }
    ];
  }, [orders]);

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
      {metrics.map((metric) => (
        <Metric key={metric.label} icon={metric.icon} label={metric.label} value={metric.value} />
      ))}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-h-32 rounded-bloom border border-pink-100 bg-white p-4 shadow-sm sm:p-5" data-aos="fade-up">
      <div className="text-blossom">{icon}</div>
      <p className="mt-3 text-xs leading-5 text-zinc-500 sm:text-sm">{label}</p>
      <p className="break-words text-xl font-bold text-ink sm:text-2xl">{value}</p>
    </div>
  );
}
