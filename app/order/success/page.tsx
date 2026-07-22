"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, FileDown, Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ProductPreview } from "@/components/configurator/ProductPreview";
import { DepositPaymentCard } from "@/components/DepositPaymentCard";
import { LAST_ORDER_KEY } from "@/lib/configurator";
import { formatThaiIsoDate } from "@/lib/date-format";
import { findOrder } from "@/lib/orders";
import type { CustomerOrder, OrderSourceItem } from "@/lib/types";

export default function SuccessPage() {
  const [order, setOrder] = useState<CustomerOrder | null>(null);

  useEffect(() => {
    const number = window.localStorage.getItem(LAST_ORDER_KEY) ?? "";
    setOrder(findOrder(number) ?? null);
  }, []);

  return (
    <>
      <Navbar />
      <main className="container-page min-h-screen py-8">
        <div className="rounded-bloom border border-pink-100 bg-white p-4 shadow-soft sm:p-6">
          <div className="flex flex-col gap-3 border-b border-pink-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-green-50 text-stem">
                <CheckCircle2 size={26} />
              </span>
              <div>
                <p className="text-sm font-bold text-blossom">คำสั่งซื้อพร้อมออเดอร์แล้ว</p>
                <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">ส่งคำสั่งพรีออเดอร์แล้ว</h1>
              </div>
            </div>
            {order ? <span className="rounded-full bg-yellow-50 px-4 py-2 text-sm font-bold text-yellow-700">รอตรวจสอบคำสั่งซื้อ</span> : null}
          </div>

          {order ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
                <section className="space-y-4">
                  <div className="rounded-bloom bg-blush p-4">
                    <p className="text-sm text-zinc-600">เลขคำสั่งซื้อ</p>
                    <p className="mt-1 break-all text-2xl font-bold text-ink">{order.orderNumber}</p>
                  </div>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <Info label="ยอดรวม" value={`${order.total} บาท`} />
                    <Info label="ยอดมัดจำ 50%" value={`${order.depositAmount} บาท`} />
                    <Info
                      label={order.estimatedDeliveryDate || order.pickupMethod.includes("จัดส่ง") ? "วันจัดส่งโดยประมาณ" : "วันรับสินค้า"}
                      value={order.estimatedDeliveryDate || order.pickupMethod.includes("จัดส่ง") ? formatThaiIsoDate(order.estimatedDeliveryDate ?? order.pickupDate) : `${formatThaiIsoDate(order.pickupDate)} ${order.pickupTime}`}
                    />
                    <Info label="สถานะ" value="รอตรวจสอบคำสั่งซื้อ" />
                  </dl>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <button type="button" onClick={() => navigator.clipboard.writeText(order.orderNumber)} className="touch-target inline-flex items-center justify-center gap-2 rounded-soft bg-blossom px-4 py-2 font-semibold text-white transition hover:bg-ink"><Copy size={18} />คัดลอกเลข</button>
                    <Link href="/track" className="touch-target inline-flex items-center justify-center gap-2 rounded-soft border border-pink-200 bg-white px-4 py-2 font-semibold transition hover:border-blossom hover:bg-blush"><Search size={18} />ติดตามสถานะ</Link>
                    <button type="button" onClick={() => window.print()} className="touch-target inline-flex items-center justify-center gap-2 rounded-soft border border-pink-200 bg-white px-4 py-2 font-semibold transition hover:border-blossom hover:bg-blush"><FileDown size={18} />พิมพ์สรุป</button>
                  </div>
                </section>
                {order.sourceItem ? <SourceItemPreview item={order.sourceItem} /> : <ProductPreview compact config={order.config} />}
              </div>

              <DepositPaymentCard order={order} onOrderUpdated={setOrder} />
            </div>
          ) : (
            <p className="mt-4 text-zinc-600">ยังไม่พบคำสั่งซื้อในเครื่องนี้</p>
          )}
        </div>
      </main>
    </>
  );
}

function SourceItemPreview({ item }: { item: OrderSourceItem }) {
  return (
    <aside className="rounded-bloom border border-pink-100 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-ink">แบบที่สั่งซื้อ</h2>
      {item.imageUrl ? (
        <div className="mt-4 aspect-[4/3] overflow-hidden rounded-soft border border-pink-100 bg-blush">
          <img
            src={item.imageUrl}
            alt={item.title}
            draggable={false}
            onContextMenu={(event) => event.preventDefault()}
            className="h-full w-full select-none object-cover"
          />
        </div>
      ) : null}
      <h3 className="mt-4 font-bold text-ink">{item.title}</h3>
      {item.description ? <p className="mt-1 text-sm text-zinc-600">{item.description}</p> : null}
      <div className="mt-3 grid gap-2 rounded-soft bg-blush/60 p-3 text-sm">
        <p className="font-semibold text-zinc-600">คะแนนการผลิต {item.productionScore.toLocaleString("th-TH")} คะแนน</p>
        <p className="text-xl font-bold text-blossom">{item.price.toLocaleString("th-TH")} บาท</p>
      </div>
    </aside>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-soft border border-pink-100 bg-white p-4"><dt className="text-sm text-zinc-500">{label}</dt><dd className="mt-1 break-words font-bold text-ink">{value}</dd></div>;
}
